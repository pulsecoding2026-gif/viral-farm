import type { Metadata } from "next";
import Link from "next/link";
import {
  Lightning,
  Scroll,
  ChatCircleDots,
  ArrowSquareOut,
  TrendUp,
  CloudSlash,
} from "@phosphor-icons/react/dist/ssr";
import {
  REGIOES,
  regiaoValida,
  termosEmAlta,
  type TermoEmAlta,
} from "@/lib/trends/google";

export const metadata: Metadata = { title: "Trends" };

/**
 * Trends com FONTE REAL: o RSS oficial do Google Trends, por região.
 *
 * A versão anterior era dado de exemplo com aviso. Esta mostra o que o
 * Brasil está buscando AGORA — e só o que a fonte realmente entrega: termo,
 * tráfego aproximado e as notícias que puxaram a busca. Volume inventado,
 * variação percentual e categoria saíram junto com o mock: número que a
 * fonte não dá é número que a gente não mostra.
 *
 * O valor da tela não é ler notícia — é o clique seguinte: cada termo vira
 * hooks, roteiro ou conversa com o Agent com o tema já preenchido. Trend
 * sem ação é agregador; trend com ação é pauta.
 */
export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ geo?: string }>;
}) {
  const { geo } = await searchParams;
  const regiao = regiaoValida(geo);
  const termos = await termosEmAlta(regiao);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Trends
        </h1>
        <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-zinc-500">
          O que as pessoas estão buscando no Google agora, na região escolhida.
          Clique num termo pra transformá-lo em hooks, roteiro ou numa conversa
          com o Agent — a pauta chega pronta.
        </p>
      </header>

      {/* ------------------------------------------------------- regiões */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {(Object.keys(REGIOES) as (keyof typeof REGIOES)[]).map((g) => (
          <Link
            key={g}
            href={g === "BR" ? "/trends" : `/trends?geo=${g}`}
            className={
              "rounded-lg px-3 py-1.5 text-xs font-medium transition " +
              (g === regiao
                ? "bg-orange-600 text-white"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200")
            }
          >
            {REGIOES[g]}
          </Link>
        ))}
        <span className="ml-auto text-[11px] text-zinc-600">
          Fonte: Google Trends · atualizado a cada 15 min
        </span>
      </div>

      {termos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-10 text-center">
          <CloudSlash size={28} className="text-zinc-600" />
          <p className="text-sm font-medium text-zinc-300">
            A fonte não respondeu agora
          </p>
          <p className="max-w-[46ch] text-xs leading-relaxed text-zinc-500">
            O Google Trends está fora do ar ou recusou a consulta. Não é nada
            com a sua conta — recarregue em instantes.
          </p>
        </div>
      ) : (
        <ol className="grid gap-3 lg:grid-cols-2">
          {termos.map((t, i) => (
            <Cartao key={t.termo} termo={t} posicao={i + 1} />
          ))}
        </ol>
      )}
    </div>
  );
}

function Cartao({ termo: t, posicao }: { termo: TermoEmAlta; posicao: number }) {
  const tema = encodeURIComponent(t.termo);
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-start gap-3.5 p-4">
        <span className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-zinc-600">
          {String(posicao).padStart(2, "0")}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold text-zinc-100 capitalize">
              {t.termo}
            </h2>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/60 px-1.5 py-0.5 text-[11px] font-medium text-emerald-300">
              <TrendUp size={11} weight="bold" />
              {t.trafego} buscas
            </span>
          </div>

          {/* As notícias que puxaram a busca — o CONTEXTO do termo. Sem
              elas, "classificação" em alta não diz de quê. */}
          {t.noticias.length > 0 && (
            <ul className="mt-2 space-y-1">
              {t.noticias.slice(0, 2).map((n) => (
                <li key={n.url}>
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-baseline gap-1.5 text-xs leading-snug"
                  >
                    <ArrowSquareOut
                      size={11}
                      className="shrink-0 translate-y-0.5 text-zinc-600 group-hover:text-orange-400"
                    />
                    <span className="truncate text-zinc-400 group-hover:text-zinc-200">
                      {n.titulo}
                    </span>
                    {n.fonte && (
                      <span className="shrink-0 text-[10px] text-zinc-600">
                        {n.fonte}
                      </span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {t.imagem && (
          // <img> cru de propósito: a miniatura vem de domínio variável do
          // gstatic e otimizar thumbnail de feed não paga a configuração de
          // remotePatterns no next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={t.imagem}
            alt=""
            className="h-14 w-14 shrink-0 rounded-lg object-cover"
          />
        )}
      </div>

      {/* O clique seguinte — a razão da tela existir. */}
      <div className="mt-auto flex items-center gap-1 border-t border-zinc-800/70 bg-zinc-950/40 px-3 py-2">
        <Acao href={`/hooks?tema=${tema}`} icone={<Lightning size={13} />} rotulo="Hooks" />
        <Acao href={`/roteiros?tema=${tema}`} icone={<Scroll size={13} />} rotulo="Roteiro" />
        <Acao
          href={`/agent-viral?tema=${tema}`}
          icone={<ChatCircleDots size={13} />}
          rotulo="Perguntar ao Agent"
        />
      </div>
    </li>
  );
}

function Acao({
  href,
  icone,
  rotulo,
}: {
  href: string;
  icone: React.ReactNode;
  rotulo: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-orange-600/15 hover:text-orange-300"
    >
      {icone}
      {rotulo}
    </Link>
  );
}
