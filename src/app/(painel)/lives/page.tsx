import type { Metadata } from "next";
import { PainelLives } from "./painel-lives";
import { radarDeLives } from "@/lib/lives/radar-lives";

export const metadata: Metadata = { title: "Lives" };

// Live muda de minuto a minuto: nada de cache de rota. O cache curto que
// existe é o de 90s dentro de radarDeLives, para poupar a API.
export const dynamic = "force-dynamic";

const AVISO: Record<string, string> = {
  exemplo:
    "Dados de exemplo. Configure TWITCH_CLIENT_ID/SECRET e KICK_CLIENT_ID/SECRET em .env.local pra ver lives reais.",
  api: "Lives reais, buscadas agora.",
  cache: "Lives reais (cache de 90s, pra não bater na API a cada refresh).",
};

export default async function LivesPage() {
  const { lives, fonte, plataformasReais } = await radarDeLives();
  const usandoExemplo = fonte === "exemplo";

  const faltando = (["twitch", "kick"] as const).filter(
    (p) => !plataformasReais.includes(p),
  );

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Lives
        </h1>
        <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-zinc-500">
          As transmissões com mais gente assistindo agora na Twitch e na Kick.
          A live de hoje é o clipe de amanhã — onde há audiência ao vivo, há
          material bruto sendo gerado em tempo real.
        </p>
        <p
          className={
            "mt-3 inline-flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed " +
            (usandoExemplo
              ? "border-amber-900/50 bg-amber-950/20 text-amber-200/80"
              : "border-zinc-800 bg-zinc-900/30 text-zinc-500")
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
      </header>

      <PainelLives lives={lives} plataformasReais={plataformasReais} />
    </div>
  );
}
