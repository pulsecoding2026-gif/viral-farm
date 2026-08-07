import type { SupabaseClient } from "@supabase/supabase-js";

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
  estilo?: "karaoke" | "neon" | "minimal" | "sem";
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
  /** Estilo escolhido na reedição; nulo herda o da análise. */
  estilo: OpcoesAnalise["estilo"] | null;
  /** URL pública do MP4 quando pronto. */
  url: string | null;
  /** Primeiras palavras faladas dentro do corte — a prévia do Estúdio. */
  previa: string | null;
};

export type JobAnalise = {
  id: string;
  link: string;
  nicho: string;
  status: "processando" | "revisao" | "pronto" | "erro";
  etapa: string | null;
  /** Epoch em ms — o formato que a UI já usava. */
  criado_em: number;
  mensagem: string | null;
  resultado: ResumoCortes | null;
  opcoes: OpcoesAnalise;
  /** Só vem no detalhe (GET /api/analises/[id]). */
  cortes?: Corte[];
};

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
  return {
    id: l.id,
    link: l.link,
    nicho: l.nicho,
    status: l.status as JobAnalise["status"],
    etapa: l.etapa,
    mensagem: l.mensagem,
    resultado: (l.resultado as ResumoCortes | null) ?? null,
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

/** Trinca [texto, início, fim] — como o worker compacta a transcrição. */
type PalavraCompacta = [string, number, number];

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
      "id, ordem, inicio_s, fim_s, titulo, gancho, motivo, score, status, arquivo, estilo, renderizado_em",
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
      gancho: (c.gancho as string | null) ?? null,
      motivo: (c.motivo as string | null) ?? null,
      score: (c.score as number | null) ?? null,
      status: c.status as Corte["status"],
      estilo: (c.estilo as Corte["estilo"]) ?? null,
      url: c.arquivo
        ? sb.storage.from("cortes").getPublicUrl(c.arquivo as string).data
            .publicUrl + versao
        : null,
      previa: previaDoCorte(palavras, inicio, fim),
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
export async function aprovarCortes(
  sb: SupabaseClient,
  analiseId: string,
  corteIds: string[],
): Promise<void> {
  const { error: erroAprovar } = await sb
    .from("cortes")
    .update({ status: "aprovado" })
    .eq("analise_id", analiseId)
    .eq("status", "proposto")
    .in("id", corteIds);
  if (erroAprovar) throw new Error(`Não aprovei os cortes: ${erroAprovar.message}`);

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
