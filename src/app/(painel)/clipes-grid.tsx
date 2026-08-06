"use client";

import { useMemo, useState } from "react";
import { NICHOS_BIBLIOTECA } from "@/lib/biblioteca/videos-exemplo";
import type { ClipeViral } from "@/lib/viral/tipos";
import { CartaoClipe } from "./cartao-clipe";

export function ClipesGrid({ clipesIniciais }: { clipesIniciais: ClipeViral[] }) {
  const [nicho, setNicho] = useState<string | null>(null);

  const clipes = useMemo(
    () => (nicho ? clipesIniciais.filter((c) => c.nicho === nicho) : clipesIniciais),
    [nicho, clipesIniciais],
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setNicho(null)}
          className={
            "rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-[0.97] " +
            (nicho === null
              ? "bg-orange-600 text-white"
              : "bg-zinc-900/5 text-zinc-600 hover:bg-zinc-900/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10")
          }
        >
          Todos
        </button>
        {NICHOS_BIBLIOTECA.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNicho(n)}
            className={
              "rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition active:scale-[0.97] " +
              (nicho === n
                ? "bg-orange-600 text-white"
                : "bg-zinc-900/5 text-zinc-600 hover:bg-zinc-900/10 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10")
            }
          >
            {n}
          </button>
        ))}
      </div>

      {clipes.length === 0 ? (
        <p className="text-sm text-zinc-500">Nada encontrado nesse nicho ainda.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {clipes.map((clipe) => (
            <CartaoClipe key={clipe.id} clipe={clipe} />
          ))}
        </div>
      )}
    </div>
  );
}
