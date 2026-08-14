/**
 * O crop animado SEGUE MESMO? Prova por pixel, não por inspeção de string.
 *
 *   npx tsx worker/testar-crop-animado.ts
 *
 * Conferir a expressão gerada lendo o texto dela não vale nada: ela pode
 * estar impecável e o ffmpeg recusar o filtro, ou aceitar e avaliar `x` uma
 * vez só na inicialização (que é o que o `drawbox` faz por padrão, e o que o
 * `crop` faz com largura e altura). Então TODO caso aqui renderiza um MP4 de
 * verdade e MEDE onde o objeto caiu no quadro.
 *
 * A fonte sintética tem um quadrado branco cuja posição horizontal obedece a
 * uma lei conhecida — `centroVerdadeiro()`, a MESMA fórmula que alimenta o
 * `drawbox` e a trajetória. Se o crop seguiu, o quadrado sai no centro dos
 * 1080px de saída, frame após frame. Se não seguiu, ele passeia — e o
 * controle com crop central fixo mostra exatamente o quanto passearia.
 *
 * A lei é uma SENÓIDE de propósito. Com movimento retilíneo a interpolação
 * linear seria exata e o teste passaria mesmo com a árvore montada errada;
 * curva obriga cada segmento a estar no lugar certo.
 */
import path from "node:path";
import fs from "node:fs/promises";
import { run, runBinario, bin } from "../src/lib/proc";
import {
  filtroDeCropAnimado,
  planejarCropAnimado,
  MAX_PONTOS,
  type Ponto,
} from "./crop-animado";

const FONTE = { largura: 1280, altura: 720 };
const SAIDA = { largura: 1080, altura: 1920 };
const DUR = 6;
const FPS = 30;

/** Meia altura do objeto na fonte; o quadrado tem 80px de lado. */
const LADO = 80;
/** Lei do movimento. Amplitude 300 mantém o centro em [340,940] — dentro da
 *  faixa que o crop 9:16 consegue centralizar numa fonte de 1280 (~[203,1077]),
 *  então nenhum caso de movimento esbarra no clamp por acidente. */
const OMEGA = (2 * Math.PI) / DUR;
function centroVerdadeiro(t: number): number {
  return 640 + 300 * Math.sin(OMEGA * t);
}

/** Banda de 8 linhas que atravessa o objeto. O objeto vive na metade vertical
 *  da fonte, que vira a metade vertical da saída. */
const BANDA_H = 8;
const BANDA_Y_FONTE = 356;
const BANDA_Y_SAIDA = 956;

/**
 * Tolerância da medição, em px de saída.
 *
 * NÃO é folga arbitrária, é a soma dos arredondamentos conhecidos:
 *   · o ffmpeg passa o `x` da expressão por lrint e depois derruba pro par
 *     abaixo (croma do yuv420p) — até 1,5px de deslocamento;
 *   · a coluna da borda do objeto pode cruzar o limiar de claro/escuro pra
 *     um lado ou pro outro — ±0,5px.
 * Tudo que passar disso é a trajetória tendo errado o alvo.
 */
const TOLERANCIA = 4;

let falhas = 0;

function conferir(ok: boolean, texto: string) {
  if (!ok) falhas += 1;
  console.log(`${ok ? "ok  " : "ERRO"} ${texto}`);
}

/* --------------------------------------------------------------- fontes */

