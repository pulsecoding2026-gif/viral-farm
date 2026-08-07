"use client";

import { useState } from "react";
import {
  DownloadSimple,
  Quotes,
  CircleNotch,
  WarningCircle,
  Scissors,
  PencilSimple,
  X,
  ArrowClockwise,
} from "@phosphor-icons/react/dist/ssr";
import type { JobAnalise, Corte } from "@/lib/analises-db";
import { acharFormato } from "@/lib/formatos";
import { SeletorFormato } from "./seletor-formato";

/**
 * Os cortes prontos de uma análise — a entrega do produto.
 *
 * Cada cartão é um vídeo 9:16 tocável com o porquê da escolha ao lado, e o
 * botão Editar reabre a receita: outro estilo de legenda, início/fim
 * ajustados, e o worker re-renderiza por cima do mesmo link.
 */

function duracao(c: { inicio_s: number; fim_s: number }): string {
  const s = Math.round(c.fim_s - c.inicio_s);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function tempo(s: number): string {
  const m = Math.floor(s / 60);
  const seg = (s % 60).toFixed(1).replace(/\.0$/, "");
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

/** Botões de empurrar um limite do corte em segundos. */
function Ajuste({
  rotulo,
  valor,
  onMudar,
}: {
  rotulo: string;
  valor: number;
  onMudar: (delta: number) => void;
}) {
  const botao =
    "rounded-lg border border-zinc-700 px-2 py-1 font-mono text-[11px] text-zinc-300 transition hover:border-zinc-600 hover:bg-white/5 active:scale-95";
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-10 text-xs text-zinc-500">{rotulo}</span>
      <button type="button" onClick={() => onMudar(-5)} className={botao}>
        −5s
      </button>
      <button type="button" onClick={() => onMudar(-1)} className={botao}>
        −1s
      </button>
      <span className="w-14 text-center font-mono text-sm tabular-nums text-zinc-100">
        {tempo(valor)}
      </span>
      <button type="button" onClick={() => onMudar(1)} className={botao}>
        +1s
      </button>
      <button type="button" onClick={() => onMudar(5)} className={botao}>
        +5s
      </button>
    </div>
  );
}

function Editor({
  corte,
  estiloDaAnalise,
  duracaoVideo,
  onFechar,
  onEnviado,
}: {
  corte: Corte;
  estiloDaAnalise: string;
  duracaoVideo: number;
  onFechar: () => void;
  onEnviado: () => void;
}) {
  const [inicio, setInicio] = useState(corte.inicio_s);
  const [fim, setFim] = useState(corte.fim_s);
  const [estilo, setEstilo] = useState(corte.estilo ?? estiloDaAnalise);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valido = fim - inicio >= 5;

  async function renderizar() {
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch(`/api/cortes/${corte.id}/reeditar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inicio_s: Math.round(inicio * 10) / 10,
          fim_s: Math.round(fim * 10) / 10,
          estilo,
        }),
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

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-orange-900/50 bg-orange-950/10 p-4">
      <div className="space-y-2.5">
        <Ajuste
          rotulo="Início"
          valor={inicio}
          onMudar={(d) => setInicio((v) => Math.max(0, Math.min(v + d, fim - 5)))}
        />
        <Ajuste
          rotulo="Fim"
          valor={fim}
          onMudar={(d) =>
            setFim((v) => Math.min(duracaoVideo, Math.max(v + d, inicio + 5)))
          }
        />
        <p className="text-xs text-zinc-500">
          Novo corte: <b className="font-medium text-zinc-300">{duracao({ inicio_s: inicio, fim_s: fim })}</b>
          {" "}· a legenda se realinha sozinha às palavras
        </p>
      </div>

      {/* Sem "auto" aqui: reeditar é escolher o formato DESTE corte. */}
      <SeletorFormato valor={estilo} onEscolher={setEstilo} permitirAuto={false} />

      {erro && (
        <p className="flex items-start gap-2 text-xs text-rose-400">
          <WarningCircle size={14} weight="fill" className="mt-px shrink-0" />
          {erro}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={renderizar}
          disabled={enviando || !valido}
          className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? (
            <CircleNotch size={15} className="animate-spin" />
          ) : (
            <ArrowClockwise size={15} weight="bold" />
          )}
          Renderizar de novo
        </button>
        <button
          type="button"
          onClick={onFechar}
          className="rounded-xl px-3 py-2 text-sm text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function CartaoCorte({
  corte,
  estiloDaAnalise,
  duracaoVideo,
  onReeditado,
}: {
  corte: Corte;
  estiloDaAnalise: string;
  duracaoVideo: number;
  onReeditado: () => void;
}) {
  const [editando, setEditando] = useState(false);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 sm:flex-row">
      {/* O vídeo em proporção real de short. */}
      <div className="w-full shrink-0 bg-black sm:w-[210px]">
        {corte.status === "pronto" && corte.url ? (
          <video
            key={corte.url}
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
            editando ? null : (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={corte.url}
                  download={`corte-${corte.ordem}.mp4`}
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 active:scale-[0.98]"
                >
                  <DownloadSimple size={15} weight="bold" />
                  Baixar MP4
                </a>
                <button
                  type="button"
                  onClick={() => setEditando(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-white/5"
                >
                  <PencilSimple size={15} />
                  Editar
                </button>
              </div>
            )
          ) : corte.status === "erro" ? (
            <p className="text-xs text-rose-400">
              Este corte falhou na renderização — os demais não são afetados.
            </p>
          ) : (
            <p className="text-xs text-zinc-500">Renderizando…</p>
          )}
        </div>

        {editando && corte.status === "pronto" && (
          <div>
            <div className="flex items-center justify-between">
              <p className="mt-4 text-xs font-semibold tracking-wider text-orange-400 uppercase">
                Reeditar corte
              </p>
              <button
                type="button"
                onClick={() => setEditando(false)}
                aria-label="Fechar edição"
                className="mt-4 text-zinc-600 transition hover:text-zinc-300"
              >
                <X size={15} />
              </button>
            </div>
            <Editor
              corte={corte}
              estiloDaAnalise={estiloDaAnalise}
              duracaoVideo={duracaoVideo}
              onFechar={() => setEditando(false)}
              onEnviado={onReeditado}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function ResultadoCortes({
  job,
  onReeditado,
}: {
  job: JobAnalise;
  onReeditado: () => void;
}) {
  // Descartados no Estúdio ficam de fora da entrega; propostos não deveriam
  // existir num job pronto, mas se existirem também não são resultado.
  const cortes = (job.cortes ?? []).filter(
    (c) => c.status !== "descartado" && c.status !== "proposto",
  );
  // acharFormato normaliza: "auto" e nulo caem no padrão, porque o editor de
  // um corte só aceita formato concreto.
  const estiloDaAnalise = acharFormato(job.opcoes.estilo).id;
  const duracaoVideo = job.resultado?.duracao_video_s ?? 5400;

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
            <CartaoCorte
              key={c.id}
              corte={c}
              estiloDaAnalise={estiloDaAnalise}
              duracaoVideo={duracaoVideo}
              onReeditado={onReeditado}
            />
          ))}
        </div>
      )}
    </div>
  );
}
