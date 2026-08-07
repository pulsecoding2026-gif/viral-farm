"use client";

import { useMemo, useState } from "react";
import {
  WarningCircle,
  MagnifyingGlass,
  YoutubeLogo,
  TiktokLogo,
  InstagramLogo,
  Sparkle,
  SlidersHorizontal,
  ShieldCheck,
  Scissors,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import type { OpcoesAnalise } from "@/lib/analises-db";

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
    exemplo: "https://www.youtube.com/watch?v=...",
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

const ESTILOS: { id: NonNullable<OpcoesAnalise["estilo"]>; rotulo: string; amostra: React.ReactNode }[] = [
  {
    id: "karaoke",
    rotulo: "Karaokê",
    amostra: (
      <span className="font-black tracking-tight uppercase">
        <span className="text-orange-500">Farmar</span>{" "}
        <span className="text-white">viral</span>
      </span>
    ),
  },
  {
    id: "neon",
    rotulo: "Neon",
    amostra: (
      <span className="font-black tracking-tight uppercase">
        <span className="text-emerald-400">Farmar</span>{" "}
        <span className="text-white">viral</span>
      </span>
    ),
  },
  {
    id: "minimal",
    rotulo: "Minimal",
    amostra: (
      <span className="font-black tracking-tight text-white uppercase">
        Farmar viral
      </span>
    ),
  },
  {
    id: "sem",
    rotulo: "Sem legenda",
    amostra: <span className="text-zinc-600">—</span>,
  },
];

/** Id do vídeo do YouTube, pros formatos de URL que aceitamos. */
function idDoYoutube(link: string): string | null {
  const m = link.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|live\/))([\w-]{11})/,
  );
  return m?.[1] ?? null;
}