/** Fonte com o objeto que se move pela lei conhecida. */
async function fonteMovel(dir: string): Promise<string> {
  const arq = path.join(dir, "fonte-movel.mp4");
  // `overlay` e não `drawbox`: o `eval` do drawbox sumiu no ffmpeg 9 (existe
  // no 6.1 da VPS), e sem `eval=frame` explícito a expressão pode ser avaliada
  // UMA VEZ — o objeto sairia parado e o teste mediria outra coisa sem que
  // nenhum erro aparecesse. O overlay tem `eval` nas duas versões.
  const caixa =
    `[0:v][1:v]overlay=x='${640 - LADO / 2}+300*sin(${OMEGA.toFixed(9)}*t)':` +
    `y=${360 - LADO / 2}:eval=frame`;
  await run(
    bin.ffmpeg(),
    [
      "-f", "lavfi",
      "-i", `color=c=0x08080f:size=${FONTE.largura}x${FONTE.altura}:rate=${FPS}:duration=${DUR}`,
      "-f", "lavfi",
      "-i", `color=c=white:size=${LADO}x${LADO}:rate=${FPS}:duration=${DUR}`,
      "-filter_complex", caixa,
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "16",
      "-pix_fmt", "yuv420p", "-y", arq,
    ],
    { timeoutMs: 120_000 },
  );
  return arq;
}

/**
 * Fonte só com marcas nas DUAS BORDAS da imagem.
 *
 * É a fonte do teste de clamp: se o crop for preso em x=0, a marca esquerda
 * aparece colada na borda esquerda da saída e nada mais aparece; se for preso
 * no x máximo, só a direita. Qualquer valor intermediário não mostra marca
 * nenhuma. É a medição mais direta de "ficou preso" que existe.
 */
async function fonteBordas(dir: string): Promise<string> {
  const arq = path.join(dir, "fonte-bordas.mp4");
  const barras =
    `drawbox=x=0:y=0:w=14:h=${FONTE.altura}:color=white:t=fill,` +
    `drawbox=x=${FONTE.largura - 14}:y=0:w=14:h=${FONTE.altura}:color=white:t=fill`;
  await run(
    bin.ffmpeg(),
    [
      "-f", "lavfi",
      "-i", `color=c=0x08080f:size=${FONTE.largura}x${FONTE.altura}:rate=${FPS}:duration=${DUR}`,
      "-vf", barras,
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "16",
      "-pix_fmt", "yuv420p", "-y", arq,
    ],
    { timeoutMs: 120_000 },
  );
  return arq;
}

/* -------------------------------------------------------------- render */

async function renderizar(fonte: string, filtro: string, saida: string) {
  await run(
    bin.ffmpeg(),
    [
      "-i", fonte,
      "-vf", filtro,
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "16",
      "-pix_fmt", "yuv420p", "-an", "-y", saida,
    ],
    { timeoutMs: 180_000 },
  );
}

async function dimensoes(arq: string): Promise<string> {
  const s = await run(
    bin.ffprobe(),
    ["-v", "error", "-select_streams", "v:0", "-show_entries",
     "stream=width,height", "-of", "csv=p=0", arq],
    { timeoutMs: 20_000 },
  );
  return s.trim();
}

/* -------------------------------------------------------------- medição */

type Medida = {
  /** Centro de massa horizontal do que é claro, em px da saída. */
  centro: number;
  /** Primeira e última coluna clara. */
  esquerda: number;
  direita: number;
  colunas: number;
};

/**
 * Lê UM frame exato e acha o que é claro nele.
 *
 * O `-ss` vai DEPOIS do `-i` (busca exata, sem pular pro keyframe) e mira meio
 * frame antes do alvo: o ffmpeg descarta tudo com pts menor que o -ss, então
 * o primeiro frame entregue é o de número `quadro`, com t = quadro/FPS
 * cravado. Medir "por volta de 2,5s" não serviria — a conta esperada depende
 * do instante EXATO que o filtro viu.
 */
