import type { Live } from "./tipos";

/**
 * Lives fictícias, para a tela existir antes das credenciais.
 * A página avisa que é exemplo — nenhum número aqui passa por real.
 *
 * `comecou_em` é calculado na leitura, não fixado, pra que "no ar há 2h" não
 * vire "no ar há 340 dias" na semana que vem.
 */

const agoraMenos = (minutos: number) =>
  new Date(Date.now() - minutos * 60_000).toISOString();

export const LIVES_EXEMPLO: Live[] = [
  { id: "t1", titulo: "GRANDE FINAL — campeonato mundial", canal: "arenaBR", plataforma: "twitch", espectadores: 184_320, categoria: "Counter-Strike 2", comecou_em: agoraMenos(212), idioma: "pt", link: "https://twitch.tv/", },
  { id: "k1", titulo: "REACT: os cortes mais vistos da semana", canal: "cortesdodia", plataforma: "kick", espectadores: 96_540, categoria: "Just Chatting", comecou_em: agoraMenos(88), idioma: "pt", link: "https://kick.com/", },
  { id: "t2", titulo: "speedrun até zerar, sem parar", canal: "runnerzin", plataforma: "twitch", espectadores: 72_180, categoria: "Elden Ring", comecou_em: agoraMenos(415), idioma: "pt", link: "https://twitch.tv/", },
  { id: "k2", titulo: "cozinhando ao vivo com a chat decidindo", canal: "panelaquente", plataforma: "kick", espectadores: 54_900, categoria: "Food & Drink", comecou_em: agoraMenos(64), idioma: "pt", link: "https://kick.com/", },
  { id: "t3", titulo: "análise de mercado ao vivo", canal: "graficoaovivo", plataforma: "twitch", espectadores: 41_250, categoria: "Just Chatting", comecou_em: agoraMenos(147), idioma: "pt", link: "https://twitch.tv/", },
  { id: "k3", titulo: "24h no aquário — bastidores", canal: "fundodomar", plataforma: "kick", espectadores: 33_780, categoria: "Special Events", comecou_em: agoraMenos(902), idioma: "pt", link: "https://kick.com/", },
  { id: "t4", titulo: "treino guiado + tira-dúvidas", canal: "boratreinar", plataforma: "twitch", espectadores: 28_410, categoria: "Fitness & Health", comecou_em: agoraMenos(36), idioma: "pt", link: "https://twitch.tv/", },
  { id: "k4", titulo: "restaurando um opala de 1979", canal: "garagemk", plataforma: "kick", espectadores: 19_630, categoria: "Science & Technology", comecou_em: agoraMenos(258), idioma: "pt", link: "https://kick.com/", },
  { id: "t5", titulo: "desenhando o que a chat pedir", canal: "traçolivre", plataforma: "twitch", espectadores: 15_070, categoria: "Art", comecou_em: agoraMenos(121), idioma: "pt", link: "https://twitch.tv/", },
  { id: "k5", titulo: "podcast ao vivo com convidado surpresa", canal: "microfoneaberto", plataforma: "kick", espectadores: 12_240, categoria: "Podcasts", comecou_em: agoraMenos(73), idioma: "pt", link: "https://kick.com/", },
];
