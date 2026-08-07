/**
 * Renderiza uma amostra do MESMO trecho em vários formatos, pra comparar o
 * resultado lado a lado — e verifica que a legenda respeita a safe zone.
 *
 *   npx tsx worker/testar-formatos.ts
 */
import path from "node:path";
import fs from "node:fs/promises";
import { renderizarCorte } from "./renderizar";
import { gerarAss } from "./legendas";
import { acharFormato, SAFE_ZONE } from "../src/lib/formatos";
import type { Palavra } from "./transcritor";
import { run, bin } from "../src/lib/proc";

const FRASE =
  "eu perdi 5 contratações porque não entendi as 3 regras do jogo e isso custou caro";

const AMOSTRA = ["hormozi", "podcast-premium", "dark-luxury", "hype-challenge"];

function palavras(inicio: number, fim: number): Palavra[] {
  const p = FRASE.split(" ");
  const passo = (fim - inicio) / p.length;
  return p.map((texto, i) => ({
    texto,
    inicio_s: inicio + i * passo,
    fim_s: inicio + (i + 1) * passo - 0.02,
  }));
}

async function gerarFonte(dir: string): Promise<string> {
  const arquivo = path.join(dir, "fonte-formatos.mp4");
  await run(
    bin.ffmpeg(),
    [
      "-f", "lavfi", "-i", "color=c=0x1a1a2e:size=1280x720:rate=30:duration=8",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=8",
      "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-shortest", "-y", arquivo,
    ],
    { timeoutMs: 60_000 },
  );
  return arquivo;
}

/**
 * A verificação que importa: nenhuma coordenada \pos pode cair dentro do
 * rail direito das plataformas. Se cair, a legenda fica atrás dos botões.
 */
function verificarSafeZone(ass: string, formatoId: string): string {
  const LARGURA = 1080;
  const limiteDireito =
    LARGURA * (1 - SAFE_ZONE.railDireita.larguraPct / 100);
  const posicoes = [...ass.matchAll(/\\pos\((\d+),(\d+)\)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }));
  if (posicoes.length === 0) return `${formatoId}: sem \\pos (nada a checar)`;

  const invasores = posicoes.filter((p) => p.x > limiteDireito);
  const yMin = Math.min(...posicoes.map((p) => p.y));
  const yMax = Math.max(...posicoes.map((p) => p.y));
  const yOk =
    yMin >= 1920 * (SAFE_ZONE.areaUtil.yPct[0] / 100) &&
    yMax <= 1920 * (SAFE_ZONE.areaUtil.yPct[1] / 100);

  return (
    `${formatoId}: âncora x=${posicoes[0].x} (limite ${Math.round(limiteDireito)}) ` +
    `y=${yMin}-${yMax} | rail: ${invasores.length === 0 ? "OK" : "INVADIU"} ` +
    `| vertical: ${yOk ? "OK" : "FORA"}`
  );
}

async function main() {
  const dir = path.join(process.cwd(), "saidas", "formatos");
  await fs.mkdir(dir, { recursive: true });
  const fonte = await gerarFonte(dir);

  const corte = { inicio_s: 0.2, fim_s: 7.2 };
  const p = palavras(corte.inicio_s, corte.fim_s);

  console.log("Safe zone:", SAFE_ZONE.areaUtil.xPct, SAFE_ZONE.areaUtil.yPct, "\n");

  for (const id of AMOSTRA) {
    const f = acharFormato(id);
    const ass = gerarAss(p, corte.inicio_s, id, f.nome);
    console.log(verificarSafeZone(ass ?? "", id));

    const t0 = Date.now();
    await renderizarCorte(fonte, corte, p, dir, id, {
      estilo: id,
      tituloTela: f.nome,
    });
    // Frame do meio pra inspeção visual.
    await run(
      bin.ffmpeg(),
      ["-ss", "3.5", "-i", path.join(dir, `${id}.mp4`), "-frames:v", "1", "-y",
       path.join(dir, `${id}.png`)],
      { timeoutMs: 30_000 },
    );
    console.log(`   render ${((Date.now() - t0) / 1000).toFixed(1)}s → ${id}.png`);
  }

  console.log(`\nframes em ${dir}`);
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
