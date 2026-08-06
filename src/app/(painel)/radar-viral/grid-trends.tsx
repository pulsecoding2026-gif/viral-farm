"use client";

import { useMemo, useState } from "react";
import {
  FunnelSimple,
  MagnifyingGlass,
  Globe,
  YoutubeLogo,
  TiktokLogo,
  InstagramLogo,
  SlidersHorizontal,
  SquaresFour,
  Rows,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { NICHOS_BIBLIOTECA } from "@/lib/biblioteca/videos-exemplo";
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";
import { CartaoVideo } from "./cartao-video";
import { LinhaVideo } from "./linha-video";
import { Paginacao, usePaginacao } from "../paginacao";

type Visao = "grade" | "lista";
type Plataforma = "geral" | "tiktok" | "instagram" | "youtube";
type Ordem = "views" | "curtidas" | "engajamento" | "recentes";
type Periodo = "qualquer" | "24h" | "7d" | "30d";
type Duracao = "qualquer" | "ate15" | "15a30" | "30a60" | "mais60";
type Engajamento = "qualquer" | "3" | "6" | "10";

const PERIODO_MS: Record<Exclude<Periodo, "qualquer">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const FAIXA_DURACAO: Record<
  Exclude<Duracao, "qualquer">,
  [number, number]
> = {
  ate15: [0, 15],
  "15a30": [15, 30],
  "30a60": [30, 60],
  mais60: [60, Infinity],
};

const PLATAFORMAS: { id: Plataforma; rotulo: string; icone: Icon; cor: string }[] =
  [
    { id: "geral", rotulo: "Geral", icone: Globe, cor: "text-zinc-300" },
    { id: "tiktok", rotulo: "TikTok", icone: TiktokLogo, cor: "text-zinc-100" },
    {
      id: "instagram",
      rotulo: "Instagram",
      icone: InstagramLogo,
      cor: "text-pink-400",
    },
    { id: "youtube", rotulo: "YouTube", icone: YoutubeLogo, cor: "text-red-500" },
  ];

const CLASSE_SELECT =
  "rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-1.5 text-xs text-zinc-200 outline-none transition focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15";

/** Curtidas por visualização, em %. É o sinal de que o vídeo prendeu. */
function engajamentoPct(v: ItemBiblioteca): number {
  if (!v.visualizacoes) return 0;
  return (v.curtidas / v.visualizacoes) * 100;
}

export function GridTrends({
  videosIniciais,
  idsSalvos = [],
}: {
  videosIniciais: ItemBiblioteca[];
  idsSalvos?: string[];
}) {
  const salvos = new Set(idsSalvos);

  const [plataforma, setPlataforma] = useState<Plataforma>("geral");
  const [nicho, setNicho] = useState<string | null>(null);
  const [ordem, setOrdem] = useState<Ordem>("views");
  const [periodo, setPeriodo] = useState<Periodo>("qualquer");
  const [duracao, setDuracao] = useState<Duracao>("qualquer");
  const [engajamento, setEngajamento] = useState<Engajamento>("qualquer");
  const [semLegenda, setSemLegenda] = useState(false);
  const [busca, setBusca] = useState("");
  const [avancados, setAvancados] = useState(false);
  // Grade é o padrão: em vídeo, a thumbnail é metade da informação. A lista
  // existe pra quando a decisão é por número, não por imagem.
  const [visao, setVisao] = useState<Visao>("grade");

  // Instante da montagem, congelado. Chamar Date.now() dentro do useMemo torna
  // o filtro impuro: o React pode reexecutar o render e o corte de "últimas
  // 24h" mudaria sozinho entre duas renderizações da mesma tela.
  const [agora] = useState(() => Date.now());

  // Contagem por plataforma sai da lista crua: a aba precisa mostrar quanto
  // existe ali, não quanto sobrou depois dos outros filtros.
  const porPlataforma = useMemo(() => {
    const c: Record<Plataforma, number> = {
      geral: videosIniciais.length,
      tiktok: 0,
      instagram: 0,
      youtube: 0,
    };
    for (const v of videosIniciais) c[v.plataforma]++;
    return c;
  }, [videosIniciais]);

  const videos = useMemo(() => {
    let lista =
      plataforma === "geral"
        ? videosIniciais
        : videosIniciais.filter((v) => v.plataforma === plataforma);

    if (nicho) lista = lista.filter((v) => v.nicho === nicho);

    const termo = busca.trim().toLowerCase();
    if (termo) {
      lista = lista.filter(
        (v) =>
          v.titulo.toLowerCase().includes(termo) ||
          v.canal.toLowerCase().includes(termo),
      );
    }

    if (periodo !== "qualquer") {
      const limite = agora - PERIODO_MS[periodo];
      lista = lista.filter((v) => new Date(v.publicado_em).getTime() >= limite);
    }

    if (duracao !== "qualquer") {
      const [min, max] = FAIXA_DURACAO[duracao];
      lista = lista.filter((v) => v.duracao_s > min && v.duracao_s <= max);
    }

    if (engajamento !== "qualquer") {
      const min = Number(engajamento);
      lista = lista.filter((v) => engajamentoPct(v) >= min);
    }

    // undefined = ainda não classificado pela IA — deixa passar em vez de
    // esconder um vídeo bom por falta de classificação (ver tipos.ts).
    if (semLegenda) lista = lista.filter((v) => v.tem_legenda_embutida !== true);

    return [...lista].sort((a, b) => {
      if (ordem === "curtidas") return b.curtidas - a.curtidas;
      if (ordem === "engajamento") return engajamentoPct(b) - engajamentoPct(a);
      if (ordem === "recentes") {
        return (
          new Date(b.publicado_em).getTime() - new Date(a.publicado_em).getTime()
        );
      }
      return b.visualizacoes - a.visualizacoes;
    });
  }, [
    plataforma,
    nicho,
    ordem,
    periodo,
    duracao,
    engajamento,
    semLegenda,
    busca,
    videosIniciais,
    agora,
  ]);

  // A paginação recebe a lista já filtrada e ordenada — ela só fatia.
  const pag = usePaginacao(videos, 12);

  const refinado =
    nicho !== null ||
    periodo !== "qualquer" ||
    duracao !== "qualquer" ||
    engajamento !== "qualquer" ||
    semLegenda ||
    busca.trim() !== "";

  const qtdAvancados =
    (duracao !== "qualquer" ? 1 : 0) +
    (engajamento !== "qualquer" ? 1 : 0) +
    (semLegenda ? 1 : 0);

  function limpar() {
    setNicho(null);
    setPeriodo("qualquer");
    setDuracao("qualquer");
    setEngajamento("qualquer");
    setSemLegenda(false);
    setBusca("");
  }

  const plataformaVazia =
    plataforma !== "geral" && porPlataforma[plataforma] === 0;

  return (
    <div>
      {/* Nível 1 — plataforma. O corte mais forte: o formato que funciona no
          TikTok não é o mesmo do YouTube, então isto vem antes de tudo. */}
      <div
        role="tablist"
        aria-label="Plataforma"
        className="mb-4 flex gap-0.5 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40 p-1"
      >
        {PLATAFORMAS.map((p) => {
          const ativa = p.id === plataforma;
          const Icone = p.icone;
          const n = porPlataforma[p.id];
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={() => setPlataforma(p.id)}
              className={
                "flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition " +
                (ativa
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-300")
              }
            >
              <Icone
                size={16}
                weight={ativa ? "fill" : "regular"}
                className={ativa ? p.cor : undefined}
              />
              {p.rotulo}
              <span
                className={
                  "rounded-full px-1.5 text-[11px] tabular-nums " +
                  (ativa
                    ? "bg-zinc-700 text-zinc-200"
                    : "bg-zinc-800/70 text-zinc-600")
                }
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3.5">
        {/* Nível 2 — categoria. */}
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

        {/* Nível 3 — refinamento. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-zinc-800 pt-3">
          <div className="relative min-w-0 flex-1 sm:max-w-[15rem]">
            <MagnifyingGlass
              size={14}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-600"
            />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Título ou canal"
              aria-label="Buscar por título ou canal"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950/60 py-1.5 pr-3 pl-8 text-xs text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15"
            />
          </div>

          <label className="flex items-center gap-1.5 text-xs text-zinc-500">
            Ordenar
            <select
              value={ordem}
              onChange={(e) => setOrdem(e.target.value as Ordem)}
              className={CLASSE_SELECT}
            >
              <option value="views">Mais vistos</option>
              <option value="curtidas">Mais curtidos</option>
              <option value="engajamento">Maior engajamento</option>
              <option value="recentes">Mais recentes</option>
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-zinc-500">
            Período
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as Periodo)}
              className={CLASSE_SELECT}
            >
              <option value="qualquer">Qualquer data</option>
              <option value="24h">Últimas 24h</option>
              <option value="7d">Última semana</option>
              <option value="30d">Último mês</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => setAvancados((v) => !v)}
            aria-expanded={avancados}
            className={
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition " +
              (qtdAvancados > 0
                ? "border-orange-900/70 text-orange-400"
                : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300")
            }
          >
            <SlidersHorizontal size={13} />
            Mais filtros
            {qtdAvancados > 0 && (
              <span className="rounded-full bg-orange-600 px-1.5 text-[10px] font-semibold tabular-nums text-white">
                {qtdAvancados}
              </span>
            )}
          </button>
        </div>

        {avancados && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-zinc-800 pt-3">
            <label className="flex items-center gap-1.5 text-xs text-zinc-500">
              Duração
              <select
                value={duracao}
                onChange={(e) => setDuracao(e.target.value as Duracao)}
                className={CLASSE_SELECT}
              >
                <option value="qualquer">Qualquer</option>
                <option value="ate15">Até 15s</option>
                <option value="15a30">15 a 30s</option>
                <option value="30a60">30 a 60s</option>
                <option value="mais60">Mais de 60s</option>
              </select>
            </label>

            <label className="flex items-center gap-1.5 text-xs text-zinc-500">
              Engajamento
              <select
                value={engajamento}
                onChange={(e) => setEngajamento(e.target.value as Engajamento)}
                className={CLASSE_SELECT}
                title="Curtidas dividido por visualizações"
              >
                <option value="qualquer">Qualquer</option>
                <option value="3">Acima de 3%</option>
                <option value="6">Acima de 6%</option>
                <option value="10">Acima de 10%</option>
              </select>
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-500 transition hover:text-zinc-300">
              <input
                type="checkbox"
                checked={semLegenda}
                onChange={(e) => setSemLegenda(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-950 accent-orange-600"
              />
              Só sem legenda embutida
            </label>
          </div>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs tabular-nums text-zinc-500">
          {videos.length} {videos.length === 1 ? "vídeo" : "vídeos"}
          {nicho && <span className="text-zinc-600"> · {nicho}</span>}
        </p>

        <div className="flex items-center gap-3">
          {refinado && (
            <button
              type="button"
              onClick={limpar}
              className="text-xs text-zinc-500 transition hover:text-orange-400"
            >
              Limpar filtros
            </button>
          )}

          <div
            role="group"
            aria-label="Modo de exibição"
            className="flex gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900/40 p-0.5"
          >
            {(
              [
                { id: "grade" as Visao, icone: SquaresFour, rotulo: "Grade" },
                { id: "lista" as Visao, icone: Rows, rotulo: "Lista" },
              ]
            ).map((v) => {
              const ativa = v.id === visao;
              const Icone = v.icone;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVisao(v.id)}
                  aria-pressed={ativa}
                  title={v.rotulo}
                  aria-label={v.rotulo}
                  className={
                    "rounded-md p-1.5 transition " +
                    (ativa
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-600 hover:text-zinc-400")
                  }
                >
                  <Icone size={15} weight={ativa ? "fill" : "regular"} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 px-6 py-16 text-center">
          <FunnelSimple size={26} className="text-zinc-700" />
          <p className="mt-3.5 text-sm font-medium text-zinc-300">
            {plataformaVazia
              ? `Nenhum vídeo do ${PLATAFORMAS.find((p) => p.id === plataforma)?.rotulo} por aqui`
              : "Nenhum vídeo com esses filtros"}
          </p>
          <p className="mt-1 max-w-[46ch] text-sm leading-relaxed text-zinc-500">
            {plataformaVazia
              ? "As tendências reais hoje vêm só do YouTube, que é a única das três com API pública de busca. TikTok e Instagram aparecem apenas nos dados de exemplo."
              : "Tente afrouxar o período, a duração ou escolher outra categoria."}
          </p>
          {!plataformaVazia && (
            <button
              type="button"
              onClick={limpar}
              className="mt-5 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : visao === "grade" ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {pag.itens.map((video, i) => (
              <CartaoVideo
                key={video.id}
                video={video}
                salvoInicial={salvos.has(video.id)}
                // A medalha #1..#3 só faz sentido quando a ordem é por alcance;
                // em "mais recentes" ela seria uma classificação falsa. E só na
                // primeira página: #1 na página 3 seria mentira.
                posicao={
                  ordem === "views" ? pag.primeiro + i : undefined
                }
              />
            ))}
          </div>
          <Paginacao {...pag} rotulo="vídeos" />
        </>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center gap-3 border-b border-zinc-800 px-3 py-2 text-[10px] font-semibold tracking-wider text-zinc-600 uppercase">
            <span className="w-4 shrink-0" />
            <span className="w-7 shrink-0" />
            <span className="min-w-0 flex-1">Vídeo</span>
            <span className="hidden w-24 shrink-0 lg:block">Categoria</span>
            <span className="hidden w-10 shrink-0 text-right md:block">Dur.</span>
            <span className="w-14 shrink-0 text-right">Views</span>
            <span className="hidden w-14 shrink-0 text-right sm:block">Likes</span>
            <span className="w-12 shrink-0 text-right">Eng.</span>
            <span className="hidden w-14 shrink-0 text-right xl:block">Idade</span>
            {/* Precisa bater exatamente com o bloco de ações da linha. */}
            <span className="w-[84px] shrink-0" />
          </div>

          <ul className="divide-y divide-zinc-800/50">
            {pag.itens.map((video, i) => (
              <LinhaVideo
                key={video.id}
                video={video}
                salvoInicial={salvos.has(video.id)}
                posicao={pag.primeiro + i}
              />
            ))}
          </ul>

          <div className="px-3 pb-3">
            <Paginacao {...pag} opcoes={[25, 50, 100]} rotulo="vídeos" />
          </div>
        </div>
      )}
    </div>
  );
}
