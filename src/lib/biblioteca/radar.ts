import fs from "node:fs";
import path from "node:path";
import { exigir } from "../env";
import { NICHOS_BIBLIOTECA } from "./videos-exemplo";
import { marcarLegendaEmbutida } from "./filtro-legenda";
import type { ItemBiblioteca } from "./tipos";

/**
 * Radar de tendências: busca os vídeos curtos mais vistos por nicho via
 * YouTube Data API v3 (busca simples, sem SDK — a API é só REST).
 *
 * Não hospedamos vídeo de terceiro aqui: só título, canal, views, duração e
 * a thumbnail pública que o próprio YouTube expõe (mesma regra do
 * analisador — ver PLANO_MVP.md seção 1).
 *
 * Global de propósito: sem `regionCode` nem `relevanceLanguage`, e cada
 * nicho roda em várias línguas (não só português) pra não limitar a
 * Biblioteca ao Brasil. Ver PLANO_MVP.md seção 1 — a versão anterior
 * prendia tudo em pt/BR.
 *
 * Cota: `search.list` custa 100 unidades por chamada, `videos.list` custa 1
 * por chamada (não por vídeo). Rodar pros 3 nichos × 2 línguas gasta ~600
 * unidades por atualização, contra uma cota diária gratuita de 10.000 — por
 * isso o resultado fica em cache local por 12h em vez de bater na API a
 * cada carregamento de página.
 *
 * NICHOS TROCADOS PRA GTA (26/08/2026) — a GTA VIRAL é dedicada à franquia
 * (docs/gta/plano-mestre.md), então "o que performa no nicho" agora quer
 * dizer "o que performa dentro de GTA", não categorias genéricas de canal.
 * Os três nichos abaixo são formatos DENTRO da franquia, não jogos
 * diferentes — é por isso que a busca continua "roleplay gta v", nunca só
 * "roleplay".
 *
 * NUNCA adicionar consulta de "gta vi" aqui: o jogo lança em 19/11/2026 e não
 * existe gameplay dele em vídeo nenhum ainda (docs/gta/pesquisa-jogo.md).
 * Buscar por "gta vi" devolveria zero resultado sempre — pior que devolver o
 * resultado errado, porque não avisa nada, só fica vazio.
 */

type Nicho = (typeof NICHOS_BIBLIOTECA)[number];

// Duas línguas por nicho: português (a base de RP brasileira, que é onde o
// produto mira primeiro) e inglês (servidores de RP e canais de GTA Online
// em inglês também viralizam, e ampliam o pool antes do filtro "sem
// legenda" de baixo).
const CONSULTAS_POR_NICHO: Record<Nicho, string[]> = {
  "gta rp": ["roleplay gta v cortes", "gta rp funny moments"],
  "gta online": ["gta online melhores momentos", "gta online funny moments"],
  "gta v engraçado": ["gta v momentos engraçados", "gta 5 funny moments compilation"],
};

const ARQUIVO_CACHE = path.join(process.cwd(), "data", "biblioteca.json");
const VALIDADE_CACHE_MS = 12 * 60 * 60 * 1000;

type Cache = { atualizado_em: number; videos: ItemBiblioteca[] };

function lerCache(): Cache | null {
  try {
    return JSON.parse(fs.readFileSync(ARQUIVO_CACHE, "utf-8"));
  } catch {
    return null;
  }
}

function salvarCache(videos: ItemBiblioteca[]) {
  fs.mkdirSync(path.dirname(ARQUIVO_CACHE), { recursive: true });
  fs.writeFileSync(
    ARQUIVO_CACHE,
    JSON.stringify({ atualizado_em: Date.now(), videos } satisfies Cache),
    "utf-8",
  );
}

function paraSegundos(duracaoIso8601: string): number {
  const m = duracaoIso8601.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const [, h, min, s] = m;
  return Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0);
}

async function buscarJson(url: URL): Promise<unknown> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`YouTube API respondeu ${resp.status}: ${await resp.text()}`);
  }
  return resp.json();
}

async function buscarIdsPorConsulta(consulta: string, chave: string): Promise<string[]> {
  const urlBusca = new URL("https://www.googleapis.com/youtube/v3/search");
  urlBusca.searchParams.set("key", chave);
  urlBusca.searchParams.set("part", "id");
  urlBusca.searchParams.set("q", consulta);
  urlBusca.searchParams.set("type", "video");
  urlBusca.searchParams.set("videoDuration", "short");
  urlBusca.searchParams.set("order", "viewCount");
  urlBusca.searchParams.set("safeSearch", "strict");
  // Sem regionCode/relevanceLanguage de propósito: a busca fica global, não
  // travada em um país/idioma. `search.list` custa 100 unidades fixas por
  // chamada, não por resultado — pedir mais aqui não pesa na cota. Vale a
  // pena: boa parte do vídeo viral já vem com legenda embutida, então o
  // filtro "sem legenda" precisa de um pool maior pra sobrar algo depois de
  // filtrar. 50 é o teto da API.
  urlBusca.searchParams.set("maxResults", "50");

  const dadosBusca = (await buscarJson(urlBusca)) as {
    items?: { id?: { videoId?: string } }[];
  };
  return (dadosBusca.items ?? [])
    .map((it) => it.id?.videoId)
    .filter((id): id is string => Boolean(id));
}

