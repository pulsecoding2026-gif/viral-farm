"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  YoutubeLogo,
  TiktokLogo,
  InstagramLogo,
  FacebookLogo,
} from "@phosphor-icons/react/dist/ssr";

/**
 * Campo de link no próprio hero.
 *
 * O produto É um campo de link — esconder isso atrás de "criar conta" joga
 * fora a demonstração mais barata que existe. O link digitado viaja até o
 * Analisador pela querystring, então quem já tem conta cai direto na análise
 * em vez de recomeçar.
 *
 * Não analisa aqui: a landing é pública e o pipeline custa dinheiro por
 * chamada. Um botão que dispara análise sem conta seria convite a abuso.
 */

const ACEITOS = [
  { icone: YoutubeLogo, nome: "YouTube" },
  { icone: TiktokLogo, nome: "TikTok" },
  { icone: InstagramLogo, nome: "Reels" },
  { icone: FacebookLogo, nome: "Facebook" },
];

export function HeroEntrada({
  alinhamento = "centro",
}: {
  /** No hero o campo é o eixo da página e fica centrado; num layout de duas
   *  colunas ele precisa encostar na esquerda junto com o texto. */
  alinhamento?: "centro" | "esquerda";
} = {}) {
  const [link, setLink] = useState("");
  const router = useRouter();
  const esquerda = alinhamento === "esquerda";

  function seguir(e: React.FormEvent) {
    e.preventDefault();
    const alvo = link.trim()
      ? `/analisador?link=${encodeURIComponent(link.trim())}`
      : "/analisador";
    router.push(alvo);
  }

  return (
    <div
      className={
        "mt-8 w-full " + (esquerda ? "max-w-xl" : "mx-auto max-w-2xl")
      }
    >
      <form
        onSubmit={seguir}
        // Sem backdrop-blur: este bloco fica sobre o vídeo do hero, e refazer
        // o desfoque a cada quadro trava a reprodução. Fundo opaco resolve a
        // legibilidade pelo mesmo preço visual.
        className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-2 sm:flex-row"
      >
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Cole o link de um vídeo longo"
          aria-label="Link do vídeo"
          className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
        />
        <button
          type="submit"
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_2px_16px_rgb(255_62_2/0.35)] transition hover:bg-orange-500 active:scale-[0.98]"
        >
          <MagnifyingGlass size={16} weight="bold" />
          Gerar meus cortes
        </button>
      </form>

      <div
        className={
          "mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 " +
          (esquerda ? "justify-start" : "justify-center")
        }
      >
        {/* zinc-400, não zinc-600: em zinc-600 media 2,58:1 sobre o cartão do
            CTA e zinc-500 só chegava a 3,81 — os dois abaixo dos 4,5:1 da
            WCAG AA pra texto pequeno. zinc-400 dá 7,02. */}
        <span className="text-[11px] text-zinc-400">Aceita links de</span>
        {ACEITOS.map(({ icone: Icone, nome }) => (
          <span
            key={nome}
            className="flex items-center gap-1.5 text-[11px] text-zinc-500"
          >
            <Icone size={13} weight="fill" />
            {nome}
          </span>
        ))}
      </div>
    </div>
  );
}
