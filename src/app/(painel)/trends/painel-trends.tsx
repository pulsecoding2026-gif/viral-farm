"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  GoogleLogo,
  YoutubeLogo,
  XLogo,
  Hash,
  TrendUp,
  TrendDown,
  MagnifyingGlass,
  Target,
  FunnelSimple,
  Globe,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import {
  FAIXA_PERIODO,
  ROTULO_PERIODO,
  type TermoTrend,
  type FonteTrend,
  type Periodo,
} from "@/lib/trends/tipos";
import { NICHOS_BIBLIOTECA } from "@/lib/biblioteca/videos-exemplo";
import { Paginacao, usePaginacao } from "../paginacao";

type Aba = "tudo" | FonteTrend;
type Ordem = "variacao" | "volume";

const FONTES: {
  id: FonteTrend;
  rotulo: string;
  descricao: string;
  icone: Icon;
  cor: string;
  destaque: string;
  unidade: string;
}[] = [
  {
    id: "google",
    rotulo: "Google",
    descricao: "O que estão pesquisando",
    icone: GoogleLogo,
    cor: "from-blue-500 to-sky-600",
    destaque: "text-sky-400",
    unidade: "buscas",
  },
  {
    id: "youtube",
    rotulo: "YouTube",
    descricao: "Termos mais buscados na plataforma",
    icone: YoutubeLogo,
    cor: "from-red-500 to-rose-600",
    destaque: "text-red-400",
    unidade: "buscas",
  },
  {
    id: "x",
    rotulo: "X / Twitter",
    descricao: "Sobre o que estão falando",
    icone: XLogo,
    cor: "from-zinc-600 to-zinc-800",
    destaque: "text-zinc-300",
    unidade: "menções",
  },
  {
    id: "hashtag",
    rotulo: "Hashtags",
    descricao: "As mais usadas em vídeo curto",
    icone: Hash,
    cor: "from-fuchsia-500 to-purple-600",
    destaque: "text-fuchsia-400",
    unidade: "usos",
  },
];

const PERIODOS: Periodo[] = ["hoje", "ontem", "7d", "30d"];

/** Quantos termos cada painel mostra na visão "Tudo", antes de mandar pra aba. */
const PREVIA = 6;

