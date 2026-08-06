import Link from "next/link";
import { ArrowRight, Lock } from "@phosphor-icons/react/dist/ssr";
import { SECOES } from "@/lib/modulos";
import { icone } from "../(painel)/icones";
import {
  MaqueteRadar,
  MaqueteAnalisador,
  MaqueteRoteiros,
  MaqueteLives,
} from "./maquetes";

/**
 * O método, em quatro passos.
 *
 * A contagem de ferramentas vem do registro de módulos, mas os NOMES não
 * aparecem: listar cada um entrega o mapa do produto de graça. Aqui o card
 * diz quantas ferramentas o bloco tem e o que elas resolvem — o nome fica
 * atrás do cadastro.
 *
 * A área de mídia tem proporção fixa em todos os cards. Sem isso, maquetes de
 * alturas diferentes empurram o texto para pontos diferentes e a fileira fica
 * desalinhada. Trocar por imagem é só substituir o conteúdo da caixa.
 */

const PROMESSA: Record<string, string> = {
  descobrir:
    "Veja o que está em alta e o que dá pra aproveitar no que você já gravou.",
  planejar: "Vire o achado em roteiro, gancho e título — escritos com IA.",
  criar: "Monte o vídeo: cortes, narração e imagens de apoio.",
  viralizar: "Publique e leia o resultado pra alimentar a próxima rodada.",
};

/**
 * Trocar por <Image> quando as artes definitivas chegarem.
 *
 * Os títulos das janelas são o nome do BLOCO, não o do módulo. A barra de
 * título da maquete mostrava "Radar Viral", "Analisador", "Lives" — ou seja,
 * entregava justamente os nomes que os cards deixaram de listar.
 */
const MIDIA: Record<string, React.ReactNode> = {
  descobrir: <MaqueteRadar titulo="Descobrir" />,
  planejar: <MaqueteRoteiros titulo="Planejar" />,
  criar: <MaqueteAnalisador titulo="Criar" />,
  viralizar: <MaqueteLives titulo="Viralizar" />,
};

export function Metodo() {
  return (
    <section id="metodo" className="border-y border-zinc-800/60 bg-[#060609]">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[52ch] text-center">
          <span className="inline-block rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-orange-500 uppercase">
            O ciclo do farm
          </span>
          <h2 className="mt-5 text-3xl leading-tight font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            Saia do silêncio, viralize e{" "}
            <span className="pr-[2px] text-orange-500 italic">ganhe dinheiro</span>{" "}
            em 4 passos
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Aura ninguém ganha de sorte — farma. Com alcance é igual: quem
            cresce de forma consistente repete o mesmo ciclo.
          </p>
        </div>

        <ol className="relative mt-14 grid gap-8 lg:grid-cols-4 lg:gap-5">
          {SECOES.map((secao, i) => {
            const IconeSecao = icone(secao.icone);
            const total = secao.modulos.length;
            const prontos = secao.modulos.filter((m) => m.pronto).length;
            const completo = prontos === total;
            const iniciado = prontos > 0;

            return (
              <li key={secao.id} className="relative flex flex-col">
                <div className="relative mb-5 flex items-center justify-center lg:mb-6">
                  {i < SECOES.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute top-1/2 left-[calc(50%+28px)] hidden h-px w-[calc(100%-56px)] border-t border-dashed border-zinc-800 lg:block"
                    />
                  )}
                  <span
                    className={
                      "relative flex h-14 w-14 items-center justify-center rounded-full font-mono text-sm font-bold tabular-nums " +
                      (iniciado
                        ? "bg-orange-600 text-white shadow-[0_0_0_6px_rgb(255_62_2/0.12)]"
                        : "border border-zinc-800 bg-zinc-900 text-zinc-600")
                    }
                  >
                    0{i + 1}
                  </span>
                </div>

                <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30">
                  {/* Proporção fixa: é o que mantém a fileira alinhada. */}
                  <div
                    className={
                      "relative aspect-[4/3] overflow-hidden border-b border-zinc-800 bg-[#08080a] " +
                      (iniciado ? "" : "opacity-40 grayscale")
                    }
                  >
                    <div className="absolute inset-0 flex items-center justify-center p-3">
                      <div className="w-full">{MIDIA[secao.id]}</div>
                    </div>
                    {/* Véu na base: a maquete é só uma prévia, e o degradê
                        impede que ela seja lida como especificação. */}
                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-[#08080a]" />
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white " +
                          (secao.modulos[0]?.cor ?? "from-zinc-700 to-zinc-800")
                        }
                      >
                        <IconeSecao size={15} weight="fill" />
                      </span>
                      <h3 className="text-base font-semibold tracking-tight text-zinc-50">
                        {secao.rotulo}
                      </h3>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                      {PROMESSA[secao.id] ?? secao.descricao}
                    </p>

                    {/* Contagem sem nomes: diz o tamanho, não o conteúdo. */}
                    <div className="mt-auto border-t border-zinc-800 pt-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-[13px] text-zinc-300">
                          <Lock size={12} className="text-zinc-600" />
                          {total} {total === 1 ? "ferramenta" : "ferramentas"}
                        </span>
                        <span
                          className={
                            "text-[11px] font-medium tabular-nums " +
                            (completo
                              ? "text-emerald-500"
                              : iniciado
                                ? "text-amber-500"
                                : "text-zinc-600")
                          }
                        >
                          {completo
                            ? "Disponível"
                            : iniciado
                              ? `${prontos} de ${total}`
                              : "Em breve"}
                        </span>
                      </div>

                      <Link
                        href="/cadastro"
                        className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-2 text-[13px] font-medium text-zinc-400 transition hover:border-orange-900/70 hover:text-orange-400"
                      >
                        Ver por dentro
                        <ArrowRight size={13} weight="bold" />
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <p className="max-w-[54ch] text-base leading-relaxed text-zinc-400">
            São{" "}
            <b className="font-semibold text-zinc-100">
              {SECOES.reduce((n, s) => n + s.modulos.length, 0)} ferramentas
            </b>{" "}
            dentro do painel. O ciclo já começa de pé — o primeiro passo está
            completo.
          </p>
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_24px_rgb(255_62_2/0.35)] transition hover:bg-orange-500 active:scale-[0.98]"
          >
            Entrar e ver o painel
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </div>
    </section>
  );
}
