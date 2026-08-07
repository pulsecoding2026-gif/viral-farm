"use client";

import { useMemo, useState } from "react";
import { Sparkle, Check, MagnifyingGlass, X } from "@phosphor-icons/react/dist/ssr";
import { FORMATOS, CATEGORIAS, acharFormato, type Formato } from "@/lib/formatos";

/**
 * A galeria de formatos — o seletor único usado tanto na nova análise quanto
 * na reedição de um corte pronto.
 *
 * A prévia mostra só o que o render REALMENTE entrega hoje: caixa, peso, cor,
 * contorno, fundo e a cor de destaque. Fonte é aproximada por família (as
 * tipografias dos presets não estão carregadas no site), e isso está escrito
 * no card — prévia que promete o que o MP4 não devolve é pior que prévia
 * nenhuma.
 */

const FRASE = ["Isso", "mudou", "TUDO", "pra", "mim"];
/** A palavra que recebe a cor de destaque na prévia. */
const DESTAQUE = 2;

/** Família CSS mais próxima da tipografia do preset. */
function familia(fonte: string): string {
  const f = fonte.toLowerCase();
  if (f.includes("playfair")) return "Georgia, 'Times New Roman', serif";
  if (f.includes("jetbrains") || f.includes("mono"))
    return "ui-monospace, 'Cascadia Code', Consolas, monospace";
  return "ui-sans-serif, system-ui, 'Segoe UI', sans-serif";
}

/** Contorno preto do preset vira text-shadow (o stroke real é do ffmpeg). */
function contorno(stroke: string): string | undefined {
  const px = Number(stroke.match(/^(\d+)/)?.[1] ?? 0);
  if (px === 0) return undefined;
  const r = Math.max(1, Math.round(px / 3));
  return [
    `${-r}px ${-r}px 0 #000`,
    `${r}px ${-r}px 0 #000`,
    `${-r}px ${r}px 0 #000`,
    `${r}px ${r}px 0 #000`,
  ].join(", ");
}

function aplicarCaixa(palavra: string, caixa: string): string {
  if (caixa.toUpperCase().includes("UPPERCASE")) return palavra.toUpperCase();
  return palavra;
}

/** Cor legível do texto do preset (alguns declaram condição de fundo). */
function corDoTexto(cor: string): string {
  return cor.match(/#[0-9A-Fa-f]{6}/)?.[0] ?? "#FFFFFF";
}

function Previa({ f }: { f: Formato }) {
  const l = f.legenda;
  const temFundo = !l.fundo.toLowerCase().startsWith("nenhum");
  const cor = corDoTexto(l.cor);
  const destaque = f.destaque.cores[0] ?? cor;

  return (
    <div className="flex h-20 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-zinc-900 to-zinc-950 px-3">
      <p
        className="text-center leading-tight"
        style={{
          fontFamily: familia(l.fonte),
          fontWeight: l.peso,
          fontSize: 15,
          color: cor,
          textShadow: contorno(l.stroke),
          letterSpacing: l.peso >= 800 ? "-0.02em" : undefined,
        }}
      >
        {FRASE.map((p, i) => (
          <span
            key={i}
            style={{
              color: i === DESTAQUE ? destaque : undefined,
              background: temFundo ? "rgba(0,0,0,.7)" : undefined,
              padding: temFundo ? "1px 4px" : undefined,
              borderRadius: temFundo ? 4 : undefined,
            }}
          >
            {aplicarCaixa(p, l.caixa)}
            {i < FRASE.length - 1 ? " " : ""}
          </span>
        ))}
      </p>
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
            A prévia mostra caixa, peso, cor e contorno reais do preset. A fonte
            é aproximada — no MP4 sai a tipografia do formato.
          </p>
        </div>
      )}
    </div>
  );
}
