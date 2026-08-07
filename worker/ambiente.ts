import { config } from "dotenv";
import path from "node:path";

/**
 * Ambiente do worker.
 *
 * Na máquina de dev ele lê o mesmo .env.local do site; na VPS, um .env
 * simples na raiz do repositório. O primeiro que existir vence.
 */
config({ path: path.join(process.cwd(), ".env.local") });
config({ path: path.join(process.cwd(), ".env") });

function exigir(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(
      `${nome} não está configurada. O worker precisa dela no .env (VPS) ou .env.local (dev).`,
    );
  }
  return valor;
}

export const ambiente = {
  supabaseUrl: () => exigir("NEXT_PUBLIC_SUPABASE_URL"),
  // Chave de SERVIDOR: ignora RLS. É o que deixa o worker escrever nos jobs
  // de qualquer usuário. Nunca vai pro navegador nem pro repositório.
  // Aceita o formato novo (sb_secret_...) e cai pro JWT legado se preciso.
  supabaseServico: () =>
    process.env.SUPABASE_SECRET_KEY ?? exigir("SUPABASE_SERVICE_ROLE_KEY"),
  /** Qual provedor transcreve. Troca por env, sem mexer em código. */
  transcritor: () => process.env.TRANSCRITOR ?? "groq",

  /** Quantos segundos o worker dorme entre checagens da fila. */
  intervaloSegundos: () => Number(process.env.WORKER_INTERVALO_S ?? 5),

  /**
   * Cérebro que escolhe os cortes: deepseek (padrão, decisão do produto —
   * custo baixo protege a margem) ou claude.
   */
  llm: () => {
    const provedor = (process.env.LLM ?? "deepseek") as "deepseek" | "claude";
    if (provedor === "claude") {
      return {
        provedor,
        chave: exigir("ANTHROPIC_API_KEY"),
        modelo: process.env.LLM_MODELO ?? "claude-sonnet-5",
      };
    }
    return {
      provedor: "deepseek" as const,
      chave: exigir("DEEPSEEK_API_KEY"),
      modelo: process.env.LLM_MODELO ?? "deepseek-chat",
    };
  },

  /** Máximo de cortes por vídeo. */
  maxCortes: () => Number(process.env.MAX_CORTES ?? 5),
};
