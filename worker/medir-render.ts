/**
 * Mede o custo de cada parte do render, pra atacar o gargalo certo.
 *
 *   npx tsx worker/medir-render.ts
 *
 * Um corte estava levando de 3 a 6 minutos na VPS — e ela ficava sem CPU até
 * pra aceitar SSH. Antes de otimizar no escuro, isto separa: quanto custa o
 * desfoque do enquadramento "ajustar", e quanto custa o preset do x264.
 */
import path from "node:path";
import fs from "node:fs/promises";
import { run, bin } from "../src/lib/proc";

const DUR = 20;
const dir = path.join(process.cwd(), "saidas", "medicao");

const CROP = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920";

/** Como era: desfoque no tamanho cheio. */
const BLUR_ANTIGO =
  `split=2[bg][fg];[bg]${CROP},gblur=sigma=28,` +
  `eq=brightness=-0.16:saturation=1.15[bgb];` +
  `[fg]scale=1080:-2[fgs];[bgb][fgs]overlay=(W-w)/2:(H-h)/2`;

/** Como ficou: desfoque em miniatura, ampliado de volta. */
const BLUR_NOVO =
  `split=2[bg][fg];[bg]${CROP},scale=120:214,gblur=sigma=4,scale=1080:1920,` +
  `eq=brightness=-0.16:saturation=1.15[bgb];` +
  `[fg]scale=1080:-2[fgs];[bgb][fgs]overlay=(W-w)/2:(H-h)/2`;

async function fonte(): Promise<string> {
  const arq = path.join(dir, "_fonte.mp4");
  // testsrc2 tem detalhe em movimento no quadro inteiro: é o pior caso pro
  // encoder, então a medição não sai otimista.
  await run(
    bin.ffmpeg(),
    [
      "-f", "lavfi", "-i", `testsrc2=s=1280x720:r=30:d=${DUR}`,
      "-f", "lavfi", "-i", `sine=f=440:d=${DUR}`,
      "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-shortest", "-y", arq,
    ],
    { timeoutMs: 120_000 },
  );
  return arq;
}

async function medir(
  nome: string,
  entrada: string,
  filtro: string,
  preset: string,
): Promise<number> {
  const saida = path.join(dir, `${nome}.mp4`);
  const t0 = Date.now();
  await run(
    bin.ffmpeg(),
    [
      "-i", entrada,
      "-vf", filtro,
      "-r", "30",
      "-c:v", "libx264",
      "-preset", preset,
      "-crf", "21",
      "-c:a", "aac", "-b:a", "128k",
      "-y", saida,
    ],
    { timeoutMs: 15 * 60_000 },
  );
  const s = (Date.now() - t0) / 1000;
  const bytes = (await fs.stat(saida)).size;
  console.log(
    `${nome.padEnd(28)} ${s.toFixed(1).padStart(6)}s  ` +
      `${(DUR / s).toFixed(2).padStart(5)}x tempo real  ` +
      `${Math.round(bytes / 1024)} KB`,
  );
  return s;
}

async function main() {
  await fs.mkdir(dir, { recursive: true });
  const entrada = await fonte();
  console.log(`clipe de ${DUR}s, saída 1080x1920@30\n`);

  const base = await medir("crop + fast", entrada, CROP, "fast");
  const antigo = await medir("blur antigo + fast", entrada, BLUR_ANTIGO, "fast");
  const novo = await medir("blur novo + fast", entrada, BLUR_NOVO, "fast");
  const novoVf = await medir("blur novo + veryfast", entrada, BLUR_NOVO, "veryfast");
  const cropVf = await medir("crop + veryfast", entrada, CROP, "veryfast");

  console.log("\n--- o que cada mudança rende ---");
  console.log(`desfoque no tamanho cheio custava  ${(antigo - base).toFixed(1)}s`);
  console.log(`desfoque em miniatura custa        ${(novo - base).toFixed(1)}s`);
  console.log(`ganho só do desfoque               ${(((antigo - novo) / antigo) * 100).toFixed(0)}%`);
  console.log(`ganho fast -> veryfast (com blur)  ${(((novo - novoVf) / novo) * 100).toFixed(0)}%`);
  console.log(`ganho fast -> veryfast (só crop)   ${(((base - cropVf) / base) * 100).toFixed(0)}%`);
  console.log(`total antigo -> novo+veryfast      ${(((antigo - novoVf) / antigo) * 100).toFixed(0)}%`);
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
