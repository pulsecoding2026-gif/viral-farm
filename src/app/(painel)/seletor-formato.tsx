"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Sparkle,
  Check,
  MagnifyingGlass,
  X,
  CaretDown,
} from "@phosphor-icons/react/dist/ssr";
import { FORMATOS, CATEGORIAS, acharFormato, type Formato } from "@/lib/formatos";

/**
 * A galeria de formatos — o seletor único usado tanto na nova análise quanto
 * na reedição de um corte pronto.
 *
 * A prévia é o RENDER REAL (public/formatos/*.webp), gerado na VPS pelo
 * mesmo motor que monta os cortes. Antes ela era desenhada em CSS
 * aproximando a fonte pela família genérica — e como o navegador não tem
 * Anton, Archivo Black nem Space Grotesk, os 15 apareciam quase iguais e
 * escolher virava chute.
 */

/*
 * As funções que simulavam a tipografia em CSS (familia, contorno,
 * aplicarCaixa, corDoTexto) saíram junto com a prévia falsa: com o render
 * real como miniatura, aproximar fonte no navegador virou código morto.
 */

/**
 * A prévia é o RENDER REAL do formato, não uma simulação em CSS.
 *
 * A versão anterior desenhava a frase em HTML aproximando a tipografia pela
 * família genérica — e o navegador não tem Anton, Archivo Black nem Space
 * Grotesk. Os 15 apareciam quase iguais e escolher virava chute.
 *
 * As imagens saem de worker/gerar-miniaturas.ts, renderizadas na VPS (é lá
 * que as fontes existem) e versionadas como asset: 31 KB pelos 15, contra
 * um ffmpeg por visita da galeria pra produzir sempre a mesma imagem.
 */
function Previa({ f }: { f: Formato }) {
  return (
    <div className="relative h-20 overflow-hidden rounded-lg bg-zinc-950">
      <Image
        src={`/formatos/${f.id}.webp`}
        alt={`Legenda do formato ${f.nome}`}
        fill
        sizes="(max-width: 640px) 100vw, 320px"
        className="object-cover"
      />
    </div>
  );
}

/**
 * Seletor compacto, pra trocar o formato de UM corte dentro do Estúdio.
 *
 * A galeria completa (SeletorFormato) é a escolha do envio: tem busca,
 * filtro e prévia grande. Repetir aquilo em cada corte transformaria a lista
 * de propostas numa página de rolagem infinita.
 *
 * Aqui o padrão é a etiqueta fechada, mostrando o que a IA escolheu e por
 * quê. Só quem DISCORDA abre — e discordar é a exceção, não a regra.
 */
