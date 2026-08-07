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
import { acharFormato, FORMATOS, SAFE_ZONE } from "../src/lib/formatos";
import type { Palavra } from "./transcritor";
import { run, bin } from "../src/lib/proc";

const FRASE =
  "eu perdi 5 contratações porque não entendi as 3 regras do jogo e isso custou caro";

/** Marcadas pra ver a cor de destaque de cada preset, não só a tipografia. */
const DESTAQUES = ["contratações", "regras", "custou"];

/** Todos: verificar amostra não responde se os OUTROS estão certos. */
const AMOSTRA = FORMATOS.map((f) => f.id);

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

  const frames: string[] = [];

  for (const id of AMOSTRA) {
    const f = acharFormato(id);
    const ass = gerarAss(p, corte.inicio_s, id, f.nome, DESTAQUES);
    console.log(verificarSafeZone(ass ?? "", id));

    const t0 = Date.now();
    await renderizarCorte(fonte, corte, p, dir, id, {
      estilo: id,
      tituloTela: f.nome,
      destaques: DESTAQUES,
    });
    const png = path.join(dir, `${id}.png`);
    // Frame do meio pra inspeção visual.
    await run(
      bin.ffmpeg(),
      ["-ss", "3.5", "-i", path.join(dir, `${id}.mp4`), "-frames:v", "1", "-y", png],
      { timeoutMs: 30_000 },
    );
    frames.push(png);
    console.log(`   render ${((Date.now() - t0) / 1000).toFixed(1)}s → ${id}.png`);
  }

  // Folha de contato: 15 imagens soltas não dá pra comparar. Lado a lado,
  // um preset que saiu igual ao vizinho salta aos olhos.
  const colunas = 5;
  const linhas = Math.ceil(frames.length / colunas);
  const contato = path.join(dir, "todos.png");
  await run(
    bin.ffmpeg(),
    [
      ...frames.flatMap((f) => ["-i", f]),
      "-filter_complex",
      `${frames.map((_, i) => `[${i}:v]scale=300:-1[v${i}]`).join(";")};` +
        `${frames.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${frames.length}:` +
        `layout=${frames
          .map((_, i) => `${(i % colunas) === 0 ? "0" : `w0*${i % colunas}`}_${Math.floor(i / colunas) === 0 ? "0" : `h0*${Math.floor(i / colunas)}`}`)
          .join("|")}[out]`,
      "-map", "[out]", "-y", contato,
    ],
    { timeoutMs: 120_000 },
  );

  console.log(`\n${frames.length} frames + folha de contato (${colunas}x${linhas}) em ${dir}`);
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
