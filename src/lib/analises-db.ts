import type { SupabaseClient } from "@supabase/supabase-js";
import {
  diagnosticar,
  type CodigoErro,
  type AcaoErro,
} from "./analise/diagnostico";

/**
 * Análises e cortes lidos do Supabase — substitui o data/analises.json.
 *
 * Tudo aqui roda com o cliente DA SESSÃO (RLS decide o que aparece), nunca
 * com a chave de serviço: quem escreve nos jobs é o worker da VPS; o site
 * só cria o pedido, lê o progresso e registra as decisões do Estúdio.
 */

export type OpcoesAnalise = {
  modo?: "auto" | "manual";
  qtd?: number;
  duracao?: "curto" | "medio" | "longo";
  direcao?: string;
  /** Id da galeria (src/lib/formatos.ts) ou "auto": a IA escolhe por corte. */
  estilo?: string;
  /** Caixa de título nos primeiros 5s do corte. */
  titulo?: boolean;
  /** Remove as pausas longas entre as falas. */
  limpar_silencio?: boolean;
};

/** Diagnóstico do score — por que o trecho foi escolhido. */
export type NotasCorte = {
  gancho: number;
  fluxo: number;
  valor: number;
  tendencia: number;
};

export type ResumoCortes = {
  tipo: "cortes";
  titulo: string;
  duracao_video_s: number;
  idioma: string | null;
  qtd_cortes: number;
  duracao_total_ms: number;
};

export type Corte = {
  id: string;
  ordem: number;
  inicio_s: number;
  fim_s: number;
  titulo: string;
  gancho: string | null;
  motivo: string | null;
  score: number | null;
  status: "proposto" | "aprovado" | "descartado" | "renderizando" | "pronto" | "erro";
  /** Diagnóstico do score nas 4 dimensões. */
  notas: NotasCorte | null;
  /** Frase que aparece ESCRITA na tela nos primeiros segundos. */
  titulo_tela: string | null;
  /** Legenda pronta pra postar. */
  descricao: string | null;
  /** Formato deste corte — escolhido pela IA ou trocado na reedição. */
  estilo: string | null;
  /** Por que a IA casou ESTE trecho com ESSE formato. */
  motivo_formato: string | null;
  /** Palavras que a IA marcou pra pintar com a cor de destaque. */
  destaques: string[] | null;
  /** URL pública do MP4 quando pronto. */
  url: string | null;
  /** Primeiras palavras faladas dentro do corte — a prévia do Estúdio. */
  previa: string | null;
  /**
   * Palavras em volta do corte, pro ajuste de início e fim no Estúdio.
   *
   * Vai ALÉM das bordas de propósito: o defeito clássico é o corte começar
   * no meio da frase ("...vão mudar" em vez de "os carros do GTA VI vão
   * mudar"), e consertar isso exige poder ESTENDER pra trás, não só encurtar.
   *
   * Ajuste por palavra, não por segundo: fala não se alinha a segundo, se
   * alinha a palavra — e a transcrição já traz o tempo exato de cada uma.
   */
  contexto: PalavraDoCorte[] | null;
};

export type PalavraDoCorte = {
  texto: string;
  inicio_s: number;
  fim_s: number;
};

/** Quando a análise falha, o `resultado` guarda o diagnóstico em vez do resumo. */
export type ResumoErro = {
  tipo: "erro";
  codigo: CodigoErro;
  acao: AcaoErro;
};

export type JobAnalise = {
  id: string;
  link: string;
  nicho: string;
  status: "processando" | "revisao" | "pronto" | "erro" | "cancelado";
  etapa: string | null;
  /** Epoch em ms — o formato que a UI já usava. */
  criado_em: number;
  mensagem: string | null;
  resultado: ResumoCortes | ResumoErro | null;
  opcoes: OpcoesAnalise;
  /** Só vem no detalhe (GET /api/analises/[id]). */
  cortes?: Corte[];
};

