/**
 * Confere a trajetória CIENTE DE CORTE DE CENA.
 *
 *   npx tsx worker/testar-trajetoria-cenas.ts
 *
 * O teste central aqui não é sobre suavidade — é sobre o A/B que a versão
 * contínua PERDEU. Um trailer com 19 cenas em 30 s é reconstruído em memória,
 * e as três câmeras disputam a mesma métrica do `diagnosticar-rastreio.ts`:
 * em quantas amostras o rosto ficou dentro do recorte.
 *
 *   contínua  — a de hoje, que trata troca de cena como movimento
 *   fixa      — crop central, a que venceu o A/B
 *   por cena  — a nova
 *
 * Se a nova não ganhar das DUAS, ela não deve existir.
 */
import {
  planejarTrajetoria,
  centroEm,
  larguraDoCrop,
  limitesDoCentro,
  PADROES,
  type Amostra,
  type Ponto,
  type Rosto,
} from "../src/lib/enquadramento/trajetoria";
import {
  planejarTrajetoriaPorCena,
  PADROES_POR_CENA,
} from "../src/lib/enquadramento/trajetoria-cenas";

let falhas = 0;

function conferir(nome: string, ok: boolean, detalhe = "") {
  console.log(`${ok ? "ok  " : "ERRO"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  if (!ok) falhas += 1;
}

const FONTE = { largura: 1920, altura: 1080 };
const SAIDA = { largura: 1080, altura: 1920 };

const CROP = larguraDoCrop(FONTE, SAIDA);
const MEIA = CROP / 2;
const { min: LIM_MIN, max: LIM_MAX } = limitesDoCentro(FONTE, CROP);
const ZONA = PADROES.zonaMortaFracao * CROP;
const VEL_MAX = PADROES.velocidadeMaxFracao * CROP;
const EPS = PADROES_POR_CENA.saltoEpsilon_s;

/** Rosto centrado em `centro`, do jeito que o YuNet devolveria. */
function rosto(centro: number, w = 180, conf = 0.95): Rosto {
  return { x: centro - w / 2, y: 300, w, h: Math.round(w * 1.25), conf };
}

/** Amostras de `de` até `ate` (inclusive), a cada `passo` segundos. */
function serie(
  de: number,
  ate: number,
  passo: number,
  rostosEm: (t: number) => Rosto[],
): Amostra[] {
  const out: Amostra[] = [];
  for (let t = de; t <= ate + 1e-9; t += passo) {
    const arred = Math.round(t * 1000) / 1000;
    out.push({ t: arred, rostos: rostosEm(arred) });
  }
  return out;
}

/** Ruído determinístico — teste que sorteia número não é teste. */
function tremor(i: number, amplitude: number): number {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return (s - Math.floor(s) - 0.5) * 2 * amplitude;
}

/**
 * A MÉTRICA DO A/B, igual à do `diagnosticar-rastreio.ts`: o rosto principal
 * de cada amostra está dentro do recorte naquele instante?
 */
function taxaDentro(amostras: Amostra[], pontos: Ponto[]): number {
  let dentro = 0;
  let total = 0;
  for (const a of amostras) {
    const r = a.rostos[0];
    if (!r) continue;
    total += 1;
    if (Math.abs(r.x + r.w / 2 - centroEm(pontos, a.t)) <= MEIA) dentro += 1;
  }
  return total === 0 ? 0 : dentro / total;
}

function pct(f: number): string {
  return `${(f * 100).toFixed(0)}%`;
}

/** Velocidade máxima entre pontos consecutivos, ignorando os saltos de cena. */
function velocidadeSemSaltos(pontos: Ponto[], deT: number): number {
  let v = 0;
  for (let i = 1; i < pontos.length; i++) {
    const dt = pontos[i].t - pontos[i - 1].t;
    if (dt <= 0 || pontos[i - 1].t < deT) continue;
    if (dt <= EPS * 1.5) continue; // é o degrau, não é panorâmica
    v = Math.max(v, Math.abs(pontos[i].centroX - pontos[i - 1].centroX) / dt);
  }
  return v;
}

function crescente(pontos: Ponto[]): boolean {
  for (let i = 1; i < pontos.length; i++) {
    if (pontos[i].t <= pontos[i - 1].t) return false;
  }
  return true;
}

function dentroDaFonte(pontos: Ponto[]): boolean {
  return pontos.every(
    (p) => p.centroX >= LIM_MIN - 1e-6 && p.centroX <= LIM_MAX + 1e-6,
  );
}

console.log("=== o trailer que reprovou o rastreamento ===\n");

/**
 * 19 cenas em 30 s — a densidade medida no material real. As posições foram
 * escolhidas como um decupagem plausível: a maioria perto do meio (é onde
 * qualquer enquadramento põe o assunto) e algumas bem nas pontas, que é onde
 * o crop fixo perde e o rastreamento deveria ganhar.
 */
const POSICOES = [
  960, 1180, 520, 900, 1420, 760, 1010, 300, 1150, 640,
  1660, 880, 1250, 420, 990, 1520, 700, 1080, 340,
];
const DUR_CENA = 30 / POSICOES.length;
const CORTES = Array.from(
  { length: POSICOES.length - 1 },
  (_, k) => Math.round((k + 1) * DUR_CENA * 1000) / 1000,
);

/**
 * Três planos em que o assunto ATRAVESSA o quadro durante a própria cena
 * (700 px em 1,6 s). Existem para o teste não ser vazio: contra eles a câmera
 * parada é comprovadamente imperfeita — 700 px não cabem num recorte de 607 —
 * e a meta de 85% passa a ser um número conquistado, não um número de graça.
 */
const CENAS_COM_TRAVELLING = new Set([4, 12, 13]);

{
  let i = 0;
  const amostras = serie(0, 30, 0.5, (t) => {
    const cena = Math.min(POSICOES.length - 1, Math.floor(t / DUR_CENA));
    const dentroDaCena = (t - cena * DUR_CENA) / DUR_CENA; // 0..1
    // Dentro de uma cena a pessoa não fica de mármore: anda ±20 px e o
    // detector treme mais ±5. Nenhum dos dois justifica mover a câmera.
    const curso = CENAS_COM_TRAVELLING.has(cena) ? 700 : 40;
    const x = Math.min(
      1820,
      Math.max(100, POSICOES[cena] + curso * (dentroDaCena - 0.5) + tremor(i++, 5)),
    );
    return [rosto(x)];
  });

  const porCena = planejarTrajetoriaPorCena(amostras, CORTES, FONTE, SAIDA);
  const continua = planejarTrajetoria(amostras, FONTE, SAIDA);
  const fixa: Ponto[] = [{ t: 0, centroX: FONTE.largura / 2 }];

  const tPorCena = taxaDentro(amostras, porCena);
  const tContinua = taxaDentro(amostras, continua);
  const tFixa = taxaDentro(amostras, fixa);

  console.log(
    `   por cena ${pct(tPorCena)}   ·   contínua ${pct(tContinua)}   ·   ` +
      `fixa ${pct(tFixa)}\n`,
  );

  conferir(
    "por cena bate a meta de 85%",
    tPorCena >= 0.85,
    pct(tPorCena),
  );
  conferir(
    "por cena ganha da contínua",
    tPorCena > tContinua,
    `${pct(tPorCena)} vs ${pct(tContinua)}`,
  );
  conferir(
    "por cena ganha do crop fixo",
    tPorCena > tFixa,
    `${pct(tPorCena)} vs ${pct(tFixa)}`,
  );
  // O diagnóstico do material real: a contínua chega a ficar do lado OPOSTO
  // do quadro. Se este teste não reproduzir a derrota dela, não é o mesmo
  // problema que está sendo consertado.
  conferir(
    "e a contínua de fato perde do crop fixo (o A/B reproduzido)",
    tContinua < tFixa,
    `${pct(tContinua)} vs ${pct(tFixa)}`,
  );
  conferir("tempo estritamente crescente", crescente(porCena));
  conferir("o recorte nunca sai da fonte", dentroDaFonte(porCena));
}

console.log("\n=== cena curta: a câmera fica parada ===\n");

{
  const amostras = serie(0, 30, 0.5, (t) => {
    const cena = Math.min(POSICOES.length - 1, Math.floor(t / DUR_CENA));
    return [rosto(POSICOES[cena])];
  });
  const p = planejarTrajetoriaPorCena(amostras, CORTES, FONTE, SAIDA);

  // Dentro de qualquer cena, dois instantes quaisquer têm o MESMO valor.
  let piorMexida = 0;
  for (let c = 0; c < POSICOES.length; c++) {
    const ini = c === 0 ? 0 : CORTES[c - 1];
    const fim = c === POSICOES.length - 1 ? 30 : CORTES[c];
    const base = centroEm(p, ini);
    for (let t = ini; t < fim - 1e-6; t += 0.05) {
      piorMexida = Math.max(piorMexida, Math.abs(centroEm(p, t) - base));
    }
  }
  conferir(
    "nenhum movimento dentro de cena curta",
    piorMexida < 1e-6,
    `pior=${piorMexida.toFixed(6)}px`,
  );
  conferir(
    "uma cena, um ponto (19 cenas ≈ 19 pontos)",
    p.length <= POSICOES.length * 2,
    `${p.length} pontos`,
  );
  // E acerta cada cena: com a pessoa parada, a posição fixa é a dela.
  conferir(
    "cada cena é enquadrada no seu próprio rosto",
    POSICOES.every((x, c) => {
      const t = (c === 0 ? 0 : CORTES[c - 1]) + 0.1;
      return Math.abs(centroEm(p, t) - Math.min(Math.max(x, LIM_MIN), LIM_MAX)) < 1e-6;
    }),
  );
}

{
  // Escolha da posição fixa: 3 rostos agrupados e 1 solto na ponta. Enquadrar
  // "a média" pegaria os 3 de raspão ou nenhum; o ótimo de cobertura fica com
  // o grupo e ignora o solitário.
  const amostras: Amostra[] = [
    { t: 0, rostos: [rosto(900)] },
    { t: 0.5, rostos: [rosto(1000)] },
    { t: 1.0, rostos: [rosto(1100)] },
    { t: 1.4, rostos: [rosto(1880, 120)] },
  ];
  const p = planejarTrajetoriaPorCena(amostras, [1.2], FONTE, SAIDA);
  const x = centroEm(p, 0.5);
  conferir(
    "posição fixa cobre o grupo, não a média com o rosto solto",
    Math.abs(x - 1000) < 1e-6,
    `${x.toFixed(1)} (média seria ${((900 + 1000 + 1100 + 1880) / 4).toFixed(0)})`,
  );
}

{
  // Dois rostos longe demais para caberem juntos: a câmera tem que escolher o
  // lado com MAIS rosto, não o meio vazio entre eles.
  const amostras: Amostra[] = [
    { t: 0, rostos: [rosto(1300), rosto(200, 120)] },
    { t: 0.5, rostos: [rosto(1300), rosto(200, 120)] },
    { t: 1.0, rostos: [rosto(1320)] },
  ];
  const p = planejarTrajetoriaPorCena(amostras, [1.4], FONTE, SAIDA);
  const x = centroEm(p, 0.5);
  conferir(
    "com dois grupos incompatíveis, fica no maior",
    Math.abs(x - 1300) <= MEIA && x > 1000,
    `${x.toFixed(1)}`,
  );
}

console.log("\n=== cena longa: volta a seguir ===\n");

{
  // Cena 1 curta (0–2 s, rosto na esquerda), corte, cena 2 longa com a pessoa
  // atravessando o quadro a 100 px/s.
  const amostras = serie(0, 14, 0.25, (t) =>
    t < 2 ? [rosto(400)] : [rosto(600 + 100 * Math.min(t - 2, 8))],
  );
  const p = planejarTrajetoriaPorCena(amostras, [2], FONTE, SAIDA);

  conferir(
    "a cena curta ficou parada na esquerda",
    Math.abs(centroEm(p, 1.5) - 400) < 1e-6,
    `${centroEm(p, 1.5).toFixed(1)}`,
  );
  conferir(
    "a cena longa acompanha até o fim da caminhada",
    Math.abs(centroEm(p, 13) - (1400 - ZONA)) < 2,
    `${centroEm(p, 13).toFixed(1)} vs ${(1400 - ZONA).toFixed(1)}`,
  );
  conferir(
    "e segue sem tranco: dentro da cena a velocidade respeita o teto",
    velocidadeSemSaltos(p, 2) <= VEL_MAX * 1.001,
    `${velocidadeSemSaltos(p, 2).toFixed(1)}px/s (teto ${VEL_MAX.toFixed(0)})`,
  );
  // A prova de que ela SEGUIU e não travou numa posição só.
  const dentroDaCena = p.filter((q) => q.t >= 2).map((q) => q.centroX);
  conferir(
    "a câmera de fato andou dentro da cena longa",
    Math.max(...dentroDaCena) - Math.min(...dentroDaCena) > 600,
    `faixa=${(Math.max(...dentroDaCena) - Math.min(...dentroDaCena)).toFixed(0)}px`,
  );
  conferir("tempo estritamente crescente", crescente(p));
}

{
  // Cena longa mas com rosto em pouquíssimas amostras: não há trajetória a
  // suavizar, e seguir três pontos soltos é seguir ruído.
  const amostras = serie(0, 10, 0.5, (t) => (t >= 4 && t <= 5 ? [rosto(1400)] : []));
  const p = planejarTrajetoriaPorCena(amostras, [3], FONTE, SAIDA);
  const faixa = p.filter((q) => q.t >= 3);
  const xs = faixa.map((q) => q.centroX);
  conferir(
    "cena longa com rosto escasso vira posição fixa",
    new Set(xs.map((x) => x.toFixed(3))).size === 1,
    `${xs.length} pontos, ${new Set(xs.map((x) => x.toFixed(3))).size} valor(es)`,
  );
}

console.log("\n=== cena sem rosto: centro, sem herdar ===\n");

{
  const amostras = serie(0, 12, 0.5, (t) => {
    if (t < 4) return [rosto(400)];
    if (t < 8) return [];
    return [rosto(1500)];
  });
  const p = planejarTrajetoriaPorCena(amostras, [4, 8], FONTE, SAIDA);

  conferir(
    "antes do corte, a posição da cena antiga",
    Math.abs(centroEm(p, 3.9) - 400) < 1e-6,
    `${centroEm(p, 3.9).toFixed(1)}`,
  );
  conferir(
    "cena sem rosto vai para o centro, e não herda os 400",
    Math.abs(centroEm(p, 4) - 960) < 1e-6 && Math.abs(centroEm(p, 6) - 960) < 1e-6,
    `x(4s)=${centroEm(p, 4).toFixed(1)} x(6s)=${centroEm(p, 6).toFixed(1)}`,
  );
  conferir(
    "e a cena seguinte assume o rosto novo na hora",
    Math.abs(centroEm(p, 8) - 1500) < 1e-6,
    `${centroEm(p, 8).toFixed(1)}`,
  );
  // A versão contínua faria o oposto: seguraria os 400 por 0,6 s e depois
  // derivaria ao centro por 2,5 s — 3 s de câmera andando numa cena de 4.
  const c = planejarTrajetoria(amostras, FONTE, SAIDA);
  conferir(
    "(a contínua, no mesmo material, ainda estava viajando aos 6 s)",
    Math.abs(centroEm(c, 6) - 960) > 20,
    `x(6s)=${centroEm(c, 6).toFixed(1)}`,
  );
}

{
  // Dois cortes mais próximos que o período de amostragem: a cena do meio não
  // tem amostra nenhuma. Sem evidência, centro — mesma regra.
  const amostras = serie(0, 6, 0.5, (t) => [rosto(t < 2 ? 500 : 1500)]);
  const p = planejarTrajetoriaPorCena(amostras, [2.1, 2.4], FONTE, SAIDA);
  conferir(
    "cena sem amostra nenhuma também vai ao centro",
    Math.abs(centroEm(p, 2.2) - 960) < 1e-6,
    `${centroEm(p, 2.2).toFixed(1)}`,
  );
  conferir("tempo estritamente crescente mesmo com cortes colados", crescente(p));
}

console.log("\n=== sem cortes: idêntica à de hoje ===\n");

{
  const casos: Array<[string, Amostra[]]> = [
    ["pessoa atravessando", serie(0, 12, 0.25, (t) => [rosto(400 + 100 * Math.min(t, 8))])],
    ["duas pessoas", serie(0, 15, 0.25, (t) => [rosto(500), rosto(1400, 260)])],
    ["buraco no meio", serie(0, 12, 0.25, (t) => (t > 2 && t < 6 ? [] : [rosto(700)]))],
    ["cena curtíssima", serie(0, 1, 0.25, () => [rosto(1500)])],
    ["sem amostra nenhuma", []],
  ];

  for (const [nome, amostras] of casos) {
    const a = planejarTrajetoriaPorCena(amostras, [], FONTE, SAIDA);
    const b = planejarTrajetoria(amostras, FONTE, SAIDA);
    const igual =
      a.length === b.length &&
      a.every(
        (q, i) => Math.abs(q.t - b[i].t) < 1e-12 && Math.abs(q.centroX - b[i].centroX) < 1e-12,
      );
    conferir(`sem cortes é a contínua ponto a ponto — ${nome}`, igual,
      `${a.length} vs ${b.length} pontos`);
  }

  // Corte fora do intervalo das amostras não é corte: não há dois pedaços.
  const amostras = serie(0, 6, 0.25, (t) => [rosto(800 + 50 * t)]);
  const a = planejarTrajetoriaPorCena(amostras, [-3, 0, 40, NaN, Infinity], FONTE, SAIDA);
  const b = planejarTrajetoria(amostras, FONTE, SAIDA);
  conferir(
    "corte fora do intervalo (ou inválido) é descartado",
    a.length === b.length && a.every((q, i) => Math.abs(q.centroX - b[i].centroX) < 1e-12),
    `${a.length} vs ${b.length} pontos`,
  );
}

console.log("\n=== a fronteira é degrau, não rampa ===\n");

{
  const amostras = serie(0, 12, 0.5, (t) => [rosto(t < 6 ? 400 : 1500)]);
  const p = planejarTrajetoriaPorCena(amostras, [6], FONTE, SAIDA);

  const antes = centroEm(p, 6 - EPS);
  const depois = centroEm(p, 6);
  const bemAntes = centroEm(p, 5.0);
  const logoApos = centroEm(p, 6.5);

  conferir(
    "o valor é constante até 1 ms antes do corte",
    Math.abs(antes - bemAntes) < 1e-9 && Math.abs(antes - 400) < 1e-6,
    `x(5,0)=${bemAntes.toFixed(1)} x(6−ε)=${antes.toFixed(1)}`,
  );
  conferir(
    "e já é o novo valor exatamente no corte",
    Math.abs(depois - 1500) < 1e-6,
    `x(6,0)=${depois.toFixed(1)}`,
  );
  conferir(
    "o salto inteiro acontece dentro de 1 ms",
    Math.abs(depois - antes) > 1000,
    `Δ=${(depois - antes).toFixed(1)}px em ${(EPS * 1000).toFixed(0)}ms`,
  );
  conferir(
    "constante depois do corte também (nada de rampa do outro lado)",
    Math.abs(logoApos - depois) < 1e-9,
    `x(6,5)=${logoApos.toFixed(1)}`,
  );

  // A verificação que pega o bug de verdade: meio caminho antes do corte, uma
  // rampa já teria movido a câmera. Aos 5,5 s ela tem que estar EXATAMENTE
  // onde estava aos 3 s.
  conferir(
    "nada se mexe na metade da cena anterior",
    Math.abs(centroEm(p, 5.5) - centroEm(p, 3)) < 1e-9,
  );

  // E o par de pontos existe mesmo na lista, não só na leitura.
  const idx = p.findIndex((q) => Math.abs(q.t - 6) < 1e-9);
  conferir(
    "existe um ponto em t−ε colado no de t",
    idx > 0 && Math.abs(p[idx - 1].t - (6 - EPS)) < 1e-9,
    idx > 0 ? `t=${p[idx - 1].t} e t=${p[idx].t}` : "não achou o ponto do corte",
  );
}

{
  // O motivo de NÃO simplificar a saída: um salto pequeno (menor que a
  // tolerância do Douglas–Peucker) tem que sobreviver como salto.
  const amostras = serie(0, 8, 0.5, (t) => [rosto(t < 4 ? 900 : 903)]);
  const p = planejarTrajetoriaPorCena(amostras, [4], FONTE, SAIDA);
  conferir(
    "salto pequeno não vira rampa (a saída não passa por simplificar)",
    Math.abs(centroEm(p, 3.9) - 900) < 1e-6 && Math.abs(centroEm(p, 4) - 903) < 1e-6,
    `x(3,9)=${centroEm(p, 3.9).toFixed(2)} x(4,0)=${centroEm(p, 4).toFixed(2)}`,
  );
}

console.log("\n=== bordas e degenerados ===\n");

{
  const amostras = serie(0, 10, 0.5, (t) => [rosto(t < 5 ? 60 : 1870, 200)]);
  const p = planejarTrajetoriaPorCena(amostras, [5], FONTE, SAIDA);
  conferir("prende nas duas bordas", dentroDaFonte(p));
  conferir(
    "cena da esquerda no limite mínimo",
    Math.abs(centroEm(p, 1) - LIM_MIN) < 1e-6,
    `${centroEm(p, 1).toFixed(2)}`,
  );
  conferir(
    "cena da direita no limite máximo",
    Math.abs(centroEm(p, 7) - LIM_MAX) < 1e-6,
    `${centroEm(p, 7).toFixed(2)}`,
  );
}

{
  // Fonte já vertical: não sobra curso, a trajetória inteira é uma constante.
  const p = planejarTrajetoriaPorCena(
    serie(0, 6, 0.5, (t) => [rosto(t < 3 ? 200 : 900)]),
    [3],
    { largura: 1080, altura: 1920 },
    SAIDA,
  );
  conferir(
    "fonte sem curso vira ponto único no centro",
    p.length === 1 && Math.abs(p[0].centroX - 540) < 1e-6,
    `${p.length} pt, x=${p[0].centroX}`,
  );
}

{
  const p = planejarTrajetoriaPorCena([], [1, 2, 3], FONTE, SAIDA);
  conferir("sem amostra nenhuma ainda devolve um ponto",
    p.length === 1 && p[0].centroX === 960);
}

{
  // Cortes repetidos e fora de ordem não podem duplicar fronteira nem quebrar
  // a monotonicidade do tempo.
  const amostras = serie(0, 9, 0.5, (t) => [rosto(t < 3 ? 400 : t < 6 ? 1400 : 800)]);
  const p = planejarTrajetoriaPorCena(amostras, [6, 3, 3, 6, 3], FONTE, SAIDA);
  conferir("cortes repetidos/desordenados são normalizados", crescente(p));
  conferir(
    "e as três cenas saíram certas",
    Math.abs(centroEm(p, 1) - 400) < 1e-6 &&
      Math.abs(centroEm(p, 4) - 1400) < 1e-6 &&
      Math.abs(centroEm(p, 7) - 800) < 1e-6,
    `${centroEm(p, 1).toFixed(0)} / ${centroEm(p, 4).toFixed(0)} / ${centroEm(p, 7).toFixed(0)}`,
  );
}

console.log();
if (falhas > 0) {
  console.log(`${falhas} falha(s).`);
  process.exit(1);
}
console.log(
  "Trajetória por cena: para nas cenas curtas, segue nas longas, salta nos cortes.",
);