async function medirBanda(
  video: string,
  largura: number,
  y: number,
  quadro: number,
): Promise<Medida | null> {
  const buf = await runBinario(
    bin.ffmpeg(),
    [
      "-i", video,
      "-ss", ((quadro - 0.5) / FPS).toFixed(6),
      "-frames:v", "1",
      "-vf", `crop=${largura}:${BANDA_H}:0:${y}`,
      "-pix_fmt", "gray", "-f", "rawvideo", "-",
    ],
    { timeoutMs: 60_000 },
  );
  if (buf.length < largura * BANDA_H) return null;

  const claras: { i: number; v: number }[] = [];
  for (let x = 0; x < largura; x++) {
    let soma = 0;
    for (let y2 = 0; y2 < BANDA_H; y2++) soma += buf[y2 * largura + x];
    const media = soma / BANDA_H;
    if (media > 128) claras.push({ i: x, v: media });
  }
  if (claras.length === 0) return null;

  const peso = claras.reduce((a, c) => a + c.v, 0);
  return {
    centro: claras.reduce((a, c) => a + c.i * c.v, 0) / peso,
    esquerda: claras[0].i,
    direita: claras[claras.length - 1].i,
    colunas: claras.length,
  };
}

/** No vídeo de saída (1080 de largura). */
const medir = (video: string, quadro: number) =>
  medirBanda(video, SAIDA.largura, BANDA_Y_SAIDA, quadro);

/**
 * Onde o objeto REALMENTE está na fonte, medido em vez de deduzido.
 *
 * O `overlay` trunca o x pro inteiro e um quadrado de 80px tem centro em
 * x+39,5, não x+40 — dois deslocamentos de até 1,5px da FONTE, que viram 4px
 * na saída depois da escala. Deduzir a posição pela fórmula em vez de medir
 * jogaria esse erro da fonte sintética na conta do crop e obrigaria a afrouxar
 * a tolerância até ela não provar mais nada.
 */
const medirNaFonte = (video: string, quadro: number) =>
  medirBanda(video, FONTE.largura, BANDA_Y_FONTE, quadro);

/**
 * Coluna da saída onde cai um ponto da fonte.
 *
 * O `scale` mapeia CENTRO DE PIXEL pra centro de pixel: destino =
 * (origem + 0,5) × fator − 0,5. Ignorar o meio pixel deixa um viés fixo de
 * ~0,8px em toda medição — pequeno, mas é exatamente o tipo de erro que se
 * disfarça de tolerância necessária.
 */
function naSaida(posFonte: number, fator: number, x: number): number {
  return (posFonte + 0.5) * fator - 0.5 - x;
}

/** O ffmpeg passa `x` por lrint e depois alinha ao croma (par, pra baixo). */
function xUsadoPeloFfmpeg(x: number): number {
  const r = Math.round(x);
  return r - (r % 2);
}

/** O `scale=` que o gerador escolheu, lido da saída dele — assim o esperado
 *  não repete a fórmula do produto, só consome o resultado dela. */
function escalaDo(filtro: string): number {
  const m = /scale=(\d+):(\d+)/.exec(filtro);
  if (!m) throw new Error(`filtro sem scale: ${filtro}`);
  return Number(m[1]) / FONTE.largura;
}

/** O `x` estático do crop, quando o filtro não tem expressão. */
function xEstaticoDo(filtro: string): number {
  const m = /crop=\d+:\d+:(\d+):\d+$/.exec(filtro);
  if (!m) throw new Error(`filtro não é estático: ${filtro}`);
  return Number(m[1]);
}

/** Trajetória amostrada da lei verdadeira. */
function trajetoria(de: number, ate: number, passo: number): Ponto[] {
  const p: Ponto[] = [];
  for (let t = de; t <= ate + 1e-9; t += passo) {
    p.push({ t: Number(t.toFixed(3)), centroX: centroVerdadeiro(t) });
  }
  return p;
}

/* ------------------------------------------------------------------ casos */

