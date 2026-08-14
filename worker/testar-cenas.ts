/**
 * Verifica a detecção de corte de cena.
 *
 * As perguntas, em ordem de quanto custam se estiverem erradas:
 *
 *   1. OFFSET. O pts_time volta relativo ao início da janela? Errar aqui
 *      desloca a trajetória inteira e o sintoma é "o rastreamento piorou",
 *      indistinguível do bug que a detecção veio consertar. Por isso o mesmo
 *      vídeo é analisado com três `inicio_s` diferentes: os cortes têm que
 *      andar junto com a janela.
 *   2. ACERTA os cortes que existem, nos instantes certos?
 *   3. NÃO INVENTA corte onde não há? Vazio é a resposta boa pra câmera fixa
 *      — e é o material em que o rastreamento funciona bem.
 *   4. Falha do ffmpeg devolve [] sem lançar?
 *
 *   npx tsx worker/testar-cenas.ts
 */
import path from "node:path";
import fs from "node:fs/promises";
import { run, bin } from "../src/lib/proc";
import { detectarCortesDeCena, LIMIAR_PADRAO } from "./cenas";

/**
 * Duração PEDIDA de cada trecho.
 *
 * A entregue não é exatamente esta — a fonte lavfi emite frames inteiros, e
 * 1,5s a 25fps vira 38 frames = 1,52s. Por isso os instantes esperados são
 * MEDIDOS com ffprobe, não calculados a partir daqui: um teste que inventa a
 * própria verdade de referência não testa nada.
 */
const TRECHO = 1.5;

/** Tolerância dos instantes. Meio frame a 25fps é 0,02s; 0,2s é folga larga. */
const TOLERANCIA = 0.2;

const TAM = "640x360";
const FPS = 25;

/** Um trecho isolado, pra depois concatenar. */
async function trecho(dir: string, nome: string, fonte: string): Promise<string> {
  const arq = path.join(dir, `${nome}.mp4`);
  // A PRIMEIRA opção de uma fonte lavfi entra com "=" ("testsrc2=s=..."); as
  // seguintes, com ":". Fonte que já traz opção (color=c=...) continua no ":".
  const sep = fonte.includes("=") ? ":" : "=";
  await run(
    bin.ffmpeg(),
    [
      "-f", "lavfi", "-i", `${fonte}${sep}s=${TAM}:r=${FPS}:d=${TRECHO}`,
      "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
      "-y", arq,
    ],
    { timeoutMs: 90_000 },
  );
  return arq;
}

/** Duração real de um arquivo, medida. */
async function duracao(arq: string): Promise<number> {
  const saida = await run(
    bin.ffprobe(),
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", arq],
    { timeoutMs: 20_000 },
  );
  return Number(saida.trim());
}

/**
 * Vídeo com N cortes conhecidos.
 *
 * Fontes deliberadamente diferentes entre si (cor chapada, barras de teste,
 * padrão de calibração): é o análogo do corte duro de edição, que é o caso
 * que quebrava a trajetória. Os instantes de emenda são conhecidos, o que
 * permite medir o ERRO de cada um em vez de só contar quantos saíram.
 */
async function videoComCortes(
  dir: string,
): Promise<{ arq: string; esperados: number[]; total: number }> {
  const fontes = [
    "color=c=0xB01020",
    "testsrc2",
    "color=c=0x1030C0",
    "smptebars",
    "color=c=0x10A030",
  ];
  const partes: string[] = [];
  for (const [i, f] of fontes.entries()) {
    partes.push(await trecho(dir, `parte-${i}`, f));
  }

  const lista = path.join(dir, "lista.txt");
  // O concat demuxer quer caminho relativo ao arquivo de lista.
  await fs.writeFile(
    lista,
    partes.map((p) => `file '${path.basename(p)}'`).join("\n"),
    "utf8",
  );

  const arq = path.join(dir, "cortes.mp4");
  await run(
    bin.ffmpeg(),
    [
      "-f", "concat", "-safe", "0", "-i", lista,
      /**
       * REENCODA — e isto NÃO é preciosismo, é o que faz o teste medir o
       * detector em vez de medir um defeito do próprio material.
       *
       * Com `-c copy` as emendas viram um arquivo cujos PARÂMETROS mudam no
       * meio: o `smptebars` sai marcado com color_range=tv/bt470bg e as cores
       * chapadas saem "unknown". Ao cruzar essa fronteira o ffmpeg
       * REINICIALIZA o filtergraph, o `scene` perde o frame de referência, e
       * aquele corte — um corte gritante, de azul chapado pra barras — sai com
       * score ZERO. O sintoma no teste era "o detector perdeu um corte";
       * a causa era o arquivo de teste.
       *
       * Reencodar produz um fluxo uniforme, que é o que um vídeo editado de
       * verdade é. Custa fração de segundo neste tamanho.
       */
      "-vf", "format=yuv420p,setsar=1",
      "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
      "-y", arq,
    ],
    { timeoutMs: 90_000 },
  );

  // O passo real é MEDIDO: lavfi entrega frames inteiros, não o d= pedido.
  const passo = await duracao(partes[0]);
  // N trechos = N-1 emendas.
  const esperados = fontes
    .slice(1)
    .map((_, i) => Number(((i + 1) * passo).toFixed(3)));
  return { arq, esperados, total: await duracao(arq) };
}

