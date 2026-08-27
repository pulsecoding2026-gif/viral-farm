"use client";

import { useState } from "react";
import {
  PlayCircle,
  ArrowSquareOut,
  YoutubeLogo,
} from "@phosphor-icons/react/dist/ssr";
import { ContagemLancamento } from "./contagem-lancamento";

/**
 * O ID do vídeo oficial do "Extended Look" no YouTube da Rockstar.
 *
 * DEIXADO EM `null` DE PROPÓSITO — não é esquecimento, é a leitura correta da
 * pesquisa. `docs/gta/pesquisa-jogo.md` (seção 2) confirma DATA e HORÁRIO do
 * Extended Look com fonte oficial (Rockstar Newswire, @RockstarGames no X,
 * Netflix Tudum), mas nenhuma fonte apurada traz o ID do vídeo no YouTube —
 * o material sai de fato só em 27–28/08/2026, depois do fechamento da
 * pesquisa. Chutar um ID de 11 caracteres só tem saídas ruins: ou o vídeo não
 * existe ainda (capa 404, embed quebrado) ou, pior, o ID pertence a OUTRO
 * vídeo qualquer e toca a coisa errada na home. As duas são piores do que não
 * incorporar nada — por isso o card abaixo tem uma segunda forma, que linka
 * para a fonte oficial em vez de adivinhar.
 *
 * Assim que o vídeo estrear e o ID for confirmado, troque esta linha por uma
 * string. O card muda sozinho de "link para a fonte" para "capa clicável" —
 * nenhum outro ponto deste arquivo precisa de ajuste, é a mesma ideia de fonte
 * única que `src/lib/gta/lancamento.ts` aplica às datas.
 */
const ID_YOUTUBE_TRAILER: string | null = null;

/** A fonte oficial, confirmada — usada tanto no rodapé do card quanto no
 * link de saída quando não há ID para incorporar. */
const FONTE_NEWSWIRE =
  "https://www.rockstargames.com/newswire/article/9k2kaa1o3297k9/grand-theft-auto-vi-an-extended-look";

/**
 * A seção do trailer + contador na home.
 *
 * O PORQUÊ DE EXISTIR AGORA E NÃO SÓ NO HERO
 *
 * O Extended Look estreou em 27/08/2026 e o hero já parou de carregar
 * relógio (ver o comentário em `page.tsx`) — um número grande de dias
 * distrai no meio da promessa. Esta seção é o lugar certo pra devolver essa
 * urgência: ela mostra que o material saiu de verdade (prova, não promessa) e
 * conecta direto com o próximo marco oficial, que é o `<ContagemLancamento />`
 * já pronto e importado sem modificação — a fonte da data continua sendo
 * `src/lib/gta/lancamento.ts`, e ela sozinha.
 */