async function casoMovimento(dir: string, fonte: string) {
  console.log("\n=== 1. O crop segue o objeto? ===\n");

  const pontos = trajetoria(0, DUR, 0.1);
  const plano = planejarCropAnimado(pontos, FONTE, SAIDA);
  console.log(
    `     ${pontos.length} pontos → ${plano.amostras.length} amostras ` +
      `(simplificação sub-pixel), expressão com ${plano.expressaoX.length} caracteres`,
  );
  console.log(`     ${plano.expressaoX.slice(0, 150)}…\n`);

  const mp4 = path.join(dir, "movimento.mp4");
  await renderizar(fonte, plano.filtro, mp4);
  conferir((await dimensoes(mp4)) === "1080,1920", "movimento · saída 1080x1920");

  // Controle: o mesmo material com o crop central FIXO. Serve pra provar que
  // o número do caso animado não é coincidência do enquadramento.
  const centralX = xUsadoPeloFfmpeg(plano.xMaximo / 2);
  const controle = path.join(dir, "controle-central.mp4");
  await renderizar(
    fonte,
    `scale=${plano.escalado.largura}:${plano.escalado.altura},` +
      `crop=${SAIDA.largura}:${SAIDA.altura}:${centralX}:${plano.y}`,
    controle,
  );

  const fator = plano.escalado.largura / FONTE.largura;
  const meio = SAIDA.largura / 2;
  const quadros = [20, 45, 75, 110, 130];
  let piorAnimado = 0;
  let piorControle = 0;

  for (const q of quadros) {
    const t = q / FPS;
    const naFonte = await medirNaFonte(fonte, q);
    const a = await medir(mp4, q);
    const c = await medir(controle, q);
    if (!a || !naFonte) {
      conferir(false, `t=${t.toFixed(3)}s · objeto não encontrado`);
      continue;
    }
    // O alvo é o CENTRO dos 1080px. Os dois termos de correção não são folga:
    // um é o meio pixel do `scale`, o outro é a diferença entre onde o overlay
    // desenhou o quadrado e onde a trajetória acreditou que ele estivesse —
    // erro da fonte sintética, medido, não estimado.
    const alvo =
      meio + (naFonte.centro - centroVerdadeiro(t)) * fator + 0.5 * fator - 0.5;
    const erro = Math.abs(a.centro - alvo);
    piorAnimado = Math.max(piorAnimado, erro);
    const desvioControle = c ? Math.abs(c.centro - meio) : Infinity;
    if (Number.isFinite(desvioControle)) {
      piorControle = Math.max(piorControle, desvioControle);
    }
    conferir(
      erro <= TOLERANCIA,
      `t=${t.toFixed(3)}s · objeto em ${naFonte.centro.toFixed(1)}px da fonte → ` +
        `saiu na coluna ${a.centro.toFixed(1)} (alvo ${alvo.toFixed(1)}, erro ${erro.toFixed(1)}px) · ` +
        `crop fixo teria errado ${desvioControle === Infinity ? "o quadro inteiro" : desvioControle.toFixed(0) + "px"}`,
    );
  }

  console.log(
    `\n     pior erro seguindo: ${piorAnimado.toFixed(1)}px · ` +
      `pior desvio do crop fixo: ${piorControle.toFixed(0)}px`,
  );
  conferir(
    piorControle > 200,
    `o controle desvia de verdade (${piorControle.toFixed(0)}px) — o teste tem o que provar`,
  );
}

async function casoUmPonto(dir: string, fonte: string) {
  console.log("\n=== 2. Um ponto só: estático, sem expressão ===\n");

  const filtro = filtroDeCropAnimado([{ t: 0, centroX: 640 }], FONTE, SAIDA);
  console.log(`     ${filtro}\n`);
  conferir(!filtro.includes("if("), "um ponto não gera if() — é crop fixo");
  conferir(!filtro.includes("'"), "um ponto não precisa de aspas no filtro");

  const mp4 = path.join(dir, "um-ponto.mp4");
  await renderizar(fonte, filtro, mp4);
  conferir((await dimensoes(mp4)) === "1080,1920", "um ponto · saída 1080x1920");

  const fator = escalaDo(filtro);
  const x = xUsadoPeloFfmpeg(xEstaticoDo(filtro));

  for (const q of [6, 15]) {
    const t = q / FPS;
    const naFonte = await medirNaFonte(fonte, q);
    const m = await medir(mp4, q);
    if (!naFonte) {
      conferir(false, `t=${t.toFixed(3)}s · objeto não encontrado na fonte`);
      continue;
    }
    // Crop parado: o objeto passeia, e onde ele cai é conta fechada.
    const esperado = naSaida(naFonte.centro, fator, x);
    const erro = m ? Math.abs(m.centro - esperado) : Infinity;
    conferir(
      erro <= TOLERANCIA,
      `t=${t.toFixed(3)}s · esperado na coluna ${esperado.toFixed(1)}, ` +
        `medido ${m ? m.centro.toFixed(1) : "nada"} (erro ${erro.toFixed(1)}px)`,
    );
  }
}

