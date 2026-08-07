import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ambiente } from "./ambiente";
import type { OpcoesCorte } from "./cortar";
import type { TranscricaoPalavras } from "./transcritor";
import { diagnosticar } from "../src/lib/analise/diagnostico";

/**
 * A fila é a própria tabela `analises` — o Supabase é a ponte entre o site
 * (Vercel) e o worker (VPS). Nenhum dos dois fala com o outro diretamente:
 * o site grava o job, o worker o consome, e a VPS não abre porta nenhuma.
 *
 * Dois tipos de trabalho na mesma fila:
 *   etapa 'na_fila'              → análise nova (baixar, transcrever, propor)
 *   etapa 'renderizar_aprovados' → o dono aprovou cortes no Estúdio
 */

export type OpcoesJob = OpcoesCorte & {
  modo?: "auto" | "manual";
  estilo?: string;
  /** Caixa de título nos primeiros 5s. Ligada por padrão. */
  titulo?: boolean;
  /** Remove as pausas longas entre as falas. */
  limpar_silencio?: boolean;
};

export type JobAnalise = {
  id: string;
  user_id: string;
  link: string;
  nicho: string;
  etapa: "na_fila" | "renderizar_aprovados";
  opcoes: OpcoesJob;
};

let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  cliente ??= createClient(ambiente.supabaseUrl(), ambiente.supabaseServico(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cliente;
}

/**
 * Pega o trabalho mais antigo da fila e o assume.
 *
 * A troca de etapa com o filtro `.in("etapa", ...)` é a trava: se dois
 * workers disputarem o mesmo job, só o primeiro update acha a linha ainda
 * na fila — o segundo atualiza zero linhas e volta pra espera.
 */
export async function pegarProximoJob(): Promise<JobAnalise | null> {
  const { data: candidatos, error } = await supabase()
    .from("analises")
    .select("id, user_id, link, nicho, etapa, opcoes")
    .eq("status", "processando")
    .in("etapa", ["na_fila", "renderizar_aprovados"])
    .order("criado_em", { ascending: true })
    .limit(1);

  if (error) throw new Error(`Fila indisponível: ${error.message}`);
  const job = candidatos?.[0];
  if (!job) return null;

  const { data: assumido, error: erroTrava } = await supabase()
    .from("analises")
    .update({ etapa: job.etapa === "na_fila" ? "baixando" : "preparando_render" })
    .eq("id", job.id)
    .eq("etapa", job.etapa)
    .select("id");

  if (erroTrava) throw new Error(`Não deu pra assumir o job: ${erroTrava.message}`);
  if (!assumido || assumido.length === 0) return null; // outro worker levou

  return {
    ...(job as Omit<JobAnalise, "opcoes">),
    opcoes: (job.opcoes ?? {}) as OpcoesJob,
  };
}

export async function marcarEtapa(id: string, etapa: string): Promise<void> {
  await supabase().from("analises").update({ etapa }).eq("id", id);
}

/**
 * Devolve à fila os jobs que um worker morto deixou pendurados.
 *
 * `pegarProximoJob` só enxerga as etapas 'na_fila' e 'renderizar_aprovados'.
 * Assim que assume um job, ele troca a etapa por 'baixando' — e a partir daí,
 * se o processo morrer (deploy, queda, reboot da VPS), a linha fica em
 * 'processando' numa etapa que ninguém mais procura. O job nunca termina e
 * nunca falha: o dono vê o progresso girando pra sempre.
 *
 * Roda SÓ na partida, antes do laço. Nesse instante o worker ainda não pegou
 * nada, então tudo que está em 'processando' fora da fila é órfão por
 * definição — e como é um processo por VPS, não há risco de roubar o job de
 * um colega vivo.
 */
export async function recuperarOrfaos(): Promise<number> {
  const { data: orfaos, error } = await supabase()
    .from("analises")
    .select("id")
    .eq("status", "processando")
    .not("etapa", "in", '("na_fila","renderizar_aprovados")');

  if (error) throw new Error(`Não li os órfãos: ${error.message}`);
  if (!orfaos || orfaos.length === 0) return 0;

  for (const { id } of orfaos) {
    // Cortes já aprovados no Estúdio não podem ser perdidos: a curadoria foi
    // trabalho do dono. Se existem, o job volta pra fase de renderização.
    const { data: aprovados } = await supabase()
      .from("cortes")
      .select("id")
      .eq("analise_id", id)
      .in("status", ["aprovado", "renderizando"]);

    if (aprovados && aprovados.length > 0) {
      // 'renderizando' é estado de quem morreu no meio — volta pra aprovado.
      await supabase()
        .from("cortes")
        .update({ status: "aprovado" })
        .eq("analise_id", id)
        .eq("status", "renderizando");
      await supabase()
        .from("analises")
        .update({ etapa: "renderizar_aprovados" })
        .eq("id", id);
    } else {
      // Sem curadoria a perder: recomeça do zero. Os cortes parciais saem
      // porque o worker vai registrar os novos e sairiam duplicados.
      await supabase().from("cortes").delete().eq("analise_id", id);
      await supabase()
        .from("analises")
        .update({ etapa: "na_fila", resultado: null })
        .eq("id", id);
    }
  }

  return orfaos.length;
}

/**
 * Grava a transcrição na análise — compactada em trincas [texto, início, fim]
 * pra não inchar o jsonb (vídeo de 1h passa de 10 mil palavras).
 */
export async function salvarTranscricao(
  id: string,
  t: TranscricaoPalavras,
): Promise<void> {
  await supabase()
    .from("analises")
    .update({
      transcricao: {
        idioma: t.idioma,
        texto: t.texto,
        palavras: t.palavras.map((p) => [p.texto, p.inicio_s, p.fim_s]),
      },
    })
    .eq("id", id);
}

/** Lê a transcrição de volta, expandindo as trincas. */
export async function lerTranscricao(
  id: string,
): Promise<TranscricaoPalavras | null> {
  const { data, error } = await supabase()
    .from("analises")
    .select("transcricao")
    .eq("id", id)
    .single();

  if (error || !data?.transcricao) return null;
  const t = data.transcricao as {
    idioma: string | null;
    texto: string;
    palavras: [string, number, number][];
  };
  return {
    idioma: t.idioma,
    texto: t.texto,
    palavras: t.palavras.map(([texto, inicio_s, fim_s]) => ({
      texto,
      inicio_s,
      fim_s,
    })),
  };
}

/** Análise parou no Estúdio: propostas prontas, esperando o dono decidir. */
export async function pararParaRevisao(id: string): Promise<void> {
  await supabase()
    .from("analises")
    .update({ status: "revisao", etapa: null })
    .eq("id", id);
}

export async function concluirJob(
  id: string,
  resultado: unknown,
): Promise<void> {
  await supabase()
    .from("analises")
    .update({ status: "pronto", etapa: null, resultado })
    .eq("id", id);
}

/**
 * Marca a análise como falha — com a mensagem JÁ traduzida pra humano.
 *
 * O código do diagnóstico vai no `resultado` (jsonb que já existe) em vez de
 * numa coluna nova: é o que a tela usa pra decidir entre "tentar de novo" e
 * "analisar outro vídeo". Guardar o texto cru em lugar nenhum é proposital —
 * ele já foi pro log do worker, e no banco só serviria pra vazar de novo.
 */
export async function falharJob(id: string, erro: unknown): Promise<void> {
  const d = diagnosticar(erro);
  await supabase()
    .from("analises")
    .update({
      status: "erro",
      etapa: null,
      mensagem: d.mensagem,
      resultado: { tipo: "erro", codigo: d.codigo, acao: d.acao },
    })
    .eq("id", id);
}
