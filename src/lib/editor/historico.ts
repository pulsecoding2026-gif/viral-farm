/**
 * O histórico de edição — o que um Ctrl+Z tem que desfazer.
 *
 * O editor é não-destrutivo (ver `projeto.ts`): toda operação troca números
 * dentro de um `Projeto` imutável. Isso torna o histórico quase de graça —
 * guardar um passo é guardar a referência do documento de antes. Como as
 * mudanças são feitas por espalhamento (`{...p, trilhas: ...}`), os passos
 * COMPARTILHAM quase tudo: o que cada um custa de fato são os arrays de
 * trilhas que aquela operação tocou, não o projeto inteiro copiado.
 *
 * DUAS DECISÕES QUE VALEM SER LIDAS ANTES DE MEXER AQUI:
 *
 * 1. PILHA LIMITADA. Mesmo com compartilhamento, um projeto por passo sem teto
 *    é um vazamento lento numa aba que fica aberta a tarde toda. `LIMITE_DE_PASSOS`
 *    joga o mais antigo fora. Ninguém desfaz 50 vezes; quem tenta quer o botão
 *    de fechar sem salvar.
 *
 * 2. AGRUPAMENTO POR TEMPO. Arrastar um clipe dispara dezenas de mudanças por
 *    segundo. Sem agrupar, um Ctrl+Z desfaz um pixel de arrasto e a pessoa
 *    martela o atalho até desfazer coisa que não queria. Chamadas seguidas com
 *    o MESMO rótulo dentro da janela colapsam no mesmo passo.
 *
 * O NÚCLEO É PURO DE PROPÓSITO. `useHistorico` é uma casca de `useState` em
 * volta de `criarHistorico`/`aplicarNoHistorico`/`desfazerNoHistorico`/
 * `refazerNoHistorico`, e o relógio entra por parâmetro. É o que deixa o
 * comportamento ser testado em Node (`worker/testar-historico.ts`) sem montar
 * um renderizador de React nem esperar 600ms de verdade num `sleep`.
 */

import { useCallback, useState } from "react";

/**
 * Quantos passos a pilha guarda. Cada passo é um documento inteiro; o número
 * é generoso pro uso real e ainda assim finito.
 */
export const LIMITE_DE_PASSOS = 50;

/**
 * Quanto tempo depois da última mudança o mesmo rótulo ainda colapsa.
 *
 * A janela é DESLIZANTE: ela conta a partir da última mudança do grupo, não do
 * começo dele. Um arrasto de dez segundos é um gesto só e tem que continuar
 * sendo um passo só; o que fecha o grupo é a pessoa PARAR de arrastar.
 */
export const JANELA_DE_AGRUPAMENTO_MS = 600;

export type OpcoesDeAplicar = {
  /**
   * Rótulo do gesto em andamento — algo como `"mover:<id do item>"`.
   *
   * Inclua a identidade do alvo no rótulo: só `"mover"` faria arrastar um
   * clipe e, logo em seguida, outro, virarem um passo só.
   */
  agrupar?: string;
};

export type Historico<T> = {
  /** Do mais antigo ao mais recente. O último é pra onde `desfazer` volta. */
  passado: T[];
  presente: T;
  /** Do próximo ao mais distante. O primeiro é pra onde `refazer` vai. */
  futuro: T[];
  /**
   * O gesto aberto: qual rótulo e quando ele mudou pela última vez. `null`
   * quando o próximo `aplicar` tem que abrir passo novo de qualquer jeito.
   */
  grupo: { rotulo: string; em: number } | null;
};

/** Histórico zerado. É também o que `reiniciar` faz — abrir outro documento
 * não pode deixar o Ctrl+Z voltando pro projeto anterior. */
export function criarHistorico<T>(inicial: T): Historico<T> {
  return { passado: [], presente: inicial, futuro: [], grupo: null };
}

export function podeDesfazer<T>(h: Historico<T>): boolean {
  return h.passado.length > 0;
}

export function podeRefazer<T>(h: Historico<T>): boolean {
  return h.futuro.length > 0;
}

/**
 * O novo estado vira o presente; o presente vira passado (ou é engolido pelo
 * grupo aberto).
 *
 * `agora` é injetável só pelo teste — em produção quem chama é o hook, com
 * `Date.now()`.
 */