async function casoDesordenado(dir: string, fonte: string) {
  console.log("\n=== 3. Pontos fora de ordem, repetidos e sujos ===\n");

  const limpos = trajetoria(0, DUR, 0.1);
  const sujos: Ponto[] = [
    ...limpos,
    // Repetidos com o MESMO valor: é o que a divisão por zero adoraria. O
    // valor igual deixa o resultado independente de qual sobrevive, então a
    // comparação com a trajetória limpa continua determinística.
    { t: limpos[10].t, centroX: limpos[10].centroX },
    { t: limpos[40].t, centroX: limpos[40].centroX },
    // Detector que não convergiu naquele frame.
    { t: NaN, centroX: 500 },
    { t: 2.5, centroX: Infinity },
    { t: Infinity, centroX: 500 },
  ];
  // Permutação fixa (LCG) — embaralhado de verdade, reprodutível.
  let semente = 987654321;
  const embaralhados = sujos.slice();
  for (let i = embaralhados.length - 1; i > 0; i--) {
    semente = (semente * 1103515245 + 12345) % 2147483648;
    const j = semente % (i + 1);
    [embaralhados[i], embaralhados[j]] = [embaralhados[j], embaralhados[i]];
  }

  const bagunca = planejarCropAnimado(embaralhados, FONTE, SAIDA);
  const ordem = planejarCropAnimado(limpos, FONTE, SAIDA);
  conferir(
    bagunca.expressaoX === ordem.expressaoX,
    `bagunça e trajetória limpa geram a MESMA expressão ` +
      `(${bagunca.amostras.length} amostras dos dois lados)`,
  );

  const ts = bagunca.amostras.map((a) => a.t);
  conferir(
    ts.every((t, i) => i === 0 || t > ts[i - 1]),
    "os instantes saem estritamente crescentes (nenhuma divisão por zero)",
  );

  const mp4 = path.join(dir, "desordenado.mp4");
  await renderizar(fonte, bagunca.filtro, mp4);
  conferir((await dimensoes(mp4)) === "1080,1920", "desordenado · saída 1080x1920");

  const fator = bagunca.escalado.largura / FONTE.largura;
  const meio = SAIDA.largura / 2;
  for (const q of [45, 110]) {
    const t = q / FPS;
    const naFonte = await medirNaFonte(fonte, q);
    const m = await medir(mp4, q);
    if (!naFonte) {
      conferir(false, `t=${t.toFixed(3)}s · objeto não encontrado na fonte`);
      continue;
    }
    const alvo =
      meio + (naFonte.centro - centroVerdadeiro(t)) * fator + 0.5 * fator - 0.5;
    const erro = m ? Math.abs(m.centro - alvo) : Infinity;
    conferir(
      erro <= TOLERANCIA,
      `t=${t.toFixed(3)}s · segue igual (erro ${erro.toFixed(1)}px)`,
    );
  }
}

