/**
 * Trajetória de rosto → filtro `crop` que se move junto.
 *
 * A outra ponta do rastreamento: um agente acha os rostos, outro suaviza a
 * linha, e AQUI ela vira filtro de ffmpeg que roda de verdade. O crop do
 * ffmpeg avalia `x` e `y` UMA VEZ POR FRAME e aceita expressão com `t` — é
 * essa brecha que permite animar o enquadramento sem `zoompan` (que trabalha
 * por número de frame, não por segundo, e é caro num núcleo só).
 *
 * Largura e altura do crop continuam FIXAS: o ffmpeg só as lê na
 * inicialização. Então isto é PANORÂMICA, não zoom — que é exatamente o que
 * seguir um rosto pede.
 *
 * ────────────────────────────────────────────────────────────────────────
 * POR QUE A ÁRVORE É BALANCEADA, E NÃO UMA CADEIA
 *
 * A forma óbvia de interpolar é encadear:
 *
 *     if(lt(t,T1), <seg 1>, if(lt(t,T2), <seg 2>, if(...)))
 *
 * Ela MORRE em 95 pontos. O avaliador do ffmpeg protege a pilha com um
 * contador de profundidade (`stack_index`, 100 em eval.c) e cada argumento de
 * função gasta um nível; passando disso o filtro nem monta — "Failed to
 * configure input pad on Parsed_crop_0", medido em ffmpeg 9.0 e igual no 6.1
 * da VPS, porque o limite é a mesma constante desde sempre.
 *
 * 95 pontos é pouco: uma trajetória de rosto a 30fps gasta isso em 3
 * segundos. Então o mesmo `if(lt(t,...))` é montado como BUSCA BINÁRIA no
 * tempo — a profundidade cai de N para log2(N), e o teto do parser some:
 *
 *     if(lt(t,T_meio), <metade esquerda>, <metade direita>)
 *
 * De quebra fica mais barato por frame (log2(N) comparações em vez de N/2),
 * o que importa numa VPS de 1 vCPU.
 *
 * O TETO QUE SOBRA É O TAMANHO DO ARGUMENTO, não o parser. Medido: 800
 * ramos = 32640 caracteres é o último que o Windows aceita (limite de 32767
 * da linha de comando); no Linux o teto por argumento é 128 KiB, ~3200
 * ramos. Como o filtro viaja junto de outros argumentos, o cap fica em
 * MAX_PONTOS = 400 (~16 KB de expressão), que passa folgado nos dois.
 *
 * Acima de MAX_PONTOS a trajetória é RALEADA (pontos uniformemente
 * descartados, primeiro e último preservados) — nunca truncada, que
 * congelaria o enquadramento no meio do clipe, e nunca recusada, que
 * derrubaria o render por causa de um detalhe de formatação.
 * ────────────────────────────────────────────────────────────────────────
 */

/** Um ponto da trajetória. `t` em segundos desde o início do clipe;
 *  `centroX` em pixels da FONTE (antes de qualquer escala). */
export type Ponto = { t: number; centroX: number };

export type Dimensoes = { largura: number; altura: number };

/** Teto de ramos na expressão. Ver o cabeçalho: é tamanho de argv, não
 *  limite do parser. */
export const MAX_PONTOS = 400;

/**
 * Sub-pixel de erro que autoriza jogar um ponto fora.
 *
 * Trajetória suavizada tem trecho reto de sobra, e ponto que a reta dos
 * vizinhos já prevê dentro de meio pixel não muda um frame sequer — só
 * engorda a expressão e aproxima o teto.
 */
const TOLERANCIA_PX = 0.5;

/** Quantos pontos seguidos a simplificação pode engolir de uma vez. Trava de
 *  custo: sem ela, uma trajetória parada vira O(n²). */
const CORRIDA_MAXIMA = 64;

/** yuv420p exige lado par; ímpar faz o ffmpeg recusar o filtro. */
function par(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2);
}

