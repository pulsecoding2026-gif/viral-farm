import {
  Check,
  CircleNotch,
  Link as LinkIcon,
  Info,
  DownloadSimple,
  FilmStrip,
  Waveform,
  Sparkle,
  Broom,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { Etapa } from "@/lib/analise/pipeline";

const ETAPAS: { chave: Etapa; rotulo: string; detalhe: string; icone: Icon }[] = [
  {
    chave: "validando",
    rotulo: "Validando o link",
    detalhe: "Confere se a origem é aceita",
    icone: LinkIcon,
  },
  {
    chave: "lendo-metadados",
    rotulo: "Lendo os dados do vídeo",
    detalhe: "Duração, autor e métricas públicas",
    icone: Info,
  },
  {
    chave: "baixando",
    rotulo: "Baixando o vídeo",
    detalhe: "Em 720p, direto para memória temporária",
    icone: DownloadSimple,
  },
  {
    chave: "extraindo-frames",
    rotulo: "Extraindo frames",
    detalhe: "10 quadros, metade nos primeiros 25%",
    icone: FilmStrip,
  },
  {
    chave: "transcrevendo",
    rotulo: "Transcrevendo o áudio",
    detalhe: "Whisper, com marcação de tempo",
    icone: Waveform,
  },
  {
    chave: "analisando",
    rotulo: "Analisando com a IA",
    detalhe: "A etapa mais longa — é aqui que os roteiros nascem",
    icone: Sparkle,
  },
  {
    chave: "limpando",
    rotulo: "Finalizando",
    detalhe: "Apagando o vídeo baixado",
    icone: Broom,
  },
];

// "pronto" é emitido um instante antes de "limpando" (ver o finally em
// pipeline.ts): pro painel, as duas etapas marcam o mesmo ponto final.
function indiceAtual(etapa: Etapa): number {
  if (etapa === "pronto") return ETAPAS.length - 1;
  return ETAPAS.findIndex((e) => e.chave === etapa);
}

export function PainelProgresso({ etapa }: { etapa: Etapa }) {
  const atual = indiceAtual(etapa);
  const pct = Math.round(((atual + 1) / ETAPAS.length) * 100);

  return (
    <div className="surgir overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <div className="border-b border-zinc-800 px-5 py-4 sm:px-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-zinc-100">Analisando o material</p>
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
                  <p className="mt-0.5 text-xs text-zinc-500">{e.detalhe}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="border-t border-zinc-800 px-5 py-3.5 text-xs leading-relaxed text-zinc-500 sm:px-6">
        Leva de 40 a 90 segundos. Pode fechar esta aba ou abrir outra análise
        pelo histórico — ela continua rodando no servidor.
      </p>
    </div>
  );
}
