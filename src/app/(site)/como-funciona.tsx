import {
  LinkSimple,
  Sparkle,
  DownloadSimple,
} from "@phosphor-icons/react/dist/ssr";
import { ViTextura } from "./vi-textura";

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
    /*
     * `ceu-alvorada` no lugar do `bg-zinc-950` chapado.
     *
     * A página inteira virava PRETO UNIFORME a partir daqui — o hero é o
     * único ponto com imagem e cor, e da segunda seção em diante era sempre
     * o mesmo #080808. `ceu-alvorada` é a mesma receita do `ceu-miami` de
     * monetizacao.tsx (40% preto, resto é radial distante), só que com a
     * "hora do dia" deslocada, pra esta seção não repetir a temperatura da
     * próxima. `relative overflow-hidden` é o que permite o "VI" sangrar
     * pra fora da seção sem vazar pro resto da página.
     */
    <section
      id="como-funciona"
      className="ceu-alvorada relative overflow-hidden border-y border-zinc-800/60"
    >
      {/* O "VI" gigante, cortado na borda, bem apagado — textura de marca,
          não informação. Ver o porquê em vi-textura.tsx. */}
      <ViTextura
        className="pointer-events-none absolute top-1/2 -right-24 h-[150%] w-auto -translate-y-1/2 text-[var(--acao-600)] opacity-[0.05] sm:-right-16 sm:h-[170%]"
      />

      <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
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
                /*
                 * Raio 16px e borda branca a 12% — os valores do brandbook.
                 * Nada de canto muito redondo: lê como app de banco.
                 *
                 * `relative overflow-hidden` entrou para conter a mancha de
                 * cor da cabeceira (abaixo) dentro do raio do cartão, e o
                 * hover trocou o branco genérico por um contorno e um brilho
                 * rosa CONTIDOS — um tom só, sem blur exagerado, porque
                 * "excesso de glow" é item do NÃO FAZER do brandbook.
                 */
                className="group relative overflow-hidden rounded-2xl border border-white/12 bg-[#111111] transition hover:border-orange-600/35 hover:shadow-[0_10px_30px_-14px_rgba(238,79,156,0.4)]"
              >
                {/*
                  A CABECEIRA DE COR — o substituto da arte de personagem que
                  o brandbook pede e que aqui não pode vir de imagem nenhuma.
                  `.mancha-cartao` (gta-tokens.css) é o gradiente-assinatura
                  escurecido por cima com a receita literal do guia —
                  transparent 30% → rgba(0,0,0,.88) 100% — até sumir dentro do
                  #111111 do resto do cartão. Opacidade baixa em repouso,
                  sobe um pouco no hover pra dar resposta sem virar neon.
                */}
                <div
                  aria-hidden="true"
                  className="mancha-cartao pointer-events-none absolute inset-x-0 top-0 h-24 opacity-[0.5] transition-opacity duration-200 group-hover:opacity-80"
                />

                <div className="relative p-6">
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
                  <h3 className="fonte-titulo mt-5 text-lg font-semibold tracking-tight text-zinc-50">
                    {p.titulo}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {p.texto}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
