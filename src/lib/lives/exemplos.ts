import type { Live } from "./tipos";

/**
 * Lives fictícias, para a tela existir antes das credenciais.
 * A página avisa que é exemplo — nenhum número aqui passa por real.
 *
 * Temática GTA de propósito: a GTA VIRAL é dedicada à franquia (ver
 * docs/gta/plano-mestre.md), então mesmo o exemplo precisa parecer com o que
 * a pessoa vai ver de verdade — GTA V, GTA Online e servidores de RP, nunca
 * "GTA VI" (o jogo lança em 19/11/2026 e não existe gameplay dele ainda).
 * Canais e categorias são fictícios, sem citar streamer real.
 *
 * `comecou_em` é calculado na leitura, não fixado, pra que "no ar há 2h" não
 * vire "no ar há 340 dias" na semana que vem.
 */

const agoraMenos = (minutos: number) =>
  new Date(Date.now() - minutos * 60_000).toISOString();

export const LIVES_EXEMPLO: Live[] = [
  { id: "t1", titulo: "RP na Cidade Alta — a fuga que ninguém esperava", canal: "vidadecrime_rp", plataforma: "twitch", espectadores: 84_320, categoria: "Grand Theft Auto V", comecou_em: agoraMenos(212), idioma: "pt", link: "https://twitch.tv/", },
  { id: "k1", titulo: "GTA Online: heist do cassino do zero até o assalto", canal: "cortesdegta", plataforma: "kick", espectadores: 46_540, categoria: "GTA Online", comecou_em: agoraMenos(88), idioma: "pt", link: "https://kick.com/", },
  { id: "t2", titulo: "personagem novo no RP, dia 1 dentro da cidade", canal: "rpbrasil_oficial", plataforma: "twitch", espectadores: 52_180, categoria: "Grand Theft Auto V", comecou_em: agoraMenos(415), idioma: "pt", link: "https://twitch.tv/", },
  { id: "k2", titulo: "perseguição de polícia que virou meme na hora", canal: "caosnacidade", plataforma: "kick", espectadores: 34_900, categoria: "GTA RP", comecou_em: agoraMenos(64), idioma: "pt", link: "https://kick.com/", },
  { id: "t3", titulo: "audiência no tribunal do servidor — RP jurídico", canal: "advogadodorp", plataforma: "twitch", espectadores: 29_250, categoria: "Grand Theft Auto V", comecou_em: agoraMenos(147), idioma: "pt", link: "https://twitch.tv/", },
  { id: "k3", titulo: "bugs e momentos aleatórios do GTA Online", canal: "risoemgta", plataforma: "kick", espectadores: 21_780, categoria: "GTA Online", comecou_em: agoraMenos(902), idioma: "pt", link: "https://kick.com/", },
  { id: "t4", titulo: "corrida ilegal + chat decidindo o carro", canal: "garagemdorp", plataforma: "twitch", espectadores: 18_410, categoria: "Grand Theft Auto V", comecou_em: agoraMenos(36), idioma: "pt", link: "https://twitch.tv/", },
  { id: "k4", titulo: "24h dentro do personagem, sem sair do RP", canal: "imersaoTotalRP", plataforma: "kick", espectadores: 13_630, categoria: "GTA RP", comecou_em: agoraMenos(258), idioma: "pt", link: "https://kick.com/", },
  { id: "t5", titulo: "montando gangue nova do zero no servidor", canal: "facçãonova", plataforma: "twitch", espectadores: 10_070, categoria: "Grand Theft Auto V", comecou_em: agoraMenos(121), idioma: "pt", link: "https://twitch.tv/", },
  { id: "k5", titulo: "só heists até zerar a lista da semana", canal: "assaltosemfim", plataforma: "kick", espectadores: 8_240, categoria: "GTA Online", comecou_em: agoraMenos(73), idioma: "pt", link: "https://kick.com/", },
];
