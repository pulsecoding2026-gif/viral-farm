"use client";

import { useState } from "react";
import Link from "next/link";
import { List, X } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "../logo";

const SECOES = [
  // "#metodo" saiu quando a seção foi removida da home. Âncora sem destino
  // não dá erro — só não rola, e o visitante conclui que o site está quebrado.
  { href: "#monetizacao", rotulo: "Como monetizar" },
  { href: "#planos", rotulo: "Planos" },
  { href: "#perguntas", rotulo: "Perguntas" },
];

/**
 * Cabeçalho flutuante em pílula.
 *
 * Não encosta na borda: fica solto sobre o conteúdo, com o fundo desfocado.
 * Isso dá a leitura de "camada acima da página" em vez de "faixa colada no
 * topo", e deixa o brilho do hero passar por baixo.
 */
export function NavegacaoSite() {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="sticky top-0 z-50 px-4 pt-6 sm:px-6 sm:pt-8">
      {/*
        Blur leve, fundo mais opaco. `backdrop-blur-xl` sobre o vídeo do hero
        obrigava o compositor a refazer um desfoque de 24px a cada quadro, e
        era isso que travava a reprodução. Com o fundo mais fechado, 8px de
        desfoque bastam para o efeito de vidro custando uma fração disso.
      */}
      <header className="mx-auto max-w-5xl rounded-3xl border border-zinc-800/80 bg-zinc-900/88 shadow-lg shadow-black/40 backdrop-blur-sm">
        <div className="flex items-center gap-5 px-4 py-2.5 sm:px-5">
          <Link
            href="/"
            aria-label="Viral Farm"
            className="shrink-0 transition-opacity hover:opacity-80"
          >
            <Logo className="max-w-[124px]" />
          </Link>

          <nav className="hidden flex-1 items-center gap-5 lg:flex">
            {SECOES.map((s) => (
              <a
                key={s.href}
                href={s.href}
                className="text-sm text-zinc-400 transition hover:text-zinc-100"
              >
                {s.rotulo}
              </a>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-1.5 sm:flex">
            <Link
              href="/entrar"
              className="rounded-full px-3.5 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-zinc-100"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_16px_rgb(255_62_2/0.35)] transition hover:bg-orange-500 active:scale-[0.98]"
            >
              Começar
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            aria-label={aberto ? "Fechar menu" : "Abrir menu"}
            className="ml-auto rounded-full p-2 text-zinc-400 transition hover:bg-white/[0.06] sm:ml-0 lg:hidden"
          >
            {aberto ? <X size={18} /> : <List size={18} />}
          </button>
        </div>

        {aberto && (
          <div className="border-t border-zinc-800/80 px-4 py-3 lg:hidden">
            <nav className="flex flex-col gap-0.5">
              {SECOES.map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  onClick={() => setAberto(false)}
                  className="rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.06]"
                >
                  {s.rotulo}
                </a>
              ))}
            </nav>
            <div className="mt-2 flex gap-2 border-t border-zinc-800/80 pt-3 sm:hidden">
              <Link
                href="/entrar"
                className="flex-1 rounded-full border border-zinc-700 px-4 py-2.5 text-center text-sm font-medium text-zinc-200"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="flex-1 rounded-full bg-orange-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
              >
                Começar
              </Link>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}
