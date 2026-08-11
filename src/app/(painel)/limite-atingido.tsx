"use client";

import Link from "next/link";
import { ArrowRight, Warning } from "@phosphor-icons/react/dist/ssr";

/**
 * O aviso de que o plano acabou — em âmbar, nunca em vermelho.
 *
 * Bater no limite NÃO é erro: é o produto funcionando como foi vendido. Se
 * esta tela usasse a mesma casca vermelha de "falhou a renderização", a
 * pessoa leria como defeito e abriria suporte em vez de olhar os planos.
 * Âmbar comunica "pare e decida", que é exatamente o que se espera aqui.
 *
 * O `motivo` vem PRONTO da API (ver podeCriarAnalise em lib/planos/uso.ts) e
 * já é concreto: quantas foram usadas, quando renova, o que fazer. Este
 * componente não reescreve nem resume — só emoldura e oferece a saída.
 */

/** Um título por tipo de bloqueio, porque "Limite atingido" não diz qual. */
const TITULOS: Record<string, string> = {
  sem_analises: "Suas análises deste ciclo acabaram",
  cortes_demais: "Cortes demais para o seu plano",
  video_longo: "Este vídeo é mais longo que o seu plano permite",
};

export function LimiteAtingido({
  motivo,
  codigo,
}: {
  motivo: string;
  /** MotivoBloqueio da API. Solto de propósito: código novo não quebra a tela. */
  codigo?: string;
}) {
  const titulo = (codigo && TITULOS[codigo]) || "Limite do plano";

  return (
    <div
      role="status"
      className="surgir flex items-start gap-3 rounded-2xl border border-amber-900/60 bg-amber-950/25 p-4"
    >
      <Warning
        size={20}
        weight="fill"
        className="mt-0.5 shrink-0 text-amber-500"
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-100">{titulo}</p>
        <p className="mt-1 text-sm leading-relaxed text-amber-200/80">
          {motivo}
        </p>

        {/*
          A saída fica DENTRO do aviso, não numa barra genérica no rodapé:
          o momento de decidir sobre o plano é este, com o motivo à vista.
        */}
        <Link
          href="/assinatura"
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 active:scale-[0.98]"
        >
          Ver planos
          <ArrowRight size={14} weight="bold" />
        </Link>
      </div>
    </div>
  );
}
