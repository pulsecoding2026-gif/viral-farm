"use client";

import { useState } from "react";
import Link from "next/link";
import { List, X } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "../logo";
import { MARCA } from "@/lib/gta/marca";

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
      {/*
        O ACABAMENTO DA PÍLULA — três camadas, e cada uma resolve uma coisa.

        1. `bg-zinc-900/70` com `backdrop-blur-md`: mais vidro que antes. O
           comentário abaixo explica por que não vamos além disso.
        2. O `::before` desenha um fio do gradiente da marca na borda, via a
           técnica de máscara: um gradiente preenche a borda e o
           `mask-composite: exclude` recorta o miolo, sobrando só o contorno de
           1px. É o que dá o brilho de néon na quina sem precisar de imagem
           nem de segundo elemento posicionado.
        3. O brilho por baixo (`shadow`) usa o rosa da marca em opacidade
           baixa, não preto puro — assenta a pílula sobre o vídeo em vez de
           recortá-la com uma sombra dura.
      */}
      {/*
        82%, e não 70%: sobre um vídeo de Miami saturado o fundo translúcido
        deixa rosa e laranja atravessarem por trás dos links, e "Como
        monetizar" em zinc-400 sobre uma mancha rosa não passa perto de 4,5:1.
        O contraste do texto não pode depender do frame que está tocando atrás.
      */}
      <header className="pilula-marca mx-auto max-w-5xl rounded-3xl bg-zinc-900/82 shadow-[0_8px_32px_-8px_rgb(0_0_0/0.8),0_0_24px_-6px_rgb(243_69_170/0.25)] backdrop-blur-md">
        <div className="flex items-center gap-5 px-4 py-2.5 sm:px-5">
          <Link
            href="/"
            aria-label={MARCA}
            className="shrink-0 transition-opacity hover:opacity-80"
          >
            {/*
              A LARGURA É REFÉM DA ALTURA DO CABEÇALHO, e a arte já mudou de
              proporção duas vezes: 7,7:1 → 2,7:1 → 2:1. A 2:1, cada pixel de
              largura custa meio de altura, e o cabeçalho tem 77px no total.
              132px dão 66px de logo — cabe com a folga que impede o lockup de
              encostar na borda do cartão.
              Se a arte mudar de novo, é esta conta que precisa ser refeita.
            */}
            <Logo className="max-w-[132px]" />
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

          {/*
            `bg-orange-700`, não `bg-orange-600`, nos dois "Começar" (aqui e
            no menu mobile). Medido: branco sobre acao-600 (#ee4f9c) dá
            3,37:1 — reprova o 4,5:1 de texto normal, e o botão é 14px. Sobre
            acao-700 (#c73a7d) dá 4,85:1. O glow também deixa de citar
            `rgb(255 62 2)`, o laranja da marca anterior, e passa a ser o
            tom do próprio botão.

            `py-2` → `py-3` nos dois links: 8px de padding + a linha de texto
            fechava em ~36px de altura, abaixo do alvo de toque mínimo de
            44px. `py-3` fecha em 44px.
          */}
          <div className="ml-auto hidden items-center gap-1.5 sm:flex">
            <Link
              href="/entrar"
              className="rounded-full px-3.5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-zinc-100"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-full bg-orange-700 px-4 py-3 text-sm font-semibold text-white shadow-[0_2px_16px_rgb(199_58_125/0.35)] transition hover:bg-orange-600 active:scale-[0.98]"
            >
              Começar
            </Link>
          </div>

          {/*
            `h-11 w-11` (44×44) em vez de `p-2` em volta de um ícone de 18px
            (~34×34 no total). É o único jeito de abrir o menu no celular —
            não pode ficar abaixo do alvo de toque mínimo.
          */}
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            aria-label={aberto ? "Fechar menu" : "Abrir menu"}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/[0.06] sm:ml-0 lg:hidden"
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
                  /* py-2 → py-3.5: cada item de menu mobile é uma faixa de
                     toque própria e precisa dos 44px, não só o botão que abre
                     o menu. */
                  className="rounded-xl px-3 py-3.5 text-sm text-zinc-300 transition hover:bg-white/[0.06]"
                >
                  {s.rotulo}
                </a>
              ))}
            </nav>
            <div className="mt-2 flex gap-2 border-t border-zinc-800/80 pt-3 sm:hidden">
              <Link
                href="/entrar"
                className="flex-1 rounded-full border border-zinc-700 px-4 py-3 text-center text-sm font-medium text-zinc-200"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="flex-1 rounded-full bg-orange-700 px-4 py-3 text-center text-sm font-semibold text-white"
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
