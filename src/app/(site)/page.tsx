import Link from "next/link";
import { ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { NavegacaoSite } from "./navegacao-site";
import { HeroVideo } from "./hero-video";
import { HeroEntrada } from "./hero-entrada";
import { Metodo } from "./metodo";
import { VisaoIA } from "./visao-ia";
import {
  DestaqueGrande,
  DestaquesDuplos,
  DestaqueBiblioteca,
} from "./destaques";
import { Monetizacao } from "./monetizacao";
import { Planos } from "./planos";
import { Perguntas } from "./perguntas";
import { ChamadaFinal } from "./chamada-final";
import { ContagemLancamento } from "./contagem-lancamento";
import { Logo } from "../logo";
import { NAO_AFILIADO } from "@/lib/gta/marca";

/** Chips de capacidade sob o hero — o que o produto faz, em uma palavra cada. */
const CAPACIDADES = [
  "Transcrição palavra a palavra",
  "Cortes 9:16 prontos",
  "Legenda animada",
  "Título na tela",
  "Limpeza de silêncios",
  "Radar por plataforma",
];


export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <NavegacaoSite />

      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden">
        {/*
          Faixa de vídeo com altura fixa, não `inset-0`. A seção inteira passa
          de 1400px; esticar um 16:9 até cobrir isso ampliaria o quadro umas 2x
          e sobraria só o meio do tronco.
          A altura anda junto com o recuo do bloco de texto abaixo: é a relação
          entre os dois que decide em que ponto da figura o título cai. Mexer
          num sem o outro desalinha a composição.
        */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[430px] sm:h-[520px] lg:h-[620px] xl:h-[680px]">
          <HeroVideo />

          {/*
            Só costura nas pontas, nada sobre a cena — e o vídeo também não
            leva ajuste de brilho ou contraste no encode: é o material como
            veio.

            O degradê do topo existe porque o cabeçalho ocupa espaço no fluxo:
            o vídeo começa logo abaixo dele e, sem isso, aparece uma linha reta
            cortando a tela. O da base costura com a seção seguinte.
          */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#09090b] via-[#09090b]/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-b from-transparent to-[#09090b]" />
        </div>

        {/*
          O recuo grande no topo posiciona o texto na altura das pernas da
          figura, deixando corpo e cartões livres acima.

          Não dá pra descer mais: com a figura inteira visível E o texto abaixo
          dela, o campo de link — a ação principal — cai fora da primeira tela.
          Estes valores são o ponto onde os dois ainda cabem em 900px de altura.
        */}
        <div className="relative mx-auto max-w-6xl px-5 pt-[17rem] pb-16 sm:px-8 sm:pt-[22rem] sm:pb-20 lg:pt-[26rem] xl:pt-[28rem]">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-xs text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              Feito por fãs · não afiliado à Rockstar Games
            </p>

            <h1 className="fonte-titulo mt-6 text-4xl leading-[1.05] font-semibold tracking-tight text-zinc-50 sm:text-6xl">
              Sua live de GTA VI vira
              <br />
              <span className="text-orange-500 italic">
                uma semana de Shorts.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-[52ch] text-base leading-relaxed text-zinc-300 sm:text-lg">
              <b className="font-semibold text-zinc-100">Cole o link.</b> A IA
              acha os melhores momentos, corta em 9:16 e legenda — enquanto você
              ainda está jogando. O hype não espera você editar.
            </p>

            {/* O campo de link é a demonstração mais barata que existe —
                esconder atrás de "criar conta" joga fora a chance. */}
            <HeroEntrada />

            {/*
              A contagem vem DEPOIS do campo, não antes.
              A urgência só ajuda quem já entendeu o que o produto faz; em cima
              do título ela rouba a atenção da única frase que explica a
              plataforma para quem chegou agora.
            */}
            <div className="mt-10">
              <ContagemLancamento />
            </div>

            <p className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-600">
              <ShieldCheck size={14} className="text-emerald-600" />O vídeo é
              processado e apagado. Fica só a análise.
            </p>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
            {CAPACIDADES.map((c) => (
              <span
                key={c}
                className="rounded-full border border-zinc-800 bg-zinc-900/40 px-3 py-1.5 text-[11px] text-zinc-400"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      <Metodo />
      <DestaqueGrande />
      <VisaoIA />
      <DestaquesDuplos />
      <DestaqueBiblioteca />


      {/* A monetização vem logo antes dos planos: é ela que dá o porquê de
          pagar, e o bloco termina com o custo por roteiro. */}
      <Monetizacao />
      <Planos />
      <Perguntas />

      <ChamadaFinal />

      {/* ----------------------------------------------------------- rodapé */}
      <footer className="border-t border-zinc-800/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo className="max-w-[126px]" />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-600">
            <a href="#metodo" className="transition hover:text-zinc-400">
              O método
            </a>
            <a href="#monetizacao" className="transition hover:text-zinc-400">
              Monetização
            </a>
            <a href="#planos" className="transition hover:text-zinc-400">
              Planos
            </a>
            <Link href="/entrar" className="transition hover:text-zinc-400">
              Entrar
            </Link>
            {/* Exigidos na revisão de app do TikTok e do Google — precisam
                estar acessíveis de qualquer página pública. */}
            <Link href="/termos" className="transition hover:text-zinc-400">
              Termos
            </Link>
            <Link href="/politica" className="transition hover:text-zinc-400">
              Privacidade
            </Link>
          </div>
        </div>

        {/*
          O aviso de não-afiliação, em toda página pública.
          Custa uma linha e é o que separa "site de fã" de "site que se passa
          por oficial" — ver docs/gta/politica-de-conteudo.md. Fica legível de
          verdade (zinc-500, não 600): aviso que ninguém consegue ler não
          cumpre a função de avisar.
        */}
        <div className="border-t border-zinc-800/40">
          <p className="mx-auto max-w-6xl px-5 py-5 text-[11px] leading-relaxed text-zinc-500 sm:px-8">
            {NAO_AFILIADO}
          </p>
        </div>
      </footer>
    </div>
  );
}
