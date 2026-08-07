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
  supabaseServico: () => exigir("SUPABASE_SERVICE_ROLE_KEY"),
  anthropic: () => exigir("ANTHROPIC_API_KEY"),

  /** Qual provedor transcreve. Troca por env, sem mexer em código. */
  transcritor: () => process.env.TRANSCRITOR ?? "groq",

  /** Quantos segundos o worker dorme entre checagens da fila. */
  intervaloSegundos: () => Number(process.env.WORKER_INTERVALO_S ?? 5),

  /** Modelo que escolhe os cortes. Sonnet dá conta e custa uma fração. */
  modelo: () => process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",

  /** Máximo de cortes por vídeo. */
  maxCortes: () => Number(process.env.MAX_CORTES ?? 5),
};
