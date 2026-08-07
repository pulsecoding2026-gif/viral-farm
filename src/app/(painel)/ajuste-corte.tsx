"use client";

import { useMemo } from "react";
import { ArrowsHorizontal, ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import type { PalavraDoCorte } from "@/lib/analises-db";

/**
 * Ajuste do início e do fim de um corte, ANTES de renderizar.
 *
 * O defeito que isto conserta: a IA escolhe a janela por tempo e às vezes
 * entra no meio da frase — "…vão mudar" em vez de "os carros do GTA VI vão
 * mudar". Quem assiste percebe na hora, e não havia como consertar.
 *
 * O ajuste é POR PALAVRA, não por segundo. Fala não se alinha a segundo, se
 * alinha a palavra, e a transcrição já traz o tempo exato de cada uma. Botão
 * de ±1s exigiria adivinhar no escuro (aqui ainda não existe vídeo pra
 * assistir); clicar na palavra onde a frase começa é exato e óbvio.
 *
 * As palavras de fora da janela aparecem apagadas — é o que deixa ESTENDER
 * pra trás, que é justamente o conserto do corte que começa tarde.
 */

function segundos(s: number): string {
  const m = Math.floor(s / 60);
  const seg = Math.floor(s % 60);
  return `${m}:${String(seg).padStart(2, "0")}`;
}

export function AjusteCorte({
  contexto,
  inicio,
  fim,
  originalInicio,
  originalFim,
  onMudar,
}: {
  contexto: PalavraDoCorte[];
  inicio: number;
  fim: number;
  originalInicio: number;
  originalFim: number;
  onMudar: (inicio: number, fim: number) => void;
}) {
  const mexido =
    Math.abs(inicio - originalInicio) > 0.01 ||
    Math.abs(fim - originalFim) > 0.01;

  const duracao = fim - inicio;

  // Índices da janela atual dentro do contexto — governam o realce e as
  // regras de clique.
  const { primeiro, ultimo } = useMemo(() => {
    let p = -1;
    let u = -1;
    contexto.forEach((w, i) => {
      if (w.inicio_s >= inicio - 0.05 && w.fim_s <= fim + 0.05) {
        if (p === -1) p = i;
        u = i;
      }
    });
    return { primeiro: p, ultimo: u };
  }, [contexto, inicio, fim]);

  /**
   * Uma palavra só: clicar antes da janela move o INÍCIO, clicar depois move
   * o FIM. Dois modos separados ("agora estou editando o início") seriam um
   * estado a mais pra pessoa segurar na cabeça sem ganhar nada.
   */
  function clicar(i: number) {
    const w = contexto[i];
    if (i < primeiro) onMudar(w.inicio_s, fim);
    else if (i > ultimo) onMudar(inicio, w.fim_s);
    // Dentro da janela: aproxima da borda mais perto.
    else if (i - primeiro <= ultimo - i) onMudar(w.inicio_s, fim);
    else onMudar(inicio, w.fim_s);
  }

  return (
    <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
          <ArrowsHorizontal size={12} className="text-orange-500" />
          Clique numa palavra pra mover o começo ou o fim
        </span>
        <span className="font-mono text-[11px] tabular-nums text-zinc-500">
          {segundos(inicio)}–{segundos(fim)} · {Math.round(duracao)}s
        </span>
        {mexido && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMudar(originalInicio, originalFim);
            }}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
          >
            <ArrowCounterClockwise size={11} />
            Desfazer
          </button>
        )}
      </div>

      {/* max-h + scroll: 24s de fala em palavras é muito texto, e o cartão do
          corte não pode virar uma página. */}
      <div className="max-h-28 overflow-y-auto leading-relaxed">
        {contexto.map((w, i) => {
          const dentro = i >= primeiro && i <= ultimo;
          const borda = i === primeiro || i === ultimo;
          return (
            <button
              key={`${w.inicio_s}-${i}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clicar(i);
              }}
              title={`${segundos(w.inicio_s)} — clique pra ${i < primeiro ? "começar aqui" : i > ultimo ? "terminar aqui" : "ajustar a borda"}`}
              className={
                "mr-1 mb-0.5 rounded px-1 py-0.5 text-[12px] transition " +
                (borda
                  ? "bg-orange-600 font-semibold text-white"
                  : dentro
                    ? "bg-orange-600/15 text-zinc-100 hover:bg-orange-600/30"
                    : "text-zinc-600 hover:bg-white/5 hover:text-zinc-300")
              }
            >
              {w.texto}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
        As palavras apagadas estão fora do corte — clique numa delas pra
        esticar e recuperar o começo da frase.
      </p>
    </div>
  );
}
