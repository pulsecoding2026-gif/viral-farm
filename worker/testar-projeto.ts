/**
 * Confere as duas funções do modelo que podem errar em silêncio.
 *
 *   npx tsx worker/testar-projeto.ts
 *
 * Dividir e interpolar são as únicas com conta de verdade. As demais são
 * estrutura, e estrutura errada o TypeScript pega.
 */
import {
  dividirVideo,
  enquadramentoEm,
  ENQUADRAMENTO_PADRAO,
  type ItemVideo,
} from "../src/lib/editor/projeto";

let falhas = 0;

function conferir(nome: string, ok: boolean, detalhe = "") {
  console.log(`${ok ? "ok  " : "ERRO"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  if (!ok) falhas += 1;
}

function perto(a: number, b: number, tol = 0.001): boolean {
  return Math.abs(a - b) < tol;
}

function video(over: Partial<ItemVideo> = {}): ItemVideo {
  return {
    id: "a",
    tipo: "video",
    inicio_s: 0,
    fim_s: 10,
    fonteInicio_s: 100,
    fonteFim_s: 110,
    enquadramento: { ...ENQUADRAMENTO_PADRAO },
    keyframes: [],
    volume: 1,
    efeitos: [],
    transicao: null,
    ...over,
  };
}

console.log("=== dividir ===\n");

{
  const r = dividirVideo(video(), 4, "b");
  conferir("divide no meio", r !== null);
  if (r) {
    const [e, d] = r;
    conferir("esquerda termina no corte", perto(e.fim_s, 4));
    conferir("direita começa no corte", perto(d.inicio_s, 4));
    // 4s de 10 = 40% da janela de origem: 100 + 10*0.4 = 104.
    conferir("fonte da esquerda para em 104", perto(e.fonteFim_s, 104), `${e.fonteFim_s}`);
    conferir("fonte da direita começa em 104", perto(d.fonteInicio_s, 104), `${d.fonteInicio_s}`);
    conferir("nenhum frame perdido nem repetido", perto(e.fonteFim_s, d.fonteInicio_s));
    conferir("o pedaço novo tem id próprio", d.id === "b" && e.id === "a");
  }
}

{
  // O caso que revela confusão entre tempo de linha e tempo de fonte: um
  // clipe que já foi ESTICADO na linha do tempo. Se a divisão usasse o
  // segundo cru em vez da proporção, pegaria o frame errado.
  const esticado = video({ inicio_s: 20, fim_s: 40, fonteInicio_s: 0, fonteFim_s: 10 });
  const r = dividirVideo(esticado, 30, "b");
  conferir("divide clipe deslocado na linha", r !== null);
  if (r) {
    const [e] = r;
    // Metade da linha (30 de 20–40) = metade da fonte (5 de 0–10).
    conferir("usa a PROPORÇÃO, não o segundo cru", perto(e.fonteFim_s, 5), `${e.fonteFim_s}`);
  }
}

{
  conferir("recusa corte antes do começo", dividirVideo(video(), 0.1, "b") === null);
  conferir("recusa corte depois do fim", dividirVideo(video(), 9.95, "b") === null);
  conferir("recusa corte fora do item", dividirVideo(video(), 50, "b") === null);
}

{
  // Keyframes são relativos ao ITEM: ao dividir, os do lado direito têm que
  // ser reancorados, senão a animação salta.
  const comKf = video({
    keyframes: [
      { t: 1, valor: { zoom: 1 }, curva: "suave" },
      { t: 7, valor: { zoom: 2 }, curva: "suave" },
    ],
  });
  const r = dividirVideo(comKf, 4, "b");
  if (r) {
    const [e, d] = r;
    conferir("keyframe fica do lado certo", e.keyframes.length === 1 && d.keyframes.length === 1);
    conferir("keyframe da direita é reancorado", perto(d.keyframes[0].t, 3), `t=${d.keyframes[0].t}`);
    conferir("transição não se repete no pedaço novo", d.transicao === null);
  }
}

console.log("\n=== interpolar enquadramento ===\n");

{
  const semKf = video();
  conferir(
    "sem keyframe devolve o enquadramento base",
    enquadramentoEm(semKf, 5).zoom === 1,
  );
}

{
  const zoom = video({
    keyframes: [
      { t: 0, valor: { zoom: 1 }, curva: "linear" },
      { t: 10, valor: { zoom: 2 }, curva: "linear" },
    ],
  });
  conferir("linear no início", perto(enquadramentoEm(zoom, 0).zoom, 1));
  conferir("linear no meio", perto(enquadramentoEm(zoom, 5).zoom, 1.5), `${enquadramentoEm(zoom, 5).zoom}`);
  conferir("linear no fim", perto(enquadramentoEm(zoom, 10).zoom, 2));
  conferir("antes do primeiro keyframe não extrapola", perto(enquadramentoEm(zoom, -1).zoom, 1));
  conferir("depois do último não extrapola", perto(enquadramentoEm(zoom, 99).zoom, 2));
}

{
  const suave = video({
    keyframes: [
      { t: 0, valor: { x: 0 }, curva: "suave" },
      { t: 10, valor: { x: 1 }, curva: "suave" },
    ],
  });
  const meio = enquadramentoEm(suave, 5).x;
  conferir("suave passa pelo meio no meio", perto(meio, 0.5, 0.01), `${meio.toFixed(3)}`);
  // O que separa "suave" de "linear": no primeiro quarto ela ainda está
  // acelerando, então andou MENOS que a linha reta.
  const quarto = enquadramentoEm(suave, 2.5).x;
  conferir("suave começa devagar", quarto < 0.25, `x=${quarto.toFixed(3)} < 0.25`);
}

{
  // Keyframe parcial: mexer só no zoom não pode zerar o x/y do base.
  const parcial = video({
    enquadramento: { x: 0.3, y: 0.7, zoom: 1, rotacao: 0 },
    keyframes: [
      { t: 0, valor: { zoom: 1 }, curva: "linear" },
      { t: 4, valor: { zoom: 3 }, curva: "linear" },
    ],
  });
  const e = enquadramentoEm(parcial, 2);
  conferir("keyframe parcial preserva o resto do base", perto(e.x, 0.3) && perto(e.y, 0.7), `x=${e.x} y=${e.y}`);
  conferir("e interpola o que foi declarado", perto(e.zoom, 2), `zoom=${e.zoom}`);
}

console.log();
if (falhas > 0) {
  console.log(`${falhas} falha(s).`);
  process.exit(1);
}
console.log("Modelo consistente: divisão preserva os frames e a interpolação não extrapola.");
