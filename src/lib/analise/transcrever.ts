import fs from "node:fs";
import Groq from "groq-sdk";
import { exigir } from "../env";

export type Transcricao = {
  texto: string;
  idioma: string | null;
  trechos: { inicio_s: number; fim_s: number; texto: string }[];
};

type VerboseJson = {
  text?: string;
  language?: string;
  segments?: { start?: number; end?: number; text?: string }[];
};

let cliente: Groq | null = null;
function groq() {
  cliente ??= new Groq({ apiKey: exigir("GROQ_API_KEY") });
  return cliente;
}

/**
 * Transcreve o áudio com Whisper via Groq.
 *
 * `whisper-large-v3-turbo` é a escolha por custo/velocidade: transcreve
 * 30 segundos de áudio em menos de um segundo por centavos de dólar.
 * Não fixamos idioma — o modelo detecta, e o produto precisa aceitar vídeo
 * em inglês (boa parte das referências virais vem de fora).
 */
export async function transcrever(caminhoAudio: string): Promise<Transcricao> {
  const resposta = (await groq().audio.transcriptions.create({
    file: fs.createReadStream(caminhoAudio),
    model: "whisper-large-v3-turbo",
    response_format: "verbose_json",
  })) as unknown as VerboseJson;

  const trechos = (resposta.segments ?? []).map((s) => ({
    inicio_s: Math.round((s.start ?? 0) * 10) / 10,
    fim_s: Math.round((s.end ?? 0) * 10) / 10,
    texto: (s.text ?? "").trim(),
  }));

  return {
    texto: (resposta.text ?? "").trim(),
    idioma: resposta.language ?? null,
    trechos,
  };
}

/** Formata a transcrição com timestamps para entrar no prompt do Claude. */
export function transcricaoParaTexto(t: Transcricao): string {
  if (!t.texto) {
    return "(Sem fala detectada — o vídeo pode ser só música, ambiente ou texto na tela.)";
  }
  if (t.trechos.length === 0) return t.texto;

  return t.trechos
    .map((s) => `[${s.inicio_s.toFixed(1)}s] ${s.texto}`)
    .join("\n");
}