function limite(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(v, max));
}

/**
 * Número curto pra dentro da expressão.
 *
 * `toFixed` sozinho deixa zero à direita ("1234.500"), e são milhares de
 * caracteres desperdiçados perto do teto. O Number() de volta corta o rabo.
 */
function num(v: number, casas: number): string {
  return String(Number(v.toFixed(casas)));
}

/** Ponto já convertido pro mundo do crop: `x` é a borda esquerda da janela. */
type Amostra = { t: number; x: number };

export type PlanoDeCropAnimado = {
  /** Tamanho da fonte depois do scale que cobre o quadro de saída. */
  escalado: Dimensoes;
  /** Quadro que sai, com os lados já forçados a par. */
  saida: Dimensoes;
  /** Maior `x` válido. A expressão nunca pode passar disso. */
  xMaximo: number;
  /** `y` fixo: a trajetória só tem eixo horizontal. */
  y: number;
  /** A trajetória COMO ELA FOI USADA: ordenada, sem `t` repetido,
   *  simplificada e raleada. */
  amostras: Amostra[];
  /** Quantos pontos a ralação descartou por causa do teto. 0 = coube. */
  raleados: number;
  /** Só a expressão de `x`, sem as aspas do parser de filtro. */
  expressaoX: string;
  /** A cadeia completa, pronta pro -vf / -filter_complex. */
  filtro: string;
};

/**
 * Limpa a trajetória crua.
 *
 * Três defeitos que chegam de fora e derrubariam o render:
 *   · t ou centroX não-finito (detector que não convergiu num frame);
 *   · fora de ordem (detecção em paralelo devolve na ordem que terminar);
 *   · t REPETIDO — que é divisão por zero na inclinação do segmento.
 *
 * O `t` é arredondado ao milissegundo ANTES de deduplicar, e não depois: o
 * que vai pra expressão é o valor arredondado, então deduplicar no valor cru
 * deixaria passar dois pontos que imprimem o mesmo número e a inclinação
 * dividiria por zero de qualquer jeito.
 */
function normalizar(
  pontos: Ponto[],
  fator: number,
  larguraSaida: number,
  xMaximo: number,
): Amostra[] {
  const limpos: Amostra[] = [];
  for (const p of pontos) {
    if (!Number.isFinite(p.t) || !Number.isFinite(p.centroX)) continue;
    limpos.push({
      t: Math.round(p.t * 1000) / 1000,
      // O clamp acontece JÁ AQUI, ponto a ponto. Interpolar entre dois
      // valores válidos devolve valor válido, então a expressão inteira
      // nasce dentro do quadro — o max/min lá fora é cinto e suspensório.
      x: limite(p.centroX * fator - larguraSaida / 2, 0, xMaximo),
    });
  }

  limpos.sort((a, b) => a.t - b.t);

  const unicos: Amostra[] = [];
  for (const a of limpos) {
    // Empate em t: fica o PRIMEIRO da ordenação. Escolher média mudaria a
    // trajetória em silêncio; descartar é honesto e o suavizador não deveria
    // ter produzido dois mesmo.
    if (unicos.length > 0 && unicos[unicos.length - 1].t === a.t) continue;
    unicos.push(a);
  }
  return unicos;
}

/** Valor da reta a→b no instante t. */
function naReta(a: Amostra, b: Amostra, t: number): number {
  return a.x + ((b.x - a.x) * (t - a.t)) / (b.t - a.t);
}

/** Tira os pontos que a reta dos vizinhos já prevê dentro da tolerância. */
function simplificar(pts: Amostra[]): Amostra[] {
  if (pts.length <= 2) return pts;

  const mantidos: Amostra[] = [pts[0]];
  let ancora = 0;

  for (let i = 1; i < pts.length - 1; i++) {
    const fim = i + 1;
    let cabe = i - ancora < CORRIDA_MAXIMA;
    for (let j = ancora + 1; cabe && j <= i; j++) {
      if (Math.abs(naReta(pts[ancora], pts[fim], pts[j].t) - pts[j].x) > TOLERANCIA_PX) {
        cabe = false;
      }
    }
    if (!cabe) {
      mantidos.push(pts[i]);
      ancora = i;
    }
  }

  mantidos.push(pts[pts.length - 1]);
  return mantidos;
}

