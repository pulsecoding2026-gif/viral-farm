"use client";

import { useState } from "react";
import {
  Scissors,
  Quotes,
  WarningCircle,
  CircleNotch,
  Check,
  Clock,
  Translate,
  FilmStrip,
  TextT,
} from "@phosphor-icons/react/dist/ssr";
import type { JobAnalise, Corte, NotasCorte } from "@/lib/analises-db";

/**
 * O Estúdio — Clip AI.
 *
 * A IA já assistiu, transcreveu e propôs os cortes; aqui é a mesa de
 * decisão do dono: cada proposta com gancho, score, motivo e a PRÉVIA do
 * que é falado no trecho. Marca os que valem, descarta o resto, e só o
 * aprovado gasta renderização.
 */

function tempo(s: number): string {
  const m = Math.floor(s / 60);
  const seg = Math.floor(s % 60);
  return `${m}:${String(seg).padStart(2, "0")}`;
}

function duracaoDe(c: Corte): string {
  return `${Math.round(c.fim_s - c.inicio_s)}s`;
}

function CorScore({ score }: { score: number | null }) {
  if (score == null) return null;
  const cor =
    score >= 80
      ? "bg-emerald-600/15 text-emerald-400"
      : score >= 60
        ? "bg-amber-600/15 text-amber-400"
        : "bg-zinc-800 text-zinc-400";
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums ${cor}`}
      title="Adequação ao formato curto (0–100)"
    >
      {score}
    </span>
  );
}

const DIMENSOES: { chave: keyof NotasCorte; rotulo: string; dica: string }[] = [
  { chave: "gancho", rotulo: "Gancho", dica: "Força dos 3 primeiros segundos" },
  { chave: "fluxo", rotulo: "Fluxo", dica: "Se sustenta sozinho, do começo ao fim" },
  { chave: "valor", rotulo: "Valor", dica: "Entrega informação, emoção ou diversão" },
  { chave: "tendencia", rotulo: "Tendência", dica: "Apelo atual do assunto" },
];

/**
 * O diagnóstico do score. Uma nota isolada é mágica; quatro barras mostram
 * ONDE o corte é forte — e é isso que ajuda a escolher entre dois de score
 * parecido.
 */
function Diagnostico({ notas }: { notas: NotasCorte }) {
  return (
    <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
      {DIMENSOES.map(({ chave, rotulo, dica }) => {
        const v = Math.max(0, Math.min(100, notas[chave] ?? 0));
        const cor =
          v >= 80 ? "bg-emerald-500" : v >= 60 ? "bg-amber-500" : "bg-zinc-600";
        return (
          <div key={chave} title={dica}>
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-[10px] tracking-wide text-zinc-500 uppercase">
                {rotulo}
              </span>
              <span className="font-mono text-[10px] tabular-nums text-zinc-400">
                {v}
              </span>
            </div>
            <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full ${cor}`}
                style={{ width: `${v}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EstudioCortes({
  job,
  onEnviado,
}: {
  job: JobAnalise;
  onEnviado: () => void;
}) {
  const propostos = (job.cortes ?? []).filter((c) => c.status === "proposto");
  const [escolhidos, setEscolhidos] = useState<Set<string>>(
    () => new Set(propostos.map((c) => c.id)),
  );
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function alternar(id: string) {
    setEscolhidos((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function renderizar() {
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch(`/api/analises/${job.id}/renderizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cortes: [...escolhidos] }),
      });
      if (!r.ok) {
        const dados = await r.json().catch(() => ({}));
        setErro(dados.erro ?? "Não consegui mandar pra renderização.");
        return;
      }
      onEnviado();
    } catch {
      setErro("Falha de rede. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  // O detalhe (com os cortes) ainda pode estar chegando.
  if (propostos.length === 0) {
    return (
      <div className="surgir flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
        <CircleNotch size={18} className="animate-spin text-orange-500" />
        Abrindo o Estúdio…
      </div>
    );
  }

  return (
    <div className="surgir">
      {/* ------------------------------------------------------ cabeçalho */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <div className="relative border-b border-zinc-800 bg-gradient-to-br from-orange-600/15 via-zinc-900/60 to-blue-600/10 px-5 py-5 sm:px-6">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-orange-500 uppercase">
            Clip AI · Estúdio
          </p>
          <h2 className="mt-1.5 text-lg leading-snug font-semibold tracking-tight text-zinc-50">
            {job.resultado?.titulo ?? job.link}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-400">
            {job.resultado?.duracao_video_s && (
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-zinc-600" />
                {tempo(job.resultado.duracao_video_s)} de vídeo
              </span>
            )}
            {job.resultado?.idioma && (
              <span className="flex items-center gap-1.5">
                <Translate size={13} className="text-zinc-600" />
                {job.resultado.idioma}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Scissors size={13} className="text-zinc-600" />
              {propostos.length} {propostos.length === 1 ? "corte proposto" : "cortes propostos"}
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------ propostas */}
        <ul className="divide-y divide-zinc-800/70 bg-zinc-900/30">
          {propostos.map((c) => {
            const marcado = escolhidos.has(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => alternar(c.id)}
                  aria-pressed={marcado}
                  className={
                    "flex w-full items-start gap-4 px-5 py-4 text-left transition sm:px-6 " +
                    (marcado ? "bg-orange-600/[0.06]" : "opacity-55 hover:opacity-80")
                  }
                >
                  {/* O seletor — a decisão em um toque. */}
                  <span
                    className={
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition " +
                      (marcado
                        ? "border-orange-600 bg-orange-600 text-white"
                        : "border-zinc-700 bg-zinc-950")
                    }
                  >
                    {marcado && <Check size={13} weight="bold" />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm leading-snug font-semibold text-zinc-100">
                        {c.titulo}
                      </h3>
                      <CorScore score={c.score} />
                      <span className="font-mono text-[11px] tabular-nums text-zinc-600">
                        {tempo(c.inicio_s)}–{tempo(c.fim_s)} · {duracaoDe(c)}
                      </span>
                    </div>

                    {c.gancho && (
                      <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-relaxed text-zinc-300 italic">
                        <Quotes
                          size={12}
                          weight="fill"
                          className="mt-1 shrink-0 text-orange-500"
                        />
                        {c.gancho}
                      </p>
                    )}

                    {c.motivo && (
                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                        {c.motivo}
                      </p>
                    )}

                    {c.notas && <Diagnostico notas={c.notas} />}

                    {/* O que vai ESCRITO na tela nos primeiros segundos. */}
                    {c.titulo_tela && (
                      <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-[11px] font-bold text-black">
                        <TextT size={11} weight="bold" />
                        {c.titulo_tela}
                      </p>
                    )}

                    {/* A prévia da fala: o que o espectador vai OUVIR. É o
                        que deixa decidir sem assistir o vídeo de novo. */}
                    {c.previa && (
                      <p className="mt-2 rounded-lg border border-zinc-800/80 bg-zinc-950/50 px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-500">
                        {c.previa}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {/* ---------------------------------------------------------- ação */}
        <div className="border-t border-zinc-800 bg-zinc-900/60 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">
              {escolhidos.size === 0
                ? "Nenhum corte selecionado"
                : `${escolhidos.size} de ${propostos.length} selecionado${escolhidos.size > 1 ? "s" : ""}`}{" "}
              · o que ficar de fora não gasta renderização
            </p>
            <button
              type="button"
              onClick={renderizar}
              disabled={enviando || escolhidos.size === 0}
              className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_16px_rgb(255_62_2/0.35)] transition hover:bg-orange-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {enviando ? (
                <CircleNotch size={16} className="animate-spin" />
              ) : (
                <FilmStrip size={16} weight="bold" />
              )}
              Renderizar {escolhidos.size > 0 ? escolhidos.size : ""}{" "}
              {escolhidos.size === 1 ? "corte" : "cortes"}
            </button>
          </div>

          {erro && (
            <p className="mt-3 flex items-start gap-2 text-xs text-rose-400">
              <WarningCircle size={14} weight="fill" className="mt-px shrink-0" />
              {erro}
            </p>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-zinc-600">
        O vídeo fonte fica guardado por até 24h pra esta revisão — renderizar
        agora é imediato. Depois disso ele é apagado e uma nova renderização
        baixa o vídeo de novo.
      </p>
    </div>
  );
}
