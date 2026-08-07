import {
  MagnifyingGlass,
  Lightning,
  Check,
  CircleNotch,
  BookmarkSimple,
  Eye,
  Heart,
  TrendUp,
  Users,
  FilmSlate,
} from "@phosphor-icons/react/dist/ssr";

/**
 * Maquetes das telas do produto, em HTML.
 *
 * Recriação fiel da interface real — mesmos componentes, mesma hierarquia,
 * mesmas cores — e não captura de tela. Três razões: fica nítida em qualquer
 * resolução, acompanha mudança de tema sem reexportar imagem, e nunca
 * envelhece silenciosamente como um PNG guardado em /public.
 *
 * Os textos são genéricos de propósito: nada aqui deve passar por resultado
 * real de um usuário.
 */

function Barra({ w = "100%", cor = "bg-zinc-800" }: { w?: string; cor?: string }) {
  return <span className={`block h-1.5 rounded-full ${cor}`} style={{ width: w }} />;
}

export function Moldura({
  titulo,
  children,
  className = "",
}: {
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "overflow-hidden rounded-2xl border border-zinc-800 bg-[#0b0b0e] " +
        className
      }
    >
      <div className="flex items-center gap-1.5 border-b border-zinc-800 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-zinc-700" />
        <span className="h-2 w-2 rounded-full bg-zinc-700" />
        <span className="h-2 w-2 rounded-full bg-zinc-700" />
        <span className="ml-2 truncate text-[10px] text-zinc-600">{titulo}</span>
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------- analisador */

export function MaqueteAnalisador({ titulo = "Analisador" }: { titulo?: string } = {}) {
  return (
    <Moldura titulo={titulo}>
      <div className="p-3">
        <div className="rounded-lg border border-zinc-800 bg-gradient-to-br from-orange-600/12 to-transparent p-2.5">
          <p className="text-[9px] font-medium text-zinc-400">
            Link do vídeo
          </p>
          <div className="mt-1.5 flex gap-1.5">
            <div className="flex min-w-0 flex-1 items-center rounded-md border border-zinc-700 bg-zinc-950/60 px-2 py-1.5">
              <span className="truncate text-[9px] text-zinc-600">
                youtube.com/shorts/…
              </span>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-md bg-orange-600 px-2 py-1.5 text-[9px] font-semibold text-white">
              <MagnifyingGlass size={9} weight="bold" />
              Analisar
            </span>
          </div>
        </div>

        <div className="mt-2.5 space-y-1.5">
          {[
            ["Extraindo frames", true],
            ["Transcrevendo o áudio", true],
            ["Analisando com a IA", false],
          ].map(([r, feito]) => (
            <div key={String(r)} className="flex items-center gap-2">
              <span
                className={
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-full " +
                  (feito ? "bg-emerald-600/15 text-emerald-400" : "bg-orange-600 text-white")
                }
              >
                {feito ? (
                  <Check size={8} weight="bold" />
                ) : (
                  <CircleNotch size={8} weight="bold" className="animate-spin" />
                )}
              </span>
              <span
                className={
                  "text-[9px] " + (feito ? "text-zinc-600" : "font-medium text-zinc-300")
                }
              >
                {r}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Moldura>
  );
}

/* ----------------------------------------------------------- 3 roteiros */

export function MaqueteRoteiros({ titulo = "Resultado" }: { titulo?: string } = {}) {
  return (
    <Moldura titulo={titulo}>
      <div className="space-y-2 p-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/40"
          >
            <div className="flex items-center gap-1.5 border-b border-zinc-800 px-2.5 py-1.5">
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded bg-orange-600 text-[8px] font-bold text-white">
                {n}
              </span>
              <Barra w="60%" />
              <span className="ml-auto text-[8px] text-zinc-700">~40s</span>
            </div>
            {n === 1 && (
              <div className="space-y-1.5 p-2.5">
                <div className="rounded border-l-2 border-orange-600 bg-orange-600/8 py-1.5 pl-2">
                  <p className="flex items-center gap-1 text-[7px] font-bold tracking-wider text-orange-400 uppercase">
                    <Lightning size={7} weight="fill" />
                    Gancho
                  </p>
                  <span className="mt-1 block">
                    <Barra w="85%" cor="bg-zinc-700" />
                  </span>
                </div>
                {["0-3s", "3-12s"].map((t) => (
                  <div key={t} className="flex items-center gap-1.5">
                    <span className="rounded bg-zinc-800 px-1 font-mono text-[7px] text-zinc-500">
                      {t}
                    </span>
                    <Barra w="100%" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Moldura>
  );
}

/* ----------------------------------------------------------- radar viral */

export function MaqueteRadar({ titulo = "Radar Viral" }: { titulo?: string } = {}) {
  return (
    <Moldura titulo={titulo}>
      <div className="p-3">
        <div className="flex gap-1">
          {["Geral", "TikTok", "Reels", "YouTube"].map((p, i) => (
            <span
              key={p}
              className={
                "rounded px-1.5 py-1 text-[8px] font-medium " +
                (i === 0 ? "bg-zinc-800 text-zinc-100" : "text-zinc-600")
              }
            >
              {p}
            </span>
          ))}
        </div>

        <div className="mt-2 flex gap-1">
          {["Todas", "Curiosidades", "Fitness"].map((n, i) => (
            <span
              key={n}
              className={
                "rounded-full px-1.5 py-0.5 text-[8px] " +
                (i === 0 ? "bg-orange-600 text-white" : "bg-white/5 text-zinc-500")
              }
            >
              {n}
            </span>
          ))}
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          {[
            ["10.8%", true],
            ["7.4%", false],
            ["11.1%", true],
          ].map(([eng, salvo], i) => (
            <div
              key={i}
              className="overflow-hidden rounded border border-zinc-800 bg-zinc-900/40"
            >
              <div className="relative aspect-[3/4] bg-gradient-to-br from-zinc-800 to-zinc-950">
                <span className="absolute top-1 left-1 rounded bg-red-600 px-1 text-[6px] font-bold text-white">
                  YT
                </span>
                <span
                  className={
                    "absolute top-1 right-1 rounded p-0.5 " +
                    (salvo ? "bg-orange-600 text-white" : "bg-black/60 text-zinc-400")
                  }
                >
                  <BookmarkSimple size={6} weight={salvo ? "fill" : "bold"} />
                </span>
                <span className="absolute bottom-1 left-1 text-[7px] font-bold text-emerald-400">
                  {eng}
                </span>
              </div>
              <div className="space-y-1 p-1.5">
                <Barra w="100%" />
                <Barra w="60%" />
                <div className="flex gap-1.5 pt-0.5 text-[6px] text-zinc-600">
                  <span className="flex items-center gap-0.5">
                    <Eye size={6} />
                    9,1M
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Heart size={6} />
                    980mil
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Moldura>
  );
}

/* --------------------------------------------------------------- trends */

export function MaqueteTrends({ titulo = "Trends" }: { titulo?: string } = {}) {
  return (
    <Moldura titulo={titulo}>
      <div className="p-3">
        <div className="flex gap-1">
          {["Hoje", "Ontem", "7 dias", "30 dias"].map((p, i) => (
            <span
              key={p}
              className={
                "rounded px-1.5 py-1 text-[8px] font-medium " +
                (i === 0 ? "bg-zinc-800 text-zinc-100" : "text-zinc-600")
              }
            >
              {p}
            </span>
          ))}
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          {[
            ["Google", "from-blue-500 to-sky-600"],
            ["YouTube", "from-red-500 to-rose-600"],
          ].map(([nome, cor]) => (
            <div
              key={nome}
              className="rounded border border-zinc-800 bg-zinc-900/40 p-2"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-4 w-4 rounded bg-gradient-to-br ${cor}`}
                />
                <span className="text-[9px] font-semibold text-zinc-200">
                  {nome}
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {[
                  ["+156%", "88%"],
                  ["+84%", "62%"],
                  ["+41%", "44%"],
                ].map(([v, w], i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="text-[7px] tabular-nums text-zinc-700">
                      {i + 1}
                    </span>
                    <Barra w={w} />
                    <span className="flex shrink-0 items-center gap-0.5 rounded bg-emerald-950/60 px-1 text-[6px] font-bold text-emerald-400">
                      <TrendUp size={5} weight="bold" />
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Moldura>
  );
}

/* ---------------------------------------------------------------- lives */

export function MaqueteLives({ titulo = "Lives" }: { titulo?: string } = {}) {
  return (
    <Moldura titulo={titulo}>
      <div className="grid grid-cols-2 gap-1.5 p-3">
        {[
          ["184,3mil", "3h32", true],
          ["96,5mil", "1h28", false],
          ["72,2mil", "6h55", false],
          ["54,9mil", "1h04", false],
        ].map(([v, t, top], i) => (
          <div
            key={i}
            className="overflow-hidden rounded border border-zinc-800 bg-zinc-900/40"
          >
            <div className="relative aspect-video bg-gradient-to-br from-zinc-800 to-zinc-950">
              <span className="absolute top-1 left-1 flex items-center gap-0.5 rounded bg-red-600 px-1 text-[6px] font-bold text-white">
                <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
                AO VIVO
              </span>
              {top && (
                <span className="absolute top-1 right-1 rounded bg-orange-600 px-1 text-[6px] font-bold text-white">
                  TOP 1
                </span>
              )}
              <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/70 px-1 text-[6px] font-bold text-white">
                <Users size={5} weight="fill" />
                {v}
              </span>
              <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[6px] text-zinc-300">
                {t}
              </span>
            </div>
            <div className="space-y-1 p-1.5">
              <Barra w="100%" />
              <Barra w="55%" />
            </div>
          </div>
        ))}
      </div>
    </Moldura>
  );
}

/* ----------------------------------------------------------- biblioteca */

export function MaqueteBiblioteca({ titulo = "Biblioteca" }: { titulo?: string } = {}) {
  return (
    <Moldura titulo={titulo}>
      <div className="flex gap-2 p-3">
        <div className="w-[38%] shrink-0 space-y-1">
          {[
            ["Todos os ativos", "12", true],
            ["Referências", "9", false],
            ["Minhas análises", "3", false],
          ].map(([r, n, ativo]) => (
            <div
              key={String(r)}
              className={
                "flex items-center gap-1 rounded px-1.5 py-1 text-[8px] " +
                (ativo ? "bg-orange-600 text-white" : "text-zinc-500")
              }
            >
              <span className="min-w-0 flex-1 truncate">{r}</span>
              <span className="text-[7px] opacity-70">{n}</span>
            </div>
          ))}
          <div className="pt-1.5">
            <p className="px-1.5 text-[6px] font-bold tracking-wider text-zinc-700 uppercase">
              Coleções
            </p>
            {[
              ["🌊", "Fundo do mar", "4"],
              ["🔥", "Virais", "2"],
            ].map(([e, n, q]) => (
              <div
                key={String(n)}
                className="mt-1 flex items-center gap-1 rounded px-1.5 py-1 text-[8px] text-zinc-400"
              >
                <span className="text-[8px]">{e}</span>
                <span className="min-w-0 flex-1 truncate">{n}</span>
                <span className="text-[7px] text-zinc-700">{q}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex gap-1.5 rounded border border-zinc-800 bg-zinc-900/40 p-1.5"
            >
              <span className="h-7 w-6 shrink-0 rounded bg-zinc-800" />
              <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                <Barra w="90%" />
                <Barra w="50%" />
                {i === 0 && (
                  <div className="rounded border-l border-orange-700 bg-orange-950/20 py-0.5 pl-1">
                    <Barra w="70%" cor="bg-zinc-700" />
                  </div>
                )}
              </div>
              <FilmSlate size={8} className="mt-0.5 shrink-0 text-zinc-700" />
            </div>
          ))}
        </div>
      </div>
    </Moldura>
  );
}
