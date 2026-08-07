"use client";

import { useState } from "react";
import {
  StopCircle,
  ArrowClockwise,
  Plus,
  CircleNotch,
  LinkSimple,
} from "@phosphor-icons/react/dist/ssr";
import type { JobAnalise } from "@/lib/analises-db";

/**
 * A tela de uma análise que o dono interrompeu.
 *
 * Deliberadamente NEUTRA, não vermelha: cancelar foi uma decisão, não uma
 * falha. Reusar o painel de erro aqui pintaria de alarme a tela de quem
 * acabou de clicar em parar.
 *
 * O link fica à vista e o retomar reaproveita as mesmas opções — quem parou
 * por engano não deveria recolar o link e reescolher tudo.
 */
export function PainelCancelado({
  job,
  onRetomado,
  onOutroLink,
}: {
  job: JobAnalise;
  onRetomado: () => void;
  onOutroLink: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function retomar() {
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch(`/api/analises/${job.id}/retomar`, {
        method: "POST",
      });
      if (!r.ok) {
        const dados = await r.json().catch(() => ({}));
        setErro(dados.erro ?? "Não consegui recolocar na fila.");
        return;
      }
      onRetomado();
    } catch {
      setErro("Falha de rede. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="surgir overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-start gap-3 p-5">
        <StopCircle
          size={19}
          weight="fill"
          className="mt-0.5 shrink-0 text-zinc-500"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-200">Análise interrompida</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
            Você parou esta análise. Nada foi renderizado e nenhum
            processamento continua rodando no servidor.
          </p>
          <p className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-zinc-600">
            <LinkSimple size={12} className="shrink-0" />
            <span className="truncate">{job.link}</span>
          </p>
        </div>
      </div>

      {erro && <p className="px-5 pb-3 text-xs text-rose-400">{erro}</p>}

      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800 bg-zinc-950/40 px-5 py-3.5">
        <button
          type="button"
          onClick={retomar}
          disabled={enviando}
          className="flex items-center gap-2 rounded-xl bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-60"
        >
          {enviando ? (
            <CircleNotch size={15} className="animate-spin" />
          ) : (
            <ArrowClockwise size={15} weight="bold" />
          )}
          {enviando ? "Recolocando na fila…" : "Rodar de novo"}
        </button>

        <button
          type="button"
          onClick={onOutroLink}
          className="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-100"
        >
          <Plus size={15} weight="bold" />
          Analisar outro vídeo
        </button>

        <span className="ml-auto text-[11px] text-zinc-600">
          As mesmas opções são reaproveitadas
        </span>
      </div>
    </div>
  );
}
