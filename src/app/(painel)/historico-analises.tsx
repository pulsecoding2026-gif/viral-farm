"use client";

import {
  SpinnerGap,
  CheckCircle,
  XCircle,
  CaretRight,
  ClockCounterClockwise,
  Plus,
  Scissors,
} from "@phosphor-icons/react/dist/ssr";
import { resumoDeCortes, type JobAnalise } from "@/lib/analises-db";

function Status({ status }: { status: JobAnalise["status"] }) {
  if (status === "processando") {
    return (
      <SpinnerGap size={16} className="shrink-0 animate-spin text-orange-500" />
    );
  }
  if (status === "revisao") {
    return (
      <Scissors size={16} weight="fill" className="shrink-0 text-amber-400" />
    );
  }
  if (status === "pronto") {
    return (
      <CheckCircle size={16} weight="fill" className="shrink-0 text-emerald-500" />
    );
  }
  return <XCircle size={16} weight="fill" className="shrink-0 text-rose-500" />;
}

function titulo(job: JobAnalise): string {
  return resumoDeCortes(job.resultado)?.titulo || job.link;
}

function legenda(job: JobAnalise): string {
  if (job.status === "processando") return "Em andamento…";
  if (job.status === "revisao") {
    const qtd = resumoDeCortes(job.resultado)?.qtd_cortes ?? 0;
    return `${qtd} ${qtd === 1 ? "corte proposto" : "cortes propostos"} — esperando você no Estúdio`;
  }
  if (job.status === "erro") return job.mensagem ?? "Falhou";
  const qtd = resumoDeCortes(job.resultado)?.qtd_cortes ?? 0;
  return qtd === 1 ? "1 corte pronto" : `${qtd} cortes prontos`;
}

function quando(ms: number): string {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.round(h / 24)}d`;
}

export function HistoricoAnalises({
  jobs,
  idSelecionado,
  onSelecionar,
  onNova,
}: {
  jobs: JobAnalise[];
  idSelecionado: string | null;
  onSelecionar: (id: string) => void;
  onNova: () => void;
}) {
  if (jobs.length === 0) {
    return (
      <div className="surgir flex flex-col items-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 px-6 py-16 text-center">
        <ClockCounterClockwise size={28} className="text-zinc-700" />
        <p className="mt-4 text-sm font-medium text-zinc-300">
          Nenhuma análise ainda
        </p>
        <p className="mt-1 max-w-[42ch] text-sm text-zinc-500">
          Cole o link de um vídeo e os primeiros cortes aparecem aqui.
        </p>
        <button
          type="button"
          onClick={onNova}
          className="mt-5 flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_16px_rgb(255_62_2/0.35)] transition hover:bg-orange-500 active:scale-[0.98]"
        >
          <Plus size={16} weight="bold" />
          Nova análise
        </button>
      </div>
    );
  }

  return (
    <ul className="surgir space-y-2">
      {jobs.map((job) => {
        const ativo = job.id === idSelecionado;
        return (
          <li key={job.id}>
            <button
              type="button"
              onClick={() => onSelecionar(job.id)}
              aria-current={ativo ? "true" : undefined}
              className={
                "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition " +
                (ativo
                  ? "border-orange-900/70 bg-orange-950/20"
                  : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60")
              }
            >
              <Status status={job.status} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-100">
                  {titulo(job)}
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {legenda(job)}
                </p>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-zinc-600">
                {quando(job.criado_em)}
              </span>
              <CaretRight size={14} className="shrink-0 text-zinc-700" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
