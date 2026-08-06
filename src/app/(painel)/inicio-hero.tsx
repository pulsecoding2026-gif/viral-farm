"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlass,
  YoutubeLogo,
  TiktokLogo,
  InstagramLogo,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

/**
 * Input em destaque do Dashboard. Não analisa aqui: leva o link colado até o
 * Analisador (que é onde a análise roda de verdade), já preenchido.
 *
 * O seletor de plataforma é só um guia de expectativa — quem decide a origem
 * é a própria URL, validada no servidor contra a allowlist de hosts em
 * src/lib/analise/extrair.ts. As três opções abaixo estão nessa lista, então
 * nenhuma delas promete algo que o backend recusaria.
 */

type Plataforma = {
  id: string;
  rotulo: string;
  icone: Icon;
  exemplo: string;
  cor: string;
};

const PLATAFORMAS: Plataforma[] = [
  {
    id: "youtube",
    rotulo: "YouTube",
    icone: YoutubeLogo,
    exemplo: "https://www.youtube.com/shorts/...",
    cor: "text-red-500",
  },
  {
    id: "tiktok",
    rotulo: "TikTok",
    icone: TiktokLogo,
    exemplo: "https://www.tiktok.com/@voce/video/...",
    cor: "text-zinc-200",
  },
  {
    id: "reels",
    rotulo: "Reels",
    icone: InstagramLogo,
    exemplo: "https://www.instagram.com/reel/...",
    cor: "text-pink-400",
  },
];

export function InicioHero() {
  const [link, setLink] = useState("");
  const [plataforma, setPlataforma] = useState(PLATAFORMAS[0]);
  const router = useRouter();

  function ir(e: React.FormEvent) {
    e.preventDefault();
    const destino = link.trim()
      ? `/analisador?link=${encodeURIComponent(link.trim())}`
      : "/analisador";
    router.push(destino);
  }

  return (
    <div className="rounded-3xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-white sm:text-xl">
        Cole o link do seu material bruto
      </h2>
      <p className="mt-1 max-w-[52ch] text-sm text-white/85">
        A gravação crua, sem edição. A IA lê o que aparece e devolve três
        roteiros a partir dela.
      </p>

      <div
        role="radiogroup"
        aria-label="Plataforma de origem"
        className="mt-4 flex gap-1.5"
      >
        {PLATAFORMAS.map((p) => {
          const ativa = p.id === plataforma.id;
          const Icone = p.icone;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={ativa}
              onClick={() => setPlataforma(p)}
              className={
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition " +
                (ativa
                  ? "bg-zinc-900/85 text-white shadow-sm"
                  : "bg-black/15 text-white/80 hover:bg-black/25")
              }
            >
              <Icone
                size={15}
                weight={ativa ? "fill" : "regular"}
                className={ativa ? p.cor : undefined}
              />
              {p.rotulo}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={ir}
        className="mt-3 flex flex-col gap-2.5 rounded-2xl bg-zinc-900/85 p-2.5 backdrop-blur sm:flex-row sm:items-center"
      >
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder={plataforma.exemplo}
          aria-label={`Link do material bruto no ${plataforma.rotulo}`}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none"
        />
        <button
          type="submit"
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-orange-500 active:scale-[0.98]"
        >
          <MagnifyingGlass size={17} weight="bold" />
          Analisar material
        </button>
      </form>
    </div>
  );
}