export function TrailerLancamento() {
  return (
    <section id="trailer" className="relative overflow-hidden border-y border-zinc-800/60">
      {/*
        Fundo próprio, sem depender de `.ceu-miami` / `.ceu-alvorada` /
        `.ceu-noturno` — as três já estão em uso (monetizacao, como-funciona,
        planos) e outro agente está editando `gta-tokens.css` agora, então uma
        quarta variante compartilhada teria que esperar. Um radial isolado,
        só neste arquivo, resolve sem tocar no CSS global e sem repetir a
        "hora do dia" de nenhuma seção vizinha.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(65% 45% at 50% 0%, rgb(238 79 156 / 0.12) 0%, transparent 65%), linear-gradient(180deg, #080808 0%, #0d1322 100%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[52ch] text-center">
          <span className="placa inline-block rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-xs text-orange-500">
            Trailer oficial
          </span>
          {/* Caixa mista, não caixa alta — a regra da virada é a mesma de
              todo título de seção: caixa alta só na `.placa`. */}
          <h2 className="titulo-letreiro mt-5 text-2xl leading-[1.05] sm:text-4xl">
            O trailer já rodou.{" "}
            <span className="acento-rosa">O lançamento, não.</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Grand Theft Auto VI: An Extended Look estreou em 27 de agosto de
            2026, na Netflix e no YouTube oficial da Rockstar Games. O jogo
            chega em 19 de novembro — o relógio ao lado segue sozinho o
            próximo marco confirmado.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-stretch">
          {/* ------------------------------------------------ o trailer */}
          <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#111111]">
            <TrailerEmbed />
            <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-100">
                  Grand Theft Auto VI: An Extended Look
                </p>
                <p className="text-xs text-zinc-500">
                  Rockstar Games · 27 de agosto de 2026
                </p>
              </div>
              {/*
                A fonte fica visível de propósito — mesma lógica do link em
                `contagem-lancamento.tsx`. Este é um fandom que caça erro
                factual, e mostrar de onde o material vem é o que separa
                agregador confiável de canal de rumor.
              */}
              <a
                href={FONTE_NEWSWIRE}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1 text-[11px] text-zinc-600 underline-offset-4 transition hover:text-zinc-400 hover:underline"
              >
                Fonte
                <ArrowSquareOut size={12} weight="bold" />
              </a>
            </div>
          </div>

          {/* ------------------------------------------------ o contador */}
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/12 bg-[#111111] p-6 text-center sm:p-8">
            <p className="placa text-xs text-zinc-500">Próximo marco</p>
            <ContagemLancamento />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * O player, em duas formas possíveis.
 *
 * SEM `ID_YOUTUBE_TRAILER` (o estado de hoje): um cartão que manda para a
 * fonte oficial. Não é uma capa falsa nem um player quebrado — é a saída
 * honesta quando não há vídeo confirmado pra incorporar.
 *
 * COM `ID_YOUTUBE_TRAILER`: a técnica da miniatura clicável. O iframe do
 * YouTube sozinho já carrega centenas de KB de JS e rastreador em toda
 * visita, mesmo que ninguém clique em play — então a página só busca a capa
 * (uma imagem, do CDN público do YouTube) e só injeta o `<iframe>` depois do
 * clique. `youtube-nocookie.com` no lugar de `youtube.com` reduz ainda mais
 * o seguimento de quem nunca deu play.
 */
function TrailerEmbed() {
  const [carregado, setCarregado] = useState(false);

  if (!ID_YOUTUBE_TRAILER) {
    return (
      <div
        className="relative flex aspect-video w-full flex-col items-center justify-center gap-4 px-6 text-center sm:px-10"
        style={{ background: "var(--grad-noite)" }}
      >
        <PlayCircle size={48} weight="fill" className="text-white/60" />
        {/*
          O texto anterior falava de "ID do vídeo confirmado para incorporar",
          que é conversa de quem programa, não de quem visita. O visitante não
          precisa saber por que o vídeo não toca aqui dentro — ele precisa
          saber que o trailer existe, quanto dura e onde assistir. A razão
          técnica está documentada no topo deste arquivo, que é onde ela serve
          para alguma coisa.
        */}
        <p className="max-w-[38ch] text-sm leading-relaxed text-zinc-200">
          26 minutos de gameplay, capturados no PlayStation 5. Assista no canal
          oficial da Rockstar.
        </p>
        {/* Alvo de toque ≥44px, mesmo sendo um link de texto com ícone. */}
        <a
          href={FONTE_NEWSWIRE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-orange-700 px-5 text-sm font-semibold text-white shadow-[0_4px_24px_rgb(199_58_125/0.35)] transition hover:bg-orange-600 active:scale-[0.98]"
        >
          <YoutubeLogo size={18} weight="fill" />
          Assistir o trailer
        </a>
      </div>
    );
  }

  if (carregado) {
    return (
      <div className="relative aspect-video w-full bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${ID_YOUTUBE_TRAILER}?autoplay=1&rel=0`}
          title="Grand Theft Auto VI: An Extended Look — Rockstar Games"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setCarregado(true)}
      aria-label="Reproduzir o trailer Grand Theft Auto VI: An Extended Look"
      className="group relative block aspect-video w-full bg-black"
    >
      {/* `maxresdefault` é a capa em resolução alta; nem todo vídeo tem uma
          gerada, e quando falta o YouTube devolve um placeholder cinza feio
          em vez de 404 — por isso o `onError` troca para `hqdefault`, que
          sempre existe. */}
      <img
        src={`https://i.ytimg.com/vi/${ID_YOUTUBE_TRAILER}/maxresdefault.jpg`}
        onError={(e) => {
          e.currentTarget.src = `https://i.ytimg.com/vi/${ID_YOUTUBE_TRAILER}/hqdefault.jpg`;
        }}
        alt="Capa do trailer Grand Theft Auto VI: An Extended Look"
        className="h-full w-full object-cover"
        loading="lazy"
      />
      <span className="absolute inset-0 bg-black/25 transition group-hover:bg-black/40" />
      <span className="absolute inset-0 flex items-center justify-center">
        <PlayCircle
          size={64}
          weight="fill"
          className="text-white/90 drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)] transition group-hover:scale-105 group-hover:text-white"
        />
      </span>
    </button>
  );
}
