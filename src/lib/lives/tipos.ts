/**
 * Lives ao vivo agora, por número de espectadores.
 *
 * Por que isto vive num produto de vídeo curto: a live de hoje é o clipe de
 * amanhã. Onde há muita gente assistindo há material bruto sendo gerado em
 * tempo real — e quem chega primeiro no corte pega a onda inteira.
 */

export type PlataformaLive = "twitch" | "kick";

export type Live = {
  id: string;
  titulo: string;
  canal: string;
  plataforma: PlataformaLive;
  espectadores: number;
  /** Nome da categoria/jogo, como a plataforma reporta. */
  categoria: string;
  /** ISO 8601. Usado pra calcular há quanto tempo está no ar. */
  comecou_em: string;
  idioma?: string;
  thumbnail_url?: string;
  link: string;
  /** Conteúdo adulto sinalizado pela própria plataforma. */
  adulto?: boolean;
};

export type ResultadoLives = {
  lives: Live[];
  /** De onde veio o dado — a UI avisa quando é exemplo. */
  fonte: "api" | "cache" | "exemplo";
  /** Plataformas que responderam de verdade nesta consulta. */
  plataformasReais: PlataformaLive[];
};
