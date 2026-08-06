import Link from "next/link";
import {
  ArrowRight,
  FilmStrip,
  Waveform,
  Scissors,
  Sparkle,
  MapPin,
  UsersThree,
  Lightning,
  Quotes,
} from "@phosphor-icons/react/dist/ssr";

/**
 * O que a análise devolve.
 *
 * A versão anterior desta seção eram dois retângulos cinzas vazios com um
 * ícone no meio, um rotulado "antes" e outro "depois". Não mostrava nada:
 * lia como placeholder e as etiquetas em quatro cores viravam arco-íris.
 *
 * Aqui a prova é o próprio formato da saída — os campos que o pipeline
 * realmente retorna (ver SaidaDoPipeline em src/lib/analise/pipeline.ts):
 * cenário, o que aparece, trechos com início e fim, fala transcrita. Nada de
 * "detecção de objetos" ou caixa delimitadora: isso o produto não faz.
 */

/** Trechos aproveitáveis, em segundos. Ilustrativos, não de uma análise real. */
const TRECHOS = [
  { de: 12, ate: 18, rotulo: "Melhor gancho", forte: true },
  { de: 34, ate: 41, rotulo: "Virada", forte: false },
  { de: 58, ate: 72, rotulo: "Fecho", forte: true },
];
const DURACAO = 90;

const CAMPOS = [
  { icone: MapPin, rotulo: "Cenário", valor: "Ambiente interno, luz natural" },
  { icone: UsersThree, rotulo: "Quem aparece", valor: "Uma pessoa, plano médio" },
  { icone: Quotes, rotulo: "Fala transcrita", valor: "Com marcação de tempo" },
  { icone: Lightning, rotulo: "Gancho sugerido", valor: "A partir de 0:12" },
];

export function VisaoIA() {
  return (
    <section className="relative overflow-hidden">
      {/* Um brilho só, atrás de tudo — em vez de dois halos competindo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 left-1/2 h-72 w-[48rem] -translate-x-1/2 rounded-full bg-blue-600/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[52ch] text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-blue-400 uppercase">
            <Sparkle size={12} weight="fill" />
            Como a IA lê
          </span>
          <h2 className="mt-5 text-3xl leading-tight font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            Você direciona.
            <br />
            <span className="text-blue-500 italic">A IA entrega.</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Ela lê dez frames do seu vídeo — metade nos primeiros 25%, onde a
            retenção se decide — mais o áudio transcrito com marcação de tempo.
          </p>
        </div>

        {/* O painel de saída. É ele que mostra o produto, não uma moldura vazia. */}
        <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-3.5">
            <span className="flex items-center gap-2 text-xs font-medium text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              Resultado da análise
            </span>
            <span className="font-mono text-[11px] tabular-nums text-zinc-600">
              1:30
            </span>
          </div>

          <div className="p-5 sm:p-6">
            {/* Linha do tempo com os trechos marcados — a informação central
                da análise, e a única que precisa de representação gráfica. */}
            <p className="mb-3 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
              Trechos aproveitáveis
            </p>
            <div className="relative h-9 overflow-hidden rounded-lg bg-zinc-950">
              {TRECHOS.map((t) => (
                <span
                  key={t.rotulo}
                  className={
                    "absolute inset-y-0 rounded-md " +
                    (t.forte ? "bg-blue-600" : "bg-blue-600/45")
                  }
                  style={{
                    left: `${(t.de / DURACAO) * 100}%`,
                    width: `${((t.ate - t.de) / DURACAO) * 100}%`,
                  }}
                />
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {TRECHOS.map((t) => (
                <span
                  key={t.rotulo}
                  className="flex items-center gap-2 text-[11px] text-zinc-400"
                >
                  <span
                    className={
                      "h-2 w-2 rounded-sm " +
                      (t.forte ? "bg-blue-600" : "bg-blue-600/45")
                    }
                  />
                  {t.rotulo}
                  <span className="font-mono tabular-nums text-zinc-600">
                    0:{String(t.de).padStart(2, "0")}–0:
                    {String(t.ate).padStart(2, "0")}
                  </span>
                </span>
              ))}
            </div>

            <div className="mt-6 grid gap-x-6 gap-y-4 border-t border-zinc-800 pt-6 sm:grid-cols-2">
              {CAMPOS.map(({ icone: Icone, rotulo, valor }) => (
                <div key={rotulo} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-blue-400">
                    <Icone size={14} weight="fill" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] tracking-wide text-zinc-500 uppercase">
                      {rotulo}
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-200">{valor}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* E o que sai disso: os três roteiros. */}
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-orange-900/50 bg-orange-600/8 px-4 py-3.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-white">
                <Sparkle size={15} weight="fill" />
              </span>
              <p className="text-sm text-zinc-200">
                <b className="font-semibold text-zinc-50">Três roteiros</b>{" "}
                escritos a partir disso — cada um com um ângulo diferente.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            { icone: FilmStrip, t: "10 frames", d: "metade nos primeiros 25%" },
            { icone: Waveform, t: "Áudio transcrito", d: "com marcação de tempo" },
            { icone: Scissors, t: "Trechos marcados", d: "com início e fim exatos" },
          ].map(({ icone: Icone, t, d }) => (
            <div
              key={t}
              className="flex items-start gap-2.5 rounded-xl border border-zinc-800/70 bg-zinc-900/20 px-4 py-3"
            >
              <Icone size={16} className="mt-0.5 shrink-0 text-blue-400" />
              <p className="text-xs leading-relaxed text-zinc-400">
                <b className="font-medium text-zinc-200">{t}</b>
                <br />
                {d}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_24px_rgb(247_65_17/0.35)] transition hover:bg-orange-500 active:scale-[0.98]"
          >
            Analisar meu vídeo
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </div>
    </section>
  );
}
