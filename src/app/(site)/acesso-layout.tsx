import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldCheck, Check } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "../logo";

/**
 * Moldura das telas de entrar e criar conta.
 *
 * A coluna da direita usa o pôster do vídeo do hero, não fundo liso: antes
 * eram dois blocos pretos separados por uma linha reta, com o texto solto no
 * meio de muito espaço vazio. O pôster é estático (não o vídeo) porque numa
 * tela de formulário o movimento disputa atenção com o que a pessoa precisa
 * preencher — e pesa 155 KB contra 2 MB.
 *
 * No celular a coluna some por inteiro: depois do clique em "criar conta",
 * argumento de venda é ruído entre a pessoa e o campo.
 */
export function AcessoLayout({
  titulo,
  subtitulo,
  children,
  rodape,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
  rodape: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#09090b]">
      {/* ----------------------------------------------------- formulário */}
      <div className="flex w-full flex-col px-5 py-7 sm:px-10 lg:w-[54%] lg:px-16">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Viral Farm"
            className="min-w-0 transition-opacity hover:opacity-80"
          >
            <Logo className="max-w-[132px]" />
          </Link>
          <Link
            href="/"
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-300"
          >
            <ArrowLeft size={13} weight="bold" />
            Voltar
          </Link>
        </div>

        {/* `justify-center` com padding curto em vez de `flex-1 items-center`:
            o formulário é baixo, e centralizar numa coluna de altura total
            abria vãos enormes em cima e embaixo. */}
        <div className="flex flex-1 flex-col justify-center py-8">
          <div className="mx-auto w-full max-w-sm lg:mx-0">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
              {titulo}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              {subtitulo}
            </p>

            <div className="mt-6">{children}</div>

            <div className="mt-5 text-sm text-zinc-500">{rodape}</div>

            <p className="mt-6 flex items-center gap-2 text-[11px] text-zinc-600">
              <ShieldCheck size={13} className="shrink-0 text-emerald-600" />
              Seu vídeo é processado e apagado. Fica só a análise.
            </p>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- vitrine */}
      {/*
        A arte é quadrada e a coluna é alta e estreita, então `object-cover`
        recortaria as laterais e comeria os painéis de neon — que são metade
        da composição. Por isso ela fica CONTIDA no topo, em proporção
        própria, e o texto ocupa o resto. Nada é cortado.
      */}
      <aside className="relative hidden overflow-hidden border-l border-zinc-800/60 lg:flex lg:w-[46%] lg:flex-col">
        {/* Sem `priority` no <Image>: a coluna some no celular, e o preload
            dispara mesmo com a imagem em display:none — seriam centenas de KB
            baixados no celular pra nada. */}
        <div className="relative aspect-square w-full shrink-0">
          <Image
            src="/acesso-viral-farm.png"
            alt=""
            fill
            sizes="46vw"
            className="object-cover object-center"
          />
          {/* Fecha a base da arte no fundo da página, sem corte reto. */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#09090b]" />
        </div>

        <div className="relative -mt-16 flex flex-1 flex-col justify-center px-12 pb-10 xl:px-16">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-orange-500 uppercase">
            Comece a farmar
          </p>
          <p className="mt-3 max-w-[20ch] text-3xl leading-[1.1] font-semibold tracking-tight text-zinc-50">
            O vídeo que você já gravou vira{" "}
            <span className="text-orange-500 italic">vários cortes.</span>
          </p>

          <ul className="mt-6 space-y-2.5">
            {[
              ["Transcrição por palavra", "cada uma com seu tempo"],
              ["Melhores momentos", "escolhidos e pontuados"],
              ["Cortes 9:16", "com legenda animada"],
            ].map(([titulo, detalhe]) => (
              <li key={titulo} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
                  <Check size={9} weight="bold" />
                </span>
                <span className="text-sm text-zinc-300">
                  {titulo}
                  <span className="text-zinc-600"> — {detalhe}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-6 border-t border-zinc-800/80 pt-4 text-xs leading-relaxed text-zinc-600">
            De 40 a 90 segundos por análise. Pode fechar a aba — o processamento
            continua no servidor.
          </p>
        </div>
      </aside>
    </div>
  );
}