/** Fontes de UM trecho só, sem emenda nenhuma. */
async function videoLiso(dir: string, nome: string, filtro: string[]): Promise<string> {
  const arq = path.join(dir, `${nome}.mp4`);
  await run(
    bin.ffmpeg(),
    [
      "-f", "lavfi", "-i", `color=c=white:s=${TAM}:r=${FPS}:d=8`,
      ...filtro,
      "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
      "-y", arq,
    ],
    { timeoutMs: 90_000 },
  );
  return arq;
}

let falhas = 0;

function ok(condicao: boolean, linha: string) {
  if (!condicao) falhas += 1;
  console.log(`${condicao ? "ok  " : "ERRO"} ${linha}`);
}

function fmt(ns: number[]): string {
  return ns.length === 0 ? "[]" : `[${ns.map((n) => n.toFixed(2)).join(", ")}]`;
}

/**
 * Casa os detectados com os esperados e devolve o maior erro.
 * Infinity quando a quantidade não bate — não dá pra falar de erro de
 * instante se nem os instantes existem.
 */
function erroMaximo(detectados: number[], esperados: number[]): number {
  if (detectados.length !== esperados.length) return Infinity;
  return esperados.reduce(
    (pior, e, i) => Math.max(pior, Math.abs(detectados[i] - e)),
    0,
  );
}

