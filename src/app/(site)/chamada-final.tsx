import { Check, ArrowRight, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { HeroEntrada } from "./hero-entrada";

/**
 * Fecho da landing.
 *
 * A versão anterior era mais um cartão escuro arredondado com texto centrado
 * no meio de muito vazio — a página inteira é feita de cartões escuros
 * arredondados, então o fecho não se distinguia de uma seção qualquer e não
 * sinalizava "acabou, decide agora". E era o único bloco da página sem nada
 * pra olhar: todos os outros mostram tela do produto.
 *
 * Aqui a seção é uma FAIXA de ponta a ponta (sem moldura), com os dois
 * brilhos de marca em cantos opostos — laranja de um lado, azul do outro — e
 * duas colunas: a ação de um lado, o que volta dela do outro. O visual da
 * saída é o argumento; o texto sozinho não era.
 */

/** Formatos de gancho que o pipeline produz. Ilustrativos, não de uma análise real. */
const ROTEIROS = [
  {
    angulo: "Direto",
    gancho: "O erro que você comete nos 3 primeiros segundos",
    duracao: "0:32",
  },
  {
    angulo: "História",
    gancho: "Passei seis meses fazendo isso do jeito errado",
    duracao: "0:45",
  },
  {
    angulo: "Contra-intuitivo",
    gancho: "Postar todo dia está te atrapalhando",
    duracao: "0:28",
  },
];

const GARANTIAS = [
  "Não pede cartão",
  "O vídeo é apagado depois",
  "Cancela quando quiser",
];

export function ChamadaFinal() {
  return (
    <section className="relative overflow-hidden border-t border-zinc-800/60 bg-[#060609]">
      {/*
        Os dois brilhos de marca, em cantos opostos e bem abertos. É o que
        separa esta faixa das seções anteriores sem precisar de moldura — e
        usa o azul, não só laranja.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-[34rem] w-[34rem] rounded-full bg-orange-600/22 blur-[110px]" />
        <div className="absolute -right-32 -bottom-40 h-[34rem] w-[34rem] rounded-full bg-blue-600/18 blur-[110px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
          {/* ------------------------------------------------------- a ação */}
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-orange-900/60 bg-orange-950/40 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-orange-400 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              90 segundos · sem cartão
            </p>

            {/*
              "Seu material parado é farm não coletado" era metáfora em cima de
              metáfora — bonito e abstrato. Isto aponta pra uma coisa concreta
              que a pessoa tem agora: o arquivo no celular dela.
            */}
            <h2 className="mt-6 text-4xl leading-[1.05] font-semibold tracking-tight text-zinc-50 sm:text-6xl">
              Seu próximo viral
              <br />
              já está{" "}
              <span className="text-orange-500 italic">gravado.</span>
            </h2>

            <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-zinc-300 sm:text-lg">
              Está parado no rolo da câmera agora. Cola o link e a IA devolve{" "}
              <b className="font-semibold text-zinc-100">três roteiros</b> — cada
              um com um ângulo diferente pro mesmo material.
            </p>

            <HeroEntrada alinhamento="esquerda" />

            {/* Os três medos que travam o clique: custo, privacidade, prisão. */}
            <ul className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2.5">
              {GARANTIAS.map((t) => (
                <li
                  key={t}
                  className="flex items-center gap-1.5 text-xs text-zinc-400"
                >
                  <Check size={13} weight="bold" className="text-emerald-500" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* ---------------------------------------------------- o retorno */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-5 rounded-[2.5rem] bg-blue-600/8 blur-2xl" />

            <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-2xl shadow-black/60">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-5 py-3.5">
                <span className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  O que volta pra você
                </span>
                {/* Deixa explícito que é amostra de formato, não resultado de
                    uma análise que aconteceu. */}
                <span className="text-[10px] tracking-wide text-zinc-600 uppercase">
                  Exemplo
                </span>
              </div>

              <ul className="divide-y divide-zinc-800/70">
                {ROTEIROS.map((r, i) => (
                  <li
                    key={r.angulo}
                    className="flex items-start gap-3.5 px-5 py-4"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/15 font-mono text-[11px] font-bold tabular-nums text-blue-400">
                      0{i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold tracking-wider text-blue-400 uppercase">
                          {r.angulo}
                        </span>
                        <span className="font-mono text-[10px] tabular-nums text-zinc-600">
                          {r.duracao}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-snug text-zinc-200">
                        “{r.gancho}”
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-3 border-t border-zinc-800 bg-orange-600/8 px-5 py-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-white">
                  <Sparkle size={15} weight="fill" />
                </span>
                <p className="text-sm text-zinc-300">
                  Com gancho, blocos e chamada —{" "}
                  <b className="font-semibold text-zinc-50">prontos pra gravar</b>
                  .
                </p>
                <ArrowRight
                  size={16}
                  weight="bold"
                  className="ml-auto shrink-0 text-orange-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
