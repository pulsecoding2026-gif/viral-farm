import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import {
  MaqueteTrends,
  MaqueteRadar,
  MaqueteBiblioteca,
  MaqueteLives,
} from "./maquetes";

/**
 * Seções de destaque: título grande e a tela do produto em tamanho generoso.
 *
 * Cada destaque só existe se o módulo estiver de pé. Vender tela de módulo em
 * construção é a forma mais rápida de queimar confiança na primeira sessão.
 */

export function DestaqueGrande() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-[54ch] text-center">
        <span className="inline-block rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-orange-500 uppercase">
          Descoberta
        </span>
        <h2 className="mt-5 text-3xl leading-tight font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          Encontre o que está{" "}
          <span className="text-orange-500 italic">viralizando</span>
        </h2>
        <p className="mt-4 text-base leading-relaxed text-zinc-400">
          Antes de decidir o que gravar, veja o que já está funcionando — por
          plataforma e por categoria, com engajamento real: curtidas divididas
          por visualizações, não só o número grande de views.
        </p>
      </div>

      {/*
        Sem `scale`: transform magnifica mas não reflui, então a maquete
        estourava a moldura e a lateral era cortada. Aqui ela ocupa a largura
        natural dentro de um contêiner generoso — a moldura é que dá a escala.
      */}
      <div className="relative mt-12">
        <div className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-orange-600/10 blur-3xl" />
        <div className="relative rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-[#08080a] p-5 shadow-2xl shadow-black/60 sm:p-10">
          <div className="mx-auto max-w-2xl">
            <MaqueteRadar />
          </div>
        </div>
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/radar-viral"
          className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-white/[0.04]"
        >
          Abrir o Radar Viral
          <ArrowRight size={15} weight="bold" />
        </Link>
      </div>
    </section>
  );
}

/** Dois cartões lado a lado, cada um com a tela do módulo. */
export function DestaquesDuplos() {
  const cartoes = [
    {
      titulo: "Trends",
      chamada: "O que as pessoas estão procurando",
      texto:
        "Google, YouTube, X e hashtags — separados por fonte e por período. Ordena por quem mais subiu, não só por volume: assunto perene tem busca alta o ano todo, o que interessa é a janela abrindo.",
      maquete: <MaqueteTrends />,
      href: "/trends",
    },
    {
      titulo: "Lives",
      chamada: "Matéria-prima acontecendo agora",
      texto:
        "As transmissões com mais audiência na Twitch e na Kick, em tempo real. A live de hoje é o clipe de amanhã — quem chega primeiro no corte pega a onda inteira.",
      maquete: <MaqueteLives />,
      href: "/lives",
    },
  ];

  return (
    <section className="border-y border-zinc-800/60 bg-[#060609]">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-4 lg:grid-cols-2">
          {cartoes.map((c) => (
            <div
              key={c.titulo}
              className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30"
            >
              <div className="border-b border-zinc-800 bg-[#08080a] p-5">
                {c.maquete}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-blue-400 uppercase">
                  {c.titulo}
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-zinc-50">
                  {c.chamada}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">
                  {c.texto}
                </p>
                <Link
                  href={c.href}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-orange-400 transition hover:text-orange-300"
                >
                  Ver por dentro
                  <ArrowRight size={14} weight="bold" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** A Biblioteca como fecho do ciclo. */
export function DestaqueBiblioteca() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <span className="inline-block rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-orange-500 uppercase">
            Acervo
          </span>
          {/* Não repetir "num lugar só": essa construção é a chamada da seção
              de Módulos. Aqui o ponto é outro — o que você achou não se perde. */}
          <h2 className="mt-5 text-3xl leading-tight font-semibold tracking-tight text-zinc-50 sm:text-4xl">
            O que você achou{" "}
            <span className="text-orange-500 italic">não se perde</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Salvou uma referência no Radar? Analisou um vídeo seu? Os dois caem
            na Biblioteca. Agrupe em coleções, anote por que aquilo importa, e
            monte a série antes de gravar o primeiro take.
          </p>

          <ul className="mt-6 space-y-3">
            {[
              ["Referências e análises juntas", "as duas origens no mesmo acervo"],
              ["Coleções por propósito", "uma série, um tema, um cliente"],
              ["Notas em cada ativo", "o porquê de ter salvado, não só o link"],
            ].map(([t, d]) => (
              <li key={t} className="flex items-baseline gap-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-600" />
                <span className="text-sm text-zinc-300">
                  {t}
                  <span className="text-zinc-600"> — {d}</span>
                </span>
              </li>
            ))}
          </ul>

          <Link
            href="/biblioteca"
            className="mt-7 inline-flex items-center gap-2 rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-white/[0.04]"
          >
            Abrir a Biblioteca
            <ArrowRight size={15} weight="bold" />
          </Link>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-orange-600/8 blur-3xl" />
          <div className="relative rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/60 to-[#08080a] p-4 shadow-2xl shadow-black/60 sm:p-6">
            <MaqueteBiblioteca />
          </div>
        </div>
      </div>
    </section>
  );
}
