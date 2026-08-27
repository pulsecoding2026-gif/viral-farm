"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Lightning, Info } from "@phosphor-icons/react/dist/ssr";
import { ViTextura } from "./vi-textura";

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
    resumo: "Pra quem está começando a tirar corte de vídeo longo.",
    mensal: 59.9,
    analises: 60,
    recursos: [
      "Até 8 cortes por análise",
      "Vídeos de até 90 minutos",
      "Legenda animada e título na tela",
      "Radar Viral, Trends e Lives",
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
      "Até 15 cortes por análise",
      "Estúdio: você aprova antes de renderizar",
      "Reeditar corte quantas vezes quiser",
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
    /*
     * `ceu-noturno` no lugar do `bg-zinc-950` chapado — mesma receita do
     * `ceu-alvorada` de como-funciona.tsx, com a dupla de cor puxando mais
     * pro roxo que pro rosa, pra esta seção não repetir a temperatura de
     * monetizacao.tsx logo acima. `relative overflow-hidden` contém o "VI"
     * gigante que sangra pela lateral da seção.
     */
    <section
      id="planos"
      className="ceu-noturno relative overflow-hidden border-y border-zinc-800/60"
    >
      {/* O "VI" do outro lado e espelhado, pra não repetir a composição de
          como-funciona.tsx — textura, não informação. */}
      <ViTextura
        className="pointer-events-none absolute top-0 -left-28 h-[130%] w-auto scale-x-[-1] text-[var(--neon-500)] opacity-[0.05] sm:-left-16"
      />

      <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[46ch] text-center">
          <span className="placa inline-block rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-xs text-orange-500">
            Planos
          </span>
          {/*
            "grava" era o verbo do público antigo. Quem monta canal de cortes
            não grava nada — ele POSTA, e é o volume de posts que decide o
            plano.

            O espaço entre "você" e "posta" virou um espaço INQUEBRÁVEL
            (` `). Sem isso, em algumas larguras a quebra de linha caía
            bem ali e "posta" — uma palavra de cinco letras, sozinha, maiúscula
            de tamanho — sobrava isolada na segunda linha, órfã. Prender as
            duas últimas palavras juntas garante que, se a frase quebrar, ela
            quebra ANTES delas, nunca no meio.
          */}
          <h2 className="titulo-letreiro mt-5 text-balance text-2xl leading-[1.05] sm:text-4xl">
            Escolha pelo quanto você{" "}
            <span className="acento-rosa">posta</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Cada análise lê uma live inteira e devolve vários cortes prontos.
            Cancele quando quiser.
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          {/* zinc-500 no estado inativo dava 4,14:1 — abaixo do 4,5:1 de texto
              normal. zinc-400 dá 7,81:1. */}
          <span
            className={
              "text-sm transition " + (anual ? "text-zinc-400" : "text-zinc-100")
            }
          >
            Mensal
          </span>
          {/*
            O alvo de toque real deste botão precisa ser 44×44px, mas a
            TRILHA visual do switch não pode crescer pra isso — um switch de
            44px de altura não lê mais como switch. A saída é separar as duas
            coisas: o `<button>` vira a área de toque (h-11 w-11, centralizada)
            e um `<span>` interno desenha a trilha do tamanho de sempre
            (h-6 w-11). O switch parece igual; só fica fácil de acertar.
          */}
          <button
            type="button"
            role="switch"
            aria-checked={anual}
            aria-label="Cobrança anual"
            onClick={() => setAnual((v) => !v)}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          >
            <span
              className={
                "relative h-6 w-11 rounded-full transition " +
                (anual ? "bg-orange-600" : "bg-zinc-700")
              }
            >
              <span
                className={
                  "absolute top-1 h-4 w-4 rounded-full bg-white transition-all " +
                  (anual ? "left-6" : "left-1")
                }
              />
            </span>
          </button>
          <span
            className={
              "text-sm transition " + (anual ? "text-zinc-100" : "text-zinc-400")
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
                /*
                 * Cartão sólido, não translúcido — mesmo ajuste de
                 * monetizacao.tsx. O destaque ia de `orange-600/10` (tingido)
                 * até `zinc-900/40` (ainda translúcido); agora fecha em
                 * `zinc-900` sólido, então o degradê pinta só a parte de cima
                 * do cartão e a base é o mesmo #111111 dos outros dois planos.
                 *
                 * `overflow-hidden` NÃO fica aqui — fica só no wrapper interno
                 * logo abaixo. Se ficasse no cartão inteiro, o selo "Mais
                 * popular" (que fura -12px pra cima da borda de propósito)
                 * seria cortado pela própria borda que ele deveria furar.
                 */
                className={
                  "group relative flex flex-col rounded-2xl border transition " +
                  (p.destaque
                    ? "border-orange-900/60 bg-gradient-to-b from-orange-600/10 to-zinc-900 lg:-mt-3"
                    : "border-zinc-800 bg-zinc-900 hover:border-orange-600/30")
                }
              >
                {p.destaque && (
                  /* bg-orange-700, não 600: texto branco em 11px sobre
                     acao-600 mede 3,37:1 (reprova); sobre acao-700, 4,85:1. */
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 rounded-full bg-orange-700 px-3 py-1 text-[11px] font-bold text-white">
                    Mais popular
                  </span>
                )}

                {/*
                  O WRAPPER QUE RECORTA — profundidade nos três planos, não só
                  no destaque. `.mancha-cartao` é o mesmo gradiente-assinatura
                  escurecido do brandbook usado em como-funciona.tsx; aqui a
                  dose muda por plano: mais viva no "Mais popular" (que já é o
                  cartão que deve puxar o olho primeiro), mais discreta nos
                  outros dois — profundidade sem competir com o CTA.
                */}
                <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl">
                  <div
                    aria-hidden="true"
                    className={
                      "mancha-cartao pointer-events-none absolute inset-x-0 top-0 h-20 transition-opacity duration-200 " +
                      (p.destaque
                        ? "opacity-[0.4] group-hover:opacity-60"
                        : "opacity-[0.16] group-hover:opacity-30")
                    }
                  />

                  <div
                    className={
                      "relative flex flex-1 flex-col p-6 " +
                      (p.destaque ? "lg:pb-9" : "")
                    }
                  >
                    <h3 className="fonte-titulo text-lg font-semibold tracking-tight text-zinc-50">
                      {p.nome}
                    </h3>
                    <p className="mt-1.5 min-h-[2.5rem] text-sm leading-relaxed text-zinc-400">
                      {p.resumo}
                    </p>

                    <div className="mt-5 flex items-baseline gap-1.5">
                      {/* O preço em Bebas: é número grande, e é onde a condensada
                          trabalha melhor — lê como painel de placar. */}
                      <span className="numero-placa text-5xl leading-none text-zinc-50">
                        R$ {brl(preco)}
                      </span>
                      {/* zinc-500 dava 4,14:1 — abaixo do 4,5:1. zinc-400 dá 7,81:1. */}
                      <span className="text-sm text-zinc-400">/mês</span>
                    </div>
                    {/* zinc-600 media 2,59:1, bem abaixo do mínimo. zinc-400 dá 7,81:1. */}
                    <p className="mt-1 text-xs text-zinc-400">
                      {anual ? "cobrado anualmente" : "cancele a qualquer momento"}
                    </p>

                    <div
                      className={
                        "mt-5 flex items-center gap-2 rounded-xl px-3.5 py-2.5 " +
                        /*
                         * `bg-white/[0.06]` no lugar de `bg-zinc-800/60`.
                         * `zinc-800` foi remapeado pra `--borda`, que já É uma
                         * cor translúcida (branco a 12%) — pedir mais 40% de
                         * transparência em cima disso (o "/60") deixava o chip
                         * quase invisível nos planos Lite e Viral, exatamente o
                         * chip que mostra o número de análises do plano. O
                         * `bg-white/[0.06]` é o mesmo truque usado no ícone de
                         * como-funciona.tsx: opacidade pensada para SER a cor de
                         * fundo, não emprestada de um token de borda.
                         */
                        (p.destaque ? "bg-orange-600/15" : "bg-white/[0.06]")
                      }
                    >
                      <Lightning
                        size={15}
                        weight="fill"
                        className={p.destaque ? "text-orange-400" : "text-zinc-400"}
                      />
                      <span className="text-sm tabular-nums text-zinc-200">
                        {p.analises} análises por mês
                      </span>
                    </div>

                    {/*
                      `bg-orange-700`, mesmo ajuste do botão "Ver os planos" em
                      monetizacao.tsx: branco sobre acao-600 reprova o texto
                      normal (3,37:1); sobre acao-700, passa (4,85:1). O glow
                      também troca de `rgb(255 62 2)` — o laranja da marca
                      anterior — pro rosa `rgb(199 58 125)` que combina com o
                      novo fundo do botão.
                    */}
                    <Link
                      href="/cadastro"
                      className={
                        "mt-5 rounded-xl px-4 py-3 text-center text-sm font-semibold transition active:scale-[0.98] " +
                        (p.destaque
                          ? "bg-orange-700 text-white shadow-[0_2px_16px_rgb(199_58_125/0.35)] hover:bg-orange-600"
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
                </div>
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