async function casoBordas(dir: string, bordas: string) {
  console.log("\n=== 4. Trajetória impossível: prende, não quebra ===\n");

  // Pede o crop MUITO à esquerda do quadro e depois MUITO à direita.
  const pontos: Ponto[] = [
    { t: 0, centroX: -4000 },
    { t: 1.5, centroX: -4000 },
    { t: 3.5, centroX: 9000 },
    { t: DUR, centroX: 9000 },
  ];
  const plano = planejarCropAnimado(pontos, FONTE, SAIDA);
  console.log(`     x vai de ${plano.amostras[0].x} a ${plano.amostras[plano.amostras.length - 1].x} (máximo ${plano.xMaximo})`);
  console.log(`     ${plano.expressaoX}\n`);

  conferir(
    plano.amostras.every((a) => a.x >= 0 && a.x <= plano.xMaximo),
    "toda amostra já nasce dentro de [0, xMáximo]",
  );

  const mp4 = path.join(dir, "bordas.mp4");
  await renderizar(bordas, plano.filtro, mp4);
  conferir((await dimensoes(mp4)) === "1080,1920", "bordas · render não falhou, saída 1080x1920");

  // A marca da esquerda tem 14px na fonte → ~37px na saída.
  const larguraMarca = Math.ceil(14 * (plano.escalado.largura / FONTE.largura));

  const esq = await medir(mp4, 21);
  conferir(
    esq !== null && esq.esquerda <= 2 && esq.direita <= larguraMarca + 8,
    `t=0.700s preso em x=0 · marca esquerda nas colunas ` +
      `${esq ? `${esq.esquerda}–${esq.direita}` : "nenhuma"} (esperado 0–${larguraMarca})`,
  );

  const dir2 = await medir(mp4, 165);
  conferir(
    dir2 !== null &&
      dir2.direita >= SAIDA.largura - 3 &&
      dir2.esquerda >= SAIDA.largura - larguraMarca - 8,
    `t=5.500s preso em x=${plano.xMaximo} · marca direita nas colunas ` +
      `${dir2 ? `${dir2.esquerda}–${dir2.direita}` : "nenhuma"} ` +
      `(esperado ${SAIDA.largura - larguraMarca}–${SAIDA.largura - 1})`,
  );
}

async function casoSegurar(dir: string, fonte: string) {
  console.log("\n=== 5. Antes do primeiro e depois do último ponto ===\n");

  // Detecção só no miolo do clipe. Fora dela, o valor tem que SEGURAR — se
  // extrapolar a reta, o crop sai do quadro e o objeto some da medição.
  const pontos = trajetoria(2, 4, 0.1);
  const plano = planejarCropAnimado(pontos, FONTE, SAIDA);
  const fator = plano.escalado.largura / FONTE.largura;

  const mp4 = path.join(dir, "segurar.mp4");
  await renderizar(fonte, plano.filtro, mp4);
  conferir((await dimensoes(mp4)) === "1080,1920", "segurar · saída 1080x1920");

  const primeiro = plano.amostras[0];
  const ultimo = plano.amostras[plano.amostras.length - 1];

  for (const [q, seguro, rotulo] of [
    [18, primeiro.x, "antes do primeiro ponto (t=0.600s < 2s)"],
    [165, ultimo.x, "depois do último ponto (t=5.500s > 4s)"],
  ] as [number, number, string][]) {
    const t = q / FPS;
    const naFonte = await medirNaFonte(fonte, q);
    const m = await medir(mp4, q);
    if (!naFonte) {
      conferir(false, `${rotulo} · objeto não encontrado na fonte`);
      continue;
    }
    const esperado = naSaida(naFonte.centro, fator, xUsadoPeloFfmpeg(seguro));
    const erro = m ? Math.abs(m.centro - esperado) : Infinity;
    conferir(
      erro <= TOLERANCIA,
      `${rotulo} · x seguro em ${Math.round(seguro)}, objeto esperado na ` +
        `coluna ${esperado.toFixed(0)}, medido ${m ? m.centro.toFixed(0) : "nada"} ` +
        `(erro ${erro.toFixed(1)}px)`,
    );
  }
}

