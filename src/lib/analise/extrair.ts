import path from "node:path";
import fs from "node:fs/promises";
import { run, bin } from "../proc";
import { env } from "../env";

/**
 * Hosts aceitos. Serve pra duas coisas: evitar que a URL vire um vetor de
 * SSRF (o yt-dlp faz a requisição a partir do nosso servidor) e deixar
 * explícito de onde o produto aceita conteúdo.
 */
const HOSTS_PERMITIDOS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "tiktok.com",
  "www.tiktok.com",
  "vm.tiktok.com",
  "instagram.com",
  "www.instagram.com",
  "facebook.com",
  "www.facebook.com",
  "fb.watch",
];

export class ErroDeEntrada extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErroDeEntrada";
  }
}

export function validarUrl(entrada: string): URL {
  let url: URL;
  try {
    url = new URL(entrada.trim());
  } catch {
    throw new ErroDeEntrada("Isso não parece um link válido.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ErroDeEntrada("O link precisa começar com http:// ou https://");
  }

  if (!HOSTS_PERMITIDOS.includes(url.hostname.toLowerCase())) {
    throw new ErroDeEntrada(
      `Por enquanto aceitamos links de YouTube, TikTok, Instagram e Facebook. ` +
        `Recebi: ${url.hostname}`,
    );
  }

  return url;
}

export type Metadados = {
  id: string;
  titulo: string;
  autor: string;
  duracao_s: number;
  visualizacoes: number | null;
  curtidas: number | null;
  comentarios: number | null;
  descricao: string;
  thumbnail: string | null;
  url: string;
  plataforma: string;
};

type YtDlpJson = {
  id?: string;
  title?: string;
  uploader?: string;
  channel?: string;
  duration?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  description?: string;
  thumbnail?: string;
  webpage_url?: string;
  extractor_key?: string;
};

/**
 * Clients de player tentados em ordem, tanto na leitura de metadados quanto
 * no download.
 *
 * O YouTube devolve 403 ou "Sign in to confirm you're not a bot" de forma
 * intermitente dependendo do client que o yt-dlp usa e da reputação do IP —
 * datacenter (a VPS) apanha bem mais que residencial. `null` é o padrão do
 * yt-dlp; `android_vr` e `tv` são os fallbacks que passam onde o padrão
 * é barrado. Sem a cascata, ~1 em cada N análises falharia por um motivo
 * que não tem nada a ver com o usuário.
 */
const CLIENTS: (string | null)[] = [null, "android_vr", "tv"];

export async function lerMetadados(url: URL): Promise<Metadados> {
  // Mesma cascata de clients do download. Esta chamada roda ANTES do
  // download — sem a cascata aqui, o job morria na porta de entrada sem
  // nem chegar no fallback.
  let saida: string | null = null;
  let ultimoErro: unknown;

  for (const client of CLIENTS) {
    try {
      saida = await run(
        bin.ytdlp(),
        [
          ...(client
            ? ["--extractor-args", `youtube:player_client=${client}`]
            : []),
          "-J",
          "--no-warnings",
          "--no-playlist",
          url.toString(),
        ],
        { timeoutMs: 60_000 },
      );
      break;
    } catch (err) {
      ultimoErro = err;
    }
  }

  if (saida === null) {
    throw ultimoErro instanceof Error
      ? ultimoErro
      : new Error("Não consegui ler os dados desse vídeo.");
  }

  let j: YtDlpJson;
  try {
    j = JSON.parse(saida);
  } catch {
    throw new Error("Não consegui ler os dados desse vídeo.");
  }

  const duracao = Math.round(j.duration ?? 0);
  if (!duracao) {
    throw new ErroDeEntrada(
      "Não consegui identificar a duração do vídeo. Ele pode ser uma live ou estar indisponível.",
    );
  }

  const limite = env().MAX_DURACAO_SEGUNDOS;
  if (duracao > limite) {
    const min = Math.floor(limite / 60);
    // Mensagem de saída, não de recusa: diz o limite, o que fazer agora e o
    // que está vindo. Sem isso, quem chega pela promessa de "vídeo longo" da
    // landing leva uma correção seca e vai embora.
    throw new ErroDeEntrada(
      `Esse vídeo tem ${Math.round(duracao / 60)}min e a análise aceita até ` +
        `${min}min por enquanto. Corte um trecho e mande — o corte automático ` +
        `de vídeo longo está sendo construído no módulo Clip AI.`,
    );
  }

  return {
    id: j.id ?? "desconhecido",
    titulo: j.title ?? "(sem título)",
    autor: j.uploader ?? j.channel ?? "(desconhecido)",
    duracao_s: duracao,
    visualizacoes: j.view_count ?? null,
    curtidas: j.like_count ?? null,
    comentarios: j.comment_count ?? null,
    // Descrição longa não agrega na análise e só queima token.
    descricao: (j.description ?? "").slice(0, 1500),
    thumbnail: j.thumbnail ?? null,
    url: j.webpage_url ?? url.toString(),
    plataforma: j.extractor_key ?? url.hostname,
  };
}

/**
 * Baixa o vídeo para um arquivo temporário.
 *
 * Limitamos a 720p de propósito: a análise olha estrutura e ritmo, não
 * qualidade de imagem. Baixar 1080p só gastaria banda e tempo.
 *
 * O arquivo é apagado pelo pipeline no `finally` — ver `pipeline.ts`.
 * Nunca persistimos vídeo de terceiro (ver PLANO_MVP.md seção 1).
 */
async function limparDiretorio(dir: string) {
  const restos = await fs.readdir(dir).catch(() => [] as string[]);
  await Promise.all(
    restos.map((f) => fs.rm(path.join(dir, f), { force: true })),
  );
}

export async function baixarVideo(url: URL, dir: string): Promise<string> {
  const saida = path.join(dir, "video.%(ext)s");
  let ultimoErro: unknown;

  for (const client of CLIENTS) {
    try {
      const stdout = await run(
        bin.ytdlp(),
        [
          ...(client
            ? ["--extractor-args", `youtube:player_client=${client}`]
            : []),
          // Sem isto o yt-dlp não junta vídeo e áudio (ver bin.ffmpegDir).
          ...(bin.ffmpegDir() ? ["--ffmpeg-location", bin.ffmpegDir()!] : []),
          "-f",
          "bv*[height<=720]+ba/b[height<=720]/b",
          "--merge-output-format",
          "mp4",
          "--no-playlist",
          "--no-warnings",
          "--no-part",
          // Faz o yt-dlp imprimir o caminho final do arquivo já mesclado.
          // Sem isso teríamos que adivinhar o nome, e um readdir pode pegar
          // um fragmento (video.f251.webm, só áudio) em vez do resultado.
          "--print",
          "after_move:filepath",
          // --print implica --simulate no yt-dlp. Sem isto ele imprime o
          // caminho e não baixa nada.
          "--no-simulate",
          "-o",
          saida,
          url.toString(),
        ],
        { timeoutMs: 4 * 60_000 },
      );

      const caminho = stdout
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .at(-1);

      if (caminho) {
        const existe = await fs
          .stat(caminho)
          .then((s) => s.isFile() && s.size > 0)
          .catch(() => false);
        if (existe) return caminho;
      }

      ultimoErro = new Error("Download terminou sem produzir arquivo válido.");
      await limparDiretorio(dir);
    } catch (err) {
      ultimoErro = err;
      // Restos parciais confundiriam a próxima tentativa.
      await limparDiretorio(dir);
    }
  }

  throw new Error(
    `Não consegui baixar esse vídeo depois de ${CLIENTS.length} tentativas. ` +
      `Ele pode ser privado, com restrição de idade ou região. ` +
      `Detalhe: ${ultimoErro instanceof Error ? ultimoErro.message : ultimoErro}`,
  );
}
