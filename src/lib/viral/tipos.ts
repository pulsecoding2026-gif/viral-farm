export type ClipeViral = {
  id: string;
  descricao: string;
  nicho: string;
  duracao_s: number;
  largura: number;
  altura: number;
  autor: string;
  /** Thumbnail pública do banco de imagens — nunca um arquivo nosso. */
  thumbnail_url?: string;
  /** Link direto pro arquivo .mp4, pronto pra baixar. Só nos dados reais. */
  download_url?: string;
  /** Página do clipe no Pexels, pra dar crédito/contexto. */
  pagina_url?: string;
  /** Fallback quando não há thumbnail real (dados de exemplo). */
  emoji?: string;
};
