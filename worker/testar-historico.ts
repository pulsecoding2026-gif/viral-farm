/**
 * Confere o histórico de edição — o que um Ctrl+Z tem que desfazer.
 *
 *   npx tsx worker/testar-historico.ts
 *
 * O teste roda em cima do NÚCLEO PURO (`criarHistorico`, `aplicarNoHistorico`,
 * `desfazerNoHistorico`, `refazerNoHistorico`), não do hook. `useHistorico` é
 * uma casca de um `useState` em volta dessas funções: montar um renderizador de
 * React aqui testaria o React, não o histórico. O relógio entra por parâmetro
 * pelo mesmo motivo — teste de agrupamento com `Date.now()` de verdade seria
 * teste com `sleep`, lento e instável.
 */
import {
  JANELA_DE_AGRUPAMENTO_MS,
  LIMITE_DE_PASSOS,
  aplicarNoHistorico,
  criarHistorico,
  desfazerNoHistorico,
  podeDesfazer,
  podeRefazer,
  refazerNoHistorico,
  useHistorico,
} from "../src/lib/editor/historico";

let falhas = 0;

function conferir(nome: string, ok: boolean, detalhe = "") {
  console.log(`${ok ? "ok  " : "ERRO"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  if (!ok) falhas += 1;
}

console.log("=== desfazer e refazer ===\n");

{
  const zero = criarHistorico("a");
  conferir("começa no estado inicial", zero.presente === "a");
  conferir("nada a desfazer no começo", !podeDesfazer(zero));
  conferir("nada a refazer no começo", !podeRefazer(zero));
  conferir("desfazer no fundo da pilha não quebra", desfazerNoHistorico(zero) === zero);
  conferir("refazer sem futuro não quebra", refazerNoHistorico(zero) === zero);
}

{
  let h = criarHistorico("a");
  h = aplicarNoHistorico(h, "b", {}, 0);
  h = aplicarNoHistorico(h, "c", {}, 10);
  conferir("aplicar avança o presente", h.presente === "c");
  conferir("e empilha dois passos", h.passado.length === 2, `passado=${h.passado.length}`);

  h = desfazerNoHistorico(h);
  conferir("desfazer volta um passo", h.presente === "b");
  h = desfazerNoHistorico(h);
  conferir("desfazer volta ao início", h.presente === "a");
  conferir("e aí não há mais o que desfazer", !podeDesfazer(h));

  h = refazerNoHistorico(h);
  conferir("refazer avança de novo", h.presente === "b");
  h = refazerNoHistorico(h);
  conferir("refazer chega no topo", h.presente === "c" && !podeRefazer(h));
}

{
  let h = criarHistorico(2);
  h = aplicarNoHistorico(h, (atual) => atual * 5, {}, 0);
  conferir("aceita a forma funcional", h.presente === 10, `presente=${h.presente}`);
}

{
  const mesmo = { zoom: 1 };
  let h = criarHistorico(mesmo);
  h = aplicarNoHistorico(h, mesmo, {}, 0);
  conferir("aplicar o MESMO estado não vira passo", h.passado.length === 0);
}

console.log("\n=== agrupamento por tempo ===\n");

{
  // O gesto real: pegar o clipe e arrastar por dois segundos, com o mouse
  // disparando uma mudança a cada 200ms.
  let h = criarHistorico("base");
  h = aplicarNoHistorico(h, "antes", {}, 0);
  for (let i = 1; i <= 10; i++) {
    h = aplicarNoHistorico(h, `arrasto-${i}`, { agrupar: "mover:clipe-1" }, 200 * i);
  }

  conferir("10 chamadas agrupadas empilham 1 passo só", h.passado.length === 2, `passado=${h.passado.length} (base + antes)`);
  conferir("o presente é a última posição do arrasto", h.presente === "arrasto-10", h.presente);

  h = desfazerNoHistorico(h);
  conferir("um Ctrl+Z desfaz o arrasto INTEIRO", h.presente === "antes", h.presente);
  conferir("e o passo anterior continua na pilha", podeDesfazer(h));

  // 2000ms de gesto contra uma janela de 600ms: prova que a janela é DESLIZANTE
  // (conta da última mudança), não medida a partir do começo do grupo.
  conferir(
    "o gesto durou mais que a janela e mesmo assim colapsou",
    2000 > JANELA_DE_AGRUPAMENTO_MS,
    `2000ms > ${JANELA_DE_AGRUPAMENTO_MS}ms`,
  );
}

{
  // A pessoa parou de arrastar, pensou, e arrastou de novo: são dois passos.
  let h = criarHistorico(0);
  h = aplicarNoHistorico(h, 1, { agrupar: "mover:x" }, 0);
  h = aplicarNoHistorico(h, 2, { agrupar: "mover:x" }, JANELA_DE_AGRUPAMENTO_MS + 100);
  conferir("pausa maior que a janela abre passo novo", h.passado.length === 2, `passado=${h.passado.length}`);
}

{
  // Rótulo carrega a identidade do alvo justamente pra isto: arrastar um clipe
  // e depois outro não pode virar um passo só.
  let h = criarHistorico(0);
  h = aplicarNoHistorico(h, 1, { agrupar: "mover:a" }, 0);
  h = aplicarNoHistorico(h, 2, { agrupar: "mover:b" }, 50);
  conferir("rótulos diferentes não colapsam", h.passado.length === 2, `passado=${h.passado.length}`);
}

{
  let h = criarHistorico(0);
  h = aplicarNoHistorico(h, 1, {}, 0);
  h = aplicarNoHistorico(h, 2, {}, 10);
  conferir("sem rótulo, cada chamada é um passo", h.passado.length === 2, `passado=${h.passado.length}`);
}

{
  // Desfazer fecha o gesto aberto. Sem isso, a próxima mudança agrupada seria
  // engolida pelo grupo antigo e comeria o passo que o Ctrl+Z acabou de trazer.
  let h = criarHistorico(0);
  h = aplicarNoHistorico(h, 1, { agrupar: "mover:x" }, 0);
  h = aplicarNoHistorico(h, 2, { agrupar: "mover:x" }, 100);
  h = desfazerNoHistorico(h);
  h = aplicarNoHistorico(h, 9, { agrupar: "mover:x" }, 150);
  conferir("desfazer fecha o grupo", h.passado.length === 1, `passado=${h.passado.length}`);
  conferir("e o passo restaurado sobrevive", desfazerNoHistorico(h).presente === 0);
}

console.log("\n=== limite da pilha ===\n");

{
  const passos = LIMITE_DE_PASSOS + 10;
  let h = criarHistorico(0);
  for (let i = 1; i <= passos; i++) h = aplicarNoHistorico(h, i, {}, i);

  conferir(
    `${passos} edições guardam no máximo ${LIMITE_DE_PASSOS} passos`,
    h.passado.length === LIMITE_DE_PASSOS,
    `passado=${h.passado.length}`,
  );
  conferir("o presente é a última edição", h.presente === passos, `presente=${h.presente}`);

  for (let i = 0; i < LIMITE_DE_PASSOS; i++) h = desfazerNoHistorico(h);
  conferir(
    "desfazer tudo para no passo mais antigo que sobrou",
    h.presente === passos - LIMITE_DE_PASSOS,
    `presente=${h.presente} (esperado ${passos - LIMITE_DE_PASSOS})`,
  );
  conferir("e a pilha fica vazia", !podeDesfazer(h));
  conferir("o mais antigo foi descartado, não corrompido", !h.passado.includes(0));
}

console.log("\n=== editar depois de desfazer queima o futuro ===\n");

{
  let h = criarHistorico("a");
  h = aplicarNoHistorico(h, "b", {}, 0);
  h = aplicarNoHistorico(h, "c", {}, 10);
  h = desfazerNoHistorico(h);
  h = desfazerNoHistorico(h);
  conferir("voltou ao início com futuro cheio", h.presente === "a" && h.futuro.length === 2, `futuro=${h.futuro.length}`);

  h = aplicarNoHistorico(h, "d", {}, 20);
  conferir("edição nova descarta o futuro", h.futuro.length === 0, `futuro=${h.futuro.length}`);
  conferir("e não há mais o que refazer", !podeRefazer(h));
  conferir("refazer depois disso não ressuscita 'b'", refazerNoHistorico(h).presente === "d");
  conferir("desfazer volta pro estado de antes da edição nova", desfazerNoHistorico(h).presente === "a");
}

{
  // O hook não roda aqui, mas se ele sumir do módulo o editor quebra em
  // silêncio até alguém abrir a tela.
  conferir("o hook continua exportado", typeof useHistorico === "function");
}

console.log();
if (falhas > 0) {
  console.log(`${falhas} falha(s).`);
  process.exit(1);
}
console.log(
  "Histórico consistente: o arrasto custa um Ctrl+Z, a pilha tem teto e o futuro morre na primeira edição.",
);
