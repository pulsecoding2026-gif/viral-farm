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
      gancho: corte.gancho,
      motivo: corte.motivo,
      score: Math.round(corte.score),
    })
    .select("id")
    .single();

  if (error) throw new Error(`Não registrei o corte: ${error.message}`);
  return data.id as string;
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
    .update({ status: "pronto", arquivo: caminho })
    .eq("id", corteId);

  if (error) throw new Error(`Não marquei o corte como pronto: ${error.message}`);
}

export async function falharCorte(corteId: string): Promise<void> {
  await supabase().from("cortes").update({ status: "erro" }).eq("id", corteId);
}