/** Estreita o resultado pro resumo de sucesso — o de erro não tem título. */
export function resumoDeCortes(
  r: JobAnalise["resultado"],
): ResumoCortes | null {
  return r && r.tipo === "cortes" ? r : null;
}

type LinhaAnalise = {
  id: string;
  link: string;
  nicho: string;
  status: string;
  etapa: string | null;
  mensagem: string | null;
  resultado: unknown;
  opcoes: unknown;
  criado_em: string;
};

function linhaParaJob(l: LinhaAnalise): JobAnalise {
  const resultado = (l.resultado as JobAnalise["resultado"]) ?? null;
  const status = l.status as JobAnalise["status"];

  // Segunda barreira contra vazar erro técnico: o worker já grava a mensagem
  // traduzida, mas análises anteriores a isso guardaram o stderr cru do
  // yt-dlp — e o cliente veria flags de CLI e link de wiki ao abrir o
  // histórico. Falha SEM código de diagnóstico é linha antiga: traduz aqui.
  // (Com código, a mensagem já passou pelo diagnosticar e não se mexe.)
  const legado =
    status === "erro" && !(resultado && resultado.tipo === "erro");
  const d = legado ? diagnosticar(new Error(l.mensagem ?? "")) : null;

  return {
    id: l.id,
    link: l.link,
    nicho: l.nicho,
    status,
    etapa: l.etapa,
    mensagem: d ? d.mensagem : l.mensagem,
    resultado: d
      ? { tipo: "erro", codigo: d.codigo, acao: d.acao }
      : resultado,
    opcoes: (l.opcoes as OpcoesAnalise) ?? {},
    criado_em: new Date(l.criado_em).getTime(),
  };
}

const COLUNAS =
  "id, link, nicho, status, etapa, mensagem, resultado, opcoes, criado_em";

export async function listarAnalises(sb: SupabaseClient): Promise<JobAnalise[]> {
  const { data, error } = await sb
    .from("analises")
    .select(COLUNAS)
    .order("criado_em", { ascending: false })
    .limit(50);

  if (error) throw new Error(`Não li o histórico: ${error.message}`);
  return (data as LinhaAnalise[]).map(linhaParaJob);
}

/** Um corte pronto, com o contexto da análise de onde saiu. */
export type CorteNaEstante = {
  id: string;
  analise_id: string;
  titulo: string;
  /** Título do vídeo original — o que situa o corte na estante. */
  origem: string;
  inicio_s: number;
  fim_s: number;
  estilo: string | null;
  url: string;
  renderizado_em: number | null;
};

/**
 * Todos os cortes PRONTOS do dono, de todas as análises.
 *
 * É o acervo do Editor: o Analisador entrega automático, e aqui a pessoa
 * escolhe qual daqueles cortes quer abrir e ajustar na mão. Sem isto o
 * editor começaria vazio e obrigaria a passar pelo histórico de análises
 * pra achar o que editar.
 */
export async function listarCortesProntos(
  sb: SupabaseClient,
  limite = 60,
): Promise<CorteNaEstante[]> {
  const { data, error } = await sb
    .from("cortes")
    .select(
      "id, analise_id, titulo, inicio_s, fim_s, estilo, arquivo, renderizado_em, analises(resultado, link)",
    )
    .eq("status", "pronto")
    .not("arquivo", "is", null)
    .order("renderizado_em", { ascending: false })
    .limit(limite);

  if (error) throw new Error(`Não li os cortes: ${error.message}`);

  return (data ?? []).map((c) => {
    const analise = c.analises as { resultado?: unknown; link?: string } | null;
    const resumo = analise?.resultado as { titulo?: string } | null;
    // ?v= muda a cada render: sem isso o navegador serve o MP4 velho do
    // cache depois de uma edição, no mesmo caminho e mesma URL.
    const versao = c.renderizado_em
      ? `?v=${new Date(c.renderizado_em as string).getTime()}`
      : "";
    return {
      id: c.id as string,
      analise_id: c.analise_id as string,
      titulo: (c.titulo as string) ?? "Corte",
      origem: resumo?.titulo ?? analise?.link ?? "",
      inicio_s: Number(c.inicio_s),
      fim_s: Number(c.fim_s),
      estilo: (c.estilo as string | null) ?? null,
      url:
        sb.storage.from("cortes").getPublicUrl(c.arquivo as string).data
          .publicUrl + versao,
      renderizado_em: c.renderizado_em
        ? new Date(c.renderizado_em as string).getTime()
        : null,
    };
  });
}

