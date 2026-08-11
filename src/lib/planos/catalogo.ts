/**
 * O catálogo de planos — fonte ÚNICA de preço, limite e promessa.
 *
 * Vive em código, não no banco, porque plano é decisão de produto que muda
 * junto com o deploy: preço no banco viraria configuração invisível que
 * ninguém revisa em pull request, e um número errado ali cobra errado do
 * cliente sem deixar rastro.
 *
 * O que o BANCO guarda é a assinatura de cada pessoa (qual plano, até
 * quando, qual id no Stripe). O que ela COMPRA está descrito aqui.
 *
 * COMO OS LIMITES FORAM DIMENSIONADOS
 *
 * Não foram chutados: saíram da capacidade real da VPS. Ela tem 1 vCPU e
 * renderiza um job por vez — uma análise de 5 cortes leva cerca de 5
 * minutos. São ~280 análises por dia se a máquina rodar sem parar, o que
 * ninguém deve planejar. Dimensionei pra ~2.000 análises/mês no total, algo
 * em torno de um terço da capacidade teórica, porque uso real tem pico:
 * todo mundo publica de manhã e à noite, não distribuído em 24h.
 *
 * Quando a infra crescer, estes números sobem — e é por isso que eles moram
 * num lugar só.
 */

export type IdPlano = "gratuito" | "criador" | "profissional" | "estudio";

export type Plano = {
  id: IdPlano;
  nome: string;
  /** Uma linha sobre pra quem é. */
  resumo: string;
  /** Em CENTAVOS: dinheiro em float acumula erro de arredondamento. */
  precoMensal: number;
  /** Análises por ciclo de cobrança. É o limite que realmente pesa. */
  analisesMes: number;
  /** Teto de cortes que uma análise pode pedir. */
  cortesMax: number;
  /** Teto de duração do vídeo de entrada, em minutos. */
  duracaoMaxMin: number;
  /** O que a tela de planos lista. Ordem importa: o primeiro é o argumento. */
  recursos: string[];
  /** Só o plano em destaque na tela. */
  destaque?: boolean;
};

export const PLANOS: Record<IdPlano, Plano> = {
  /**
   * O gratuito NÃO é vendido — é onde toda conta nasce.
   *
   * Três análises dão pra provar o produto inteiro (achar cortes, revisar no
   * Estúdio, editar, renderizar) sem virar uso indefinido de graça. Zero
   * análises faria a pessoa ir embora antes de ver o valor; dez sairiam caro
   * em CPU e API antes de qualquer decisão de compra.
   */
  gratuito: {
    id: "gratuito",
    nome: "Grátis",
    resumo: "Pra experimentar e ver se o corte sai do seu jeito.",
    precoMensal: 0,
    analisesMes: 3,
    cortesMax: 3,
    duracaoMaxMin: 20,
    recursos: [
      "3 análises por mês",
      "Até 3 cortes por análise",
      "Vídeos de até 20 minutos",
      "Todos os 15 formatos de legenda",
      "Trends, Roteiros e Hooks liberados",
    ],
  },

  criador: {
    id: "criador",
    nome: "Criador",
    resumo: "Pra quem publica toda semana e não pode ficar sem pauta.",
    precoMensal: 4700,
    analisesMes: 30,
    cortesMax: 8,
    duracaoMaxMin: 90,
    recursos: [
      "30 análises por mês",
      "Até 8 cortes por análise",
      "Vídeos de até 1h30",
      "Estúdio: você aprova antes de renderizar",
      "Editor Viral IA completo",
      "Sem marca d'água",
    ],
  },

  profissional: {
    id: "profissional",
    nome: "Profissional",
    resumo: "Pra quem vive disso e publica todo dia.",
    precoMensal: 9700,
    analisesMes: 100,
    cortesMax: 15,
    duracaoMaxMin: 180,
    destaque: true,
    recursos: [
      "100 análises por mês",
      "Até 15 cortes por análise",
      "Vídeos de até 3 horas",
      "Tudo do Criador",
      "Reeditar corte quantas vezes quiser",
      "Suporte prioritário",
    ],
  },

  estudio: {
    id: "estudio",
    nome: "Estúdio",
    resumo: "Pra agência ou quem atende mais de um canal.",
    precoMensal: 19700,
    analisesMes: 300,
    cortesMax: 15,
    duracaoMaxMin: 240,
    recursos: [
      "300 análises por mês",
      "Até 15 cortes por análise",
      "Vídeos de até 4 horas",
      "Tudo do Profissional",
      "Acesso antecipado aos módulos novos",
      "Suporte por WhatsApp",
    ],
  },
};

/** Os que aparecem na tela de preço, na ordem. O grátis não se vende. */
export const PLANOS_PAGOS: Plano[] = [
  PLANOS.criador,
  PLANOS.profissional,
  PLANOS.estudio,
];

/** Desconto do pagamento anual. 2 meses de graça, arredondado. */
export const DESCONTO_ANUAL = 0.17;

/**
 * O plano de um perfil, com queda segura pro gratuito.
 *
 * Plano desconhecido (registro antigo, valor digitado à mão no banco, plano
 * que deixou de existir) NUNCA pode liberar mais do que o gratuito: errar
 * pra baixo custa uma reclamação, errar pra cima entrega produto de graça
 * sem ninguém perceber.
 */
export function acharPlano(id: string | null | undefined): Plano {
  return PLANOS[(id ?? "") as IdPlano] ?? PLANOS.gratuito;
}

/** "R$ 47,00" — o preço como a tela mostra. */
export function precoEmReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