export function SeletorFormatoCompacto({
  valor,
  motivo,
  onEscolher,
}: {
  valor: string;
  /** Por que a IA escolheu este formato. Vira o argumento a favor dela. */
  motivo?: string | null;
  onEscolher: (id: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const escolhido = acharFormato(valor);

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="inline-flex items-center gap-1.5 rounded-md border border-orange-900/60 bg-orange-950/30 px-2 py-1 text-[11px] font-medium text-orange-300 transition hover:border-orange-700 hover:bg-orange-950/60"
        >
          <Sparkle size={11} weight="fill" />
          {escolhido.nome}
          <CaretDown
            size={10}
            weight="bold"
            className={"transition " + (aberto ? "rotate-180" : "")}
          />
        </button>
        {motivo && !aberto && (
          <span className="text-[11px] leading-snug text-zinc-500">{motivo}</span>
        )}
        {!motivo && !aberto && (
          <span className="text-[11px] text-zinc-600">trocar formato</span>
        )}
      </div>

      {aberto && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/70 p-1.5">
          {FORMATOS.map((f) => {
            const atual = f.id === escolhido.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onEscolher(f.id);
                  setAberto(false);
                }}
                className={
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition " +
                  (atual ? "bg-orange-600/15" : "hover:bg-white/[0.05]")
                }
              >
                {/* Render real, pelo mesmo motivo da galeria: o "Aa" que
                    estava aqui caía numa fonte genérica do navegador e não
                    dizia nada sobre o formato. */}
                <span className="relative h-8 w-14 shrink-0 overflow-hidden rounded bg-zinc-900">
                  <Image
                    src={`/formatos/${f.id}.webp`}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium text-zinc-100">
                    {f.nome}
                  </span>
                  <span className="block truncate text-[10px] text-zinc-500">
                    {f.categoria} · {f.duracaoIdeal.minSeg}–{f.duracaoIdeal.maxSeg}s
                  </span>
                </span>
                {atual && (
                  <Check size={12} weight="bold" className="shrink-0 text-orange-400" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chamas({ n }: { n: number }) {
  return (
    <span className="tabular-nums text-[11px] text-orange-400" aria-label={`Viralidade ${n} de 5`}>
      {"●".repeat(n)}
      <span className="text-zinc-700">{"●".repeat(5 - n)}</span>
    </span>
  );
}

export function SeletorFormato({
  valor,
  onEscolher,
  permitirAuto = true,
}: {
  valor: string;
  onEscolher: (id: string) => void;
  /** A reedição escolhe UM formato pra UM corte — lá não existe "auto". */
  permitirAuto?: boolean;
}) {
  const [categoria, setCategoria] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return FORMATOS.filter((f) => {
      if (categoria !== "todas" && f.categoria !== categoria) return false;
      if (!t) return true;
      return (
        f.nome.toLowerCase().includes(t) ||
        f.categoria.toLowerCase().includes(t) ||
        f.tags.some((tag) => tag.toLowerCase().includes(t))
      );
    });
  }, [categoria, busca]);

  const auto = permitirAuto && valor === "auto";
  const escolhido = auto ? null : acharFormato(valor);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-zinc-300">Formato do corte</p>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="text-[12px] text-orange-400 transition hover:text-orange-300"
        >
          {aberto ? "Fechar galeria" : `Ver os ${FORMATOS.length} formatos`}
        </button>
      </div>

      {/* Resumo do que está escolhido — a galeria fica fechada por padrão. */}
      <div className="grid gap-2 sm:grid-cols-2">
        {permitirAuto && (
          <button
            type="button"
            onClick={() => onEscolher("auto")}
            aria-pressed={auto}
            className={
              "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-left transition " +
              (auto
                ? "border-orange-700 bg-orange-950/25"
                : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700")
            }
          >
            <Sparkle
              size={18}
              weight="fill"
              className={auto ? "mt-0.5 shrink-0 text-orange-400" : "mt-0.5 shrink-0 text-zinc-500"}
            />
            <span>
              <span className="block text-[13px] font-semibold text-zinc-100">
                Automático
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">
                A IA escolhe o formato de cada corte pelo conteúdo do trecho.
                Cortes do mesmo vídeo podem sair em formatos diferentes.
              </span>
            </span>
          </button>
        )}

        {escolhido && (
          <div className="rounded-xl border border-orange-700 bg-orange-950/25 px-3.5 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-semibold text-zinc-100">
                {escolhido.nome}
              </p>
              <Chamas n={escolhido.viralidade} />
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {escolhido.categoria} · {escolhido.duracaoIdeal.minSeg}–
              {escolhido.duracaoIdeal.maxSeg}s
            </p>
          </div>
        )}
      </div>

      {aberto && (
        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-40 flex-1">
              <MagnifyingGlass
                size={14}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-zinc-600"
              />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar formato ou tag"
                aria-label="Buscar formato"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pr-8 pl-8 text-[12px] text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-600"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca("")}
                  aria-label="Limpar busca"
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Categorias"
            className="mb-3 flex flex-wrap gap-1.5"
          >
            {["todas", ...CATEGORIAS].map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={categoria === c}
                onClick={() => setCategoria(c)}
                className={
                  "rounded-full border px-2.5 py-1 text-[11px] transition " +
                  (categoria === c
                    ? "border-orange-700 bg-orange-950/40 text-orange-300"
                    : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300")
                }
              >
                {c === "todas" ? "Todas" : c}
              </button>
            ))}
          </div>

          {lista.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-zinc-600">
              Nenhum formato com esse termo.
            </p>
          ) : (
            <div className="grid max-h-96 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
              {lista.map((f) => {
                const ativo = f.id === valor;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onEscolher(f.id)}
                    aria-pressed={ativo}
                    className={
                      "rounded-xl border p-2 text-left transition " +
                      (ativo
                        ? "border-orange-600 bg-orange-950/25"
                        : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700")
                    }
                  >
                    <Previa f={f} />
                    <div className="mt-2 flex items-baseline justify-between gap-2 px-0.5">
                      <p className="truncate text-[12px] font-semibold text-zinc-100">
                        {f.nome}
                      </p>
                      {ativo ? (
                        <Check size={13} weight="bold" className="shrink-0 text-orange-400" />
                      ) : (
                        <Chamas n={f.viralidade} />
                      )}
                    </div>
                    <p className="mt-0.5 px-0.5 text-[10px] text-zinc-600">
                      {f.categoria} · {f.duracaoIdeal.minSeg}–{f.duracaoIdeal.maxSeg}s
                    </p>
                    <p className="mt-1 line-clamp-2 px-0.5 text-[10px] leading-snug text-zinc-500">
                      {f.quandoUsar}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          <p className="mt-3 text-[10px] leading-snug text-zinc-600">
            Cada prévia é um render de verdade, feito pelo mesmo motor que
            monta os seus cortes — tipografia, contorno e cores idênticos ao
            que sai no MP4.
          </p>
        </div>
      )}
    </div>
  );
}
