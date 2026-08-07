import fs from "node:fs/promises";
import { supabase } from "./fila";
import type { CorteEscolhido } from "./cortar";

/**
 * Persistência dos cortes: o MP4 vai pro bucket `cortes` e a linha vai pra
 * tabela `cortes`. O caminho leva user_id + análise + uuid do corte — não
 * adivinhável, e o `on delete cascade` da tabela acompanha a análise.
 */

export async function registrarCorte(
  analiseId: string,
  userId: string,
  ordem: number,
  corte: CorteEscolhido,
  status: "proposto" | "renderizando" = "proposto",
): Promise<string> {
  const { data, error } = await supabase()
    .from("cortes")
    .insert({
      analise_id: analiseId,
      user_id: userId,
      ordem,
      inicio_s: corte.inicio_s,
      fim_s: corte.fim_s,
      titulo: corte.titulo,
      titulo_tela: corte.titulo_tela,
      gancho: corte.gancho,
      motivo: corte.motivo,
      descricao: corte.descricao,
      score: Math.round(corte.score),
      notas: corte.notas,
      // O formato escolhido pela IA fica gravado no corte: é o que o
      // Estúdio mostra e o que a reedição usa como ponto de partida.
      estilo: corte.formato,
      motivo_formato: corte.motivoFormato || null,
      status,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Não registrei o corte: ${error.message}`);
  return data.id as string;
}

export type CorteAprovado = {
  id: string;
  ordem: number;
  inicio_s: number;
  fim_s: number;
  /** Estilo escolhido na reedição; nulo herda o da análise. */
  estilo: string | null;
  titulo_tela: string | null;
};

/** Cortes que o dono aprovou no Estúdio e ainda não foram renderizados. */
export async function lerCortesAprovados(
  analiseId: string,
): Promise<CorteAprovado[]> {
  const { data, error } = await supabase()
    .from("cortes")
    .select("id, ordem, inicio_s, fim_s, estilo, titulo_tela")
    .eq("analise_id", analiseId)
    .eq("status", "aprovado")
    .order("ordem", { ascending: true });

  if (error) throw new Error(`Não li os cortes aprovados: ${error.message}`);
  return (data ?? []).map((c) => ({
    id: c.id as string,
    ordem: c.ordem as number,
    inicio_s: Number(c.inicio_s),
    fim_s: Number(c.fim_s),
    estilo: (c.estilo as string | null) ?? null,
    titulo_tela: (c.titulo_tela as string | null) ?? null,
  }));
}

export async function marcarCorteRenderizando(corteId: string): Promise<void> {
  await supabase()
    .from("cortes")
    .update({ status: "renderizando" })
    .eq("id", corteId);
}

export async function subirVideoDoCorte(
  corteId: string,
  analiseId: string,
  userId: string,
  arquivoLocal: string,
): Promise<void> {
  const caminho = `${userId}/${analiseId}/${corteId}.mp4`;
  const bytes = await fs.readFile(arquivoLocal);

  const { error: erroUpload } = await supabase()
    .storage.from("cortes")
    .upload(caminho, bytes, { contentType: "video/mp4", upsert: true });

  if (erroUpload) throw new Error(`Upload falhou: ${erroUpload.message}`);

  const { error } = await supabase()
    .from("cortes")
    .update({
      status: "pronto",
      arquivo: caminho,
      // Vira o ?v= da URL pública — fura o cache do navegador na reedição.
      renderizado_em: new Date().toISOString(),
    })
    .eq("id", corteId);

  if (error) throw new Error(`Não marquei o corte como pronto: ${error.message}`);
}

export async function falharCorte(corteId: string): Promise<void> {
  await supabase().from("cortes").update({ status: "erro" }).eq("id", corteId);
}
