"use client";

import Link from "next/link";
import {
  ArrowSquareOut,
  Eye,
  Heart,
  ClosedCaptioning,
  MagnifyingGlass,
  BookmarkSimple,
} from "@phosphor-icons/react/dist/ssr";
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";
import {
  useSalvo,
  engajamento,
  corDoEngajamento,
  formatarNumero,
  tempoRelativo,
  PLATAFORMA,
} from "./usar-salvo";

export function CartaoVideo({
  video,
  salvoInicial = false,
  posicao,
}: {
  video: ItemBiblioteca;
  salvoInicial?: boolean;
  posicao?: number;
}) {
  const { salvo, ocupado, alternar } = useSalvo(video, salvoInicial);
  const plataforma = PLATAFORMA[video.plataforma];
  const eng = engajamento(video);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30 transition duration-200 hover:-translate-y-0.5 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/40">
      {/*
        3:4 em vez de 9:16: a thumbnail que a YouTube Data API devolve é 16:9,
        e recortar isso num retrato extremo comia metade da imagem. 3:4 ainda
        comunica formato vertical e deixa o cartão bem mais curto.
      */}
      <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950">
        {video.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- thumbnail pública externa, sem otimização
          <img
            src={video.thumbnail_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="text-5xl opacity-90">{video.emoji}</span>
        )}

        {/* Véu na base: sem ele a duração some sobre thumbnail clara. */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />

        <div className="absolute top-2 left-2 flex items-center gap-1">
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white ${plataforma.cor}`}
          >
            {plataforma.rotulo}
          </span>
          {posicao !== undefined && posicao <= 3 && (
            <span className="rounded-md bg-orange-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              #{posicao}
            </span>
          )}
        </div>

        <div className="absolute top-2 right-2 flex items-center gap-1">
          {video.tem_legenda_embutida && (
            <span
              title="Já tem legenda queimada no vídeo"
              className="rounded-md bg-black/70 p-1 text-zinc-300 backdrop-blur"
            >
              <ClosedCaptioning size={12} weight="fill" />
            </span>
          )}
          {/* O gesto que liga o Radar à Biblioteca. */}
          <button
            type="button"
            onClick={alternar}
            disabled={ocupado}
            aria-pressed={salvo}
            title={salvo ? "Remover da Biblioteca" : "Salvar na Biblioteca"}
            aria-label={salvo ? "Remover da Biblioteca" : "Salvar na Biblioteca"}
            className={
              "rounded-md p-1 backdrop-blur transition active:scale-90 disabled:opacity-60 " +
              (salvo
                ? "bg-orange-600 text-white"
                : "bg-black/70 text-zinc-300 hover:text-white")
            }
          >
            <BookmarkSimple size={12} weight={salvo ? "fill" : "bold"} />
          </button>
        </div>

        <span className="absolute right-2 bottom-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white backdrop-blur">
          {video.duracao_s}s
        </span>

        {/* Engajamento aparece no canto quando é notável — abaixo de 4% seria
            ruído, e o cartão já tem informação demais competindo. */}
        {eng >= 4 && (
          <span
            title="Curtidas dividido por visualizações"
            className={`absolute bottom-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold tabular-nums backdrop-blur ${corDoEngajamento(eng)}`}
          >
            {eng.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-zinc-100">
          {video.titulo}
        </h3>
        <p className="mt-1 truncate text-xs text-zinc-500">{video.canal}</p>

        {/* Métricas numa linha só, com tabular-nums pra não dançar entre cartões. */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums text-zinc-500">
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {formatarNumero(video.visualizacoes)}
          </span>
          <span className="flex items-center gap-1">
            <Heart size={12} />
            {formatarNumero(video.curtidas)}
          </span>
          <span className="text-zinc-600">{tempoRelativo(video.publicado_em)}</span>
        </div>

        {/*
          Fantasma, não sólido. Com 16 cartões na tela, 16 botões laranja
          cheios matariam a hierarquia — o laranja deixa de apontar qualquer
          coisa. Aqui ele só acende no hover.
        */}
        <div className="mt-3 flex items-center gap-1.5 border-t border-zinc-800 pt-3">
          <Link
            href={`/analisador?nicho=${encodeURIComponent(video.nicho)}`}
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition group-hover:border-orange-900/70 group-hover:text-orange-400 hover:!bg-orange-600 hover:!text-white active:scale-[0.98]"
          >
            <MagnifyingGlass size={12} weight="bold" />
            <span className="truncate">Já gravei assim</span>
          </Link>
          {video.link && (
            <a
              href={video.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir "${video.titulo}" no ${plataforma.rotulo}`}
              className="flex shrink-0 items-center justify-center rounded-lg border border-zinc-800 p-1.5 text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-200 active:scale-[0.98]"
            >
              <ArrowSquareOut size={13} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
