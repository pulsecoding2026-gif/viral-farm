import type { Metadata } from "next";
import { GridTrends } from "./grid-trends";
import { radarDeTendencias } from "@/lib/biblioteca/radar";
import { VIDEOS_EXEMPLO } from "@/lib/biblioteca/videos-exemplo";
import { listarSalvos } from "@/lib/salvos";

export const metadata: Metadata = { title: "Radar Viral" };

// Duas razões: lê quais vídeos já estão salvos (estado mutável) e depende do
// cache de 12h do radar. Estático, congelaria os dois no momento do build.
export const dynamic = "force-dynamic";

export default async function RadarViralPage() {
  let videos = VIDEOS_EXEMPLO;
  let aviso =
    "Prévia com dados de exemplo. Configure YOUTUBE_API_KEY em .env.local pra ver tendências reais de GTA.";

  try {
    const radar = await radarDeTendencias();
    videos = radar.videos;
    aviso =
      radar.fonte === "cache"
        ? "Dados reais do YouTube sobre GTA (cache de até 12h, pra não estourar a cota da API)."
        : "Dados reais do YouTube sobre GTA, atualizados agora.";
  } catch (err) {
    console.error(
      "[radar-viral] radar indisponível, caindo pros dados de exemplo:",
      err,
    );
  }

  const usandoExemplo = videos === VIDEOS_EXEMPLO;
  // Lido no servidor pra o marcador de salvo já vir pintado no primeiro paint.
  const idsSalvos = listarSalvos()
    .filter((i) => i.tipo === "video")
    .map((i) => i.id);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
          Radar Viral
        </h1>
        <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-zinc-400">
          O corte de GTA que está performando agora — RP, GTA Online e
          momentos engraçados de GTA V. Entenda o formato que está funcionando
          antes de cortar o seu, e salve o que servir de referência.
        </p>
        <p
          className={
            "mt-3 inline-flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed " +
            (usandoExemplo
              ? "border-amber-900/50 bg-amber-950/20 text-amber-200/80"
              : "border-zinc-800 bg-zinc-900/30 text-zinc-400")
          }
        >
          {aviso}
        </p>
      </header>

      <GridTrends videosIniciais={videos} idsSalvos={idsSalvos} />
    </div>
  );
}
