/**
 * Verifica o proxy: leve o bastante pra trafegar, fiel o bastante pra editar.
 *
 * As três perguntas que importam pro editor não-destrutivo:
 *   1. Encolheu de verdade? (senão não resolve o problema de banda)
 *   2. A DURAÇÃO sobreviveu? (o editor marca tempo no proxy e o render aplica
 *      esse tempo no ORIGINAL — meio segundo de deriva já corta a fala)
 *   3. Os keyframes ficaram frequentes? (é o que faz o arrastar da alça
 *      responder em vez de travar)
 *
 * O upload fica de fora de propósito: depende de rede e de credencial do
 * Supabase, e o que pode dar errado nele não é código nosso.
 *
 *   npx tsx worker/testar-proxy.ts
 */
import path from "node:path";
import fs from "node:fs/promises";
import { run, bin } from "../src/lib/proc";
import { duracaoDoArquivo } from "../src/lib/analise/midia";
import { gerarProxy } from "./proxy";

const DUR = 10;

/**
 * Fonte sintético em 720p.
 *
 * testsrc2 porque ele é visualmente ocupado (padrões em movimento, ruído):
 * uma tela lisa comprimiria pra quase nada e o teste do "3x menor" passaria
 * sem provar nada.
 */
async function fonte(dir: string): Promise<string> {
  const arq = path.join(dir, "fonte.mp4");
  await run(
    bin.ffmpeg(),
    [
      "-f", "lavfi", "-i", `testsrc2=size=1280x720:rate=30:duration=${DUR}`,
      "-f", "lavfi", "-i", `sine=frequency=440:duration=${DUR}`,
      "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-ac", "2", "-shortest", "-y", arq,
    ],
    { timeoutMs: 120_000 },
  );
  return arq;
}

async function altura(arq: string): Promise<number> {
  const saida = await run(
    bin.ffprobe(),
    ["-v", "error", "-select_streams", "v:0", "-show_entries",
     "stream=height", "-of", "csv=p=0", arq],
    { timeoutMs: 20_000 },
  );
  return Number(saida.trim());
}

/** Maior buraco entre keyframes, em segundos — é o pior caso de um seek. */
async function maiorGapKeyframe(arq: string): Promise<number> {
  const saida = await run(
    bin.ffprobe(),
    ["-v", "error", "-select_streams", "v:0", "-show_entries",
     "packet=pts_time,flags", "-of", "csv=p=0", arq],
    { timeoutMs: 60_000 },
  );

  const tempos = saida
    .trim()
    .split("\n")
    .map((l) => l.trim().split(","))
    // O flag "K" marca keyframe; é nele que o decodificador consegue entrar.
    .filter((c) => c.length >= 2 && c[1].includes("K"))
    .map((c) => Number(c[0]))
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);

  if (tempos.length < 2) return Number.POSITIVE_INFINITY;
  let maior = 0;
  for (let i = 1; i < tempos.length; i++) {
    maior = Math.max(maior, tempos[i] - tempos[i - 1]);
  }
  return maior;
}

async function main() {
  const dir = path.join(process.cwd(), "saidas", "proxy");
  await fs.mkdir(dir, { recursive: true });

  console.log("gerando fonte sintético 1280x720...");
  const original = await fonte(dir);

  const t0 = Date.now();
  const proxy = await gerarProxy(original, dir);
  const segundos = (Date.now() - t0) / 1000;

  const [alturaFonte, alturaProxy] = await Promise.all([
    altura(original),
    altura(proxy),
  ]);
  const [durFonte, durProxy] = await Promise.all([
    duracaoDoArquivo(original),
    duracaoDoArquivo(proxy),
  ]);
  const [bytesFonte, bytesProxy] = await Promise.all([
    fs.stat(original).then((s) => s.size),
    fs.stat(proxy).then((s) => s.size),
  ]);

  const reducao = bytesFonte / bytesProxy;
  const deriva = Math.abs(durProxy - durFonte);
  const gap = await maiorGapKeyframe(proxy);

  const checagens: { nome: string; ok: boolean; detalhe: string }[] = [
    {
      nome: "altura <= 480",
      ok: alturaProxy <= 480 && alturaProxy > 0,
      detalhe: `${alturaFonte}px → ${alturaProxy}px`,
    },
    {
      nome: "duração preservada (±0.5s)",
      ok: deriva <= 0.5,
      detalhe: `${durFonte.toFixed(2)}s → ${durProxy.toFixed(2)}s (deriva ${deriva.toFixed(3)}s)`,
    },
    {
      nome: "pelo menos 3x menor",
      ok: reducao >= 3,
      detalhe:
        `${(bytesFonte / 1024).toFixed(0)} KB → ${(bytesProxy / 1024).toFixed(0)} KB ` +
        `(${reducao.toFixed(1)}x menor)`,
    },
    {
      nome: "keyframe a cada ~1s",
      ok: gap <= 2,
      detalhe: `maior buraco entre keyframes: ${gap.toFixed(2)}s`,
    },
  ];

  console.log(`\nproxy gerado em ${segundos.toFixed(1)}s\n`);
  let falhas = 0;
  for (const c of checagens) {
    if (!c.ok) falhas += 1;
    console.log(`${c.ok ? "ok  " : "ERRO"} ${c.nome.padEnd(28)} ${c.detalhe}`);
  }

  console.log(`\narquivos em ${dir}`);
  if (falhas > 0) {
    console.log(`\n${falhas} falha(s).`);
    process.exit(1);
  }
  console.log("\nProxy leve, com a duração intacta e buscável.");
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