/** Ralação uniforme, preservando as duas pontas. Último recurso. */
function ralear(pts: Amostra[], teto: number): Amostra[] {
  if (pts.length <= teto) return pts;
  const saida: Amostra[] = [];
  for (let i = 0; i < teto; i++) {
    saida.push(pts[Math.round((i * (pts.length - 1)) / (teto - 1))]);
  }
  // O arredondamento pode repetir índice quando teto ≈ length; o filtro
  // abaixo garante `t` estritamente crescente, que é o que a expressão exige.
  return saida.filter((a, i) => i === 0 || a.t > saida[i - 1].t);
}

/**
 * Os ramos da expressão, em ordem de tempo.
 *
 * São N+1 pra N amostras: um SEGURA o primeiro valor antes do primeiro
 * instante, N-1 interpolam, e o último SEGURA o último valor pra sempre.
 *
 * As duas pontas são o motivo de o ramo existir. Sem a de trás, um clipe que
 * começa antes do primeiro rosto detectado extrapolaria a reta pra trás e
 * pediria um crop fora do quadro; sem a da frente, o mesmo no fim. Segurar é
 * o comportamento certo: o rosto não some, a detecção é que acabou.
 */
function ramos(pts: Amostra[]): { limiteInferior: number; expr: string }[] {
  const fora: { limiteInferior: number; expr: string }[] = [
    // limiteInferior do primeiro ramo nunca é impresso (ele é o "else" mais
    // à esquerda da árvore); fica -Infinity só pra deixar a lista honesta.
    { limiteInferior: -Infinity, expr: num(pts[0].x, 2) },
  ];

  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    // Inclinação pré-calculada em vez de (X1-X0)*(t-T0)/(T1-T0) escrito por
    // extenso: é a MESMA reta com metade dos caracteres, e são caracteres
    // contra o teto de tamanho do argumento.
    const inclinacao = (b.x - a.x) / (b.t - a.t);
    const s = num(inclinacao, 3);
    fora.push({
      limiteInferior: a.t,
      // Inclinação que arredonda pra zero é trecho parado: vira constante.
      expr: s === "0" ? num(a.x, 2) : `${num(a.x, 2)}+(t-${num(a.t, 3)})*${s}`,
    });
  }

  fora.push({
    limiteInferior: pts[pts.length - 1].t,
    expr: num(pts[pts.length - 1].x, 2),
  });
  return fora;
}

/** Busca binária no tempo, escrita como if() aninhado. Ver o cabeçalho. */
function arvore(
  r: { limiteInferior: number; expr: string }[],
  lo: number,
  hi: number,
): string {
  if (lo === hi) return r[lo].expr;
  const meio = (lo + hi) >> 1;
  return (
    `if(lt(t,${num(r[meio + 1].limiteInferior, 3)}),` +
    `${arvore(r, lo, meio)},${arvore(r, meio + 1, hi)})`
  );
}

/**
 * Tudo que o filtro precisa, separado do filtro.
 *
 * Existe apartado de `filtroDeCropAnimado` porque o teste precisa dos
 * números (escala, xMáximo, quantos pontos sobraram) pra conferir o que
 * mediu no vídeo — e porque quem chamar isso um dia vai querer logar
 * "raleados: 340" sem ter que reparsear uma string de 16 KB.
 */
