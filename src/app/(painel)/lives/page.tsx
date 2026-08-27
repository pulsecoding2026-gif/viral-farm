import type { Metadata } from "next";
import { PainelLives } from "./painel-lives";
import { radarDeLives } from "@/lib/lives/radar-lives";
import { filtrarFranquiaGta } from "@/lib/lives/filtro-jogo";

export const metadata: Metadata = { title: "Lives" };

// Live muda de minuto a minuto: nada de cache de rota. O cache curto que
// existe é o de 90s dentro de radarDeLives, para poupar a API.
export const dynamic = "force-dynamic";

const AVISO: Record<string, string> = {
  exemplo:
    "Dados de exemplo. Configure TWITCH_CLIENT_ID/SECRET e KICK_CLIENT_ID/SECRET em .env.local pra ver lives reais.",
  api: "Lives reais de GTA, buscadas agora.",
  cache: "Lives reais de GTA (cache de 90s, pra não bater na API a cada refresh).",
};

export default async function LivesPage() {
  // radarDeLives() não muda: continua trazendo TODAS as lives, de qualquer
  // jogo — é o mesmo dado que já funcionava. O corte pra franquia GTA
  // acontece aqui, na página, como um filtro puro em cima do resultado (ver
  // src/lib/lives/filtro-jogo.ts). Assim a lógica de busca/cache/token do
  // radar continua intocada.
  const { lives: todas, fonte, plataformasReais } = await radarDeLives();
  const lives = filtrarFranquiaGta(todas);
  const usandoExemplo = fonte === "exemplo";

  // As duas APIs responderam (ou o cache tinha dado real), só que nenhuma
  // live de GTA está no ar neste minuto. Isso é diferente de "sem
  // credencial" — merece um aviso próprio em vez de cair no genérico.
  const semGtaAgora = !usandoExemplo && todas.length > 0 && lives.length === 0;

  const faltando = (["twitch", "kick"] as const).filter(
    (p) => !plataformasReais.includes(p),
  );

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
          Lives
        </h1>
        <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-zinc-400">
          As transmissões de GTA com mais gente assistindo agora na Twitch e
          na Kick — GTA V, GTA Online e servidores de RP. A live de hoje é o
          clipe de amanhã: onde há audiência ao vivo, há material bruto sendo
          gerado em tempo real.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="placa inline-flex items-center gap-1.5 rounded-full bg-orange-600/15 px-3 py-1 text-[11px] font-semibold text-orange-400">
            GTA V &amp; RP
          </span>
          <span
            title="GTA VI lança em 19/11/2026 — até lá não existe gameplay do jogo pra cortar. Este filtro liga sozinho no dia em que existir o que ver."
            className="placa inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-dashed border-zinc-700 px-3 py-1 text-[11px] font-semibold text-zinc-500"
          >
            GTA VI · em breve
          </span>
        </div>

        <p
          className={
            "mt-3 inline-flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed " +
            (usandoExemplo
              ? "border-amber-900/50 bg-amber-950/20 text-amber-200/80"
              : "border-zinc-800 bg-zinc-900/30 text-zinc-400")
          }
        >
          {AVISO[fonte]}
          {!usandoExemplo && faltando.length > 0 && (
            <span className="text-amber-300/80">
              {" "}
              Falta credencial de {faltando.join(" e ")} — essa plataforma não
              entra na lista.
            </span>
          )}
        </p>

        {semGtaAgora && (
          <p className="mt-2 inline-flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-xs leading-relaxed text-zinc-400">
            Nenhuma live de GTA ao vivo neste minuto, entre{" "}
            <span className="numero-placa">{todas.length}</span> monitoradas
            na Twitch e na Kick. Isso muda a cada 90 segundos — atualize a
            página daqui a pouco.
          </p>
        )}
      </header>

      <PainelLives lives={lives} plataformasReais={plataformasReais} />
    </div>
  );
}
