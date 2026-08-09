/**
 * Fonte REAL do Trends: o RSS oficial do Google Trends.
 *
 * Por que RSS e não scraping do HTML: o feed é uma interface publicada
 * (https://trends.google.com/trending/rss?geo=XX), estável há anos, sem
 * bloqueio de bot e sem chave. Scraping da página quebraria na primeira
 * mudança de layout e provavelmente cairia em challenge de robô vindo de
 * servidor — a lição dos cookies do YouTube nesta mesma base.
 *
 * O que o feed REALMENTE dá por termo: título, tráfego aproximado ("500+",
 * "20.000+"), imagem, e as notícias que puxaram a busca. Ele NÃO dá
 * variação percentual nem categoria — e a tela não finge que dá.
 */

export type NoticiaDoTermo = {
  titulo: string;
  url: string;
  fonte: string;
};

export type TermoEmAlta = {
  termo: string;
  /** Como o Google escreve: "500+", "20.000+". Vai cru pra tela. */
  trafego: string;
  /** O mesmo número parseado, só pra ordenar. */
  trafegoNum: number;
  imagem: string | null;
  noticias: NoticiaDoTermo[];
  publicadoEm: number;
};

/** Regiões oferecidas na tela. Qualquer outra cai em BR. */
export const REGIOES = {
  BR: "Brasil",
  US: "Estados Unidos",
  PT: "Portugal",
} as const;

export type Regiao = keyof typeof REGIOES;

export function regiaoValida(geo: string | undefined): Regiao {
  return geo && geo in REGIOES ? (geo as Regiao) : "BR";
}

/* ------------------------------------------------------------------ parse */

/**
 * Desfaz as entidades que o feed usa.
 *
 * `&apos;` entrou por flagrante: manchete em inglês saiu "Block&apos;s" na
 * tela. E o `&amp;` é desfeito por ÚLTIMO de propósito — o feed escapa em
 * dois níveis ("&amp;#39;"), e desfazer o &amp; primeiro esconderia a
 * entidade interna de todo replace seguinte.
 */
function desescapar(s: string): string {
  return s
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;#39;", "'")
    .replaceAll("&amp;", "&");
}

/** Conteúdo da primeira tag `nome` dentro de `bloco`, ou vazio. */
function tag(bloco: string, nome: string): string {
  const m = new RegExp(`<${nome}[^>]*>([\\s\\S]*?)</${nome}>`).exec(bloco);
  return m ? desescapar(m[1].trim()) : "";
}

/** "20.000+" → 20000. Serve só pra ordenar; a tela mostra o texto cru. */
function trafegoParaNumero(t: string): number {
  const digitos = t.replace(/[^\d]/g, "");
  return digitos ? Number(digitos) : 0;
}

/**
 * Parser à mão, sem biblioteca de XML.
 *
 * É deliberado: o feed é raso (nenhuma tag aninhada ambígua), controlado
 * pelo Google, e uma dependência de parser inteira pra extrair meia dúzia
 * de campos seria mais superfície de ataque e de manutenção do que estas
 * trinta linhas. Se o formato mudar, o teste de fumaça acusa na hora.
 */
export function parsearRss(xml: string): TermoEmAlta[] {
  const termos: TermoEmAlta[] = [];

  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const bloco = m[1];
    const termo = tag(bloco, "title");
    if (!termo) continue;

    const noticias: NoticiaDoTermo[] = [];
    for (const n of bloco.matchAll(/<ht:news_item>([\s\S]*?)<\/ht:news_item>/g)) {
      const titulo = tag(n[1], "ht:news_item_title");
      const url = tag(n[1], "ht:news_item_url");
      if (titulo && url) {
        noticias.push({ titulo, url, fonte: tag(n[1], "ht:news_item_source") });
      }
    }

    const trafego = tag(bloco, "ht:approx_traffic") || "—";
    const data = Date.parse(tag(bloco, "pubDate"));
    termos.push({
      termo,
      trafego,
      trafegoNum: trafegoParaNumero(trafego),
      imagem: tag(bloco, "ht:picture") || null,
      // Até 3 notícias: o card é um convite pra criar, não um agregador.
      noticias: noticias.slice(0, 3),
      publicadoEm: Number.isNaN(data) ? Date.now() : data,
    });
  }

  return termos.sort((a, b) => b.trafegoNum - a.trafegoNum);
}

/* ------------------------------------------------------------------ fetch */

/**
 * Busca os termos em alta da região.
 *
 * O `revalidate` de 15 min é o cache do próprio Next no servidor: todo
 * visitante da próxima quinzena de minutos lê a mesma resposta, e o Google
 * recebe QUATRO requisições por hora, não uma por pageview. Trend de busca
 * não muda mais rápido que isso.
 *
 * Falha devolve lista vazia em vez de lançar: a página mostra o estado
 * "fonte indisponível" e continua de pé — notícia fora do ar não pode
 * derrubar a ferramenta inteira.
 */
export async function termosEmAlta(geo: Regiao): Promise<TermoEmAlta[]> {
  try {
    const resposta = await fetch(
      `https://trends.google.com/trending/rss?geo=${geo}`,
      { next: { revalidate: 900 } },
    );
    if (!resposta.ok) {
      console.error(`[trends] Google respondeu ${resposta.status} pra ${geo}`);
      return [];
    }
    return parsearRss(await resposta.text());
  } catch (e) {
    console.error("[trends] falha ao buscar o RSS:", e);
    return [];
  }
}
