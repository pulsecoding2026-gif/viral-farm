import {
  Check,
  CircleNotch,
  Clock,
  DownloadSimple,
  Waveform,
  Sparkle,
  FilmStrip,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

/**
 * Progresso de uma análise processada pelo worker na VPS.
 *
 * As chaves espelham as etapas que o worker grava na tabela (worker/indice.ts).
 * A renderização vem como `renderizando_2_de_5` — o sufixo vira o rótulo
 * "corte 2 de 5" sem precisar de uma etapa por corte aqui.
 */
const ETAPAS: { chave: string; rotulo: string; detalhe: string; icone: Icon }[] = [
  {
    chave: "na_fila",
    rotulo: "Na fila do estúdio",
    detalhe: "O servidor de cortes pega o próximo da fila em segundos",
    icone: Clock,
  },
  {
    chave: "baixando",
    rotulo: "Baixando o vídeo",
    detalhe: "Direto da plataforma pro servidor de processamento",
    icone: DownloadSimple,
  },
  {
    chave: "transcrevendo",
    rotulo: "Transcrevendo palavra por palavra",
    detalhe: "Cada palavra com seu tempo exato — é o que guia corte e legenda",
    icone: Waveform,
  },
  {
    chave: "escolhendo_cortes",
    rotulo: "Escolhendo os melhores trechos",
    detalhe: "Gancho forte, contexto completo, conclusão — e um score por corte",
    icone: Sparkle,
  },
  {
    chave: "renderizando",
    rotulo: "Renderizando os cortes",
    detalhe: "9:16, 1080p, legenda animada queimada no vídeo",
    icone: FilmStrip,
  },
];

/**
 * Onde cada etapa COMEÇA na barra.
 *
 * Peso, não fração igual: com `(indice+1)/total` a barra marcava 100% no
 * instante em que a renderização começava — e ficava lá parada durante a
 * fase mais longa de todas. Barra que crava 100% com trabalho acontecendo
 * é pior que barra nenhuma: parece travada.
 *
 * A renderização ocupa de 60% a 100% e é subdividida por "corte N de M", o
 * único ponto do pipeline com progresso real e granular.
 */
const INICIO_PCT = [0, 6, 20, 46, 60];
const FIM_RENDER = 100;

function decompor(etapa: string): {
  indice: number;
  pct: number;
  detalheVivo?: string;
} {
  const iRender = ETAPAS.length - 1;

  const render = etapa.match(/^renderizando_(\d+)_de_(\d+)$/);
  if (render) {
    const feitos = Number(render[1]) - 1;
    const total = Math.max(Number(render[2]), 1);
    const faixa = FIM_RENDER - INICIO_PCT[iRender];
    return {
      indice: iRender,
      pct: Math.round(INICIO_PCT[iRender] + (feitos / total) * faixa),
      detalheVivo: `Corte ${render[1]} de ${render[2]} — 9:16, legenda animada`,
    };
  }
  // Volta do Estúdio: os aprovados entram direto na renderização.
  if (etapa === "renderizar_aprovados" || etapa === "preparando_render") {
    return {
      indice: iRender,
      pct: INICIO_PCT[iRender],
      detalheVivo: "Preparando os cortes que você aprovou",
    };
  }
  const i = ETAPAS.findIndex((e) => e.chave === etapa);
  const indice = i === -1 ? 0 : i;
  return { indice, pct: INICIO_PCT[indice] };
}

export function PainelProgresso({ etapa }: { etapa: string | null }) {
  const { indice: atual, pct, detalheVivo } = decompor(etapa ?? "na_fila");

  return (
    <div className="surgir overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <div className="border-b border-zinc-800 px-5 py-4 sm:px-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-zinc-100">Fazendo seus cortes</p>
          <span className="font-mono text-xs tabular-nums text-zinc-500">
            {pct}%
          </span>
        </div>
        {/* Barra fina no topo: dá noção de avanço sem competir com a lista. */}
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso da análise"
          className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-800"
        >
          <div
            className="h-full rounded-full bg-orange-600 transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ol className="px-5 py-4 sm:px-6">
        {ETAPAS.map((e, i) => {
          const estado = i < atual ? "feito" : i === atual ? "atual" : "pendente";
          const Icone = e.icone;
          return (
            <li key={e.chave} className="flex gap-3.5">
              {/* Coluna do marcador, com a linha que costura uma etapa na outra. */}
              <div className="flex flex-col items-center">
                <span
                  className={
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition " +
                    (estado === "feito"
                      ? "bg-emerald-600/15 text-emerald-400"
                      : estado === "atual"
                        ? "bg-orange-600 text-white shadow-[0_0_0_4px_rgb(255_62_2/0.15)]"
                        : "border border-zinc-800 text-zinc-700")
                  }
                >
                  {estado === "feito" ? (
                    <Check size={13} weight="bold" />
                  ) : estado === "atual" ? (
                    <CircleNotch size={13} weight="bold" className="animate-spin" />
                  ) : (
                    <Icone size={13} />
                  )}
                </span>
                {i < ETAPAS.length - 1 && (
                  <span
                    className={
                      "w-px flex-1 transition-colors " +
                      (i < atual ? "bg-emerald-600/40" : "bg-zinc-800")
                    }
                  />
                )}
              </div>

              <div className={"min-w-0 " + (i < ETAPAS.length - 1 ? "pb-4" : "")}>
                <p
                  className={
                    "text-sm transition-colors " +
                    (estado === "pendente"
                      ? "text-zinc-600"
                      : estado === "atual"
                        ? "font-medium text-zinc-50"
                        : "text-zinc-400")
                  }
                >
                  {e.rotulo}
                </p>
                {estado === "atual" && (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {detalheVivo ?? e.detalhe}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="border-t border-zinc-800 px-5 py-3.5 text-xs leading-relaxed text-zinc-500 sm:px-6">
        Vídeo longo leva alguns minutos. Pode fechar esta aba — o trabalho
        continua no servidor e os cortes ficam salvos no histórico.
      </p>
    </div>
  );
}
