"use client";

import { ArrowClockwise, WifiSlash } from "@phosphor-icons/react/dist/ssr";

/**
 * Tela de falha do painel.
 *
 * Existe principalmente para o caso de não conseguirmos falar com o Supabase
 * na hora de conferir a sessão. Antes disso o layout mandava a pessoa pro
 * login, o que era mentira: a sessão continua válida, quem falhou foi a rede.
 * Aqui o cookie fica intacto e um clique tenta de novo.
 */
export default function ErroPainel({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#09090b] px-5">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-500">
          <WifiSlash size={22} />
        </span>
        <h1 className="mt-5 text-lg font-semibold tracking-tight text-zinc-100">
          Não deu pra carregar o painel
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          Pode ter sido a conexão. Você continua logado — é só tentar de novo.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500 active:scale-[0.98]"
        >
          <ArrowClockwise size={15} weight="bold" />
          Tentar de novo
        </button>
      </div>
    </div>
  );
}
