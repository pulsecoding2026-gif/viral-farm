"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  YoutubeLogo,
  TiktokLogo,
  InstagramLogo,
  TwitchLogo,
  // O Phosphor não tem logo do Kick. Um controle genérico diz "plataforma de
  // games" sem fingir uma marca que não existe no conjunto de ícones.
  GameController,
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

/**
 * A ordem não é alfabética nem histórica: Twitch e Kick vêm primeiro porque
 * são de onde sai o material de quem cliba GTA. Quem chega nesta página está
 * pensando em live de roleplay, e a primeira coisa que ele procura é se a
 * ferramenta engole o link dele.
 *
 * Esta lista precisa bater com HOSTS_PERMITIDOS em src/lib/analise/extrair.ts.
 * Anunciar aqui um host que o validador recusa é prometer erro.
 */
const ACEITOS = [
  { icone: TwitchLogo, nome: "Twitch" },
  { icone: GameController, nome: "Kick" },
  { icone: YoutubeLogo, nome: "YouTube" },
  { icone: TiktokLogo, nome: "TikTok" },
  { icone: InstagramLogo, nome: "Reels" },
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
          /*
           * `outline-none` tira o anel PADRÃO do navegador no `:focus` — mas
           * sem repor nada, o campo dependia só da regra global
           * `:focus-visible` de gta-tokens.css pra mostrar foco. Ela deveria
           * vencer (é CSS solto, fora de `@layer`, e por spec bate qualquer
           * regra em camada — que é onde o Tailwind injeta `outline-none`),
           * mas depender de uma sutileza de cascata pro único indicador de
           * foco de um campo de formulário é frágil. `focus-visible:` explícito
           * garante o anel rosa sem depender de ordem de import nenhuma.
           */
          className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus-visible:outline-2 focus-visible:outline-orange-600 focus-visible:outline-offset-2"
        />
        {/*
          `bg-orange-700`, não `bg-orange-600`: branco sobre acao-600 mede
          3,37:1 neste corpo de 14px — reprova o 4,5:1 de texto normal.
          Acao-700 dá 4,85:1. O glow também deixa de ser `rgb(255 62 2)`
          (laranja da marca anterior) e passa a ser o rosa do próprio botão.
        */}
        <button
          type="submit"
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_2px_16px_rgb(199_58_125/0.35)] transition hover:bg-orange-600 active:scale-[0.98]"
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
            /* Mesmo ajuste do rótulo acima: os nomes das plataformas
               estavam um degrau mais escuros (zinc-500, 4,14:1) que o texto
               ao lado, sem motivo — os dois são a mesma informação. */
            className="flex items-center gap-1.5 text-[11px] text-zinc-400"
          >
            <Icone size={13} weight="fill" />
            {nome}
          </span>
        ))}
      </div>
    </div>
  );
}
