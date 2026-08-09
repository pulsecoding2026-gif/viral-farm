/**
 * O contrato da aba Planejar — o que a interface manda e o que a IA devolve.
 *
 * Três módulos, três formas:
 *   · Agent Viral é CONVERSA: mensagens vão e voltam em texto corrido.
 *   · Roteiros e Hooks são GERADORES: entrada de formulário, saída em
 *     estrutura fixa que a tela desenha (blocos com tempo, lista de hooks).
 *
 * Tudo que atravessa a fronteira interface ↔ rota ↔ banco está aqui, pelo
 * mesmo motivo do editor: dois lados inventando formas parecidas divergem.
 */

export type TipoPlanejamento = "agente" | "roteiro" | "hooks";

/* -------------------------------------------------------------- Agent Viral */

export type Mensagem = {
  papel: "usuario" | "agente";
  texto: string;
};

/** O que a coluna `dados` guarda quando tipo = 'agente'. */
export type DadosConversa = {
  mensagens: Mensagem[];
};

/* ----------------------------------------------------------------- Roteiros */

export type EntradaRoteiro = {
  tema: string;
  /** Duração alvo do vídeo final, em segundos. */
  duracao_s: number;
  tom: "educativo" | "storytelling" | "polemico" | "vendas" | "humor";
  /** Id de um formato da galeria, ou vazio pra deixar a IA sugerir. */
  formato?: string;
  /** Referência opcional: link ou colagem de algo pra se inspirar. */
  referencia?: string;
};

export type BlocoRoteiro = {
  inicio_s: number;
  fim_s: number;
  /** O que a pessoa FALA neste trecho. */
  fala: string;
  /** O que aparece NA TELA enquanto isso (corte, b-roll, texto, zoom). */
  na_tela: string;
};

export type Roteiro = {
  titulo: string;
  /** A primeira frase falada — os 3 segundos que seguram o dedo. */
  gancho_falado: string;
  /** Frase escrita na tela nos primeiros segundos. */
  titulo_tela: string;
  /** Formato da galeria que a IA sugeriu pra esta ideia. */
  formato: string;
  blocos: BlocoRoteiro[];
  cta: string;
  hashtags: string[];
};

/** `dados` quando tipo = 'roteiro'. */
export type DadosRoteiro = {
  entrada: EntradaRoteiro;
  roteiro: Roteiro;
};

/* -------------------------------------------------------------------- Hooks */

export const ESTILOS_DE_HOOK = [
  "curiosidade",
  "numero",
  "polemica",
  "historia",
  "erro",
  "autoridade",
  "pergunta",
  "contraste",
] as const;

export type EstiloDeHook = (typeof ESTILOS_DE_HOOK)[number];

export type EntradaHooks = {
  tema: string;
  /** Nicho do canal, pra IA calibrar vocabulário e exemplos. */
  nicho?: string;
  quantidade: number;
};

export type Hook = {
  estilo: EstiloDeHook;
  /** O que se fala nos primeiros 1–2 segundos. Curto de propósito. */
  texto: string;
  /** Por que este padrão segura atenção — a pessoa aprende, não só copia. */
  por_que_funciona: string;
};

/** `dados` quando tipo = 'hooks'. */
export type DadosHooks = {
  entrada: EntradaHooks;
  hooks: Hook[];
};

/* ---------------------------------------------------------------- listagem */

/** Uma linha do histórico, como as telas listam. */
export type ItemPlanejamento = {
  id: string;
  tipo: TipoPlanejamento;
  titulo: string;
  dados: DadosConversa | DadosRoteiro | DadosHooks;
  criado_em: number;
  atualizado_em: number;
};
