/**
 * A conta do enquadramento manual, sem navegador e sem ffmpeg.
 *
 *   npx tsx worker/testar-enquadrar.ts
 *
 * Quatro perguntas, e a terceira é a que justifica o arquivo estar AQUI dentro
 * do worker em vez de perto do componente:
 *
 *   1. A janela visível fecha? (quanto da fonte cabe no quadro, por zoom)
 *   2. O centro fica preso, sem deixar faixa vazia na borda?
 *   3. O limite da INTERFACE é o mesmo do RENDER? O teste roda o
 *      `filtroDeEnquadramento()` de verdade e confere que o `crop` do ffmpeg
 *      NÃO precisou corrigir nada. Se a interface deixasse arrastar um pouco
 *      além, o worker corrigiria calado e o MP4 sairia diferente da prévia —
 *      a divergência que ninguém percebe até o vídeo estar publicado.
 *   4. O zoom respeita 1..3 e mantém o ponto sob o cursor parado?
 */
import { filtroDeEnquadramento } from "./render-projeto";
import {
  ZOOM_MAX,
  ZOOM_MIN,
  arrastoEmFracao,
  centralizar,
  janelaVisivel,
  moverEnquadramento,
  noPadrao,
  pontoDaFonte,
  prender,
  rotuloDeZoom,
  zoomAncorado,
  type Medidas,
} from "../src/lib/editor/enquadrar-calc";
import {
  ENQUADRAMENTO_PADRAO,
  PROPORCOES,
  type Enquadramento,
} from "../src/lib/editor/projeto";

let falhas = 0;