export function planejarCropAnimado(
  pontos: Ponto[],
  fonte: Dimensoes,
  saidaPedida: Dimensoes,
): PlanoDeCropAnimado {
  const saida = {
    largura: par(saidaPedida.largura),
    altura: par(saidaPedida.altura),
  };

  // Mesma conta do enquadramento estático: a escala que COBRE o quadro, sem
  // sobra. Assim o crop sempre tem de onde tirar pixel.
  const cobrir = Math.max(
    saida.largura / fonte.largura,
    saida.altura / fonte.altura,
  );
  // O par() arredonda pra baixo às vezes; o max() impede que o escalado saia
  // um pixel MENOR que o crop, que é um filtro que não monta.
  const escalado = {
    largura: Math.max(saida.largura, par(fonte.largura * cobrir)),
    altura: Math.max(saida.altura, par(fonte.altura * cobrir)),
  };

  const fator = escalado.largura / fonte.largura;
  const xMaximo = escalado.largura - saida.largura;
  const y = Math.round((escalado.altura - saida.altura) / 2);

  const normalizados = normalizar(pontos, fator, saida.largura, xMaximo);
  const simplificados = simplificar(normalizados);
  const amostras = ralear(simplificados, MAX_PONTOS);
  const raleados = simplificados.length - amostras.length;

  const expressaoX = montarExpressao(amostras, xMaximo);
  const estatico = !expressaoX.includes("(");

  return {
    escalado,
    saida,
    xMaximo,
    y,
    amostras,
    raleados,
    expressaoX,
    // Aspas simples são do parser de FILTRO do ffmpeg, não do shell (o spawn
    // não passa por shell nenhum). Sem elas, a primeira vírgula do if()
    // partiria a cadeia em dois filtros e o grafo nem montaria.
    filtro:
      `scale=${escalado.largura}:${escalado.altura},` +
      `crop=${saida.largura}:${saida.altura}:` +
      (estatico ? expressaoX : `'${expressaoX}'`) +
      `:${y}`,
  };
}

function montarExpressao(amostras: Amostra[], xMaximo: number): string {
  // Fonte tão estreita quanto o quadro: não há pra onde panoramizar.
  if (xMaximo <= 0) return "0";

  // Sem ponto nenhum, o comportamento tem que ser o de sempre: crop central.
  // Cair aqui é o detector não ter achado rosto, e centro é o palpite que o
  // produto já fazia antes de existir rastreamento.
  if (amostras.length === 0) return String(Math.round(xMaximo / 2));

  // Um ponto só é enquadramento ESTÁTICO deslocado — nada de expressão. O
  // ffmpeg pula a avaliação por frame inteira, e o filtro fica legível no log.
  //
  // Vários pontos no MESMO x caem aqui também, e não é caso raro: alguém
  // sentado falando pra câmera produz trajetória reta, e a simplificação a
  // reduz a duas pontas iguais. Não faz sentido pagar avaliação por frame
  // pra devolver sempre o mesmo número.
  if (amostras.every((a) => a.x === amostras[0].x)) {
    return String(Math.round(limite(amostras[0].x, 0, xMaximo)));
  }

  const r = ramos(amostras);
  // O max/min é REDUNDANTE por construção (cada amostra já nasceu presa, e
  // reta entre presos é presa). Fica assim mesmo: é a única garantia que
  // sobrevive a um bug aqui dentro, e custa uma comparação por frame. O
  // ffmpeg também prende `x` por conta própria, mas depender disso seria
  // depender de detalhe interno de uma versão.
  return `max(0,min(${arvore(r, 0, r.length - 1)},${xMaximo}))`;
}

/**
 * A cadeia de filtros: escala pra cobrir o quadro e recorta seguindo a
 * trajetória.
 *
 * Note que o `x` que o ffmpeg usa de fato ainda é alinhado por ele ao croma
 * (yuv420p força x par), então o resultado pode ficar 1px à esquerda do que
 * a expressão pediu. É invisível e não vale gastar expressão pra corrigir.
 */
export function filtroDeCropAnimado(
  pontos: Ponto[],
  fonte: Dimensoes,
  saida: Dimensoes,
): string {
  return planejarCropAnimado(pontos, fonte, saida).filtro;
}