/** Trinca [texto, início, fim] — como o worker compacta a transcrição. */
type PalavraCompacta = [string, number, number];

/**
 * Quanto de fala vai ALÉM de cada borda do corte, em segundos.
 *
 * Generoso de propósito: o defeito clássico é o corte entrar no meio da
 * frase, e consertar exige estender pra trás. 12s cobre uma frase longa
 * sem inchar a resposta (≈35 palavras por borda).
 */
const FOLGA_CONTEXTO_S = 12;

function contextoDoCorte(
  palavras: PalavraCompacta[] | undefined,
  inicio: number,
  fim: number,
): PalavraDoCorte[] | null {
  if (!palavras?.length) return null;
  const de = inicio - FOLGA_CONTEXTO_S;
  const ate = fim + FOLGA_CONTEXTO_S;
  const dentro = palavras
    .filter(([, i, f]) => f > de && i < ate)
    .map(([texto, inicio_s, fim_s]) => ({ texto, inicio_s, fim_s }));
  return dentro.length > 0 ? dentro : null;
}

function previaDoCorte(
  palavras: PalavraCompacta[] | undefined,
  inicio: number,
  fim: number,
): string | null {
  if (!palavras?.length) return null;
  const dentro = palavras.filter(([, i, f]) => i >= inicio - 0.2 && f <= fim + 0.2);
  if (dentro.length === 0) return null;
  const texto = dentro.slice(0, 42).map(([t]) => t).join(" ");
  return dentro.length > 42 ? `${texto}…` : texto;
}

export async function lerAnalise(
  sb: SupabaseClient,
  id: string,
): Promise<JobAnalise | null> {
  const { data, error } = await sb
    .from("analises")
    .select(`${COLUNAS}, transcricao`)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Não li a análise: ${error.message}`);
  if (!data) return null;

  const job = linhaParaJob(data as LinhaAnalise);
  const palavras = (
    data.transcricao as { palavras?: PalavraCompacta[] } | null
  )?.palavras;

  const { data: cortes, error: erroCortes } = await sb
    .from("cortes")
    .select(
      "id, ordem, inicio_s, fim_s, titulo, titulo_tela, gancho, motivo, descricao, score, notas, status, arquivo, estilo, motivo_formato, destaques, renderizado_em",
    )
    .eq("analise_id", id)
    .order("ordem", { ascending: true });

  if (erroCortes) throw new Error(`Não li os cortes: ${erroCortes.message}`);

  job.cortes = (cortes ?? []).map((c) => {
    const inicio = Number(c.inicio_s);
    const fim = Number(c.fim_s);
    // ?v= muda a cada renderização: sem isso, depois de uma reedição o
    // navegador serviria o MP4 antigo do cache — mesmo caminho, mesmo URL.
    const versao = c.renderizado_em
      ? `?v=${new Date(c.renderizado_em as string).getTime()}`
      : "";
    return {
      id: c.id as string,
      ordem: c.ordem as number,
      inicio_s: inicio,
      fim_s: fim,
      titulo: c.titulo as string,
      titulo_tela: (c.titulo_tela as string | null) ?? null,
      gancho: (c.gancho as string | null) ?? null,
      motivo: (c.motivo as string | null) ?? null,
      descricao: (c.descricao as string | null) ?? null,
      score: (c.score as number | null) ?? null,
      notas: (c.notas as NotasCorte | null) ?? null,
      status: c.status as Corte["status"],
      estilo: (c.estilo as string | null) ?? null,
      motivo_formato: (c.motivo_formato as string | null) ?? null,
      destaques: (c.destaques as string[] | null) ?? null,
      url: c.arquivo
        ? sb.storage.from("cortes").getPublicUrl(c.arquivo as string).data
            .publicUrl + versao
        : null,
      previa: previaDoCorte(palavras, inicio, fim),
      // Só o Estúdio usa: corte já renderizado não tem o que ajustar aqui.
      contexto:
        c.status === "proposto" ? contextoDoCorte(palavras, inicio, fim) : null,
    };
  });

  return job;
}

export async function criarAnalise(
  sb: SupabaseClient,
  userId: string,
  link: string,
  nicho: string,
  opcoes: OpcoesAnalise,
): Promise<string> {
  const { data, error } = await sb
    .from("analises")
    .insert({
      user_id: userId,
      link,
      nicho,
      status: "processando",
      // É esta etapa que o worker da VPS fica caçando.
      etapa: "na_fila",
      opcoes,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Não criei a análise: ${error.message}`);
  return data.id as string;
}

