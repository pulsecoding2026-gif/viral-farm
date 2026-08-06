"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Lightning, Info } from "@phosphor-icons/react/dist/ssr";

/**
 * Planos.
 *
 * Os limites de análise foram dimensionados sobre o custo real medido do
 * pipeline (US$ 0,11 a 0,15 por análise com Opus, ~US$ 0,05 com Sonnet), não
 * chutados — ver o rodapé de custo em ResultadoAnalise.
 *
 * NÃO existe cobrança ligada. Os botões levam ao cadastro e a nota no fim da
 * seção diz isso, pra ninguém achar que assinou algo.
 */

type Plano = {
  id: string;
  nome: string;
  resumo: string;
  mensal: number;
  analises: number;
  destaque?: boolean;
  recursos: string[];
};

const PLANOS: Plano[] = [
  {
    id: "lite",
    nome: "Lite",
    resumo: "Pra quem está começando a transformar o que já gravou.",
    mensal: 59.9,
    analises: 60,
    recursos: [
      "3 roteiros por análise",
      "Vídeos de até 3 minutos",
      "Radar Viral, Trends e Lives",
      "Biblioteca com coleções",
      "Sem marca d'água",
    ],
  },
  {
    id: "creator",
    nome: "Creator",
    resumo: "Pra quem publica toda semana e não pode ficar sem pauta.",
    mensal: 99.9,
    analises: 150,
    destaque: true,
    recursos: [
      "Tudo do Lite",
      "Histórico completo de análises",
      "Filtros avançados no Radar",
      "Exportar roteiro pronto",
      "Suporte prioritário",
    ],
  },
  {
    id: "viral",
    nome: "Viral",
    resumo: "Pra quem produz em escala ou atende mais de um canal.",
    mensal: 149.9,
    analises: 300,
    recursos: [
      "Tudo do Creator",
      "Múltiplos canais",
      "Análise em lote",
      "Acesso antecipado aos módulos novos",
      "Suporte por WhatsApp",
    ],
  },
];

const DESCONTO_ANUAL = 0.25;

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Planos() {
  const [anual, setAnual] = useState(false);

  return (
    <section id="planos" className="border-y border-zinc-800/60 bg-[#060609]">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[46ch] text-center">
          <span className="inline-block rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-orange-500 uppercase">
            Planos
          </span>
          <h2 className="mt-5 text-3xl leading-tight font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            Escolha pelo quanto você{" "}
            <span className="text-orange-500 italic">grava</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Cada análise lê um vídeo inteiro e devolve três roteiros. Cancele
            quando quiser.
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <span
            className={
              "text-sm transition " + (anual ? "text-zinc-500" : "text-zinc-100")
            }
          >
            Mensal
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={anual}
            aria-label="Cobrança anual"
            onClick={() => setAnual((v) => !v)}
            className={
              "relative h-6 w-11 shrink-0 rounded-full transition " +
              (anual ? "bg-orange-600" : "bg-zinc-700")
            }
          >
            <span
              className={
                "absolute top-1 h-4 w-4 rounded-full bg-white transition-all " +
                (anual ? "left-6" : "left-1")
              }
            />
          </button>
          <span
            className={
              "text-sm transition " + (anual ? "text-zinc-100" : "text-zinc-500")
            }
          >
            Anual
          </span>
          <span className="rounded-full bg-orange-600/15 px-2.5 py-1 text-[11px] font-semibold text-orange-400">
            Economize 25%
          </span>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PLANOS.map((p) => {
            const preco = anual ? p.mensal * (1 - DESCONTO_ANUAL) : p.mensal;
            return (
              <div
                key={p.id}
                className={
                  "relative flex flex-col rounded-2xl border p-6 " +
                  (p.destaque
                    ? "border-orange-900/60 bg-gradient-to-b from-orange-600/10 to-zinc-900/40 lg:-mt-3 lg:pb-9"
                    : "border-zinc-800 bg-zinc-900/30")
                }
              >
                {p.destaque && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-600 px-3 py-1 text-[11px] font-bold text-white">
                    Mais popular
                  </span>
                )}

                <h3 className="text-lg font-semibold tracking-tight text-zinc-50">
                  {p.nome}
                </h3>
                <p className="mt-1.5 min-h-[2.5rem] text-sm leading-relaxed text-zinc-400">
                  {p.resumo}
                </p>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="text-4xl font-semibold tracking-tight tabular-nums text-zinc-50">
                    R$ {brl(preco)}
                  </span>
                  <span className="text-sm text-zinc-500">/mês</span>
                </div>
                <p className="mt-1 text-xs text-zinc-600">
                  {anual ? "cobrado anualmente" : "cancele a qualquer momento"}
                </p>

                <div
                  className={
                    "mt-5 flex items-center gap-2 rounded-xl px-3.5 py-2.5 " +
                    (p.destaque ? "bg-orange-600/15" : "bg-zinc-800/60")
                  }
                >
                  <Lightning
                    size={15}
                    weight="fill"
                    className={p.destaque ? "text-orange-400" : "text-zinc-500"}
                  />
                  <span className="text-sm tabular-nums text-zinc-200">
                    {p.analises} análises por mês
                  </span>
                </div>

                <Link
                  href="/cadastro"
                  className={
                    "mt-5 rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition active:scale-[0.98] " +
                    (p.destaque
                      ? "bg-orange-600 text-white shadow-[0_2px_16px_rgb(255_62_2/0.35)] hover:bg-orange-500"
                      : "border border-zinc-700 text-zinc-100 hover:border-zinc-600 hover:bg-white/[0.04]")
                  }
                >
                  Começar
                </Link>

                <ul className="mt-6 space-y-2.5 border-t border-zinc-800 pt-5">
                  {p.recursos.map((r) => (
                    <li key={r} className="flex items-start gap-2.5 text-sm">
                      <Check
                        size={14}
                        weight="bold"
                        className="mt-0.5 shrink-0 text-orange-500"
                      />
                      <span className="text-zinc-300">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* A nota que impede alguém de achar que já pode assinar. */}
        <p className="mx-auto mt-8 flex max-w-[60ch] items-start gap-2.5 rounded-xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-xs leading-relaxed text-amber-200/80">
          <Info size={15} weight="fill" className="mt-px shrink-0 text-amber-500" />
          <span>
            Ainda não há cobrança ligada — o pagamento não foi integrado. Os
            valores acima são a tabela planejada; criar conta hoje não gera
            nenhum débito.
          </span>
        </p>
      </div>
    </section>
  );
}
