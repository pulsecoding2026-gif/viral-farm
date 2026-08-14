/**
 * Confere a matemática do rastreamento de rosto.
 *
 *   npx tsx worker/testar-trajetoria.ts
 *
 * Aqui o TypeScript não ajuda em nada: todos os defeitos desta parte são
 * NUMÉRICOS e todos aparecem só no vídeo pronto — a câmera treme, pinga entre
 * duas pessoas, volta ao centro quando alguém vira de costas. Cada bloco
 * abaixo é um desses defeitos, escrito como cena e cobrado como número.
 */
import {
  planejarTrajetoria,
  simplificar,
  centroEm,
  larguraDoCrop,
  limitesDoCentro,
  PADROES,
  type Amostra,
  type Ponto,
  type Rosto,
} from "../src/lib/enquadramento/trajetoria";

let falhas = 0;

function conferir(nome: string, ok: boolean, detalhe = "") {
  console.log(`${ok ? "ok  " : "ERRO"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  if (!ok) falhas += 1;
}

const FONTE = { largura: 1920, altura: 1080 };
const SAIDA = { largura: 1080, altura: 1920 };

const CROP = larguraDoCrop(FONTE, SAIDA);
const { min: LIM_MIN, max: LIM_MAX } = limitesDoCentro(FONTE, CROP);
const ZONA = PADROES.zonaMortaFracao * CROP;
const VEL_MAX = PADROES.velocidadeMaxFracao * CROP;
const TOL = PADROES.toleranciaFracao * CROP;

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

/** A trajetória é linear entre os pontos, então o pior caso está nos pontos. */
function velocidadeMaxima(pontos: Ponto[]): number {
  let v = 0;
  for (let i = 1; i < pontos.length; i++) {
    const dt = pontos[i].t - pontos[i - 1].t;
    if (dt > 0) v = Math.max(v, Math.abs(pontos[i].centroX - pontos[i - 1].centroX) / dt);
  }
  return v;
}

function faixa(pontos: Ponto[]): number {
  const xs = pontos.map((p) => p.centroX);
  return Math.max(...xs) - Math.min(...xs);
}

function fim(pontos: Ponto[]): number {
  return pontos[pontos.length - 1].centroX;
}

function monotonica(pontos: Ponto[]): boolean {
  for (let i = 1; i < pontos.length; i++) {
    if (pontos[i].centroX < pontos[i - 1].centroX - 1e-9) return false;
  }
  return true;
}

console.log("=== geometria ===\n");

{
  // 1080 de recorte com 1080 de altura seria um QUADRADO, não um 9:16. A
  // largura certa é a que, ampliada até cobrir a saída, dá 1080 de largura.
  conferir("largura do recorte é 607,5 e não 1080", Math.abs(CROP - 607.5) < 1e-6, `${CROP}`);
  conferir("curso do centro", Math.abs(LIM_MIN - 303.75) < 1e-6 && Math.abs(LIM_MAX - 1616.25) < 1e-6,
    `[${LIM_MIN}, ${LIM_MAX}]`);
}

{
  // Fonte já vertical: não sobra nada para panoramizar.
  const p = planejarTrajetoria(
    serie(0, 5, 0.25, () => [rosto(200)]),
    { largura: 1080, altura: 1920 },
    SAIDA,
  );
  conferir("fonte sem curso vira ponto único no centro",
    p.length === 1 && Math.abs(p[0].centroX - 540) < 1e-6, `${p.length} pt, x=${p[0].centroX}`);
}

{
  const p = planejarTrajetoria([], FONTE, SAIDA);
  conferir("sem amostra nenhuma ainda devolve um ponto", p.length === 1 && p[0].centroX === 960);
}

console.log("\n=== câmera parada ===\n");

{
  const p = planejarTrajetoria(serie(0, 10, 0.25, () => [rosto(960)]), FONTE, SAIDA);
  conferir("rosto parado gera trajetória constante", p.length === 1, `${p.length} ponto(s)`);
  conferir("e no lugar do rosto", Math.abs(p[0].centroX - 960) < 1e-6, `${p[0].centroX}`);
}

{
  // O caso que separa "rastreia rosto" de "câmera de segurança": o detector
  // erra alguns pixels por frame mesmo com a pessoa imóvel.
  let i = 0;
  const p = planejarTrajetoria(
    serie(0, 10, 0.25, () => [rosto(960 + tremor(i++, 3))]),
    FONTE,
    SAIDA,
  );
  conferir("tremor de ±3px não move a câmera", faixa(p) < 0.5, `faixa=${faixa(p).toFixed(3)}px`);
}

{
  // Mexida real, porém pequena: gesticular, trocar o apoio do corpo. Dentro
  // da zona morta a câmera continua parada — é isso que dá cara de tripé.
  //
  // A garantia é sobre a EXCURSÃO TOTAL, não sobre a amplitude: o alvo se
  // fixa na primeira amostra, então o pior caso é o dobro da amplitude. Com
  // ±45% da zona, o pico a pico dá 90% dela e nada pode se mexer.
  let i = 0;
  const p = planejarTrajetoria(
    serie(0, 10, 0.25, () => [rosto(960 + tremor(i++, ZONA * 0.45))]),
    FONTE,
    SAIDA,
  );
  conferir(`zona morta segura mexida de ${ZONA.toFixed(0)}px pico a pico`, faixa(p) < 0.5,
    `faixa=${faixa(p).toFixed(3)}px`);
}

console.log("\n=== pessoa atravessando ===\n");

{
  // 500 px/s, MAIS DO DOBRO do teto da câmera: força o limite de velocidade a
  // agir e ainda assim exige que ela chegue lá.
  const andando = (t: number) => (t <= 2 ? 400 + 500 * t : 1400);
  const p = planejarTrajetoria(serie(0, 12, 0.25, (t) => [rosto(andando(t))]), FONTE, SAIDA);

  conferir("movimento é monotônico (nada de recuo)", monotonica(p));
  conferir(`velocidade sob o teto de ${VEL_MAX.toFixed(0)}px/s`,
    velocidadeMaxima(p) <= VEL_MAX * 1.001, `${velocidadeMaxima(p).toFixed(1)}px/s`);
  // A zona morta é um atraso PERMANENTE de projeto: a câmera para assim que o
  // rosto entra na faixa, e não quando ele chega ao centro exato.
  conferir("chega no destino (menos a zona morta)",
    Math.abs(fim(p) - (1400 - ZONA)) < 1, `${fim(p).toFixed(1)} vs ${(1400 - ZONA).toFixed(1)}`);
  conferir("a câmera de fato andou", faixa(p) > 800, `faixa=${faixa(p).toFixed(0)}px`);
}

{
  // Andar devagar não pode ser confundido com tremor: 60 px/s por 8 s.
  const p = planejarTrajetoria(
    serie(0, 12, 0.25, (t) => [rosto(600 + 60 * Math.min(t, 8))]),
    FONTE,
    SAIDA,
  );
  conferir("acompanha caminhada lenta sem travar", fim(p) > 1000, `${fim(p).toFixed(0)}`);
  conferir("e sem estourar o teto", velocidadeMaxima(p) <= VEL_MAX * 1.001,
    `${velocidadeMaxima(p).toFixed(1)}px/s`);
}

console.log("\n=== duas pessoas ===\n");

{
  // Entrevista: os dois no quadro o tempo todo, e a confiança do detector
  // alternando entre eles a cada amostra. Seguir "o melhor rosto" aqui daria
  // uma câmera pingando 900px de ida e volta 4 vezes por segundo.
  let i = 0;
  const p = planejarTrajetoria(
    serie(0, 15, 0.25, () => {
      const alterna = i++ % 2 === 0;
      return [rosto(500, 180, alterna ? 0.95 : 0.6), rosto(1400, 180, alterna ? 0.6 : 0.95)];
    }),
    FONTE,
    SAIDA,
  );
  conferir("confiança alternando não faz a câmera pingar", faixa(p) < 1,
    `faixa=${faixa(p).toFixed(2)}px`);
  conferir("e ela fica em quem foi escolhido primeiro", Math.abs(p[0].centroX - 500) < 1,
    `${p[0].centroX.toFixed(1)}`);
}

{
  // Variação cruel: a detecção alterna QUEM APARECE. Metade das amostras não
  // tem o alvo — e mesmo assim a câmera não pode ir atrás do outro.
  let i = 0;
  const p = planejarTrajetoria(
    serie(0, 15, 0.25, () => (i++ % 2 === 0 ? [rosto(500)] : [rosto(1400)])),
    FONTE,
    SAIDA,
  );
  conferir("detecção alternando também não faz pingar", faixa(p) < 1,
    `faixa=${faixa(p).toFixed(2)}px`);
}

{
  // O contrário: a troca LEGÍTIMA precisa acontecer. A pessoa da esquerda sai
  // de cena e outra, maior, assume. Sem isso a "estabilidade" seria só
  // teimosia enquadrando parede.
  const p = planejarTrajetoria(
    serie(0, 12, 0.25, (t) => (t <= 2 ? [rosto(500)] : [rosto(1400, 260)])),
    FONTE,
    SAIDA,
  );
  conferir("troca de assunto acontece quando o antigo sai",
    Math.abs(fim(p) - (1400 - ZONA)) < 1, `${fim(p).toFixed(1)}`);
  conferir("mas sem teleporte", velocidadeMaxima(p) <= VEL_MAX * 1.001,
    `${velocidadeMaxima(p).toFixed(1)}px/s`);
  // ...e não é instantânea: o rosto novo já está lá desde 2,25 s, mas a
  // câmera não encosta nele antes das 3 amostras de confirmação. Um "segue o
  // maior rosto" ingênuo teria começado a andar em 2,25 s.
  conferir("a troca espera a confirmação", Math.abs(centroEm(p, 2.5) - 500) < 0.5,
    `x(2,5s)=${centroEm(p, 2.5).toFixed(1)}`);
}

console.log("\n=== sem rosto ===\n");

{
  // Alguém vira de costas aos 2 s e não volta mais.
  const p = planejarTrajetoria(
    serie(0, 12, 0.25, (t) => (t <= 2 ? [rosto(500)] : [])),
    FONTE,
    SAIDA,
  );
  conferir("segura a última posição no buraco curto",
    Math.abs(centroEm(p, 2.5) - 500) < 1, `x(2,5s)=${centroEm(p, 2.5).toFixed(1)}`);
  conferir("não congela para sempre: deriva ao centro",
    Math.abs(fim(p) - (960 - ZONA)) < 1, `${fim(p).toFixed(1)} vs ${(960 - ZONA).toFixed(1)}`);
  conferir("e não teleporta", velocidadeMaxima(p) <= VEL_MAX * 1.001,
    `${velocidadeMaxima(p).toFixed(1)}px/s`);
}

{
  // Piscada do detector: um buraco de uma amostra a cada três. Isso NÃO pode
  // gerar movimento nenhum — é o caso mais comum de todos.
  let i = 0;
  const p = planejarTrajetoria(
    serie(0, 12, 0.25, () => (i++ % 3 === 2 ? [] : [rosto(700)])),
    FONTE,
    SAIDA,
  );
  conferir("piscada do detector não move nada", faixa(p) < 0.5, `faixa=${faixa(p).toFixed(3)}px`);
}

console.log("\n=== bordas ===\n");

{
  const esquerda = planejarTrajetoria(serie(0, 8, 0.25, () => [rosto(100, 200)]), FONTE, SAIDA);
  const direita = planejarTrajetoria(serie(0, 8, 0.25, () => [rosto(1880, 200)]), FONTE, SAIDA);
  const todos = [...esquerda, ...direita];
  conferir("prende à esquerda", Math.abs(esquerda[0].centroX - LIM_MIN) < 1e-6,
    `${esquerda[0].centroX}`);
  conferir("prende à direita", Math.abs(direita[0].centroX - LIM_MAX) < 1e-6,
    `${direita[0].centroX}`);
  conferir("o recorte nunca sai da fonte",
    todos.every((p) => p.centroX - CROP / 2 >= -1e-6 && p.centroX + CROP / 2 <= FONTE.largura + 1e-6));
}

{
  // Atravessar batendo nas duas paredes: o filtro não pode "enrolar" contra a
  // borda e demorar a desgrudar na volta.
  const p = planejarTrajetoria(
    serie(0, 20, 0.25, (t) => [rosto(t < 8 ? 60 : 1860)]),
    FONTE,
    SAIDA,
  );
  conferir("desgruda da borda sem atraso extra",
    Math.abs(fim(p) - LIM_MAX) < 1, `${fim(p).toFixed(1)}`);
  conferir("respeita as duas bordas",
    p.every((q) => q.centroX >= LIM_MIN - 1e-6 && q.centroX <= LIM_MAX + 1e-6));
}

console.log("\n=== simplificação ===\n");

{
  const reta: Ponto[] = Array.from({ length: 50 }, (_, i) => ({ t: i * 0.25, centroX: 400 + i * 10 }));
  conferir("reta vira dois pontos", simplificar(reta, TOL).length === 2,
    `${simplificar(reta, TOL).length}`);
  const parado: Ponto[] = Array.from({ length: 50 }, (_, i) => ({ t: i * 0.25, centroX: 700 }));
  conferir("constante vira um ponto só", simplificar(parado, TOL).length === 1);
}

{
  // Cena realista: parada longa, panorâmica, parada, panorâmica de volta.
  const caminho = (t: number) => {
    if (t < 10) return 700;
    if (t < 13) return 700 + 200 * (t - 10);
    if (t < 23) return 1300;
    if (t < 26) return 1300 - 200 * (t - 23);
    return 700;
  };
  const amostras = serie(0, 36, 0.25, (t) => [rosto(caminho(t))]);

  const fiel = planejarTrajetoria(amostras, FONTE, SAIDA, { toleranciaFracao: 0 });
  const simples = planejarTrajetoria(amostras, FONTE, SAIDA);

  let pior = 0;
  for (let t = 0; t <= 36; t += 0.01) {
    pior = Math.max(pior, Math.abs(centroEm(simples, t) - centroEm(fiel, t)));
  }

  conferir("simplificação reduz muito os pontos", simples.length <= amostras.length / 5,
    `${simples.length} pontos para ${amostras.length} amostras`);
  conferir("também contra a trajetória fiel", simples.length < fiel.length,
    `${simples.length} vs ${fiel.length}`);
  conferir(`erro máximo sob a tolerância de ${TOL.toFixed(2)}px`, pior <= TOL + 1e-9,
    `${pior.toFixed(3)}px`);
  conferir("e a simplificação não inventa velocidade",
    velocidadeMaxima(simples) <= VEL_MAX * 1.001, `${velocidadeMaxima(simples).toFixed(1)}px/s`);
}

{
  // Trajetória inteira com tremor: o número de pontos tem que continuar
  // pequeno, senão a expressão de ffmpeg vira um monstro.
  let i = 0;
  const amostras = serie(0, 60, 0.2, (t) => [rosto(960 + 300 * Math.sin(t / 6) + tremor(i++, 4))]);
  const p = planejarTrajetoria(amostras, FONTE, SAIDA);
  conferir("panorâmica longa cabe em poucos pontos", p.length <= 40,
    `${p.length} pontos para ${amostras.length} amostras`);
}

console.log();
if (falhas > 0) {
  console.log(`${falhas} falha(s).`);
  process.exit(1);
}
console.log(
  "Trajetória estável: não treme, não pinga entre pessoas, não teleporta e não sai da fonte.",
);
