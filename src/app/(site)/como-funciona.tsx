import {
  LinkSimple,
  Sparkle,
  DownloadSimple,
} from "@phosphor-icons/react/dist/ssr";

/**
 * TRÊS PASSOS, e nada além disso.
 *
 * Substitui o bloco "Descoberta" que vinha da ferramenta genérica. Aquele
 * ocupava 1.109px de página, renderizava uma maquete vazia no meio, e abria
 * dizendo "antes de decidir o que GRAVAR" — para um público que a virada
 * definiu como quem NÃO grava e não aparece. Texto que contradiz a promessa do
 * hero custa mais caro que seção nenhuma.
 *
 * A régua do brandbook para esta seção: "poucos elementos competindo", "1
 * elemento principal + 1 mensagem principal". Três cartões, um verbo cada, sem
 * maquete, sem captura de tela inventada. O produto se prova no primeiro corte
 * que a pessoa gera, não numa ilustração de interface.
 */

const PASSOS = [
  {
    icone: LinkSimple,
    n: "01",
    titulo: "Cola o link",
    texto:
      "Uma live de RP da Twitch ou do Kick, um VOD do YouTube, um vídeo de 6 horas. Não precisa baixar nem cortar nada antes.",
  },
  {
    icone: Sparkle,
    n: "02",
    titulo: "A IA acha os momentos",
    texto:
      "Ela transcreve, encontra os trechos que se sustentam sozinhos, enquadra em 9:16 seguindo o rosto e legenda palavra a palavra.",
  },
  {
    icone: DownloadSimple,
    n: "03",
    titulo: "Você posta",
    texto:
      "Baixa os cortes prontos e sobe no TikTok, no Reels e no Shorts. Sem marca d'água, sem editar, sem aparecer.",
  },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="border-y border-zinc-800/60 bg-[#080808]">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[46ch] text-center">
          <span className="placa inline-block rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-xs text-orange-500">
            Como funciona
          </span>
          {/* text-4xl no máximo em título de SEÇÃO: o hero pode gritar em 6xl
              porque tem a tela inteira, aqui em cima de uma grade de três
              colunas o mesmo corpo quebra em três linhas e desequilibra. */}
          <h2 className="titulo-letreiro mt-5 text-2xl leading-[1.05] sm:text-4xl">
            Do link ao <span className="acento-rosa">post</span>
          </h2>
        </div>

        <ol className="mt-12 grid gap-4 sm:grid-cols-3">
          {PASSOS.map((p) => {
            const Icone = p.icone;
            return (
              <li
                key={p.n}
                /* Raio 16px e borda branca a 12% — os valores do brandbook.
                   Nada de canto muito redondo: lê como app de banco. */
                className="rounded-2xl border border-white/12 bg-[#111111] p-6 transition hover:border-white/20"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-orange-500">
                    <Icone size={20} weight="bold" />
                  </span>
                  {/* O número em Bebas, grande e apagado: é ambientação, não
                      informação — por isso fica em cinza, longe do rosa. */}
                  <span className="numero-placa text-4xl leading-none text-white/15">
                    {p.n}
                  </span>
                </div>
                <h3 className="fonte-titulo mt-5 text-lg text-zinc-50 uppercase">
                  {p.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {p.texto}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
