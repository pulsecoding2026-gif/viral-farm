"use client";

import { useState } from "react";
import {
  WarningCircle,
  ArrowClockwise,
  Plus,
  CircleNotch,
  LinkSimple,
} from "@phosphor-icons/react/dist/ssr";
import type { JobAnalise } from "@/lib/analises-db";
import { ROTULO_ACAO, type AcaoErro } from "@/lib/analise/diagnostico";

/**
 * A tela de uma análise que falhou.
 *
 * Antes era um retângulo vermelho com o stderr do yt-dlp dentro — flags de
 * linha de comando, código de saída e link de wiki, sem nada pra fazer
 * depois. Agora traz a frase traduzida (worker/fila.ts → diagnosticar) e a
 * saída que corresponde à causa: transitória oferece repetir, permanente
 * manda trocar de vídeo.
 */

/** Falha transitória volta pra fila; permanente não tem o que repetir. */
function acaoDoJob(job: JobAnalise): AcaoErro {
  const r = job.resultado;
  if (r && r.tipo === "erro") return r.acao;
  // Análise anterior ao diagnóstico estruturado: repetir é o palpite seguro.
  return "tentar";
}

export function PainelErro({
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

  const acao = acaoDoJob(job);
  const podeRepetir = acao === "tentar" || acao === "esperar";

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
    <div className="surgir overflow-hidden rounded-2xl border border-rose-900/60 bg-rose-950/20">
      <div className="flex items-start gap-3 p-5">
        <WarningCircle
          size={19}
          weight="fill"
          className="mt-0.5 shrink-0 text-rose-500"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-rose-200">A análise falhou</p>
          <p className="mt-1 text-sm leading-relaxed text-rose-300/90">
            {job.mensagem ?? "Não consegui processar esse vídeo."}
          </p>

          {/* O link fica visível: numa falha o campo do formulário já foi
              limpo, e sem isto a pessoa tem que ir caçar a URL de novo. */}
          <p className="mt-3 flex items-center gap-1.5 font-mono text-[11px] text-rose-400/60">
            <LinkSimple size={12} className="shrink-0" />
            <span className="truncate">{job.link}</span>
          </p>
        </div>
      </div>

      {erro && (
        <p className="px-5 pb-3 text-xs text-rose-400">{erro}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-rose-900/50 bg-rose-950/30 px-5 py-3.5">
        {podeRepetir && (
          <button
            type="button"
            onClick={retomar}
            disabled={enviando}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
          >
            {enviando ? (
              <CircleNotch size={15} className="animate-spin" />
            ) : (
              <ArrowClockwise size={15} weight="bold" />
            )}
            {enviando ? "Recolocando na fila…" : ROTULO_ACAO[acao]}
          </button>
        )}

        <button
          type="button"
          onClick={onOutroLink}
          className={
            "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition " +
            (podeRepetir
              ? "text-rose-300 hover:bg-rose-900/40 hover:text-rose-100"
              : "bg-rose-600 font-semibold text-white hover:bg-rose-500")
          }
        >
          <Plus size={15} weight="bold" />
          Analisar outro vídeo
        </button>

        {podeRepetir && (
          <span className="ml-auto text-[11px] text-rose-400/70">
            As mesmas opções são reaproveitadas
          </span>
        )}
      </div>
    </div>
  );
}
