"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  TwitchLogo,
  Globe,
  Users,
  ArrowSquareOut,
  MagnifyingGlass,
  FunnelSimple,
  Scissors,
  Lightning,
} from "@phosphor-icons/react/dist/ssr";
import type { Live, PlataformaLive } from "@/lib/lives/tipos";
import { Paginacao, usePaginacao } from "../paginacao";

type Aba = "geral" | PlataformaLive;
type Ordem = "espectadores" | "recentes" | "antigas";

const PLATAFORMA: Record<PlataformaLive, { rotulo: string; cor: string }> = {
  twitch: { rotulo: "Twitch", cor: "bg-purple-600" },
  kick: { rotulo: "Kick", cor: "bg-green-600" },
};

function compacto(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")}mil`;
  return String(n);
}

/** Há quanto tempo está no ar. Live longa já rendeu clipe; live nova ainda vai. */
function noArHa(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `${min}min no ar`;
  const h = Math.floor(min / 60);
  const resto = min % 60;
  return resto ? `${h}h${String(resto).padStart(2, "0")} no ar` : `${h}h no ar`;
}

export function PainelLives({
  lives,
  plataformasReais,
}: {
  lives: Live[];
  plataformasReais: PlataformaLive[];
}) {
  const [aba, setAba] = useState<Aba>("geral");
  const [ordem, setOrdem] = useState<Ordem>("espectadores");
  const [minimo, setMinimo] = useState(0);
  const [busca, setBusca] = useState("");

  const contagem = useMemo(
    () => ({
      geral: lives.length,
      twitch: lives.filter((l) => l.plataforma === "twitch").length,
      kick: lives.filter((l) => l.plataforma === "kick").length,
    }),
    [lives],
  );

  const visiveis = useMemo(() => {
    let lista = aba === "geral" ? lives : lives.filter((l) => l.plataforma === aba);

    const termo = busca.trim().toLowerCase();
    if (termo) {
      lista = lista.filter(
        (l) =>
          l.titulo.toLowerCase().includes(termo) ||
          l.canal.toLowerCase().includes(termo) ||
          l.categoria.toLowerCase().includes(termo),
      );
    }
    if (minimo > 0) lista = lista.filter((l) => l.espectadores >= minimo);

    return [...lista].sort((a, b) => {
      if (ordem === "recentes") {
        return new Date(b.comecou_em).getTime() - new Date(a.comecou_em).getTime();
      }
      if (ordem === "antigas") {
        return new Date(a.comecou_em).getTime() - new Date(b.comecou_em).getTime();
      }
      return b.espectadores - a.espectadores;
    });
  }, [lives, aba, ordem, minimo, busca]);

  const pag = usePaginacao(visiveis, 9);

  const ABAS: { id: Aba; rotulo: string; n: number }[] = [
    { id: "geral", rotulo: "Geral", n: contagem.geral },
    { id: "twitch", rotulo: "Twitch", n: contagem.twitch },
    { id: "kick", rotulo: "Kick", n: contagem.kick },
  ];

  const totalEspectadores = visiveis.reduce((s, l) => s + l.espectadores, 0);

  return (
    <div className="surgir">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Plataforma"
          className="inline-flex gap-0.5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-1"
        >
          {ABAS.map((a) => {
            const ativa = a.id === aba;
            const real =
              a.id === "geral" || plataformasReais.includes(a.id as PlataformaLive);
            return (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={ativa}
                onClick={() => setAba(a.id)}
                className={
                  "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition " +
                  (ativa
                    ? "bg-zinc-800 text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-300")
                }
              >
                {a.id === "geral" ? (
                  <Globe size={15} weight={ativa ? "fill" : "regular"} />
                ) : a.id === "twitch" ? (
                  <TwitchLogo
                    size={15}
                    weight={ativa ? "fill" : "regular"}
                    className={ativa ? "text-purple-400" : undefined}
                  />
                ) : (
                  <Lightning
                    size={15}
                    weight={ativa ? "fill" : "regular"}
                    className={ativa ? "text-green-400" : undefined}
                  />
                )}
                {a.rotulo}
                <span
                  className={
                    "numero-placa rounded-full px-1.5 text-[11px] " +
                    (ativa
                      ? "bg-zinc-700 text-zinc-200"
                      : "bg-zinc-800/70 text-zinc-400")
                  }
                >
                  {a.n}
                </span>
                {!real && a.id !== "geral" && (
                  <span
                    title="Sem credencial: aparece só nos dados de exemplo"
                    className="h-1.5 w-1.5 rounded-full bg-amber-500"
                  />
                )}
              </button>
            );
          })}
        </div>

        <p className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Users size={13} />
          <span className="numero-placa">{compacto(totalEspectadores)}</span>{" "}
          assistindo agora
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-xl border border-zinc-800 bg-zinc-900/30 p-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <MagnifyingGlass
            size={14}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-600"
          />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Canal, título ou categoria"
            aria-label="Buscar live"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 py-1.5 pr-3 pl-8 text-xs text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15"
          />
        </div>

        <label className="flex items-center gap-1.5 text-xs text-zinc-400">
          Ordenar
          <select
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as Ordem)}
            className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-1.5 text-xs text-zinc-200 outline-none transition focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15"
          >
            <option value="espectadores">Mais espectadores</option>
            <option value="recentes">Começaram agora</option>
            <option value="antigas">Mais tempo no ar</option>
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-xs text-zinc-400">
          Mínimo
          <select
            value={minimo}
            onChange={(e) => setMinimo(Number(e.target.value))}
            className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-1.5 text-xs text-zinc-200 outline-none transition focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15"
          >
            <option value={0}>Qualquer</option>
            <option value={1000}>1mil+</option>
            <option value={10000}>10mil+</option>
            <option value={50000}>50mil+</option>
          </select>
        </label>
      </div>

      {visiveis.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 px-6 py-16 text-center">
          <FunnelSimple size={26} className="text-zinc-700" />
          <p className="mt-3.5 text-sm font-medium text-zinc-300">
            Nenhuma live com esse recorte
          </p>
          <p className="mt-1 max-w-[44ch] text-sm leading-relaxed text-zinc-400">
            Baixe o mínimo de espectadores ou limpe a busca. Se a lista
            inteira estiver vazia, é porque nenhuma live de GTA está no ar
            neste minuto — não porque o filtro está errado.
          </p>
        </div>
      ) : (
        <>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pag.itens.map((l, i) => (
            <li key={l.id}>
              <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30 transition hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/40">
                <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-950">
                  {l.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- thumbnail pública da plataforma
                    <img
                      src={l.thumbnail_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-zinc-700">
                      sem prévia
                    </span>
                  )}

                  <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/75 to-transparent" />

                  {/* Ponto pulsando: é o sinal universal de "isto é ao vivo". */}
                  <span className="placa absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    AO VIVO
                  </span>

                  <span
                    className={`placa absolute top-2 right-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white ${PLATAFORMA[l.plataforma].cor}`}
                  >
                    {PLATAFORMA[l.plataforma].rotulo}
                  </span>

                  <span className="numero-placa absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                    <Users size={10} weight="fill" />
                    {compacto(l.espectadores)}
                  </span>

                  <span className="absolute right-2 bottom-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-200 backdrop-blur">
                    {noArHa(l.comecou_em)}
                  </span>

                  {/* TOP só na primeira página e ordenado por audiência —
                      "TOP 1" na página 2 seria classificação falsa. */}
                  {pag.pagina === 1 &&
                    i < 3 &&
                    aba === "geral" &&
                    ordem === "espectadores" && (
                      <span className="placa absolute top-9 left-2 rounded-md bg-orange-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        TOP {i + 1}
                      </span>
                    )}
                </div>

                <div className="flex flex-1 flex-col p-3.5">
                  <h3 className="line-clamp-2 text-sm font-medium leading-snug text-zinc-100">
                    {l.titulo}
                  </h3>
                  <p className="mt-1 truncate text-xs text-zinc-400">
                    {l.canal} · {l.categoria}
                  </p>

                  <div className="mt-auto flex items-center gap-1.5 pt-3">
                    <Link
                      href="/analisador"
                      className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition group-hover:border-orange-900/70 group-hover:text-orange-400 hover:!bg-orange-600 hover:!text-white"
                    >
                      <Scissors size={12} weight="bold" />
                      <span className="truncate">Cortar isso</span>
                    </Link>
                    {/* min-h/min-w 11 (44px): alvo de toque mínimo — o ícone
                        continua pequeno, só a área clicável cresce. */}
                    <a
                      href={l.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Abrir ${l.canal} no ${PLATAFORMA[l.plataforma].rotulo}`}
                      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-800 p-1.5 text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
                    >
                      <ArrowSquareOut size={13} />
                    </a>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
        <Paginacao {...pag} rotulo="lives" />
        </>
      )}
    </div>
  );
}
