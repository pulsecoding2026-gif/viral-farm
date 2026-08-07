/**
 * A conta do enquadramento manual — arrastar e dar zoom direto na prévia.
 *
 * MORA AQUI, e não dentro do componente, por um motivo só: isto é REGRA, e
 * regra tem que ser conferível sem navegador. `worker/testar-enquadrar.ts`
 * importa este arquivo e checa os números contra o filtro que o ffmpeg recebe
 * (`filtroDeEnquadramento()` em worker/render-projeto.ts). Se a interface
 * tivesse a própria conta, ela divergiria do render — a pessoa arrastaria até
 * a borda na tela e o MP4 sairia com o quadro em outro lugar.
 *
 * TUDO AQUI É FRAÇÃO, nunca pixel (regra 3 de projeto.ts). A única função que
 * conhece pixel é `arrastoEmFracao()`, e ela existe exatamente pra traduzir o
 * gesto do mouse — que nasce em pixel de tela — pra fração da FONTE.
 *
 * A ideia central é a JANELA VISÍVEL: com um dado zoom, o quadro de saída
 * mostra uma fatia da fonte de tamanho conhecido. O centro do recorte
 * (`Enquadramento.x`/`y`) só pode andar dentro do que sobra dessa fatia — e é
 * daí que sai o limite que impede faixa vazia na borda.
 */

import { ENQUADRAMENTO_PADRAO, type Enquadramento } from "./projeto";

export type Dimensoes = { largura: number; altura: number };

/**
 * Fonte e saída andam sempre juntas: nenhuma conta de enquadramento fecha
 * sabendo só uma das duas — é a razão entre elas que define o recorte.
 */
export type Medidas = { fonte: Dimensoes; saida: Dimensoes };

/**
 * Zoom 1 é "cobrir o quadro sem sobra"; abaixo disso apareceria faixa vazia,
 * que é o defeito que o recorte existe pra evitar. O teto de 3 é do produto:
 * material de celular a 1080p já fica lavado bem antes disso, e liberar mais
 * só entrega borrão com cara de erro do render.
 */
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;

function limite(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(v, max));
}

/** Gesto de mouse com número quebrado vira NaN e contamina o projeto inteiro. */
function finito(v: number, padrao: number): number {
  return Number.isFinite(v) ? v : padrao;
}

/** Sem as duas dimensões (metadado do vídeo ainda não chegou) não há conta. */
export function medidasValidas(m: Medidas): boolean {
  return (
    m.fonte.largura > 0 &&
    m.fonte.altura > 0 &&
    m.saida.largura > 0 &&
    m.saida.altura > 0
  );
}

export function zoomValido(zoom: number): number {
  return limite(finito(zoom, ZOOM_MIN), ZOOM_MIN, ZOOM_MAX);
}

/**
 * Quanto da FONTE cabe no quadro de saída, por eixo, em fração de 0 a 1.
 *
 * Mesma escala do worker: a que cobre o quadro, vezes o zoom. Como a escala de
 * cobertura nunca deixa a fonte menor que a saída, a fração nunca passa de 1 —
 * quando dá exatamente 1 aquele eixo não tem folga nenhuma, e o centro fica
 * travado no meio (é o que acontece com o eixo horizontal ao levar 16:9 pra
 * 9:16 sem zoom).
 */
export function janelaVisivel(m: Medidas, zoom: number): { x: number; y: number } {
  if (!medidasValidas(m)) return { x: 1, y: 1 };
  const cobrir = Math.max(
    m.saida.largura / m.fonte.largura,
    m.saida.altura / m.fonte.altura,
  );
  const escala = cobrir * zoomValido(zoom);
  return {
    x: Math.min(1, m.saida.largura / (m.fonte.largura * escala)),
    y: Math.min(1, m.saida.altura / (m.fonte.altura * escala)),
  };
}

/**
 * Prende um enquadramento no que é desenhável: zoom na faixa e centro dentro
 * das bordas da fonte.
 *
 * É a MESMA regra do `crop` no worker, dita em fração em vez de pixel: lá o
 * deslocamento do recorte é preso em `[0, escalado - saida]`; aqui isso vira
 * um centro preso em `[visivel/2, 1 - visivel/2]`. As duas contas têm que
 * fechar, e o teste do worker é quem cobra isso.
 *
 * Idempotente de propósito — a interface chama de novo a cada gesto.
 */
export function prender(e: Enquadramento, m: Medidas): Enquadramento {
  const zoom = zoomValido(e.zoom);
  const v = janelaVisivel(m, zoom);
  return {
    ...e,
    zoom,
    x: limite(finito(e.x, 0.5), v.x / 2, 1 - v.x / 2),
    y: limite(finito(e.y, 0.5), v.y / 2, 1 - v.y / 2),
  };
}

/**
 * Que ponto da FONTE está sob um ponto do quadro de SAÍDA.
 *
 * `ancoraX`/`ancoraY` vão de 0 a 1 no quadro de saída (0,0 é o canto superior
 * esquerdo da prévia). É a conta que sustenta o zoom ancorado no cursor — e
 * também o que o teste mede pra provar que o ponto não escorregou.
 */
