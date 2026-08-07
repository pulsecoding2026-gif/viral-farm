import { spawn } from "node:child_process";
import path from "node:path";
import { env } from "./env";

export class ProcError extends Error {
  constructor(
    readonly comando: string,
    readonly code: number | null,
    readonly stderr: string,
  ) {
    super(
      `"${comando}" saiu com código ${code}.\n` +
        stderr.split("\n").slice(-20).join("\n"),
    );
    this.name = "ProcError";
  }
}

/**
 * Executa um binário externo e devolve stdout.
 *
 * Usamos spawn com array de argumentos (nunca uma string de shell) — os
 * argumentos vêm de input do usuário (URL do vídeo), então shell aqui seria
 * injeção de comando.
 */
export function run(
  bin: string,
  args: string[],
  opts: { timeoutMs?: number; cwd?: string } = {},
): Promise<string> {
  const { timeoutMs = 5 * 60_000, cwd } = opts;

  return new Promise((resolve, reject) => {
    // cwd existe por causa dos filtros do ffmpeg (ass=arquivo.ass): caminho
    // absoluto do Windows leva "C:", o parser de filtro divide no ":" e
    // nenhum esquema de escape sobrevive igual em todas as versões. Rodar
    // DE DENTRO do diretório e referenciar por nome relativo elimina a
    // classe inteira de problema.
    const p = spawn(bin, args, { windowsHide: true, cwd });

    let stdout = "";
    let stderr = "";
    let matouPorTimeout = false;

    const timer = setTimeout(() => {
      matouPorTimeout = true;
      p.kill("SIGKILL");
    }, timeoutMs);

    p.stdout.on("data", (d) => (stdout += d.toString()));
    p.stderr.on("data", (d) => (stderr += d.toString()));

    p.on("error", (err) => {
      clearTimeout(timer);
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new Error(
            `Binário "${bin}" não encontrado. Instale-o ou aponte o caminho ` +
              `em .env.local (FFMPEG_PATH / FFPROBE_PATH / YTDLP_PATH).`,
          ),
        );
        return;
      }
      reject(err);
    });

    p.on("close", (code) => {
      clearTimeout(timer);
      if (matouPorTimeout) {
        reject(new Error(`"${bin}" estourou o timeout de ${timeoutMs}ms`));
        return;
      }
      if (code !== 0) {
        reject(new ProcError(bin, code, stderr));
        return;
      }
      resolve(stdout);
    });
  });
}

/**
 * Igual ao run(), mas devolve stdout como Buffer.
 *
 * Existe por causa da leitura de frames: `run()` concatena com toString(),
 * o que destrói byte binário (qualquer sequência inválida em UTF-8 vira
 * U+FFFD). Pra medir pixel a gente precisa do byte exato.
 */
export function runBinario(
  bin: string,
  args: string[],
  opts: { timeoutMs?: number } = {},
): Promise<Buffer> {
  const { timeoutMs = 60_000 } = opts;

  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { windowsHide: true });
    const pedacos: Buffer[] = [];
    let stderr = "";
    let matouPorTimeout = false;

    const timer = setTimeout(() => {
      matouPorTimeout = true;
      p.kill("SIGKILL");
    }, timeoutMs);

    p.stdout.on("data", (d: Buffer) => pedacos.push(d));
    p.stderr.on("data", (d) => (stderr += d.toString()));

    p.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    p.on("close", (code) => {
      clearTimeout(timer);
      if (matouPorTimeout) {
        reject(new Error(`"${bin}" estourou o timeout de ${timeoutMs}ms`));
        return;
      }
      if (code !== 0) {
        reject(new ProcError(bin, code, stderr));
        return;
      }
      resolve(Buffer.concat(pedacos));
    });
  });
}

export const bin = {
  ffmpeg: () => env().FFMPEG_PATH ?? "ffmpeg",
  ffprobe: () => env().FFPROBE_PATH ?? "ffprobe",
  ytdlp: () => env().YTDLP_PATH ?? "yt-dlp",

  /**
   * Diretório do ffmpeg, para o `--ffmpeg-location` do yt-dlp.
   *
   * O yt-dlp precisa do ffmpeg para juntar as faixas de vídeo e áudio, que
   * o YouTube entrega separadas. Se ele não achar o ffmpeg, baixa os dois
   * fragmentos, não junta, e ainda assim reporta sucesso — o erro só
   * aparece depois, quando tentamos ler frames de um arquivo só de áudio.
   *
   * Devolve null quando não há caminho explícito: aí o yt-dlp procura no
   * PATH, que é o caso do container em produção.
   */
  ffmpegDir: (): string | null => {
    const p = env().FFMPEG_PATH;
    return p ? path.dirname(p) : null;
  },
};
