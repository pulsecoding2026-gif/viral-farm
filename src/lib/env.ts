import { z } from "zod";

/**
 * Validação das variáveis de ambiente do servidor.
 *
 * Falha cedo e com mensagem clara — é melhor quebrar no boot do que
 * descobrir no meio de uma análise que faltava uma chave.
 */
const schema = z.object({
  // Opcionais aqui de propósito: as etapas de mídia (download, frames, áudio)
  // não precisam de chave de IA, e travar o boot por causa delas impediria
  // testar o pipeline por partes. A cobrança da chave acontece em `exigir()`,
  // no momento em que o cliente é construído.
  ANTHROPIC_API_KEY: z.string().default(""),
  GROQ_API_KEY: z.string().default(""),
  // Radar de tendências da Biblioteca. Sem isso, a Biblioteca cai pros dados
  // de exemplo em vez de quebrar — ver src/lib/biblioteca/radar.ts.
  YOUTUBE_API_KEY: z.string().default(""),
  // Banco de B-roll da aba Viral. Sem isso, cai pros dados de exemplo — ver
  // src/lib/viral/pexels.ts.
  PEXELS_API_KEY: z.string().default(""),

  // Modelo e esforço ficam em env pra dar pra testar Opus 5 vs Sonnet 5
  // sem mexer no código. Ver PLANO_MVP.md seção 4.
  ANTHROPIC_MODEL: z.string().default("claude-opus-5"),
  ANTHROPIC_EFFORT: z
    .enum(["low", "medium", "high", "xhigh", "max"])
    .default("high"),

  // Caminhos opcionais — se não setar, procura no PATH.
  FFMPEG_PATH: z.string().optional(),
  FFPROBE_PATH: z.string().optional(),
  YTDLP_PATH: z.string().optional(),

  // Trava de custo/abuso: vídeo maior que isso é recusado.
  MAX_DURACAO_SEGUNDOS: z.coerce.number().int().positive().default(180),
  // Quantos frames mandar pro Claude. Mais frames = mais preciso e mais caro.
  QTD_FRAMES: z.coerce.number().int().positive().default(10),
  // Lado maior do frame em px. 512 é suficiente pra analisar estrutura;
  // subir isso aumenta o custo de imagem rápido.
  FRAME_MAX_PX: z.coerce.number().int().positive().default(512),
});

let cache: z.infer<typeof schema> | null = null;

export function env() {
  if (cache) return cache;

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problemas = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Variáveis de ambiente inválidas:\n${problemas}\n\n` +
        `Copie .env.local.example para .env.local e preencha.`,
    );
  }

  cache = parsed.data;
  return cache;
}

const ONDE_PEGAR: Record<string, string> = {
  ANTHROPIC_API_KEY: "https://platform.claude.com/settings/keys",
  GROQ_API_KEY: "https://console.groq.com/keys",
  YOUTUBE_API_KEY: "https://console.cloud.google.com/apis/credentials (ative a YouTube Data API v3 no projeto antes)",
  PEXELS_API_KEY: "https://www.pexels.com/api/ (cadastro gratuito)",
};

/**
 * Lê uma variável obrigatória no ponto de uso, com erro que diz onde
 * conseguir a chave em vez de só reclamar que está faltando.
 */
export function exigir(
  nome: "ANTHROPIC_API_KEY" | "GROQ_API_KEY" | "YOUTUBE_API_KEY" | "PEXELS_API_KEY",
): string {
  const valor = env()[nome];
  if (!valor) {
    throw new Error(
      `${nome} não está configurada. Pegue a chave em ${ONDE_PEGAR[nome]} ` +
        `e coloque em .env.local`,
    );
  }
  return valor;
}