type DadosVideo = {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails?: Record<string, { url: string }>;
  };
  statistics?: { viewCount?: string; likeCount?: string };
  contentDetails: { duration: string };
};

// `videos.list` só aceita até 50 ids por chamada.
const TAMANHO_LOTE_VIDEOS = 50;

async function buscarVideosPorIds(ids: string[], chave: string): Promise<DadosVideo[]> {
  const lotes: string[][] = [];
  for (let i = 0; i < ids.length; i += TAMANHO_LOTE_VIDEOS) {
    lotes.push(ids.slice(i, i + TAMANHO_LOTE_VIDEOS));
  }

  const resultados = await Promise.all(
    lotes.map(async (lote) => {
      const urlVideos = new URL("https://www.googleapis.com/youtube/v3/videos");
      urlVideos.searchParams.set("key", chave);
      urlVideos.searchParams.set("part", "snippet,statistics,contentDetails");
      urlVideos.searchParams.set("id", lote.join(","));
      const dados = (await buscarJson(urlVideos)) as { items?: DadosVideo[] };
      return dados.items ?? [];
    }),
  );

  return resultados.flat();
}

async function buscarPorNicho(nicho: Nicho, chave: string): Promise<ItemBiblioteca[]> {
  const idsPorConsulta = await Promise.all(
    CONSULTAS_POR_NICHO[nicho].map((consulta) => buscarIdsPorConsulta(consulta, chave)),
  );
  const ids = [...new Set(idsPorConsulta.flat())];

  if (ids.length === 0) return [];

  const dadosVideos = await buscarVideosPorIds(ids, chave);

  return dadosVideos
    .map((v): ItemBiblioteca => ({
      id: v.id,
      titulo: v.snippet.title,
      canal: v.snippet.channelTitle,
      nicho,
      plataforma: "youtube",
      visualizacoes: Number(v.statistics?.viewCount ?? 0),
      // O criador pode esconder o contador de curtidas — o campo some da API nesse caso.
      curtidas: Number(v.statistics?.likeCount ?? 0),
      publicado_em: v.snippet.publishedAt,
      duracao_s: paraSegundos(v.contentDetails.duration),
      link: `https://www.youtube.com/watch?v=${v.id}`,
      thumbnail_url:
        v.snippet.thumbnails?.medium?.url ?? v.snippet.thumbnails?.default?.url,
    }))
    // "short" no filtro de busca é só uma dica pro YouTube — confirma aqui.
    .filter((v) => v.duracao_s > 0 && v.duracao_s <= 180)
    .sort((a, b) => b.visualizacoes - a.visualizacoes);
}

export async function radarDeTendencias(): Promise<{
  videos: ItemBiblioteca[];
  fonte: "youtube" | "cache";
}> {
  const cache = lerCache();
  if (cache && Date.now() - cache.atualizado_em < VALIDADE_CACHE_MS) {
    return { videos: cache.videos, fonte: "cache" };
  }

  const chave = exigir("YOUTUBE_API_KEY");

  const brutos: ItemBiblioteca[] = [];
  for (const nicho of NICHOS_BIBLIOTECA) {
    try {
      brutos.push(...(await buscarPorNicho(nicho, chave)));
    } catch (err) {
      console.error(`[radar] falhou pro nicho "${nicho}":`, err);
    }
  }

  // Com busca em vários idiomas, o mesmo vídeo pode bater em mais de um
  // nicho (ex: vida marinha e natureza) — sem isso, o `key={video.id}` do
  // grid duplica.
  const vistos = new Set<string>();
  const resultados = brutos.filter((v) => {
    if (vistos.has(v.id)) return false;
    vistos.add(v.id);
    return true;
  });

  if (resultados.length === 0) {
    // Erro de rede/cota não deve apagar um cache bom que já existia.
    if (cache) return { videos: cache.videos, fonte: "cache" };
    throw new Error("Não consegui buscar nenhum vídeo no radar do YouTube.");
  }

  let comLegenda: ItemBiblioteca[];
  try {
    comLegenda = await marcarLegendaEmbutida(resultados);
  } catch (err) {
    // Sem ANTHROPIC_API_KEY ou erro na chamada: segue sem a classificação
    // em vez de derrubar o radar inteiro por causa de um filtro opcional.
    console.error("[radar] falhou ao classificar legenda embutida:", err);
    comLegenda = resultados;
  }

  salvarCache(comLegenda);
  return { videos: comLegenda, fonte: "youtube" };
}
