/**
 * A legenda sofre com o zoom do vídeo?
 *
 *   npx tsx worker/testar-camada-legenda.ts
 *
 * A ordem CORRETA de composição é: recorta e amplia o vídeo primeiro, e só
 * então desenha a legenda por cima. Se a legenda entrasse antes do zoom, ela
 * seria ampliada junto — o texto cresceria, sairia do quadro e a safe zone
 * deixaria de valer.
 *
 * O jeito de provar sem olho humano: renderizar o MESMO texto com zoom 1 e
 * com zoom 2,5 e comparar a CAIXA DE PIXELS que o texto ocupa. Se a legenda
 * estiver na camada certa, as duas caixas são idênticas ao pixel — só o
 * fundo muda.
 */
import path from "node:path";
import fs from "node:fs/promises";
import { run, runBinario, bin } from "../src/lib/proc";
import { planejarRender, argumentosDeRender } from "./render-projeto";
import { gerarAss } from "./legendas";
import {
  ENQUADRAMENTO_PADRAO,
  projetoVazio,
  trilhaDe,
  type ItemVideo,
  type Projeto,
} from "../src/lib/editor/projeto";
import type { Palavra } from "./transcritor";

const dir = path.join(process.cwd(), "saidas", "camada-legenda");
const DUR = 4;
let falhas = 0;

function conferir(nome: string, ok: boolean, detalhe = "") {
  console.log(`${ok ? "ok  " : "ERRO"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  if (!ok) falhas += 1;
}

function palavras(): Palavra[] {
  const p = "ESTA LEGENDA NAO PODE CRESCER".split(" ");
  const passo = DUR / p.length;
  return p.map((texto, i) => ({
    texto,
    inicio_s: i * passo,
    fim_s: (i + 1) * passo - 0.02,
  }));
}

function clipe(zoom: number): ItemVideo {
  return {
    id: "a",
    tipo: "video",
    inicio_s: 0,
    fim_s: DUR,
    fonteInicio_s: 0,
    fonteFim_s: DUR,
    enquadramento: { ...ENQUADRAMENTO_PADRAO, zoom },
    keyframes: [],
    volume: 1,
    efeitos: [],
    transicao: null,
  };
}

/**
 * Caixa que os pixels CLAROS ocupam no frame.
 *
 * O fundo do teste é escuro e a legenda é branca com contorno preto, então
 * "claro" isola o texto. Lê em cinza cru — 1 byte por pixel, sem decodificar
 * PNG.
 */
async function caixaDoTexto(mp4: string): Promise<{
  x0: number; x1: number; y0: number; y1: number; largura: number; altura: number;
}> {
  const L = 270;
  const A = 480;
  const buf = await runBinario(
    bin.ffmpeg(),
    ["-ss", "2", "-i", mp4, "-frames:v", "1",
     "-vf", `scale=${L}:${A}`, "-pix_fmt", "gray", "-f", "rawvideo", "-"],
    { timeoutMs: 60_000 },
  );

  let x0 = L, x1 = -1, y0 = A, y1 = -1;
  for (let y = 0; y < A; y++) {
    for (let x = 0; x < L; x++) {
      // 200 de 255: pega o miolo branco da letra e ignora o contorno preto
      // e qualquer meio-tom do fundo.
      if (buf[y * L + x] > 200) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0, x1, y0, y1, largura: x1 - x0, altura: y1 - y0 };
}

async function renderizar(nome: string, zoom: number, fonte: string): Promise<string> {
  const p: Projeto = projetoVazio({
    corteId: "x", analiseId: "y", proxyUrl: null, duracao_s: DUR,
  });
  trilhaDe(p, "video").itens.push(clipe(zoom));

  const ass = gerarAss(palavras(), 0, "hormozi");
  const nomeAss = "legenda.ass";
  await fs.writeFile(path.join(dir, nomeAss), ass ?? "", "utf-8");

  const plano = planejarRender(p, { largura: 1280, altura: 720 }, nomeAss);
  const saida = path.join(dir, `${nome}.mp4`);
  await run(bin.ffmpeg(), argumentosDeRender(fonte, plano, saida), {
    timeoutMs: 5 * 60_000,
    cwd: dir,
  });
  return saida;
}

async function main() {
  await fs.mkdir(dir, { recursive: true });

  // Fundo com detalhe pra o zoom ser visível, mas ESCURO pra não competir
  // com o branco da legenda na medição.
  const fonte = path.join(dir, "_fonte.mp4");
  await run(
    bin.ffmpeg(),
    ["-f", "lavfi", "-i", `testsrc2=s=1280x720:r=30:d=${DUR}`,
     "-f", "lavfi", "-i", `sine=f=440:d=${DUR}`,
     "-vf", "eq=brightness=-0.45:saturation=0.3",
     "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
     "-c:a", "aac", "-shortest", "-y", fonte],
    { timeoutMs: 120_000 },
  );

  const semZoom = await caixaDoTexto(await renderizar("zoom-1", 1, fonte));
  const comZoom = await caixaDoTexto(await renderizar("zoom-2.5", 2.5, fonte));

  console.log(`zoom 1,0: texto ocupa ${semZoom.largura}x${semZoom.altura}px em (${semZoom.x0},${semZoom.y0})`);
  console.log(`zoom 2,5: texto ocupa ${comZoom.largura}x${comZoom.altura}px em (${comZoom.x0},${comZoom.y0})`);
  console.log();

  conferir("achou texto nos dois frames", semZoom.largura > 10 && comZoom.largura > 10);
  // Tolerância de 2px cobre arredondamento do reescalonamento da medição.
  conferir(
    "a LARGURA do texto não muda com o zoom",
    Math.abs(semZoom.largura - comZoom.largura) <= 2,
    `${semZoom.largura} vs ${comZoom.largura}`,
  );
  conferir(
    "a ALTURA do texto não muda com o zoom",
    Math.abs(semZoom.altura - comZoom.altura) <= 2,
    `${semZoom.altura} vs ${comZoom.altura}`,
  );
  conferir(
    "a POSIÇÃO do texto não muda com o zoom",
    Math.abs(semZoom.x0 - comZoom.x0) <= 2 && Math.abs(semZoom.y0 - comZoom.y0) <= 2,
    `(${semZoom.x0},${semZoom.y0}) vs (${comZoom.x0},${comZoom.y0})`,
  );

  console.log();
  if (falhas > 0) {
    console.log(`${falhas} falha(s) — a legenda ESTÁ sofrendo com o zoom.`);
    process.exit(1);
  }
  console.log("A legenda é desenhada DEPOIS do recorte: zoom no vídeo não a afeta.");
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
