"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trash,
  MagnifyingGlass,
  ArrowSquareOut,
  Eye,
  Heart,
  FileText,
  NotePencil,
  Check,
  X,
  FolderSimplePlus,
} from "@phosphor-icons/react/dist/ssr";
import type { ItemSalvo, Colecao } from "@/lib/salvos";

const PLATAFORMA: Record<string, { rotulo: string; cor: string }> = {
  youtube: { rotulo: "YouTube", cor: "bg-red-600" },
  tiktok: { rotulo: "TikTok", cor: "bg-zinc-700" },
  instagram: { rotulo: "Instagram", cor: "bg-pink-600" },
};

function compacto(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}mil`;
  return String(n);
}

function quando(ms: number): string {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.round(h / 24)}d`;
}

export function CartaoSalvo({
  item,
  colecoes,
  onRemover,
  onAtualizar,
  mostrarColecao = true,
}: {
  item: ItemSalvo;
  colecoes: Colecao[];
  onRemover: (id: string) => void;
  onAtualizar: (id: string, campos: { nota?: string; colecao_id?: string | null }) => void;
  mostrarColecao?: boolean;
}) {
  const [editandoNota, setEditandoNota] = useState(false);
  const [rascunho, setRascunho] = useState(item.nota ?? "");

  function salvarNota() {
    onAtualizar(item.id, { nota: rascunho });
    setEditandoNota(false);
  }

  const titulo = item.tipo === "video" ? item.video.titulo : item.titulo;

  return (
    <article className="group rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3.5 transition hover:border-zinc-700">
      <div className="flex gap-3.5">
        {item.tipo === "video" ? (
          <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-950">
            {item.video.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- thumbnail pública externa
              <img
                src={item.video.thumbnail_url}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-2xl">
                {item.video.emoji}
              </span>
            )}
          </div>
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white">
            <FileText size={18} weight="fill" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-snug text-zinc-100">
              {titulo}
            </h3>
            {item.tipo === "video" && (
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold text-white ${PLATAFORMA[item.video.plataforma]?.cor ?? "bg-zinc-700"}`}
              >
                {PLATAFORMA[item.video.plataforma]?.rotulo ?? item.video.plataforma}
              </span>
            )}
          </div>

          {item.tipo === "video" ? (
            <>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {item.video.canal} · {item.video.nicho}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums text-zinc-500">
                <span className="flex items-center gap-1">
                  <Eye size={11} />
                  {compacto(item.video.visualizacoes)}
                </span>
                <span className="flex items-center gap-1">
                  <Heart size={11} />
                  {compacto(item.video.curtidas)}
                </span>
                <span className="text-zinc-600">salvo {quando(item.salvo_em)}</span>
              </div>
            </>
          ) : (
            <p className="mt-0.5 text-xs text-zinc-500">
              {item.nicho} · {item.qtd_roteiros}{" "}
              {item.qtd_roteiros === 1 ? "roteiro" : "roteiros"} · salvo{" "}
              {quando(item.salvo_em)}
            </p>
          )}
        </div>
      </div>

      {/* A nota é o que transforma "salvei isso" em "salvei por causa disso". */}
      {editandoNota ? (
        <div className="mt-3 flex items-start gap-2">
          <textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            autoFocus
            rows={2}
            placeholder="Por que isso importa? O que dá pra aproveitar?"
            className="min-w-0 flex-1 resize-none rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15"
          />
          <button
            type="button"
            onClick={salvarNota}
            aria-label="Salvar nota"
            className="rounded-lg border border-emerald-800 p-1.5 text-emerald-400 transition hover:bg-emerald-950/40"
          >
            <Check size={14} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => {
              setRascunho(item.nota ?? "");
              setEditandoNota(false);
            }}
            aria-label="Cancelar"
            className="rounded-lg border border-zinc-800 p-1.5 text-zinc-500 transition hover:text-zinc-300"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        item.nota && (
          <button
            type="button"
            onClick={() => setEditandoNota(true)}
            className="mt-3 block w-full rounded-lg border-l-2 border-orange-800 bg-orange-950/15 py-2 pr-3 pl-3 text-left text-xs leading-relaxed text-zinc-300 transition hover:bg-orange-950/25"
          >
            {item.nota}
          </button>
        )
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-zinc-800 pt-3">
        {mostrarColecao && (
          <label className="flex items-center gap-1 text-[11px] text-zinc-600">
            <FolderSimplePlus size={13} />
            <select
              value={item.colecao_id ?? ""}
              onChange={(e) =>
                onAtualizar(item.id, { colecao_id: e.target.value || null })
              }
              aria-label="Mover para uma coleção"
              className="rounded-md border border-zinc-800 bg-zinc-950/60 px-1.5 py-1 text-[11px] text-zinc-300 outline-none transition focus:border-orange-600"
            >
              <option value="">Sem coleção</option>
              {colecoes.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.emoji} {i.nome}
                </option>
              ))}
            </select>
          </label>
        )}

        {!item.nota && !editandoNota && (
          <button
            type="button"
            onClick={() => setEditandoNota(true)}
            className="flex items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300"
          >
            <NotePencil size={12} />
            Anotar
          </button>
        )}

        {item.tipo === "video" ? (
          <>
            <Link
              href={`/analisador?nicho=${encodeURIComponent(item.video.nicho)}`}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-500 transition hover:border-orange-900/70 hover:text-orange-400"
            >
              <MagnifyingGlass size={12} weight="bold" />
              Já gravei assim
            </Link>
            {item.video.link && (
              <a
                href={item.video.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Abrir vídeo original"
                className="rounded-lg border border-zinc-800 p-1 text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-200"
              >
                <ArrowSquareOut size={12} />
              </a>
            )}
          </>
        ) : (
          <Link
            href={`/analisador?analise=${encodeURIComponent(item.id)}`}
            className="flex items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-500 transition hover:border-orange-900/70 hover:text-orange-400"
          >
            <FileText size={12} />
            Abrir análise
          </Link>
        )}

        <button
          type="button"
          onClick={() => onRemover(item.id)}
          aria-label="Remover da biblioteca"
          className="ml-auto rounded-lg p-1.5 text-zinc-700 opacity-0 transition group-hover:opacity-100 hover:bg-rose-950/40 hover:text-rose-400 focus-visible:opacity-100"
        >
          <Trash size={13} />
        </button>
      </div>
    </article>
  );
}