export function pontoDaFonte(
  e: Enquadramento,
  ancoraX: number,
  ancoraY: number,
  m: Medidas,
): { x: number; y: number } {
  const preso = prender(e, m);
  const v = janelaVisivel(m, preso.zoom);
  return {
    x: preso.x + (ancoraX - 0.5) * v.x,
    y: preso.y + (ancoraY - 0.5) * v.y,
  };
}

/**
 * Delta de PIXEL na tela virando delta de fração da fonte, já com o sinal do
 * arrasto.
 *
 * `quadro` é o tamanho da prévia NA TELA, medido na hora — a prévia pode ter
 * 320px numa janela estreita e 700 numa larga, e o mesmo gesto tem que andar a
 * mesma fração nos dois casos.
 *
 * O SINAL É INVERTIDO de propósito: arrastar pra direita empurra a IMAGEM pra
 * direita, o que significa olhar mais pra ESQUERDA da fonte — ou seja, centro
 * menor. Sem a inversão o vídeo foge do mouse, que é o jeito mais rápido de
 * fazer um editor parecer quebrado.
 *
 * A janela visível entra na conta porque com zoom alto o mesmo pixel de tela
 * vale menos fonte: é o que dá controle fino justamente quando ele é preciso.
 */
export function arrastoEmFracao(
  dxPx: number,
  dyPx: number,
  quadro: Dimensoes,
  zoom: number,
  m: Medidas,
): { dx: number; dy: number } {
  if (quadro.largura <= 0 || quadro.altura <= 0) return { dx: 0, dy: 0 };
  const v = janelaVisivel(m, zoom);
  return {
    dx: -(finito(dxPx, 0) / quadro.largura) * v.x,
    dy: -(finito(dyPx, 0) / quadro.altura) * v.y,
  };
}

/**
 * Move o centro do recorte, preso às bordas.
 *
 * Os deltas já vêm em fração da FONTE (use `arrastoEmFracao()` pra converter o
 * gesto). Prende antes e depois: antes porque o valor que veio do projeto pode
 * ter sido salvo por outra versão ou por um zoom maior, depois porque é o que
 * garante a borda.
 */
export function moverEnquadramento(
  atual: Enquadramento,
  dxFracao: number,
  dyFracao: number,
  m: Medidas,
): Enquadramento {
  const base = prender(atual, m);
  return prender(
    {
      ...base,
      x: base.x + finito(dxFracao, 0),
      y: base.y + finito(dyFracao, 0),
    },
    m,
  );
}

/**
 * Zoom com o ponto sob o cursor PARADO.
 *
 * O truque é não pensar em zoom, e sim em ancoragem: descobre-se qual ponto da
 * fonte está debaixo do cursor AGORA, aplica-se o zoom novo e resolve-se o
 * centro que recoloca aquele mesmo ponto debaixo do cursor. Duas linhas, e é a
 * diferença entre parecer profissional e parecer um zoom de leitor de PDF —
 * zoom centrado sempre puxa a imagem pra longe do que a pessoa está olhando,
 * obrigando a corrigir a posição a cada rolada.
 *
 * `fator` é multiplicativo (1,1 aproxima 10%), porque zoom é percepção
 * geométrica: somar passos fixos anda rápido demais perto de 1 e devagar
 * demais perto de 3.
 *
 * Na BORDA o ponto escorrega, e tem que escorregar mesmo: segurar a âncora ali
 * exigiria deixar faixa vazia. O limite vence a ancoragem, sempre.
 */
export function zoomAncorado(
  atual: Enquadramento,
  fator: number,
  ancoraX: number,
  ancoraY: number,
  m: Medidas,
): Enquadramento {
  const base = prender(atual, m);
  const zoom = zoomValido(base.zoom * finito(fator, 1));
  if (zoom === base.zoom) return base;

  const depois = janelaVisivel(m, zoom);
  const ax = limite(finito(ancoraX, 0.5), 0, 1);
  const ay = limite(finito(ancoraY, 0.5), 0, 1);
  const alvo = pontoDaFonte(base, ax, ay, m);

  return prender(
    {
      ...base,
      zoom,
      x: alvo.x - (ax - 0.5) * depois.x,
      y: alvo.y - (ay - 0.5) * depois.y,
    },
    m,
  );
}

/**
 * Volta ao enquadramento padrão.
 *
 * A ROTAÇÃO SOBREVIVE: ela é outro controle (o Inspector), e um botão que
 * promete "centralizar" apagando o endireitamento do material torto destrói
 * trabalho que ninguém mandou destruir.
 */
export function centralizar(atual: Enquadramento): Enquadramento {
  return { ...ENQUADRAMENTO_PADRAO, rotacao: atual.rotacao };
}

/** Já está no padrão? Serve pra desligar o botão que não faria nada. */
export function noPadrao(e: Enquadramento): boolean {
  return e.x === 0.5 && e.y === 0.5 && zoomValido(e.zoom) === ZOOM_MIN;
}

/** "1,4×" — vírgula porque a interface inteira é em português. */
export function rotuloDeZoom(zoom: number): string {
  return `${zoomValido(zoom).toFixed(1).replace(".", ",")}×`;
}