function conferir(nome: string, ok: boolean, detalhe = "") {
  console.log(`${ok ? "ok  " : "ERRO"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  if (!ok) falhas += 1;
}

function enq(over: Partial<Enquadramento> = {}): Enquadramento {
  return { ...ENQUADRAMENTO_PADRAO, ...over };
}

const n = (v: number, casas = 6) => v.toFixed(casas);

/** 16:9 virando 9:16 — o caso do produto: corte de podcast horizontal em Reels. */
const DEITADO: Medidas = {
  fonte: { largura: 1920, altura: 1080 },
  saida: PROPORCOES["9:16"],
};

/** Fonte já vertical indo pro YouTube: o eixo travado troca de lado. */
const EM_PE: Medidas = {
  fonte: { largura: 1080, altura: 1920 },
  saida: PROPORCOES["16:9"],
};

const QUADRADO: Medidas = {
  fonte: { largura: 1920, altura: 1080 },
  saida: PROPORCOES["1:1"],
};

console.log("=== 1. a janela visível ===\n");
{
  const v1 = janelaVisivel(DEITADO, 1);
  // 1080/1920 do quadro cabe na largura escalada: (1080/1920)² = 0.31640625.
  conferir(
    "16:9 em 9:16 mostra 31,6% da largura da fonte",
    Math.abs(v1.x - 0.31640625) < 1e-9,
    `x=${n(v1.x)}`,
  );
  conferir(
    "e a altura inteira — este eixo não tem folga",
    v1.y === 1,
    `y=${n(v1.y)}`,
  );

  const v2 = janelaVisivel(DEITADO, 2);
  conferir(
    "zoom 2 mostra metade de cada eixo",
    Math.abs(v2.x - v1.x / 2) < 1e-12 && Math.abs(v2.y - 0.5) < 1e-12,
    `${n(v2.x)} / ${n(v2.y)}`,
  );

  const p = janelaVisivel(EM_PE, 1);
  conferir(
    "fonte em pé no 16:9 trava o outro eixo",
    p.x === 1 && Math.abs(p.y - 0.31640625) < 1e-9,
    `x=${n(p.x)} y=${n(p.y)}`,
  );
}

console.log("\n=== 2. o centro fica preso ===\n");
{
  const v = janelaVisivel(DEITADO, 1);

  const esquerda = moverEnquadramento(enq(), -5, -5, DEITADO);
  conferir(
    "arrastar 5 fontes pra esquerda para na borda",
    Math.abs(esquerda.x - v.x / 2) < 1e-12,
    `x=${n(esquerda.x)} (mínimo ${n(v.x / 2)})`,
  );
  conferir(
    "eixo sem folga não sai do meio",
    esquerda.y === 0.5,
    `y=${n(esquerda.y)}`,
  );

  const direita = moverEnquadramento(enq(), 5, 5, DEITADO);
  conferir(
    "e pra direita para na outra borda",
    Math.abs(direita.x - (1 - v.x / 2)) < 1e-12,
    `x=${n(direita.x)} (máximo ${n(1 - v.x / 2)})`,
  );

  const comZoom = moverEnquadramento(enq({ zoom: 2 }), 0, 5, DEITADO);
  conferir(
    "com zoom 2 o eixo destravado anda até 0,75",
    Math.abs(comZoom.y - 0.75) < 1e-12,
    `y=${n(comZoom.y)}`,
  );

  // Ida e volta sem encostar na borda tem que voltar ao mesmo lugar: é o que
  // garante que arrastar e desistir não deixa o quadro torto.
  const ida = moverEnquadramento(enq({ zoom: 2 }), 0.05, 0, DEITADO);
  const volta = moverEnquadramento(ida, -0.05, 0, DEITADO);
  conferir(
    "ida e volta longe da borda devolve o valor original",
    Math.abs(volta.x - 0.5) < 1e-12,
    `x=${n(volta.x)}`,
  );

  const sujo = prender(
    { x: Number.NaN, y: 2, zoom: 0.2, rotacao: 0 },
    DEITADO,
  );
  conferir(
    "valor sujo não contamina o projeto",
    sujo.x === 0.5 && sujo.y === 0.5 && sujo.zoom === ZOOM_MIN,
    `x=${n(sujo.x)} y=${n(sujo.y)} zoom=${sujo.zoom}`,
  );
}

console.log("\n=== 3. o limite da interface é o do render ===\n");
{
  let piorFolga = Number.POSITIVE_INFINITY;
  let piorDesvio = 0;
  let sobrou = 0;
  let corrigidos = 0;
  let casos = 0;

  for (const [rotulo, m] of [
    ["16:9→9:16", DEITADO],
    ["9:16→16:9", EM_PE],
    ["16:9→1:1", QUADRADO],
  ] as const) {
    for (const zoom of [1, 1.37, 2, 3]) {
      for (const alvoX of [-1, 0, 0.2, 0.5, 0.8, 1, 2]) {
        for (const alvoY of [-1, 0, 0.35, 0.5, 0.9, 2]) {
          casos += 1;
          const p = prender({ x: alvoX, y: alvoY, zoom, rotacao: 0 }, m);
          const filtro = filtroDeEnquadramento(m.fonte, m.saida, p);
          const bater = /scale=(\d+):(\d+),crop=(\d+):(\d+):(\d+):(\d+)/.exec(filtro);
          if (!bater) {
            conferir(`${rotulo} gera filtro`, false, filtro);
            continue;
          }
          const [, L, A, w, h, cx, cy] = bater.map(Number);

          // O deslocamento que a interface PROMETE, na escala do worker.
          const querX = p.x * L - w / 2;
          const querY = p.y * A - h / 2;
          // Sobra de imagem além do recorte: negativa seria faixa vazia.
          piorFolga = Math.min(piorFolga, querX, querY, L - w - querX, A - h - querY);
          // O worker arredonda a escala pra lado par; 2px é o erro esperado
          // dessa passagem, qualquer coisa acima disso é conta diferente.
          if (querX < -2 || querY < -2 || querX > L - w + 2 || querY > A - h + 2) {
            sobrou += 1;
          }
          const desvio = Math.max(Math.abs(cx - querX), Math.abs(cy - querY));
          piorDesvio = Math.max(piorDesvio, desvio);
          if (desvio > 2) corrigidos += 1;
        }
      }
    }
  }

  conferir(
    `nenhum enquadramento deixa faixa vazia (${casos} casos)`,
    sobrou === 0,
    `pior folga ${piorFolga.toFixed(2)}px`,
  );
  conferir(
    "o crop do ffmpeg não precisou corrigir a interface",
    corrigidos === 0,
    `pior desvio ${piorDesvio.toFixed(2)}px`,
  );
}

console.log("\n=== 4. o zoom: faixa e âncora ===\n");
{
  conferir(
    "rolar pra frente sem parar trava no máximo",
    zoomAncorado(enq(), 10, 0.5, 0.5, DEITADO).zoom === ZOOM_MAX,
  );
  conferir(
    "rolar pra trás sem parar trava no mínimo",
    zoomAncorado(enq({ zoom: 3 }), 0.01, 0.5, 0.5, DEITADO).zoom === ZOOM_MIN,
  );
  {
    let e = enq();
    for (let i = 0; i < 40; i++) e = zoomAncorado(e, 1.12, 0.31, 0.62, DEITADO);
    conferir("40 roladas seguidas continuam na faixa", e.zoom === ZOOM_MAX, `zoom=${e.zoom}`);
    for (let i = 0; i < 80; i++) e = zoomAncorado(e, 0.9, 0.31, 0.62, DEITADO);
    conferir("e 80 pra trás voltam pro mínimo", e.zoom === ZOOM_MIN, `zoom=${e.zoom}`);
  }

  // O caso limpo, com folga nos dois eixos: a âncora tem que ser EXATA.
  {
    const base = prender(enq({ x: 0.4, y: 0.55, zoom: 1.5 }), DEITADO);
    const ax = 0.25;
    const ay = 0.7;
    const antes = pontoDaFonte(base, ax, ay, DEITADO);
    const novo = zoomAncorado(base, 1.3, ax, ay, DEITADO);
    const depois = pontoDaFonte(novo, ax, ay, DEITADO);
    conferir(
      "o ponto sob o cursor não sai do lugar",
      Math.abs(depois.x - antes.x) < 1e-12 && Math.abs(depois.y - antes.y) < 1e-12,
      `fonte ${n(antes.x)}/${n(antes.y)} → ${n(depois.x)}/${n(depois.y)}`,
    );
    conferir(
      "e o centro andou pra compensar",
      Math.abs(novo.x - 0.387830528846) < 1e-9 &&
        Math.abs(novo.y - 0.580769230769) < 1e-9,
      `centro ${n(base.x)}/${n(base.y)} → ${n(novo.x)}/${n(novo.y)}, zoom ${novo.zoom}`,
    );
    // Zoom CENTRADO no mesmo gesto: o ponto escorrega. É a comparação que
    // mostra por que o ancorado existe.
    const centrado = zoomAncorado(base, 1.3, 0.5, 0.5, DEITADO);
    const arrastouX = Math.abs(pontoDaFonte(centrado, ax, ay, DEITADO).x - antes.x);
    conferir(
      "zoom centrado, no mesmo gesto, arrasta o ponto",
      arrastouX > 0.01,
      `escorregou ${n(arrastouX, 4)} da fonte`,
    );
  }

  // Varredura de âncoras e fatores. Onde o limite entra, o ponto PODE
  // escorregar — segurá-lo ali exigiria deixar faixa vazia.
  {
    let pior = 0;
    let presos = 0;
    let ruins = 0;
    let casos = 0;
    for (const m of [DEITADO, EM_PE, QUADRADO]) {
      for (const zoom of [1, 1.5, 2.4, 3]) {
        for (const fator of [1.05, 1.3, 2.2, 0.95, 0.7, 0.4]) {
          for (const ax of [0, 0.25, 0.5, 0.75, 1]) {
            for (const ay of [0, 0.33, 0.5, 0.9, 1]) {
              casos += 1;
              const base = prender(enq({ x: 0.42, y: 0.61, zoom }), m);
              const antes = pontoDaFonte(base, ax, ay, m);
              const novo = zoomAncorado(base, fator, ax, ay, m);
              const depois = pontoDaFonte(novo, ax, ay, m);
              const v = janelaVisivel(m, novo.zoom);
              const naBorda = (c: number, tam: number) =>
                Math.abs(c - tam / 2) < 1e-9 || Math.abs(c - (1 - tam / 2)) < 1e-9;
              const dx = Math.abs(depois.x - antes.x);
              const dy = Math.abs(depois.y - antes.y);
              const okX = dx < 1e-12 || naBorda(novo.x, v.x);
              const okY = dy < 1e-12 || naBorda(novo.y, v.y);
              if (!okX || !okY) ruins += 1;
              if (naBorda(novo.x, v.x) || naBorda(novo.y, v.y)) presos += 1;
              else pior = Math.max(pior, dx, dy);
              if (novo.zoom < ZOOM_MIN || novo.zoom > ZOOM_MAX) ruins += 1;
            }
          }
        }
      }
    }
    conferir(
      `âncora segura em ${casos} combinações (ou o limite venceu)`,
      ruins === 0,
      `${presos} presos na borda, pior desvio livre ${pior.toExponential(1)}`,
    );
  }

  // O limite vencendo, explícito: quadro na borda direita, zoom saindo de 3
  // pra 1 com o cursor à esquerda. O ponto escorrega e tem que escorregar.
  {
    const v = janelaVisivel(DEITADO, 1);
    const novo = zoomAncorado(enq({ x: 0.9473, zoom: 3 }), 1 / 3, 0, 0.5, DEITADO);
    conferir(
      "na borda o limite vence a âncora, sem faixa vazia",
      Math.abs(novo.x - (1 - v.x / 2)) < 1e-9 && novo.zoom === ZOOM_MIN,
      `x=${n(novo.x)} (máximo ${n(1 - v.x / 2)})`,
    );
  }
}

console.log("\n=== 5. o gesto em pixel vira fração ===\n");
{
  const quadro = { largura: 360, altura: 640 };
  const v = janelaVisivel(DEITADO, 1);

  const meia = arrastoEmFracao(180, 0, quadro, 1, DEITADO);
  conferir(
    "arrastar meia prévia anda meia janela da fonte",
    Math.abs(meia.dx + v.x / 2) < 1e-12,
    `dx=${n(meia.dx)}`,
  );

  const movido = moverEnquadramento(enq(), meia.dx, meia.dy, DEITADO);
  conferir(
    "arrastar pra direita mostra a ESQUERDA da fonte (o vídeo segue o mouse)",
    movido.x < 0.5 && Math.abs(movido.x - (0.5 - v.x / 2)) < 1e-12,
    `x=${n(movido.x)}`,
  );

  const fino = arrastoEmFracao(180, 0, quadro, 2, DEITADO);
  conferir(
    "com zoom 2 o mesmo pixel anda metade — controle fino onde precisa",
    Math.abs(fino.dx - meia.dx / 2) < 1e-12,
    `dx=${n(fino.dx)}`,
  );

  const largo = arrastoEmFracao(180, 0, { largura: 720, altura: 1280 }, 1, DEITADO);
  conferir(
    "prévia do dobro do tamanho anda a metade da fração",
    Math.abs(largo.dx - meia.dx / 2) < 1e-12,
    `dx=${n(largo.dx)}`,
  );

  const semQuadro = arrastoEmFracao(180, 90, { largura: 0, altura: 0 }, 1, DEITADO);
  conferir(
    "prévia ainda não medida não move nada",
    semQuadro.dx === 0 && semQuadro.dy === 0,
  );
}

console.log("\n=== 6. o botão e o rótulo ===\n");
{
  const central = centralizar(enq({ x: 0.2, y: 0.8, zoom: 2.4, rotacao: 3 }));
  conferir(
    "Centralizar volta ao padrão",
    central.x === 0.5 && central.y === 0.5 && central.zoom === 1,
    `${n(central.x)}/${n(central.y)} zoom ${central.zoom}`,
  );
  conferir(
    "e preserva a rotação, que é outro controle",
    central.rotacao === 3,
    `rotacao=${central.rotacao}`,
  );
  conferir("noPadrao() reconhece o padrão", noPadrao(central) && !noPadrao(enq({ zoom: 2 })));
  conferir(
    "o rótulo sai em português",
    rotuloDeZoom(1.4) === "1,4×" && rotuloDeZoom(1) === "1,0×",
    `${rotuloDeZoom(1.4)} / ${rotuloDeZoom(1)}`,
  );
}

console.log();
if (falhas > 0) {
  console.log(`${falhas} falha(s).`);
  process.exit(1);
}
console.log(
  "Enquadramento manual: preso nas bordas, zoom em 1..3, âncora no cursor e a mesma conta do render.",
);
