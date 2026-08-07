import path from "node:path";
import fs from "node:fs/promises";
import { run, bin } from "../src/lib/proc";
import { gerarAss, type EstiloLegenda } from "./legendas";
import type { Palavra } from "./transcritor";

/**
 * Renderização de um corte: recorta a janela de tempo, converte pra 9:16
 * (1080x1920) com crop central e queima a legenda animada. Um comando de
 * FFmpeg só — sem arquivo intermediário.
 *
 * Crop central é decisão de MVP consciente: a v2 troca o centro fixo por
 * trajetória guiada por detecção de rosto. O filtro já isola essa etapa.
 */

export async function renderizarCorte(
  videoFonte: string,
  corte: { inicio_s: number; fim_s: number },
  palavrasDoCorte: Palavra[],
  dir: string,
  nome: string,
  estilo: EstiloLegenda = "karaoke",
): Promise<string> {
  const nomeAss = `${nome}.ass`;
  const saida = path.join(dir, `${nome}.mp4`);

  const ass = gerarAss(palavrasDoCorte, corte.inicio_s, estilo);
  if (ass !== null) {
    await fs.writeFile(path.join(dir, nomeAss), ass, "utf-8");
  }

  const duracao = corte.fim_s - corte.inicio_s;

  const filtro = [
    // Cobre 1080x1920 sem distorcer e apara a sobra: é o "cover" do CSS.
    "scale=1080:1920:force_original_aspect_ratio=increase",
    "crop=1080:1920",
    // Nome relativo + cwd no run(): caminho absoluto do Windows tem "C:",
    // o parser de filtro divide no ":" e nenhum escape é portátil.
    ...(ass !== null ? [`ass=${nomeAss}`] : []),
  ].join(",");

  await run(
    bin.ffmpeg(),
    [
      // -ss antes do -i: seek por keyframe (rápido); o re-encode garante o
      // primeiro frame exato mesmo assim.
      "-ss", corte.inicio_s.toFixed(2),
      "-t", duracao.toFixed(2),
      "-i", videoFonte,
      "-vf", filtro,
      "-r", "30",
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "21",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-y", saida,
    ],
    { timeoutMs: 10 * 60_000, cwd: dir },
  );

  return saida;
}

/** Palavras da transcrição que caem dentro da janela do corte. */
export function palavrasNaJanela(
  palavras: Palavra[],
  corte: { inicio_s: number; fim_s: number },
): Palavra[] {
  return palavras.filter(
    (p) => p.inicio_s >= corte.inicio_s - 0.2 && p.fim_s <= corte.fim_s + 0.2,
  );
}
