import type { Palavra } from "./transcritor";

/**
 * Remoção de silêncios — o "Limpeza de fala".
 *
 * Não precisa de análise de áudio nem de visão computacional: a transcrição
 * já traz o tempo de cada palavra, então TODO buraco entre o fim de uma
 * palavra e o começo da próxima é silêncio medido. Cortar esses buracos
 * deixa o corte mais denso, que é o que segura retenção em vídeo curto.
 *
 * O ffmpeg recebe os trechos de fala como uma lista de janelas e concatena;
 * as palavras são reancoradas no novo tempo pra legenda continuar batendo.
 */

/** Uma janela de fala que sobrevive ao corte. */
export type Janela = { de: number; ate: number };

export type ResultadoLimpeza = {
  janelas: Janela[];
  /** Palavras com os tempos já deslocados pro vídeo compactado. */
  palavras: Palavra[];
  /** Quanto tempo foi removido, em segundos. */
  removido_s: number;
};

/**
 * Monta as janelas de fala descartando pausas maiores que `limiar`.
 *
 * `folga` é respiro deixado nas pontas de cada janela: cortar exatamente no
 * fim da palavra corta o final da sílaba e soa picotado.
 */
export function limparSilencios(
  palavras: Palavra[],
  inicioCorte: number,
  fimCorte: number,
  { limiar = 0.45, folga = 0.12 }: { limiar?: number; folga?: number } = {},
): ResultadoLimpeza {
  const dentro = palavras
    .filter((p) => p.inicio_s >= inicioCorte - 0.2 && p.fim_s <= fimCorte + 0.2)
    .sort((a, b) => a.inicio_s - b.inicio_s);

  if (dentro.length === 0) {
    return {
      janelas: [{ de: inicioCorte, ate: fimCorte }],
      palavras: [],
      removido_s: 0,
    };
  }

  // Agrupa palavras consecutivas cuja pausa entre elas é curta.
  const grupos: Palavra[][] = [];
  let atual: Palavra[] = [dentro[0]];

  for (let i = 1; i < dentro.length; i++) {
    const pausa = dentro[i].inicio_s - dentro[i - 1].fim_s;
    if (pausa > limiar) {
      grupos.push(atual);
      atual = [];
    }
    atual.push(dentro[i]);
  }
  grupos.push(atual);

  const janelas: Janela[] = grupos.map((g, i) => ({
    // A primeira janela começa no início pedido do corte (não na 1ª palavra):
    // preserva a respiração inicial que o modelo escolheu.
    de: i === 0 ? inicioCorte : Math.max(inicioCorte, g[0].inicio_s - folga),
    ate:
      i === grupos.length - 1
        ? fimCorte
        : Math.min(fimCorte, g[g.length - 1].fim_s + folga),
  }));

  // Reancora cada palavra: soma das janelas anteriores + posição dentro da sua.
  const palavrasNovas: Palavra[] = [];
  let acumulado = 0;
  for (const [i, g] of grupos.entries()) {
    const janela = janelas[i];
    for (const p of g) {
      palavrasNovas.push({
        texto: p.texto,
        inicio_s: acumulado + (p.inicio_s - janela.de),
        fim_s: acumulado + (p.fim_s - janela.de),
      });
    }
    acumulado += janela.ate - janela.de;
  }

  const duracaoOriginal = fimCorte - inicioCorte;
  return {
    janelas,
    palavras: palavrasNovas,
    removido_s: Math.max(0, duracaoOriginal - acumulado),
  };
}

/**
 * Filtro de concatenação do ffmpeg pras janelas.
 *
 * Cada janela vira um par de trim (vídeo + áudio) com o tempo reiniciado em
 * zero (`setpts`/`asetpts`), e o concat costura tudo num fluxo só.
 */
export function filtroDeJanelas(janelas: Janela[]): string {
  const partes: string[] = [];
  for (const [i, j] of janelas.entries()) {
    partes.push(
      `[0:v]trim=start=${j.de.toFixed(3)}:end=${j.ate.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`,
      `[0:a]atrim=start=${j.de.toFixed(3)}:end=${j.ate.toFixed(3)},asetpts=PTS-STARTPTS[a${i}]`,
    );
  }
  const entradas = janelas.map((_, i) => `[v${i}][a${i}]`).join("");
  partes.push(`${entradas}concat=n=${janelas.length}:v=1:a=1[vcat][acat]`);
  return partes.join(";");
}
