/**
 * Sinais de DEMANDA — o que as pessoas estão procurando e falando.
 *
 * É o oposto complementar do Radar Viral, que mostra OFERTA (qual vídeo está
 * performando). Trends responde "sobre o que falar"; o Radar responde "em que
 * formato". Cruzar os dois é onde mora a decisão de gravar.
 */

export type FonteTrend = "google" | "youtube" | "x" | "hashtag";

export type Periodo = "hoje" | "ontem" | "7d" | "30d";

export type TermoTrend = {
  id: string;
  /** O termo, hashtag ou assunto, como a pessoa digitaria. */
  termo: string;
  fonte: FonteTrend;
  /** Buscas, menções ou usos no período. */
  volume: number;
  /** Variação percentual contra o período anterior. Negativo = esfriando. */
  variacao_pct: number;
  /** Nicho da Biblioteca ao qual o termo se encaixa, quando dá pra dizer. */
  categoria?: string;
  /**
   * Há quantos dias o termo entrou em alta. É o que o filtro de período usa.
   * Guardado como número em vez de data absoluta pra que os exemplos não
   * envelheçam — quando vier API real, isto vira um timestamp.
   */
  dias_atras: number;
};

/**
 * Faixa em dias de cada período, como [inicio, fim].
 *
 * "ontem" é uma janela, não um corte: pega o que estava em alta entre 24h e
 * 48h atrás. Sem isso, "hoje" e "ontem" devolveriam a mesma lista.
 */
export const FAIXA_PERIODO: Record<Periodo, [number, number]> = {
  hoje: [0, 1],
  ontem: [1, 2],
  "7d": [0, 7],
  "30d": [0, 30],
};

export const ROTULO_PERIODO: Record<Periodo, string> = {
  hoje: "Hoje",
  ontem: "Ontem",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
};
