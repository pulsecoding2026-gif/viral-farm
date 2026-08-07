import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "../logo";

/**
 * Moldura das páginas jurídicas (termos, política).
 *
 * Layout de leitura: coluna estreita, tipografia maior e espaçada. Essas
 * páginas são exigidas por plataformas (TikTok, Google) na revisão do app,
 * então precisam abrir rápido e sem depender de sessão.
 */
export function PaginaLegal({
  titulo,
  atualizadoEm,
  children,
}: {
  titulo: string;
  atualizadoEm: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <header className="border-b border-zinc-800/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
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
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          {titulo}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Última atualização: {atualizadoEm}
        </p>

        {/*
          Estilos por seletor descendente em vez de classe por elemento: o
          conteúdo é prosa longa e marcar cada parágrafo à mão seria ruído.
        */}
        <div
          className="mt-10 space-y-6 text-[15px] leading-relaxed text-zinc-300
            [&_a]:text-orange-400 [&_a]:underline hover:[&_a]:text-orange-300
            [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-zinc-50
            [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-zinc-100
            [&_li]:leading-relaxed
            [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:marker:text-orange-600/70 [&_ul]:list-disc
            [&_strong]:font-semibold [&_strong]:text-zinc-100"
        >
          {children}
        </div>
      </main>

      <footer className="border-t border-zinc-800/60">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-8 text-xs text-zinc-600 sm:px-8">
          <Link href="/termos" className="transition hover:text-zinc-400">
            Termos de uso
          </Link>
          <Link href="/politica" className="transition hover:text-zinc-400">
            Política de privacidade
          </Link>
          <a
            href="mailto:contato@viralfarm.com.br"
            className="transition hover:text-zinc-400"
          >
            contato@viralfarm.com.br
          </a>
        </div>
      </footer>
    </div>
  );
}
