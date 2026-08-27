/**
 * Dados de exemplo pra prévia do Radar Viral.
 *
 * Fictício de propósito. Usado como fallback quando `YOUTUBE_API_KEY` não
 * está configurada ou o radar real (`./radar.ts`) falha — ver page.tsx do
 * Radar Viral. Isso mantém a tela sempre funcional, mesmo sem a chave.
 *
 * Nichos trocados de categorias genéricas (curiosidades, culinária, fitness…)
 * pra formatos dentro da franquia GTA — a GTA VIRAL é dedicada ao nicho
 * (docs/gta/plano-mestre.md). Nunca "gta vi" aqui: o jogo lança em 19/11/2026
 * e não existe gameplay dele pra aparecer em vídeo nenhum ainda.
 */

import type { ItemBiblioteca } from "./tipos";

export type { ItemBiblioteca };

// Datas relativas a agora, pra não ficarem "publicado há 3 anos" com o tempo.
function diasAtras(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

export const NICHOS_BIBLIOTECA = [
  "gta rp",
  "gta online",
  "gta v engraçado",
] as const;

/**
 * Rótulo de exibição de cada nicho. Sem isto, a UI usava `capitalize` do CSS
 * em cima da chave crua e "gta rp" virava "Gta Rp" — legível, mas errado pro
 * nicho inteiro ser uma sigla. Aqui a grafia certa (GTA, não Gta) é escolhida
 * uma vez só, em vez de depender de CSS pra capitalizar palavra por palavra.
 */
export const ROTULOS_NICHO: Record<(typeof NICHOS_BIBLIOTECA)[number], string> = {
  "gta rp": "GTA RP",
  "gta online": "GTA Online",
  "gta v engraçado": "Momentos engraçados",
};

export const VIDEOS_EXEMPLO: ItemBiblioteca[] = [
  {
    id: "1",
    titulo: "Ele mentiu pro juiz do RP e a chat inteira viu na hora",
    canal: "Cortes de RP",
    nicho: "gta rp",
    plataforma: "youtube",
    visualizacoes: 8_200_000,
    curtidas: 610_000,
    publicado_em: diasAtras(2),
    duracao_s: 42,
    tem_legenda_embutida: true,
    emoji: "🚔",
  },
  {
    id: "2",
    titulo: "A traição que acabou com a facção mais forte do servidor",
    canal: "GTA RP Diário",
    nicho: "gta rp",
    plataforma: "tiktok",
    visualizacoes: 3_400_000,
    curtidas: 290_000,
    publicado_em: diasAtras(9),
    duracao_s: 31,
    tem_legenda_embutida: false,
    emoji: "🔫",
  },
  {
    id: "3",
    titulo: "Personagem novo dentro da cidade, dia 1 sem saber de nada",
    canal: "Vida de Cidadão",
    nicho: "gta rp",
    plataforma: "youtube",
    visualizacoes: 5_900_000,
    curtidas: 480_000,
    publicado_em: diasAtras(1),
    duracao_s: 38,
    tem_legenda_embutida: false,
    emoji: "🕶️",
  },
  {
    id: "4",
    titulo: "RP jurídico: o julgamento que travou o chat por 10 minutos",
    canal: "Tribunal RP",
    nicho: "gta rp",
    plataforma: "instagram",
    visualizacoes: 2_100_000,
    curtidas: 175_000,
    publicado_em: diasAtras(14),
    duracao_s: 55,
    tem_legenda_embutida: true,
    emoji: "⚖️",
  },
  {
    id: "5",
    titulo: "Heist do cassino do início ao fim, sem cortar nada",
    canal: "Assaltos GTA",
    nicho: "gta online",
    plataforma: "youtube",
    visualizacoes: 1_800_000,
    curtidas: 132_000,
    publicado_em: diasAtras(21),
    duracao_s: 47,
    tem_legenda_embutida: false,
    emoji: "💰",
  },
  {
    id: "6",
    titulo: "Roubei o avião mais caro do jogo na frente da polícia",
    canal: "Online Sem Limite",
    nicho: "gta online",
    plataforma: "tiktok",
    visualizacoes: 4_600_000,
    curtidas: 510_000,
    publicado_em: diasAtras(4),
    duracao_s: 18,
    tem_legenda_embutida: true,
    emoji: "✈️",
  },
  {
    id: "7",
    titulo: "Ganhei uma fortuna e perdi tudo em 60 segundos",
    canal: "Grana no GTA",
    nicho: "gta online",
    plataforma: "youtube",
    visualizacoes: 2_900_000,
    curtidas: 205_000,
    publicado_em: diasAtras(18),
    duracao_s: 52,
    tem_legenda_embutida: false,
    emoji: "🎰",
  },
  {
    id: "8",
    titulo: "A corrida ilegal que terminou com o carro voando de verdade",
    canal: "Pista Livre GTA",
    nicho: "gta online",
    plataforma: "tiktok",
    visualizacoes: 1_500_000,
    curtidas: 118_000,
    publicado_em: diasAtras(6),
    duracao_s: 29,
    tem_legenda_embutida: true,
    emoji: "🏎️",
  },
  {
    id: "9",
    titulo: "O NPC que travou e não parou de rir igual bug de 2015",
    canal: "GTA Aleatório",
    nicho: "gta v engraçado",
    plataforma: "instagram",
    visualizacoes: 6_700_000,
    curtidas: 720_000,
    publicado_em: diasAtras(3),
    duracao_s: 34,
    tem_legenda_embutida: true,
    emoji: "😂",
  },
  {
    id: "10",
    titulo: "Tentei entrar de fininho e a polícia inteira apareceu",
    canal: "Momentos GTA V",
    nicho: "gta v engraçado",
    plataforma: "youtube",
    visualizacoes: 3_200_000,
    curtidas: 240_000,
    publicado_em: diasAtras(11),
    duracao_s: 40,
    tem_legenda_embutida: false,
    emoji: "🚓",
  },
  {
    id: "11",
    titulo: "O bug de física mais engraçado que já vi no GTA",
    canal: "Rage e Risada",
    nicho: "gta v engraçado",
    plataforma: "tiktok",
    visualizacoes: 9_100_000,
    curtidas: 980_000,
    publicado_em: diasAtras(5),
    duracao_s: 25,
    tem_legenda_embutida: true,
    emoji: "🤣",
  },
  {
    id: "12",
    titulo: "Errei o assalto do jeito mais burro possível (ao vivo)",
    canal: "Falhei Feio GTA",
    nicho: "gta v engraçado",
    plataforma: "youtube",
    visualizacoes: 2_400_000,
    curtidas: 190_000,
    publicado_em: diasAtras(25),
    duracao_s: 44,
    tem_legenda_embutida: false,
    emoji: "🤦",
  },
];
