import type { Metadata } from "next";
import { PainelTrends } from "./painel-trends";
import { TERMOS_EXEMPLO } from "@/lib/trends/exemplos";

export const metadata: Metadata = { title: "Trends" };

export default function TrendsPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Trends
        </h1>
        <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-zinc-500">
          O que as pessoas estão procurando e comentando agora. Enquanto o
          Radar Viral mostra qual vídeo está performando, aqui você vê o
          assunto que tem gente atrás — é o parâmetro do que vale explorar.
        </p>
        <p className="mt-3 inline-flex items-start gap-2 rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2 text-xs leading-relaxed text-amber-200/80">
          Dados de exemplo. Os números viram reais ao conectar Google Trends,
          YouTube Data API e a API do X — cada uma exige credencial própria.
        </p>
      </header>

      <PainelTrends termos={TERMOS_EXEMPLO} />
    </div>
  );
}
