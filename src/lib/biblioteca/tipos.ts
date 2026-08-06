export type ItemBiblioteca = {
  id: string;
  titulo: string;
  canal: string;
  nicho: string;
  plataforma: "youtube" | "tiktok" | "instagram";
  visualizacoes: number;
  curtidas: number;
  /** ISO 8601. Data de publicação na plataforma original. */
  publicado_em: string;
  duracao_s: number;
  /**
   * true/false quando a IA já classificou a thumbnail; undefined quando
   * ainda não foi possível classificar (ex: sem ANTHROPIC_API_KEY). Nesse
   * caso o filtro "só sem legenda" deixa passar mesmo assim, pra não
   * esconder vídeo bom por falta de classificação.
   */
  tem_legenda_embutida?: boolean;
  /** Fallback quando não há thumbnail real (dados de exemplo). */
  emoji?: string;
  /** Thumbnail pública já exposta pela plataforma — nunca um arquivo nosso. */
  thumbnail_url?: string;
  /** Link pro vídeo original. Só existe nos dados reais do radar. */
  link?: string;
};