export function aplicarNoHistorico<T>(
  h: Historico<T>,
  novo: T | ((atual: T) => T),
  opcoes: OpcoesDeAplicar = {},
  agora: number = Date.now(),
): Historico<T> {
  const valor =
    typeof novo === "function" ? (novo as (atual: T) => T)(h.presente) : novo;

  // Mudança que não mudou nada não é passo. Vale a comparação por REFERÊNCIA:
  // o editor sempre produz documento novo quando algo mexeu, então o que isto
  // pega é o handler que devolveu o mesmo objeto — e um passo desses seria um
  // Ctrl+Z que aparentemente não faz nada.
  if (Object.is(valor, h.presente)) return h;

  const rotulo = opcoes.agrupar;
  const colapsa =
    rotulo !== undefined &&
    h.grupo !== null &&
    h.grupo.rotulo === rotulo &&
    agora - h.grupo.em <= JANELA_DE_AGRUPAMENTO_MS;

  if (colapsa) {
    // O passo já está na pilha desde a primeira mudança do gesto: aqui só o
    // presente avança. É isto que faz o arrasto inteiro custar um Ctrl+Z.
    return {
      passado: h.passado,
      presente: valor,
      futuro: [],
      grupo: { rotulo: rotulo as string, em: agora },
    };
  }

  const passado =
    h.passado.length >= LIMITE_DE_PASSOS
      ? [...h.passado.slice(h.passado.length - LIMITE_DE_PASSOS + 1), h.presente]
      : [...h.passado, h.presente];

  return {
    passado,
    presente: valor,
    // Editar depois de desfazer QUEIMA o futuro. É o comportamento de todo
    // editor: a linha do tempo da edição é uma só, e refazer para um documento
    // que já não é aquele traria de volta um estado que não existiu.
    futuro: [],
    grupo: rotulo === undefined ? null : { rotulo, em: agora },
  };
}

export function desfazerNoHistorico<T>(h: Historico<T>): Historico<T> {
  if (h.passado.length === 0) return h;
  return {
    passado: h.passado.slice(0, -1),
    presente: h.passado[h.passado.length - 1],
    futuro: [h.presente, ...h.futuro],
    // Desfazer FECHA o gesto aberto: sem isso, uma mudança agrupada logo depois
    // de um Ctrl+Z entraria no grupo antigo e apagaria o passo restaurado.
    grupo: null,
  };
}

export function refazerNoHistorico<T>(h: Historico<T>): Historico<T> {
  if (h.futuro.length === 0) return h;
  return {
    // Não estoura o limite: o futuro só tem o que o passado devolveu.
    passado: [...h.passado, h.presente],
    presente: h.futuro[0],
    futuro: h.futuro.slice(1),
    grupo: null,
  };
}

/* --------------------------------------------------------------- o hook */

export type ControleDeHistorico<T> = {
  estado: T;
  aplicar: (novo: T | ((atual: T) => T), opcoes?: OpcoesDeAplicar) => void;
  desfazer: () => void;
  refazer: () => void;
  podeDesfazer: boolean;
  podeRefazer: boolean;
  /** Troca o documento e zera as pilhas — para abrir outro corte. */
  reiniciar: (estado: T) => void;
};

/**
 * Estado com Ctrl+Z, na cara do `useState`.
 *
 *   const doc = useHistorico<Projeto | null>(null);
 *   doc.aplicar((p) => ({ ...p, proporcao: "1:1" }));
 *   doc.aplicar((p) => mover(p, id, x), { agrupar: `mover:${id}` });
 *
 * `inicial` só é lido na primeira renderização, igual ao `useState`. Documento
 * que chega depois (o projeto vindo da API, por exemplo) entra por `reiniciar`,
 * que também apaga o histórico do documento anterior.
 *
 * Ressalva herdada do `useState`: se `T` for um tipo de função, `aplicar(f)`
 * seria lido como atualizador. Um `Projeto` não é função, e nada mais no editor
 * passa por aqui.
 */
export function useHistorico<T>(inicial: T): ControleDeHistorico<T> {
  const [h, definir] = useState<Historico<T>>(() => criarHistorico(inicial));

  const aplicar = useCallback(
    (novo: T | ((atual: T) => T), opcoes?: OpcoesDeAplicar) => {
      // O relógio é lido AQUI, fora do atualizador: em StrictMode o React roda
      // o atualizador duas vezes, e ele precisa ser puro pra não decidir o
      // agrupamento com dois instantes diferentes.
      const agora = Date.now();
      definir((atual) => aplicarNoHistorico(atual, novo, opcoes ?? {}, agora));
    },
    [],
  );

  const desfazer = useCallback(() => {
    definir((atual) => desfazerNoHistorico(atual));
  }, []);

  const refazer = useCallback(() => {
    definir((atual) => refazerNoHistorico(atual));
  }, []);

  const reiniciar = useCallback((estado: T) => {
    // Fábrica, não valor: `definir(x)` com `x` função seria atualizador.
    definir(() => criarHistorico(estado));
  }, []);

  return {
    estado: h.presente,
    aplicar,
    desfazer,
    refazer,
    podeDesfazer: podeDesfazer(h),
    podeRefazer: podeRefazer(h),
    reiniciar,
  };
}