async function main() {
  const dir = path.join(process.cwd(), "saidas", "cenas");
  await fs.mkdir(dir, { recursive: true });

  console.log(`limiar em uso: ${process.env.LIMIAR_CENA ?? LIMIAR_PADRAO}\n`);

  const { arq: comCortes, esperados, total } = await videoComCortes(dir);
  // O passo real entre emendas, medido.
  const passo = esperados[0];
  console.log(
    `fonte: ${total.toFixed(2)}s, ${esperados.length} corte(s) em ${fmt(esperados)}\n`,
  );

  console.log("=== 1. Offset: os instantes voltam relativos à janela? ===\n");
  /**
   * A janela anda; os cortes que sobrevivem dentro dela têm que andar junto,
   * subtraídos do início. Se o pts_time viesse absoluto, o caso `inicio_s=0`
   * passaria e TODOS os outros errariam pelo tamanho do deslocamento — que é
   * exatamente como o bug se esconderia num teste que só olha o começo.
   */
  for (const inicio of [0, 1.0, 2.2]) {
    const detectados = await detectarCortesDeCena(comCortes, inicio, total);
    // Cortes da janela, reancorados. O que cai no início morto some.
    const relativos = esperados
      .map((e) => Number((e - inicio).toFixed(3)))
      .filter((e) => e > 0.05);
    const erro = erroMaximo(detectados, relativos);
    ok(
      erro <= TOLERANCIA,
      `inicio_s=${inicio.toFixed(1)} → ${fmt(detectados)} ` +
        `(esperado ${fmt(relativos)}, erro máx ${erro === Infinity ? "—" : erro.toFixed(3) + "s"})`,
    );

    // Diagnóstico explícito do modo de falha que importa: bater com os
    // instantes ABSOLUTOS, e não com os reancorados, é a assinatura do offset
    // silencioso. Sem esta linha o teste só diria "deu errado".
    const perto = (d: number, alvos: number[]) =>
      alvos.some((a) => Math.abs(d - a) <= TOLERANCIA);
    if (
      inicio > 0 &&
      detectados.length > 0 &&
      detectados.every((d) => perto(d, esperados)) &&
      !detectados.every((d) => perto(d, relativos))
    ) {
      console.log("     ATENÇÃO: os instantes parecem ABSOLUTOS, não relativos");
    }
  }

  console.log("\n=== 2. Acha os cortes que existem? ===\n");
  const achados = await detectarCortesDeCena(comCortes, 0, total);
  ok(
    achados.length === esperados.length,
    `${esperados.length} corte(s) conhecido(s) → detectou ${achados.length}`,
  );
  ok(
    erroMaximo(achados, esperados) <= TOLERANCIA,
    `instantes ${fmt(achados)} vs esperado ${fmt(esperados)}`,
  );

  // Janela parcial: só os cortes DE DENTRO dela, nada de vazar.
  const parcial = await detectarCortesDeCena(comCortes, passo * 1.5, passo * 3.5);
  ok(
    parcial.length === 2 && parcial.every((p) => p > 0 && p < passo * 2),
    `janela do meio (${(passo * 1.5).toFixed(2)}s–${(passo * 3.5).toFixed(2)}s) → ` +
      `${fmt(parcial)} (esperado 2, dentro de 0–${(passo * 2).toFixed(2)}s)`,
  );

  console.log("\n=== 3. Vazio quando não há corte (o caso BOM) ===\n");
  const lisos: { nome: string; arq: string }[] = [
    { nome: "cor única", arq: await videoLiso(dir, "liso-cor", ["-vf", "format=yuv420p"]) },
    // Fade de 8s: mudança de iluminação contínua, o falso positivo clássico.
    { nome: "gradiente lento", arq: await videoLiso(dir, "liso-fade", ["-vf", "fade=t=in:st=0:d=8"]) },
  ];
  // Panorâmica rápida: movimento forte de câmera SEM troca de cena.
  const pan = path.join(dir, "liso-pan.mp4");
  await run(
    bin.ffmpeg(),
    [
      "-f", "lavfi", "-i", `testsrc2=s=1280x720:r=${FPS}:d=8`,
      "-vf", "crop=640:360:'min(iw-ow,(iw-ow)*t/4)':180",
      "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-y", pan,
    ],
    { timeoutMs: 90_000 },
  );
  lisos.push({ nome: "panorâmica rápida", arq: pan });

  for (const l of lisos) {
    const r = await detectarCortesDeCena(l.arq, 0, 8);
    ok(r.length === 0, `${l.nome.padEnd(18)} → ${fmt(r)} (esperado [])`);
  }

  console.log("\n=== 4. Falha não derruba o render ===\n");
  const casosRuins: { nome: string; chamada: () => Promise<number[]> }[] = [
    {
      nome: "vídeo inexistente",
      chamada: () => detectarCortesDeCena(path.join(dir, "nao-existe.mp4"), 0, 5),
    },
    {
      nome: "arquivo que não é vídeo",
      chamada: async () => {
        const lixo = path.join(dir, "lixo.mp4");
        await fs.writeFile(lixo, "isto não é um mp4", "utf8");
        return detectarCortesDeCena(lixo, 0, 5);
      },
    },
    {
      nome: "janela invertida",
      chamada: () => detectarCortesDeCena(comCortes, 5, 2),
    },
    {
      nome: "janela de duração zero",
      chamada: () => detectarCortesDeCena(comCortes, 2, 2),
    },
  ];

  for (const c of casosRuins) {
    try {
      const r = await c.chamada();
      ok(r.length === 0, `${c.nome.padEnd(24)} → ${fmt(r)} sem lançar`);
    } catch (e) {
      falhas += 1;
      console.log(
        `ERRO ${c.nome.padEnd(24)} LANÇOU: ${e instanceof Error ? e.message.split("\n")[0] : e}`,
      );
    }
  }

  console.log(`\nfontes em ${dir}`);
  if (falhas > 0) {
    console.log(`\n${falhas} falha(s).`);
    process.exit(1);
  }
  console.log(
    "\nCortes achados nos instantes certos, relativos à janela, sem falso " +
      "positivo em movimento e sem derrubar nada quando o ffmpeg falha.",
  );
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
