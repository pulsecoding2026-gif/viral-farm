/**
 * Verifica a escolha de enquadramento e o grafo de filtros.
 *
 * Duas perguntas independentes:
 *   1. A medição DISCRIMINA? Cena com conteúdo nas bordas tem que escolher
 *      "ajustar"; cena concentrada no centro tem que escolher "preencher".
 *   2. Os dois grafos RODAM e saem 1080x1920? O "ajustar" usa split e pads
 *      nomeados, que é onde o ffmpeg costuma reclamar.
 *
 *   npx tsx worker/testar-enquadramento.ts
 */
import path from "node:path";
import fs from "node:fs/promises";
import { run, bin } from "../src/lib/proc";
import { renderizarCorte } from "./renderizar";
import {
  medirQuadro,
  decidirEnquadramento,
  ehVertical,
  type Enquadramento,
} from "./enquadramento";
import type { Palavra } from "./transcritor";

const DUR = 6;

/** Fala sintética só pra existir legenda por cima do enquadramento. */
function palavras(): Palavra[] {
  const texto = "olha isso aqui na tela agora e presta muita atencao".split(" ");
  const passo = DUR / texto.length;
  return texto.map((t, i) => ({
    texto: t,
    inicio_s: i * passo,
    fim_s: (i + 1) * passo - 0.03,
  }));
}

/**
 * Cena COM conteúdo nas bordas: barras verticais brilhantes cobrindo toda a
 * largura, incluindo as faixas que o crop 9:16 descartaria. É o análogo de
 * uma frase escrita ocupando a tela.
 */
async function fonteBordas(dir: string): Promise<string> {
  const arq = path.join(dir, "fonte-bordas.mp4");
  const barras = Array.from({ length: 16 }, (_, i) =>
    `drawbox=x=${i * 80 + 10}:y=200:w=44:h=320:color=white@0.95:t=fill`,
  ).join(",");
  await run(
    bin.ffmpeg(),
    [
      "-f", "lavfi", "-i", `color=c=0x0a0a12:size=1280x720:rate=30:duration=${DUR}`,
      "-f", "lavfi", "-i", `sine=frequency=330:duration=${DUR}`,
      "-vf", barras,
      "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-shortest", "-y", arq,
    ],
    { timeoutMs: 90_000 },
  );
  return arq;
}

/**
 * Cena concentrada no CENTRO: um bloco no meio, laterais lisas. É o análogo
 * de um close — o crop aproxima e não perde nada.
 */
async function fonteCentro(dir: string): Promise<string> {
  const arq = path.join(dir, "fonte-centro.mp4");
  await run(
    bin.ffmpeg(),
    [
      "-f", "lavfi", "-i", `color=c=0x0a0a12:size=1280x720:rate=30:duration=${DUR}`,
      "-f", "lavfi", "-i", `sine=frequency=330:duration=${DUR}`,
      // 1280*0.22 = 282px de cada lado é o que o crop descarta. O bloco vive
      // inteiro dentro da faixa preservada.
      "-vf", "drawbox=x=430:y=180:w=420:h=360:color=white@0.95:t=fill",
      "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-shortest", "-y", arq,
    ],
    { timeoutMs: 90_000 },
  );
  return arq;
}

async function dimensoes(arq: string): Promise<string> {
  const saida = await run(
    bin.ffprobe(),
    ["-v", "error", "-select_streams", "v:0", "-show_entries",
     "stream=width,height", "-of", "csv=p=0", arq],
    { timeoutMs: 20_000 },
  );
  return saida.trim();
}