function compacto(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}mil`;
  return String(n);
}

function Variacao({ pct }: { pct: number }) {
  const sobe = pct >= 0;
  return (
    <span
      className={
        "flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums " +
        (sobe
          ? "bg-emerald-950/60 text-emerald-400"
          : "bg-amber-950/60 text-amber-400")
      }
    >
      {sobe ? (
        <TrendUp size={11} weight="bold" />
      ) : (
        <TrendDown size={11} weight="bold" />
      )}
      {sobe ? "+" : ""}
      {pct}%
    </span>
  );
}

/**
 * Ações que tiram o termo da lista e levam pro resto do produto.
 * Só ícone: com uma linha por termo, rótulo em texto dobraria a altura.
 */
function Acoes({ categoria }: { categoria?: string }) {
  const q = categoria ? `?nicho=${encodeURIComponent(categoria)}` : "";
  const base =
    "flex h-6 w-6 items-center justify-center rounded-md border border-zinc-800 text-zinc-500 transition hover:border-orange-900/70 hover:text-orange-400";
  return (
    <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
      <Link href={`/radar-viral${q}`} title="Ver quem já faz vídeo disso" className={base}>
        <Target size={12} weight="bold" />
      </Link>
      <Link
        href={`/analisador${q}`}
        title="Analisar meu material sobre isso"
        className={base}
      >
        <MagnifyingGlass size={12} weight="bold" />
      </Link>
    </div>
  );
}

export function PainelTrends({ termos }: { termos: TermoTrend[] }) {
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const [aba, setAba] = useState<Aba>("tudo");
  const [nicho, setNicho] = useState<string | null>(null);
  const [ordem, setOrdem] = useState<Ordem>("variacao");
  const [busca, setBusca] = useState("");

  const noPeriodo = useMemo(() => {
    const [ini, fim] = FAIXA_PERIODO[periodo];
    return termos.filter((t) => t.dias_atras >= ini && t.dias_atras < fim);
  }, [termos, periodo]);

  const filtrados = useMemo(() => {
    let lista = noPeriodo;
    if (nicho) lista = lista.filter((t) => t.categoria === nicho);

    const termo = busca.trim().toLowerCase();
    if (termo) lista = lista.filter((t) => t.termo.toLowerCase().includes(termo));

    return [...lista].sort((a, b) =>
      ordem === "volume"
        ? b.volume - a.volume
        : b.variacao_pct - a.variacao_pct,
    );
  }, [noPeriodo, nicho, busca, ordem]);

  const porFonte = (f: FonteTrend) => filtrados.filter((t) => t.fonte === f);
  const contagem = (f: FonteTrend) => noPeriodo.filter((t) => t.fonte === f).length;

  const ABAS: { id: Aba; rotulo: string; icone: Icon; n: number }[] = [
    { id: "tudo", rotulo: "Tudo", icone: Globe, n: noPeriodo.length },
    ...FONTES.map((f) => ({
      id: f.id as Aba,
      rotulo: f.rotulo,
      icone: f.icone,
      n: contagem(f.id),
    })),
  ];

  const fonteAtiva = FONTES.find((f) => f.id === aba);
  const listaDaAba = useMemo(
    () => (fonteAtiva ? filtrados.filter((t) => t.fonte === fonteAtiva.id) : []),
    [filtrados, fonteAtiva],
  );

  // Escala das barras: relativa ao maior da FONTE inteira, não da página —
  // se fosse por página, o topo de cada uma viraria 100% e a comparação entre
  // páginas ficaria sem sentido.
  const maiorDaAba = Math.max(...listaDaAba.map((t) => t.volume), 1);

  const pag = usePaginacao(listaDaAba, 10);

  return (
    <div className="surgir">
      {/* Período: o controle mais importante desta tela. */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Período"
          className="inline-flex gap-0.5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-1"
        >
          {PERIODOS.map((p) => {
            const ativo = p === periodo;
            return (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={ativo}
                onClick={() => setPeriodo(p)}
                className={
                  "rounded-lg px-3.5 py-2 text-sm font-medium transition " +
                  (ativo
                    ? "bg-zinc-800 text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-300")
                }
              >
                {ROTULO_PERIODO[p]}
              </button>
            );
          })}
        </div>

        <p className="text-xs tabular-nums text-zinc-600">
          {noPeriodo.length} {noPeriodo.length === 1 ? "termo" : "termos"} em alta
        </p>
      </div>

      {/* Fonte: "Tudo" dá o panorama, cada aba abre a fonte inteira. */}
      <div
        role="tablist"
        aria-label="Fonte"
        className="mb-4 flex gap-0.5 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40 p-1"
      >
        {ABAS.map((a) => {
          const ativa = a.id === aba;
          const Icone = a.icone;
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={() => setAba(a.id)}
              className={
                "flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition " +
                (ativa
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-300")
              }
            >
              <Icone size={15} weight={ativa ? "fill" : "regular"} />
              {a.rotulo}
              <span
                className={
                  "rounded-full px-1.5 text-[11px] tabular-nums " +
                  (ativa ? "bg-zinc-700 text-zinc-200" : "bg-zinc-800/70 text-zinc-600")
                }
              >
                {a.n}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3.5">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setNicho(null)}
            aria-pressed={nicho === null}
            className={
              "rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-[0.97] " +
              (nicho === null
                ? "bg-orange-600 text-white"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200")
            }
          >
            Todas
          </button>
          {NICHOS_BIBLIOTECA.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNicho(n)}
              aria-pressed={nicho === n}
              className={
                "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition active:scale-[0.97] " +
                (nicho === n
                  ? "bg-orange-600 text-white"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200")
              }
            >
              {n}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-zinc-800 pt-3">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <MagnifyingGlass
              size={14}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-600"
            />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar termo"
              aria-label="Buscar termo"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 py-1.5 pr-3 pl-8 text-xs text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15"
            />
          </div>

          <label className="flex items-center gap-1.5 text-xs text-zinc-500">
            Ordenar
            <select
              value={ordem}
              onChange={(e) => setOrdem(e.target.value as Ordem)}
              className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-1.5 text-xs text-zinc-200 outline-none transition focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15"
            >
              <option value="variacao">Quem mais subiu</option>
              <option value="volume">Maior volume</option>
            </select>
          </label>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 px-6 py-16 text-center">
          <FunnelSimple size={26} className="text-zinc-700" />
          <p className="mt-3.5 text-sm font-medium text-zinc-300">
            Nada em alta com esse recorte
          </p>
          <p className="mt-1 max-w-[44ch] text-sm leading-relaxed text-zinc-500">
            Tente um período mais longo, outra categoria ou limpe a busca.
          </p>
        </div>
      ) : aba === "tudo" ? (
        /* -------------------------------------------------------- panorama */
        <div className="grid gap-4 lg:grid-cols-2">
          {FONTES.map((f) => {
            const lista = porFonte(f.id);
            const Icone = f.icone;
            const sobra = lista.length - PREVIA;
            return (
              <section
                key={f.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30"
              >
                <header className="flex items-center gap-2.5 border-b border-zinc-800 px-5 py-4">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${f.cor} text-white`}
                  >
                    <Icone size={16} weight="fill" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-zinc-100">
                      {f.rotulo}
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-500">{f.descricao}</p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-zinc-600">
                    {lista.length}
                  </span>
                </header>

                {lista.length === 0 ? (
                  <p className="px-5 py-8 text-center text-xs text-zinc-600">
                    Nada dessa fonte neste recorte.
                  </p>
                ) : (
                  <>
                    {/* Uma linha por termo: o painel cabe mais gente na tela e
                        a comparação entre fontes fica de bater o olho. */}
                    <ol className="flex-1 divide-y divide-zinc-800/50">
                      {lista.slice(0, PREVIA).map((t, i) => (
                        <li
                          key={t.id}
                          className="flex items-center gap-2.5 px-4 py-2 transition hover:bg-white/[0.02]"
                        >
                          <span className="w-3.5 shrink-0 text-right text-[11px] tabular-nums text-zinc-600">
                            {i + 1}
                          </span>
                          <p className="min-w-0 flex-1 truncate text-[13px] text-zinc-100">
                            {t.termo}
                          </p>
                          <span className="shrink-0 text-[11px] tabular-nums text-zinc-500">
                            {compacto(t.volume)}
                          </span>
                          <Variacao pct={t.variacao_pct} />
                        </li>
                      ))}
                    </ol>

                    {sobra > 0 && (
                      <button
                        type="button"
                        onClick={() => setAba(f.id)}
                        className="flex items-center justify-center gap-1.5 border-t border-zinc-800 py-2.5 text-xs font-medium text-zinc-500 transition hover:bg-white/[0.03] hover:text-orange-400"
                      >
                        Ver os {lista.length} do {f.rotulo}
                        <ArrowRight size={12} weight="bold" />
                      </button>
                    )}
                  </>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        /* ------------------------------------------------- fonte por inteiro */
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30">
          <header className="flex items-center gap-3 border-b border-zinc-800 px-5 py-4">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${fonteAtiva!.cor} text-white`}
            >
              {(() => {
                const I = fonteAtiva!.icone;
                return <I size={20} weight="fill" />;
              })()}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-zinc-50">
                {fonteAtiva!.rotulo}
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                {fonteAtiva!.descricao} · {ROTULO_PERIODO[periodo].toLowerCase()}
              </p>
            </div>
            <span className="shrink-0 text-sm tabular-nums text-zinc-500">
              {listaDaAba.length}
            </span>
          </header>

          {listaDaAba.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-zinc-600">
              Nada dessa fonte neste recorte.
            </p>
          ) : (
            <>
              {/* Cabeçalho de colunas: com linha fina, o rótulo em cima é o que
                  diz o que cada número significa sem repetir a unidade em
                  todas as linhas. */}
              <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-2 text-[10px] font-semibold tracking-wider text-zinc-600 uppercase">
                <span className="w-4 shrink-0" />
                <span className="min-w-0 flex-1">Termo</span>
                <span className="hidden w-28 shrink-0 sm:block">Categoria</span>
                <span className="hidden w-20 shrink-0 md:block">Volume</span>
                <span className="w-14 shrink-0 text-right">
                  {fonteAtiva!.unidade}
                </span>
                <span className="w-14 shrink-0 text-right">Varia</span>
                <span className="w-[52px] shrink-0" />
              </div>

              <ol className="divide-y divide-zinc-800/50">
                {pag.itens.map((t, i) => (
                  <li
                    key={t.id}
                    className="group flex items-center gap-3 px-4 py-2 transition hover:bg-white/[0.02]"
                  >
                    <span className="w-4 shrink-0 text-right text-[11px] tabular-nums text-zinc-600">
                      {pag.primeiro + i}
                    </span>

                    <p className="min-w-0 flex-1 truncate text-[13px] text-zinc-50">
                      {t.termo}
                    </p>

                    <span className="hidden w-28 shrink-0 truncate text-[11px] capitalize text-zinc-600 sm:block">
                      {t.categoria ?? "—"}
                    </span>

                    {/* Barra relativa ao maior da fonte: dá a proporção entre os
                        termos de uma olhada, o que o número sozinho não entrega. */}
                    <div className="hidden h-1 w-20 shrink-0 overflow-hidden rounded-full bg-zinc-800 md:block">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${fonteAtiva!.cor}`}
                        style={{ width: `${(t.volume / maiorDaAba) * 100}%` }}
                      />
                    </div>

                    <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-zinc-400">
                      {compacto(t.volume)}
                    </span>

                    <span className="flex w-14 shrink-0 justify-end">
                      <Variacao pct={t.variacao_pct} />
                    </span>

                    <Acoes categoria={t.categoria} />
                  </li>
                ))}
              </ol>

              <div className="px-4 pb-3">
                <Paginacao {...pag} opcoes={[25, 50, 100]} rotulo="termos" />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
