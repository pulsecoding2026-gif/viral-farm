"use client";

import Link from "next/link";
import {
  ArrowSquareOut,
  MagnifyingGlass,
  BookmarkSimple,
  ClosedCaptioning,
} from "@phosphor-icons/react/dist/ssr";
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";
import { ROTULOS_NICHO } from "@/lib/biblioteca/videos-exemplo";
import {
  useSalvo,
  engajamento,
  corDoEngajamento,
  formatarNumero,
  tempoRelativo,
  PLATAFORMA,
} from "./usar-salvo";

/**
 * Linha compacta do Radar. Mesma informação da grade, num terço da altura —
 * serve pra varrer dezenas de vídeos e comparar números, não pra apreciar
 * thumbnail. A grade continua sendo o padrão porque em vídeo a imagem
 * importa; esta visão existe pra quando a decisão é por métrica.
 */
export function LinhaVideo({
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
    <li className="group flex items-center gap-3 px-3 py-2 transition hover:bg-white/[0.02]">
      {/* Slot sempre presente, mesmo sem número — ver o comentário das ações. */}
      <span className="numero-placa w-4 shrink-0 text-right text-[11px] text-zinc-400">
        {posicao ?? ""}
      </span>

      {/*
        Sem emoji de reserva: numa lista densa ele vira enfeite e compete com o
        número ao lado. O slot mantém largura fixa mesmo vazio — se encolhesse,
        os títulos começariam em posições diferentes e a coluna quebraria.
      */}
      <div className="h-9 w-7 shrink-0 overflow-hidden rounded bg-zinc-800/60">
        {video.thumbnail_url && (
          // eslint-disable-next-line @next/next/no-img-element -- thumbnail pública externa
          <img
            src={video.thumbnail_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] leading-tight text-zinc-100">
          {video.titulo}
        </p>
        {/* Plataforma como ponto colorido junto ao canal: a etiqueta cheia
            gastava 68px de largura que o título aproveita melhor.
            A legenda embutida também vive aqui — dentro das ações ela variava
            a largura da coluna e entortava tudo à esquerda dela. */}
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-zinc-400">
          <span
            title={plataforma.rotulo}
            aria-label={plataforma.rotulo}
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${plataforma.cor}`}
          />
          <span className="truncate">{video.canal}</span>
          {video.tem_legenda_embutida && (
            <span
              title="Já tem legenda queimada no vídeo"
              aria-label="Já tem legenda queimada no vídeo"
              className="shrink-0 text-zinc-400"
            >
              <ClosedCaptioning size={12} weight="fill" />
            </span>
          )}
        </p>
      </div>

      <span className="hidden w-24 shrink-0 truncate text-[11px] text-zinc-400 lg:block">
        {ROTULOS_NICHO[video.nicho as keyof typeof ROTULOS_NICHO] ?? video.nicho}
      </span>

      <span className="numero-placa hidden w-10 shrink-0 text-right text-[11px] text-zinc-400 md:block">
        {video.duracao_s}s
      </span>

      <span className="numero-placa w-14 shrink-0 text-right text-[11px] text-zinc-400">
        {formatarNumero(video.visualizacoes)}
      </span>

      <span className="numero-placa hidden w-14 shrink-0 text-right text-[11px] text-zinc-400 sm:block">
        {formatarNumero(video.curtidas)}
      </span>

      {/* O número que o filtro de engajamento usa. Antes dava pra filtrar por
          ele sem nunca vê-lo — agora ele aparece, com faixa de cor. */}
      <span
        className={`numero-placa w-12 shrink-0 text-right text-[11px] font-semibold ${corDoEngajamento(eng)}`}
        title="Curtidas dividido por visualizações"
      >
        {eng.toFixed(1)}%
      </span>

      <span className="hidden w-14 shrink-0 text-right text-[11px] text-zinc-400 xl:block">
        {tempoRelativo(video.publicado_em)}
      </span>

      {/*
        Largura FIXA e justify-end. O link externo é condicional: se este
        bloco encolhesse quando ele falta, todas as colunas numéricas à
        esquerda escorregariam de linha para linha.
      */}
      <div className="flex w-[84px] shrink-0 items-center justify-end gap-1">
        <button
          type="button"
          onClick={alternar}
          disabled={ocupado}
          aria-pressed={salvo}
          title={salvo ? "Remover da Biblioteca" : "Salvar na Biblioteca"}
          aria-label={salvo ? "Remover da Biblioteca" : "Salvar na Biblioteca"}
          className={
            "flex h-6 w-6 items-center justify-center rounded-md border transition active:scale-90 disabled:opacity-60 " +
            (salvo
              ? "border-orange-700 bg-orange-600 text-white"
              : "border-zinc-800 text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-zinc-200 focus-visible:opacity-100")
          }
        >
          <BookmarkSimple size={12} weight={salvo ? "fill" : "bold"} />
        </button>
        <Link
          href={`/analisador?nicho=${encodeURIComponent(video.nicho)}`}
          title="Analisar meu material parecido"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-800 text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:border-orange-900/70 hover:text-orange-400 focus-visible:opacity-100"
        >
          <MagnifyingGlass size={12} weight="bold" />
        </Link>
        {video.link ? (
          <a
            href={video.link}
            target="_blank"
            rel="noopener noreferrer"
            title={`Abrir no ${plataforma.rotulo}`}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-800 text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:text-zinc-200 focus-visible:opacity-100"
          >
            <ArrowSquareOut size={12} />
          </a>
        ) : (
          // Reserva o espaço: sem isto os três botões viram dois e o bloco
          // encolhe, desalinhando as colunas.
          <span aria-hidden="true" className="h-6 w-6 shrink-0" />
        )}
      </div>
    </li>
  );
}