async function main() {
  const dir = path.join(process.cwd(), "saidas", "enquadramento");
  await fs.mkdir(dir, { recursive: true });

  const casos: { nome: string; fonte: string; esperado: Enquadramento }[] = [
    { nome: "conteudo nas bordas", fonte: await fonteBordas(dir), esperado: "ajustar" },
    { nome: "conteudo no centro", fonte: await fonteCentro(dir), esperado: "preencher" },
  ];

  let falhas = 0;

  console.log("=== 1. A medição discrimina? ===\n");
  for (const c of casos) {
    const vertical = await ehVertical(c.fonte);
    const m = await medirQuadro(c.fonte, 0.2, DUR - 0.2);
    const { enquadramento, motivo } = decidirEnquadramento(m);
    const ok = enquadramento === c.esperado;
    if (!ok) falhas += 1;

    console.log(
      `${ok ? "ok  " : "ERRO"} ${c.nome.padEnd(22)} → ${enquadramento.padEnd(10)} ` +
        `(esperado ${c.esperado})`,
    );
    console.log(
      `     laterais=${m.laterais.toFixed(1)} centro=${m.centro.toFixed(1)} ` +
        `razao=${m.razao.toFixed(2)} frames=${m.frames} vertical=${vertical}`,
    );
    console.log(`     ${motivo}\n`);
  }

  console.log("=== 2. Os dois grafos rodam e saem 1080x1920? ===\n");
  const p = palavras();
  for (const enq of ["preencher", "ajustar"] as Enquadramento[]) {
    for (const c of casos) {
      const nome = `${enq}-${c.nome.replace(/\s+/g, "-")}`;
      try {
        const t0 = Date.now();
        const mp4 = await renderizarCorte(
          c.fonte, { inicio_s: 0.2, fim_s: DUR - 0.2 }, p, dir, nome,
          { enquadramento: enq, estilo: "hormozi", tituloTela: "ESTE ANO" },
        );
        const dim = await dimensoes(mp4);
        const certo = dim === "1080,1920";
        if (!certo) falhas += 1;
        console.log(
          `${certo ? "ok  " : "ERRO"} ${nome.padEnd(34)} ${dim} ` +
            `em ${((Date.now() - t0) / 1000).toFixed(1)}s`,
        );
        // Frame do meio pra inspeção visual.
        await run(
          bin.ffmpeg(),
          ["-ss", "2.5", "-i", mp4, "-frames:v", "1", "-y",
           path.join(dir, `${nome}.png`)],
          { timeoutMs: 30_000 },
        );
      } catch (e) {
        falhas += 1;
        console.log(`ERRO ${nome.padEnd(34)} ${e instanceof Error ? e.message.split("\n")[0] : e}`);
      }
    }
  }

  // Com limpeza de silêncio o grafo muda (filter_complex com concat antes do
  // enquadramento). É outro caminho de código e quebra de outro jeito.
  console.log("\n=== 3. O grafo sobrevive à limpeza de silêncio? ===\n");
  for (const enq of ["preencher", "ajustar"] as Enquadramento[]) {
    const nome = `silencio-${enq}`;
    try {
      const espacadas: Palavra[] = [
        { texto: "olha", inicio_s: 0.2, fim_s: 0.7 },
        { texto: "isso", inicio_s: 0.7, fim_s: 1.2 },
        // Pausa longa no meio: é o que a limpeza remove.
        { texto: "agora", inicio_s: 4.0, fim_s: 4.6 },
        { texto: "aqui", inicio_s: 4.6, fim_s: 5.2 },
      ];
      const mp4 = await renderizarCorte(
        casos[0].fonte, { inicio_s: 0.2, fim_s: DUR - 0.2 }, espacadas, dir, nome,
        { enquadramento: enq, estilo: "hormozi", limparSilencio: true },
      );
      const dim = await dimensoes(mp4);
      const certo = dim === "1080,1920";
      if (!certo) falhas += 1;
      console.log(`${certo ? "ok  " : "ERRO"} ${nome.padEnd(34)} ${dim}`);
    } catch (e) {
      falhas += 1;
      console.log(`ERRO ${nome.padEnd(34)} ${e instanceof Error ? e.message.split("\n")[0] : e}`);
    }
  }

  console.log(`\nframes em ${dir}`);
  if (falhas > 0) {
    console.log(`\n${falhas} falha(s).`);
    process.exit(1);
  }
  console.log("\nMedição discrimina e os dois grafos rodam nos três caminhos.");
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
