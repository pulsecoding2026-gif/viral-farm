import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ambiente } from "./ambiente";
import type { OpcoesCorte } from "./cortar";
import type { TranscricaoPalavras } from "./transcritor";

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

export async function falharJob(id: string, mensagem: string): Promise<void> {
  await supabase()
    .from("analises")
    .update({ status: "erro", etapa: null, mensagem })
    .eq("id", id);
}
