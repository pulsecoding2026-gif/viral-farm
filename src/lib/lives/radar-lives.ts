import type { Live, PlataformaLive, ResultadoLives } from "./tipos";
import { LIVES_EXEMPLO } from "./exemplos";

/**
 * Lives ao vivo agora, somando Twitch e Kick.
 *
 * As duas APIs são públicas mas exigem credencial de aplicativo (nenhuma
 * pede login do usuário final). Sem credencial, a plataforma correspondente
 * simplesmente não entra no resultado — a UI diz o que está e o que não está
 * ligado, em vez de misturar exemplo com dado real sem avisar.
 *
 * Cache curto de propósito: live muda de minuto a minuto, e um cache longo
 * mostraria stream que já acabou. 90s é o suficiente pra não bater na API a
 * cada refresh sem entregar informação velha.
 */

const CACHE_MS = 90_000;
const LIMITE = 40;

type Cache = { em: number; dados: ResultadoLives };
const cache: { atual?: Cache } =
  (globalThis as { __viralxLives?: { atual?: Cache } }).__viralxLives ??
  ((globalThis as { __viralxLives?: { atual?: Cache } }).__viralxLives = {});

/* ------------------------------------------------------------------ twitch */

type TokenCache = { token: string; expira: number };
const tokens: Record<string, TokenCache | undefined> = {};

async function tokenTwitch(): Promise<string | null> {
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) return null;

  const guardado = tokens.twitch;
  if (guardado && guardado.expira > Date.now() + 60_000) return guardado.token;

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Twitch OAuth respondeu ${res.status}`);

  const j = await res.json();
  tokens.twitch = {
    token: j.access_token,
    expira: Date.now() + j.expires_in * 1000,
  };
  return j.access_token;
}

async function buscarTwitch(): Promise<Live[]> {
  const token = await tokenTwitch();
  if (!token) return [];

  // O Helix já devolve ordenado por espectadores, decrescente.
  const url = new URL("https://api.twitch.tv/helix/streams");
  url.searchParams.set("first", String(LIMITE));
  url.searchParams.set("type", "live");
  const idioma = process.env.LIVES_IDIOMA;
  if (idioma) url.searchParams.set("language", idioma);

  const res = await fetch(url, {
    headers: {
      "Client-Id": process.env.TWITCH_CLIENT_ID!,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Twitch Helix respondeu ${res.status}`);

  const { data } = await res.json();
  return (data ?? []).map(
    (s: Record<string, unknown>): Live => ({
      id: `tw-${s.id}`,
      titulo: (s.title as string) || "(sem título)",
      canal: (s.user_name as string) ?? (s.user_login as string) ?? "",
      plataforma: "twitch",
      espectadores: Number(s.viewer_count) || 0,
      categoria: (s.game_name as string) || "—",
      comecou_em: s.started_at as string,
      idioma: s.language as string,
      // O template vem com {width}x{height} pra substituir.
      thumbnail_url: (s.thumbnail_url as string)
        ?.replace("{width}", "440")
        .replace("{height}", "248"),
      link: `https://twitch.tv/${s.user_login}`,
    }),
  );
}

/* -------------------------------------------------------------------- kick */

async function tokenKick(): Promise<string | null> {
  const id = process.env.KICK_CLIENT_ID;
  const secret = process.env.KICK_CLIENT_SECRET;
  if (!id || !secret) return null;

  const guardado = tokens.kick;
  if (guardado && guardado.expira > Date.now() + 60_000) return guardado.token;

  // O servidor de identidade do Kick é separado da API (id.kick.com).
  const res = await fetch("https://id.kick.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Kick OAuth respondeu ${res.status}`);

  const j = await res.json();
  tokens.kick = {
    token: j.access_token,
    expira: Date.now() + (j.expires_in ?? 3600) * 1000,
  };
  return j.access_token;
}

async function buscarKick(): Promise<Live[]> {
  const token = await tokenKick();
  if (!token) return [];

  // Diferença importante em relação ao Twitch: o v2 do Kick NÃO aceita
  // ordenação — devolve do mais antigo pro mais novo. Por isso puxamos um
  // lote grande e ordenamos aqui.
  const url = new URL("https://api.kick.com/public/v2/livestreams");
  url.searchParams.set("limit", "200");
  const idioma = process.env.LIVES_IDIOMA;
  if (idioma) url.searchParams.set("language_code", idioma);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Kick livestreams respondeu ${res.status}`);

  const { data } = await res.json();
  return (data ?? [])
    .map(
      (s: Record<string, never>): Live => ({
        id: `kk-${s.id}`,
        titulo: (s.title as string) || "(sem título)",
        canal:
          (s.broadcaster_user as { username?: string })?.username ??
          (s.channel as { slug?: string })?.slug ??
          "",
        plataforma: "kick",
        espectadores: Number(s.viewer_count) || 0,
        categoria: (s.category as { name?: string })?.name || "—",
        comecou_em: s.started_at as string,
        idioma: s.language_code as string,
        thumbnail_url: s.thumbnail as string,
        link: `https://kick.com/${(s.channel as { slug?: string })?.slug ?? ""}`,
        adulto: Boolean(s.has_mature_content),
      }),
    )
    .sort((a: Live, b: Live) => b.espectadores - a.espectadores)
    .slice(0, LIMITE);
}

/* ---------------------------------------------------------------- fachada */

export async function radarDeLives(): Promise<ResultadoLives> {
  if (cache.atual && Date.now() - cache.atual.em < CACHE_MS) {
    return { ...cache.atual.dados, fonte: "cache" };
  }

  // Uma plataforma fora do ar não pode derrubar a outra.
  const [tw, kk] = await Promise.allSettled([buscarTwitch(), buscarKick()]);

  const lives: Live[] = [];
  const plataformasReais: PlataformaLive[] = [];

  if (tw.status === "fulfilled" && tw.value.length) {
    lives.push(...tw.value);
    plataformasReais.push("twitch");
  } else if (tw.status === "rejected") {
    console.error("[lives] Twitch falhou:", tw.reason);
  }

  if (kk.status === "fulfilled" && kk.value.length) {
    lives.push(...kk.value);
    plataformasReais.push("kick");
  } else if (kk.status === "rejected") {
    console.error("[lives] Kick falhou:", kk.reason);
  }

  if (lives.length === 0) {
    return { lives: LIVES_EXEMPLO, fonte: "exemplo", plataformasReais: [] };
  }

  const dados: ResultadoLives = {
    lives: lives.sort((a, b) => b.espectadores - a.espectadores),
    fonte: "api",
    plataformasReais,
  };
  cache.atual = { em: Date.now(), dados };
  return dados;
}
