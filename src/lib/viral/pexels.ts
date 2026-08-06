import fs from "node:fs";
import path from "node:path";
import { exigir } from "../env";
import { NICHOS_BIBLIOTECA } from "../biblioteca/videos-exemplo";
import type { ClipeViral } from "./tipos";

/**
 * Banco de B-roll pronto pra baixar, via Pexels Videos API.
 *
 * Diferente do radar do YouTube (src/lib/biblioteca/radar.ts): aqui o
 * download é o objetivo, não um problema. Vídeo do Pexels é licenciado pra
 * uso livre, comercial, sem precisar de crédito — por isso o botão "Baixar"
 * aponta direto pro arquivo .mp4 do próprio Pexels, sem passar pelo nosso
 * servidor.
 *
 * Cota gratuita do Pexels: 20.000 requisições/mês. Uma atualização completa
 * gasta 7 (uma por nicho) — cache de 7 dias é bem folgado, já que catálogo
 * de banco de imagens não muda de hora em hora como tendência.
 */

type Nicho = (typeof NICHOS_BIBLIOTECA)[number];

const CONSULTA_POR_NICHO: Record<Nicho, string> = {
  curiosidades: "space universe",
  "mar e vida marinha": "ocean underwater",
  natureza: "forest nature",
  automotivo: "car driving",
  "culinária": "cooking food",
  fitness: "workout gym",
  "finanças pessoais": "money business",
};

const ARQUIVO_CACHE = path.join(process.cwd(), "data", "viral.json");
const VALIDADE_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

type Cache = { atualizado_em: number; clipes: ClipeViral[] };

function lerCache(): Cache | null {
  try {
    return JSON.parse(fs.readFileSync(ARQUIVO_CACHE, "utf-8"));
  } catch {
    return null;
  }
}

function salvarCache(clipes: ClipeViral[]) {
  fs.mkdirSync(path.dirname(ARQUIVO_CACHE), { recursive: true });
  fs.writeFileSync(
    ARQUIVO_CACHE,
    JSON.stringify({ atualizado_em: Date.now(), clipes } satisfies Cache),
    "utf-8",
  );
}

type ArquivoPexels = {
  file_type: string;
  width: number | null;
  height: number | null;
  link: string;
};

/** Prefere o menor arquivo com largura >= 720px, pra não baixar 4K sem motivo. */
function escolherArquivo(arquivos: ArquivoPexels[]): ArquivoPexels | null {
  const mp4 = arquivos.filter((a) => a.file_type === "video/mp4" && a.width);
  if (mp4.length === 0) return null;

  const suficientes = mp4
    .filter((a) => (a.width ?? 0) >= 720)
    .sort((a, b) => (a.width ?? 0) - (b.width ?? 0));

  if (suficientes.length > 0) return suficientes[0];

  return mp4.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
}

async function buscarPorNicho(nicho: Nicho, chave: string): Promise<ClipeViral[]> {
  const url = new URL("https://api.pexels.com/videos/search");
  url.searchParams.set("query", CONSULTA_POR_NICHO[nicho]);
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("per_page", "6");

  const resp = await fetch(url, { headers: { Authorization: chave } });
  if (!resp.ok) {
    throw new Error(`Pexels respondeu ${resp.status}: ${await resp.text()}`);
  }

  const dados = (await resp.json()) as {
    videos?: {
      id: number;
      width: number;
      height: number;
      duration: number;
      url: string;
      image: string;
      user: { name: string };
      video_files: ArquivoPexels[];
    }[];
  };

  return (dados.videos ?? [])
    .map((v): ClipeViral | null => {
      const arquivo = escolherArquivo(v.video_files);
      if (!arquivo) return null;
      return {
        id: String(v.id),
        descricao: `Clipe de ${nicho}`,
        nicho,
        duracao_s: v.duration,
        largura: v.width,
        altura: v.height,
        autor: v.user.name,
        thumbnail_url: v.image,
        download_url: arquivo.link,
        pagina_url: v.url,
      };
    })
    .filter((c): c is ClipeViral => c !== null);
}

export async function bancoViral(): Promise<{
  clipes: ClipeViral[];
  fonte: "pexels" | "cache";
}> {
  const cache = lerCache();
  if (cache && Date.now() - cache.atualizado_em < VALIDADE_CACHE_MS) {
    return { clipes: cache.clipes, fonte: "cache" };
  }

  const chave = exigir("PEXELS_API_KEY");

  const resultados: ClipeViral[] = [];
  for (const nicho of NICHOS_BIBLIOTECA) {
    try {
      resultados.push(...(await buscarPorNicho(nicho, chave)));
    } catch (err) {
      console.error(`[viral] falhou pro nicho "${nicho}":`, err);
    }
  }

  if (resultados.length === 0) {
    if (cache) return { clipes: cache.clipes, fonte: "cache" };
    throw new Error("Não consegui buscar nenhum clipe no Pexels.");
  }

  salvarCache(resultados);
  return { clipes: resultados, fonte: "pexels" };
}