export function FormularioNovaAnalise({
  onCriada,
  nichoInicial,
  linkInicial,
}: {
  onCriada: (job: { id: string; link: string; nicho: string; opcoes: OpcoesAnalise }) => void;
  nichoInicial?: string;
  linkInicial?: string;
}) {
  const [link, setLink] = useState(linkInicial ?? "");
  const [nicho, setNicho] = useState(nichoInicial || "");
  const [plataforma, setPlataforma] = useState(PLATAFORMAS[0]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // As escolhas do Estúdio.
  const [modo, setModo] = useState<"auto" | "manual">("manual");
  const [qtd, setQtd] = useState(5);
  const [duracao, setDuracao] = useState<"" | "curto" | "medio" | "longo">("");
  const [estilo, setEstilo] = useState<NonNullable<OpcoesAnalise["estilo"]>>("karaoke");
  const [direcao, setDirecao] = useState("");

  // Prévia direto do CDN de thumbnails do YouTube — sem API, sem terceiro.
  const thumb = useMemo(() => {
    const id = idDoYoutube(link);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  }, [link]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    const opcoes: OpcoesAnalise = {
      modo,
      qtd,
      ...(duracao ? { duracao } : {}),
      estilo,
      ...(direcao.trim() ? { direcao: direcao.trim() } : {}),
    };

    try {
      const res = await fetch("/api/analises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link, nicho, opcoes }),
      });

      const dados = await res.json();
      if (!res.ok) {
        setErro(dados.erro ?? "Não consegui iniciar a análise.");
        return;
      }

      onCriada({ id: dados.id, link, nicho, opcoes });
      setLink("");
    } catch {
      setErro("Falha de rede. Confira sua conexão.");
    } finally {
      setEnviando(false);
    }
  }

  const rotuloBotao =
    modo === "manual" ? "Analisar e abrir no Estúdio" : "Gerar cortes";

  return (
    <div className="surgir space-y-5">
      <form onSubmit={enviar}>
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          {/* ------------------------------------------------------- link */}
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
              Link do vídeo
            </label>
            <input
              id="link"
              type="url"
              required
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={plataforma.exemplo}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15"
            />

            {/* Prévia: o vídeo que VAI ser processado, antes de gastar
                qualquer coisa — mesma segurança que o Opus dá. */}
            {thumb && (
              <div className="mt-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumb}
                  alt="Prévia do vídeo"
                  className="h-16 w-28 rounded-lg border border-zinc-800 object-cover"
                />
                <p className="text-xs leading-relaxed text-zinc-500">
                  É este o vídeo? Confere a prévia antes de mandar — evita
                  gastar processamento no link errado.
                </p>
              </div>
            )}
          </div>

          {/* -------------------------------------------------- o estúdio */}
          <div className="space-y-5 px-5 py-5 sm:px-6">
            {/* Modo */}
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-300">
                Como você quer trabalhar
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setModo("manual")}
                  aria-pressed={modo === "manual"}
                  className={
                    "rounded-xl border p-3.5 text-left transition " +
                    (modo === "manual"
                      ? "border-orange-700 bg-orange-950/25"
                      : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700")
                  }
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    <SlidersHorizontal size={15} className="text-orange-500" />
                    Estúdio
                    <span className="rounded-full bg-orange-600/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-orange-400 uppercase">
                      Você no comando
                    </span>
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    A IA propõe os cortes e VOCÊ revisa antes: aprova os que
                    valem, descarta o resto. Só o aprovado renderiza.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setModo("auto")}
                  aria-pressed={modo === "auto"}
                  className={
                    "rounded-xl border p-3.5 text-left transition " +
                    (modo === "auto"
                      ? "border-orange-700 bg-orange-950/25"
                      : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700")
                  }
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    <Sparkle size={15} className="text-orange-500" />
                    Automático
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    A IA decide e entrega tudo renderizado. Ótimo pra podcast
                    e vídeo de fala corrida.
                  </p>
                </button>
              </div>
            </div>

            {/* Quantidade + duração */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="qtd"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Até quantos cortes
                </label>
                <select
                  id="qtd"
                  value={qtd}
                  onChange={(e) => setQtd(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-orange-600"
                >
                  {[3, 5, 8, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} cortes
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="duracao"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Duração de cada corte
                </label>
                <select
                  id="duracao"
                  value={duracao}
                  onChange={(e) =>
                    setDuracao(e.target.value as typeof duracao)
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-orange-600"
                >
                  <option value="">Auto (20–90s)</option>
                  <option value="curto">Curto (20–40s)</option>
                  <option value="medio">Médio (40–60s)</option>
                  <option value="longo">Longo (60–90s)</option>
                </select>
              </div>
            </div>

            {/* Estilo de legenda */}
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-300">Legenda</p>
              <div
                role="radiogroup"
                aria-label="Estilo de legenda"
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                {ESTILOS.map((e) => {
                  const ativo = e.id === estilo;
                  return (
                    <button
                      key={e.id}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      onClick={() => setEstilo(e.id)}
                      className={
                        "rounded-xl border px-3 py-3 text-center transition " +
                        (ativo
                          ? "border-orange-700 bg-orange-950/25"
                          : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700")
                      }
                    >
                      <p className="text-[13px]">{e.amostra}</p>
                      <p className="mt-1.5 text-[11px] text-zinc-500">
                        {e.rotulo}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direção pra IA */}
            <div>
              <label
                htmlFor="direcao"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Incluir momentos específicos{" "}
                <span className="font-normal text-zinc-600">— opcional</span>
              </label>
              <textarea
                id="direcao"
                value={direcao}
                onChange={(e) => setDirecao(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Ex.: encontre os momentos em que falamos sobre dinheiro"
                className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15"
              />
            </div>

            {/* Nicho */}
            <div>
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
            </div>
          </div>

          {/* ------------------------------------------------------ envio */}
          <div className="border-t border-zinc-800 px-5 py-4 sm:px-6">
            <button
              type="submit"
              disabled={enviando}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_2px_16px_rgb(255_62_2/0.35)] transition hover:bg-orange-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:w-auto"
            >
              {enviando ? (
                "Iniciando…"
              ) : (
                <>
                  {modo === "manual" ? (
                    <Scissors size={17} weight="bold" />
                  ) : (
                    <MagnifyingGlass size={17} weight="bold" />
                  )}
                  {rotuloBotao}
                </>
              )}
            </button>
            <p className="mt-3 text-xs leading-relaxed text-zinc-600">
              Usar vídeos que não são seus pode violar leis de direitos
              autorais. Ao continuar, você confirma que tem autorização sobre
              este conteúdo.
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

      <p className="flex items-center gap-2 text-xs text-zinc-600">
        <ShieldCheck size={15} className="shrink-0 text-emerald-600" />
        No modo Estúdio o vídeo fonte fica guardado por até 24h pra você
        revisar; depois é apagado. Fica só a análise, nunca o arquivo.
      </p>
    </div>
  );
}