/**
 * A decisão do Estúdio: aprova os cortes escolhidos, descarta o resto e
 * devolve a análise pra fila com a etapa que o worker entende como
 * "renderizar os aprovados". Roda com a sessão do dono — RLS garante que
 * ninguém aprova corte alheio.
 */
export type CorteAprovacao = {
  id: string;
  /** Janela ajustada no Estúdio. Ausente mantém a que a IA propôs. */
  inicio_s?: number;
  fim_s?: number;
  /** Formato trocado no Estúdio. Ausente mantém o que a IA escolheu. */
  estilo?: string;
};

export async function aprovarCortes(
  sb: SupabaseClient,
  analiseId: string,
  escolhidos: CorteAprovacao[],
): Promise<void> {
  const corteIds = escolhidos.map((c) => c.id);

  // Um update por corte porque a janela pode ter sido ajustada individualmente
  // — o Estúdio deixa mexer no início e no fim de cada um. São poucos (até 15)
  // e só acontece no clique de aprovar.
  for (const c of escolhidos) {
    const ajuste =
      c.inicio_s !== undefined && c.fim_s !== undefined
        ? { inicio_s: c.inicio_s, fim_s: c.fim_s }
        : {};
    // O worker lê `corte.estilo` na renderização, então trocar aqui já muda
    // o formato daquele corte sem tocar nos outros.
    const formato = c.estilo ? { estilo: c.estilo } : {};
    const { error } = await sb
      .from("cortes")
      .update({ status: "aprovado", ...ajuste, ...formato })
      .eq("id", c.id)
      .eq("analise_id", analiseId)
      .eq("status", "proposto");
    if (error) throw new Error(`Não aprovei o corte: ${error.message}`);
  }

  const { error: erroDescartar } = await sb
    .from("cortes")
    .update({ status: "descartado" })
    .eq("analise_id", analiseId)
    .eq("status", "proposto");
  if (erroDescartar)
    throw new Error(`Não descartei os demais: ${erroDescartar.message}`);

  const { error } = await sb
    .from("analises")
    .update({ status: "processando", etapa: "renderizar_aprovados" })
    .eq("id", analiseId)
    .eq("status", "revisao");
  if (error) throw new Error(`Não mandei pra renderização: ${error.message}`);
}

/**
 * Reedita um corte PRONTO: nova janela de tempo e/ou estilo. O corte volta
 * pra 'aprovado' e a análise volta pra fila de renderização — o worker
 * sobrescreve o mesmo arquivo.
 *
 * Só quando a análise está quieta ('pronto'): reeditar no meio de outra
 * renderização embolaria a etapa que o worker está seguindo.
 */
