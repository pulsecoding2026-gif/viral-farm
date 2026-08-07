"use client";

import { useState } from "react";
import {
  WarningCircle,
  MagnifyingGlass,
  YoutubeLogo,
  TiktokLogo,
  InstagramLogo,
  FilmSlate,
  Waveform,
  Sparkle,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

const NICHOS = [
  "curiosidades",
  "mar e vida marinha",
  "natureza",
  "automotivo",
  "culinária",
  "fitness",
  "finanças pessoais",
];

/**
 * As plataformas espelham a allowlist de hosts do servidor
 * (src/lib/analise/extrair.ts) — nenhuma opção aqui promete origem que o
 * backend recusaria. A escolha só troca o exemplo do campo: quem manda de
 * verdade é a URL colada.
 */
const PLATAFORMAS: { id: string; rotulo: string; icone: Icon; exemplo: string; cor: string }[] = [
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

const ETAPAS_DO_FLUXO: { icone: Icon; texto: string }[] = [
  { icone: Waveform, texto: "Transcreve o áudio palavra por palavra" },
  { icone: Sparkle, texto: "A IA escolhe os trechos com mais chance de segurar atenção" },
  { icone: FilmSlate, texto: "Renderiza cortes 9:16 com legenda animada, prontos pra postar" },
];

export function FormularioNovaAnalise({
  onCriada,
  nichoInicial,
  linkInicial,
}: {
  onCriada: (job: { id: string; link: string; nicho: string }) => void;
  nichoInicial?: string;
  linkInicial?: string;
}) {
  const [link, setLink] = useState(linkInicial ?? "");
  const [nicho, setNicho] = useState(nichoInicial || "");
  const [plataforma, setPlataforma] = useState(PLATAFORMAS[0]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      const res = await fetch("/api/analises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link, nicho }),
      });

      const dados = await res.json();
      if (!res.ok) {
        setErro(dados.erro ?? "Não consegui iniciar a análise.");
        return;
      }

      onCriada({ id: dados.id, link, nicho });
      setLink("");
    } catch {
      setErro("Falha de rede. Confira sua conexão.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="surgir space-y-5">
      <form onSubmit={enviar}>
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <div className="border-b border-zinc-800 bg-gradient-to-br from-orange-600/12 via-transparent to-transparent px-5 py-5 sm:px-6">
            <div
              role="radiogroup"
              aria-label="Plataforma de origem"
              className="mb-4 flex gap-1.5"
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
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300")
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

            <label
              htmlFor="link"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Link do material bruto
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <input
                id="link"
                type="url"
                required
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder={plataforma.exemplo}
                className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15"
              />
              <button
                type="submit"
                disabled={enviando}
                className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_2px_16px_rgb(255_62_2/0.35)] transition hover:bg-orange-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {enviando ? (
                  "Iniciando…"
                ) : (
                  <>
                    <MagnifyingGlass size={17} weight="bold" />
                    Analisar
                  </>
                )}
              </button>
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-zinc-500">
              A gravação que você fez, sem edição — mesmo sem views, mesmo que
              ninguém tenha visto. Suba como <b className="font-medium text-zinc-400">não listado</b> e
              cole o link. Até 3 minutos.
            </p>
          </div>

          <div className="px-5 py-4 sm:px-6">
            <label
              htmlFor="nicho"
              className="mb-2 block text-sm font-medium text-zinc-300"
            >
              Nicho{" "}
              <span className="font-normal text-zinc-600">— opcional</span>
            </label>
            <input
              id="nicho"
              list="nichos"
              value={nicho}
              onChange={(e) => setNicho(e.target.value)}
              placeholder="Deixe em branco e a IA identifica pelo material"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15"
            />
            <datalist id="nichos">
              {NICHOS.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <p className="mt-2 text-xs text-zinc-600">
              É só uma dica. A IA confirma ou corrige a partir do que realmente
              aparece no vídeo.
            </p>
          </div>
        </div>

        {erro && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-300">
            <WarningCircle
              size={18}
              weight="fill"
              className="mt-0.5 shrink-0 text-rose-500"
            />
            <p>{erro}</p>
          </div>
        )}
      </form>

      <div className="grid gap-2.5 sm:grid-cols-3">
        {ETAPAS_DO_FLUXO.map(({ icone: Icone, texto }, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 rounded-xl border border-zinc-800/70 bg-zinc-900/20 px-3.5 py-3"
          >
            <Icone size={17} className="mt-0.5 shrink-0 text-orange-500" />
            <p className="text-xs leading-relaxed text-zinc-500">{texto}</p>
          </div>
        ))}
      </div>

      <p className="flex items-center gap-2 text-xs text-zinc-600">
        <ShieldCheck size={15} className="shrink-0 text-emerald-600" />
        O vídeo é processado e apagado. Fica só a análise, nunca o arquivo.
      </p>
    </div>
  );
}
