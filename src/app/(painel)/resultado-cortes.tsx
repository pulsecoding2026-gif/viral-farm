"use client";

import {
  DownloadSimple,
  Quotes,
  CircleNotch,
  WarningCircle,
  Scissors,
} from "@phosphor-icons/react/dist/ssr";
import type { JobAnalise, Corte } from "@/lib/analises-db";

/**
 * Os cortes prontos de uma análise — a entrega do produto.
 *
 * Cada cartão é um vídeo 9:16 tocável com o porquê da escolha ao lado:
 * score, gancho e motivo não são enfeite, são o argumento de que a IA
 * trabalhou. O download baixa o MP4 final, pronto pra postar.
 */

function duracao(c: Corte): string {
  const s = Math.round(c.fim_s - c.inicio_s);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function tempo(s: number): string {
  const m = Math.floor(s / 60);
  const seg = Math.floor(s % 60);
  return `${m}:${String(seg).padStart(2, "0")}`;
}

function CorSCore({ score }: { score: number | null }) {
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

function CartaoCorte({ corte }: { corte: Corte }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 sm:flex-row">
      {/* O vídeo em proporção real de short. */}
      <div className="w-full shrink-0 bg-black sm:w-[210px]">
        {corte.status === "pronto" && corte.url ? (
          <video
            src={corte.url}
            controls
            playsInline
            preload="metadata"
            className="aspect-[9/16] h-full w-full object-contain"
          />
        ) : corte.status === "erro" ? (
          <div className="flex aspect-[9/16] items-center justify-center text-rose-500">
            <WarningCircle size={26} weight="fill" />
          </div>
        ) : (
          <div className="flex aspect-[9/16] items-center justify-center text-zinc-600">
            <CircleNotch size={26} className="animate-spin" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base leading-snug font-semibold text-zinc-50">
            {corte.titulo}
          </h3>
          <CorSCore score={corte.score} />
        </div>

        <p className="mt-1 font-mono text-xs tabular-nums text-zinc-600">
          {tempo(corte.inicio_s)}–{tempo(corte.fim_s)} do vídeo · {duracao(corte)} de corte
        </p>

        {corte.gancho && (
          <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-zinc-300">
            <Quotes size={14} weight="fill" className="mt-1 shrink-0 text-orange-500" />
            <span className="italic">{corte.gancho}</span>
          </p>
        )}

        {corte.motivo && (
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            {corte.motivo}
          </p>
        )}

        <div className="mt-auto pt-4">
          {corte.status === "pronto" && corte.url ? (
            <a
              href={corte.url}
              download={`corte-${corte.ordem}.mp4`}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 active:scale-[0.98]"
            >
              <DownloadSimple size={15} weight="bold" />
              Baixar MP4
            </a>
          ) : corte.status === "erro" ? (
            <p className="text-xs text-rose-400">
              Este corte falhou na renderização — os demais não são afetados.
            </p>
          ) : (
            <p className="text-xs text-zinc-500">Renderizando…</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ResultadoCortes({ job }: { job: JobAnalise }) {
  // Descartados no Estúdio ficam de fora da entrega; propostos não deveriam
  // existir num job pronto, mas se existirem também não são resultado.
  const cortes = (job.cortes ?? []).filter(
    (c) => c.status !== "descartado" && c.status !== "proposto",
  );

  return (
    <div className="surgir space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-50">
            <Scissors size={18} className="text-orange-500" />
            {cortes.length} {cortes.length === 1 ? "corte pronto" : "cortes prontos"}
          </h2>
          {job.resultado?.titulo && (
            <p className="mt-0.5 truncate text-sm text-zinc-500">
              de “{job.resultado.titulo}”
            </p>
          )}
        </div>
        {job.resultado?.duracao_total_ms && (
          <p className="text-xs tabular-nums text-zinc-600">
            processado em {Math.round(job.resultado.duracao_total_ms / 1000)}s
          </p>
        )}
      </div>

      {cortes.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-sm text-zinc-400">
          <CircleNotch size={18} className="animate-spin text-orange-500" />
          Carregando os cortes…
        </div>
      ) : (
        <div className="space-y-3">
          {cortes.map((c) => (
            <CartaoCorte key={c.id} corte={c} />
          ))}
        </div>
      )}
    </div>
  );
}
