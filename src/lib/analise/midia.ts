import path from "node:path";
import fs from "node:fs/promises";
import { run, bin } from "../proc";
import { env } from "../env";

export type Frame = {
  segundo: number;
  base64: string;
};

/**
 * Extrai N frames distribuídos ao longo do vídeo.
 *
 * Os pontos não são uniformes de propósito: os primeiros 3 segundos decidem a
 * retenção do vídeo curto, então concentramos mais amostras no começo. Metade
 * dos frames sai dos primeiros 25% do vídeo, o resto se espalha pelo restante.
 */
export function pontosDeAmostragem(duracao: number, qtd: number): number[] {
  if (qtd <= 1) return [0];

  const inicio = Math.max(1, Math.floor(qtd / 2));
  const resto = qtd - inicio;
  const corte = duracao * 0.25;

  const pontos: number[] = [];

  for (let i = 0; i < inicio; i++) {
    pontos.push((corte * i) / inicio);
  }
  for (let i = 0; i < resto; i++) {
    pontos.push(corte + ((duracao - corte) * i) / resto);
  }

  // Nunca pedir o último frame exato — costuma cair depois do fim e falhar.
  const limite = Math.max(0, duracao - 0.2);
  return pontos.map((p) => Math.min(Math.round(p * 10) / 10, limite));
}

export async function duracaoDoArquivo(video: string): Promise<number> {
  const saida = await run(
    bin.ffprobe(),
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      video,
    ],
    { timeoutMs: 30_000 },
  );

  const d = Number.parseFloat(saida.trim());
  if (!Number.isFinite(d) || d <= 0) {
    throw new Error("Não consegui medir a duração do arquivo baixado.");
  }
  return d;
}

export async function extrairFrames(
  video: string,
  dir: string,
): Promise<Frame[]> {
  const { QTD_FRAMES, FRAME_MAX_PX } = env();
  const duracao = await duracaoDoArquivo(video);
  const pontos = pontosDeAmostragem(duracao, QTD_FRAMES);

  const frames: Frame[] = [];

  for (const [i, segundo] of pontos.entries()) {
    const destino = path.join(dir, `frame-${String(i).padStart(2, "0")}.jpg`);

    await run(
      bin.ffmpeg(),
      [
        // -ss antes do -i faz seek rápido (keyframe) em vez de decodificar
        // o vídeo inteiro até o ponto. Para amostragem isso basta.
        "-ss",
        String(segundo),
        "-i",
        video,
        "-frames:v",
        "1",
        "-vf",
        // Encaixa dentro de uma caixa MAX x MAX preservando proporção.
        // Vertical 1080x1920 vira 288x512; horizontal vira 512x288.
        `scale=w=${FRAME_MAX_PX}:h=${FRAME_MAX_PX}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
        "-q:v",
        "4",
        "-y",
        destino,
      ],
      { timeoutMs: 60_000 },
    );

    const bytes = await fs.readFile(destino);
    frames.push({ segundo, base64: bytes.toString("base64") });
  }

  if (frames.length === 0) {
    throw new Error("Não consegui extrair nenhum frame do vídeo.");
  }

  return frames;
}

/**
 * Extrai a trilha de áudio em mono 16kHz — formato que o Whisper espera.
 * Mais que isso é desperdício de upload e não melhora a transcrição.
 */
export async function extrairAudio(video: string, dir: string): Promise<string> {
  const destino = path.join(dir, "audio.mp3");

  await run(
    bin.ffmpeg(),
    [
      "-i",
      video,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-b:a",
      "64k",
      "-y",
      destino,
    ],
    { timeoutMs: 2 * 60_000 },
  );

  return destino;
}