export async function reeditarCorte(
  sb: SupabaseClient,
  corteId: string,
  campos: { inicio_s: number; fim_s: number; estilo?: string },
): Promise<"ok" | "ocupada" | "nao_achei"> {
  // RLS: se o corte for de outra pessoa, simplesmente não aparece.
  const { data: corte } = await sb
    .from("cortes")
    .select("id, analise_id, status")
    .eq("id", corteId)
    .maybeSingle();
  if (!corte) return "nao_achei";

  const { data: analise, error: erroFila } = await sb
    .from("analises")
    .update({ status: "processando", etapa: "renderizar_aprovados" })
    .eq("id", corte.analise_id as string)
    .eq("status", "pronto")
    .select("id");
  if (erroFila) throw new Error(`Não voltei pra fila: ${erroFila.message}`);
  if (!analise || analise.length === 0) return "ocupada";

  const { error } = await sb
    .from("cortes")
    .update({
      inicio_s: campos.inicio_s,
      fim_s: campos.fim_s,
      ...(campos.estilo ? { estilo: campos.estilo } : {}),
      status: "aprovado",
    })
    .eq("id", corteId);
  if (error) throw new Error(`Não atualizei o corte: ${error.message}`);

  return "ok";
}

/**
 * Interrompe uma análise em andamento.
 *
 * Só marca o status — quem realmente para é o worker, que vigia a própria
 * linha e mata o ffmpeg/yt-dlp quando ela sai de 'processando'. É por isso
 * que o retorno é imediato: a UI não espera o processo morrer.
 *
 * Cobre 'revisao' também: uma análise parada no Estúdio que o dono não quer
 * mais é a mesma decisão, só que sem processo pra matar.
 */
export async function cancelarAnalise(
  sb: SupabaseClient,
  analiseId: string,
): Promise<"ok" | "nao_achei"> {
  const { data, error } = await sb
    .from("analises")
    .update({
      status: "cancelado",
      etapa: null,
      mensagem: null,
      resultado: null,
    })
    .eq("id", analiseId)
    // O filtro é o guarda: análise pronta ou já cancelada não volta atrás,
    // e RLS já esconde o que não é do dono.
    .in("status", ["processando", "revisao"])
    .select("id");

  if (error) throw new Error(`Não consegui cancelar: ${error.message}`);
  return data && data.length > 0 ? "ok" : "nao_achei";
}

/**
 * Recoloca na fila uma análise que falhou.
 *
 * A maioria das falhas é transitória (verificação de robô, limite de taxa,
 * rede) — antes disso a tela de erro era beco sem saída e a única saída era
 * colar o link de novo, perdendo as opções escolhidas. Aqui o job volta com
 * as MESMAS opções.
 *
 * O `.eq("status", "erro")` é o guarda: só quem falhou volta pra fila, então
 * dois cliques seguidos não duplicam trabalho nem atropelam um job vivo.
 */
export async function retomarAnalise(
  sb: SupabaseClient,
  analiseId: string,
): Promise<"ok" | "nao_achei"> {
  // Cortes propostos de uma tentativa anterior sairiam duplicados quando o
  // worker registrasse os novos.
  await sb.from("cortes").delete().eq("analise_id", analiseId);

  const { data, error } = await sb
    .from("analises")
    .update({
      status: "processando",
      etapa: "na_fila",
      mensagem: null,
      resultado: null,
    })
    .eq("id", analiseId)
    // Cancelado também retoma: quem parou por engano não deveria precisar
    // recolar o link e reescolher tudo de novo.
    .in("status", ["erro", "cancelado"])
    .select("id");

  if (error) throw new Error(`Não recoloquei na fila: ${error.message}`);
  return data && data.length > 0 ? "ok" : "nao_achei";
}