async function casoTeto(dir: string, fonte: string) {
  console.log("\n=== 6. Teto de pontos ===\n");

  // Trajetória grande e curva o bastante pra simplificação não conseguir
  // salvar: ruído sobre a senóide, um ponto por frame de um clipe de 5min.
  const pontos: Ponto[] = [];
  for (let i = 0; i < 9000; i++) {
    const t = (i * DUR) / 9000;
    pontos.push({
      t,
      centroX: centroVerdadeiro(t) + 60 * Math.sin(i * 2.3987),
    });
  }

  const plano = planejarCropAnimado(pontos, FONTE, SAIDA);
  console.log(
    `     ${pontos.length} pontos → ${plano.amostras.length} amostras ` +
      `(${plano.raleados} raleados pelo teto de ${MAX_PONTOS})`,
  );
  console.log(
    `     expressão com ${plano.expressaoX.length} caracteres, ` +
      `profundidade ~${Math.ceil(Math.log2(plano.amostras.length + 1)) + 2} ` +
      `(a cadeia linear morre em 95)`,
  );

  conferir(plano.amostras.length <= MAX_PONTOS, `amostras ≤ ${MAX_PONTOS}`);
  conferir(plano.raleados > 0, "o teto foi de fato exercitado (houve ralação)");
  conferir(
    plano.expressaoX.length < 24_000,
    `expressão cabe num argumento (${plano.expressaoX.length} < 24000 chars)`,
  );

  const mp4 = path.join(dir, "teto.mp4");
  try {
    await renderizar(fonte, plano.filtro, mp4);
    conferir((await dimensoes(mp4)) === "1080,1920", "trajetória no teto renderiza");
  } catch (e) {
    conferir(false, `trajetória no teto FALHOU: ${e instanceof Error ? e.message.split("\n")[0] : e}`);
  }
}

async function casoDegenerado() {
  console.log("\n=== 7. Degenerados: sem ponto, e fonte sem folga ===\n");

  const vazio = filtroDeCropAnimado([], FONTE, SAIDA);
  console.log(`     sem ponto: ${vazio}`);
  conferir(!vazio.includes("if("), "sem ponto → crop central estático, como antes do rastreamento");

  // Rosto parado: vários pontos, um x só. Não vale pagar avaliação por frame.
  const parado = filtroDeCropAnimado(
    Array.from({ length: 60 }, (_, i) => ({ t: i * 0.1, centroX: 700 })),
    FONTE,
    SAIDA,
  );
  console.log(`     60 pontos no mesmo lugar: ${parado}`);
  conferir(!parado.includes("if("), "trajetória parada → crop fixo, sem expressão");

  // Fonte já 9:16: cobrir não deixa nada de sobra na horizontal.
  const semFolga = filtroDeCropAnimado(
    trajetoria(0, DUR, 0.5),
    { largura: 1080, altura: 1920 },
    SAIDA,
  );
  console.log(`     fonte 9:16: ${semFolga}`);
  conferir(
    semFolga.endsWith(":0:0") || /crop=1080:1920:0:\d+$/.test(semFolga),
    "fonte sem folga horizontal → x=0 fixo, sem expressão",
  );
}

/* -------------------------------------------------------------------- main */

async function main() {
  const dir = path.join(process.cwd(), "saidas", "crop-animado");
  await fs.mkdir(dir, { recursive: true });

  console.log("montando as fontes sintéticas…");
  const fonte = await fonteMovel(dir);
  const bordas = await fonteBordas(dir);

  await casoMovimento(dir, fonte);
  await casoUmPonto(dir, fonte);
  await casoDesordenado(dir, fonte);
  await casoBordas(dir, bordas);
  await casoSegurar(dir, fonte);
  await casoTeto(dir, fonte);
  await casoDegenerado();

  console.log(`\nvídeos em ${dir}`);
  if (falhas > 0) {
    console.log(`\n${falhas} falha(s).`);
    process.exit(1);
  }
  console.log("\nO crop segue a trajetória, prende nas bordas e segura nas pontas.");
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
