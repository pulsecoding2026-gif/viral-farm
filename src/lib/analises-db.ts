import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Análises e cortes lidos do Supabase — substitui o data/analises.json.
 *
 * Tudo aqui roda com o cliente DA SESSÃO (RLS decide o que aparece), nunca
 * com a chave de serviço: quem escreve nos jobs é o worker da VPS; o site
 * só cria o pedido e lê o progresso.
 */

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
  status: "renderizando" | "pronto" | "erro";
  /** URL pública do MP4 quando pronto. */
  url: string | null;
};

export type JobAnalise = {
  id: string;
  link: string;
  nicho: string;
  status: "processando" | "pronto" | "erro";
  etapa: string | null;
  /** Epoch em ms — o formato que a UI já usava. */
  criado_em: number;
  mensagem: string | null;
  resultado: ResumoCortes | null;
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
    criado_em: new Date(l.criado_em).getTime(),
  };
}

const COLUNAS = "id, link, nicho, status, etapa, mensagem, resultado, criado_em";

export async function listarAnalises(sb: SupabaseClient): Promise<JobAnalise[]> {
  const { data, error } = await sb
    .from("analises")
    .select(COLUNAS)
    .order("criado_em", { ascending: false })
    .limit(50);

  if (error) throw new Error(`Não li o histórico: ${error.message}`);
  return (data as LinhaAnalise[]).map(linhaParaJob);
}

export async function lerAnalise(
  sb: SupabaseClient,
  id: string,
): Promise<JobAnalise | null> {
  const { data, error } = await sb
    .from("analises")
    .select(COLUNAS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Não li a análise: ${error.message}`);
  if (!data) return null;

  const job = linhaParaJob(data as LinhaAnalise);

  const { data: cortes, error: erroCortes } = await sb
    .from("cortes")
    .select("id, ordem, inicio_s, fim_s, titulo, gancho, motivo, score, status, arquivo")
    .eq("analise_id", id)
    .order("ordem", { ascending: true });

  if (erroCortes) throw new Error(`Não li os cortes: ${erroCortes.message}`);

  job.cortes = (cortes ?? []).map((c) => ({
    id: c.id as string,
    ordem: c.ordem as number,
    inicio_s: Number(c.inicio_s),
    fim_s: Number(c.fim_s),
    titulo: c.titulo as string,
    gancho: (c.gancho as string | null) ?? null,
    motivo: (c.motivo as string | null) ?? null,
    score: (c.score as number | null) ?? null,
    status: c.status as Corte["status"],
    url: c.arquivo
      ? sb.storage.from("cortes").getPublicUrl(c.arquivo as string).data.publicUrl
      : null,
  }));

  return job;
}

export async function criarAnalise(
  sb: SupabaseClient,
  userId: string,
  link: string,
  nicho: string,
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
    })
    .select("id")
    .single();

  if (error) throw new Error(`Não criei a análise: ${error.message}`);
  return data.id as string;
}
