import { DownloadSimple, ArrowSquareUpRight } from "@phosphor-icons/react";
import type { ClipeViral } from "@/lib/viral/tipos";

export function CartaoClipe({ clipe }: { clipe: ClipeViral }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 transition hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700">
      <div className="relative flex aspect-[9/16] items-center justify-center overflow-hidden bg-gradient-to-br from-orange-100 via-zinc-100 to-zinc-200 text-5xl dark:from-orange-950/40 dark:via-zinc-900 dark:to-zinc-950">
        {clipe.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- thumbnail pública externa, sem otimização
          <img
            src={clipe.thumbnail_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          clipe.emoji
        )}
        <span className="absolute right-2 bottom-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {clipe.duracao_s}s
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <p className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {clipe.descricao}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">{clipe.autor}</p>
        <div className="mt-auto flex items-center gap-2 pt-1">
          {clipe.download_url ? (
            <>
              <a
                href={clipe.download_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-3 py-1.5 text-center text-xs font-medium text-white transition hover:bg-orange-500 active:scale-[0.98]"
              >
                <DownloadSimple size={14} weight="bold" />
                Baixar
              </a>
              {clipe.pagina_url && (
                <a
                  href={clipe.pagina_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Ver na Pexels"
                  className="flex shrink-0 items-center justify-center rounded-xl border border-zinc-200 p-2 text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-700 active:scale-[0.98] dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                >
                  <ArrowSquareUpRight size={16} />
                </a>
              )}
            </>
          ) : (
            <span className="flex-1 rounded-xl bg-zinc-100 px-3 py-1.5 text-center text-xs font-medium text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600">
              Exemplo, sem download
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
