import type { Metadata } from "next";
import { clienteSupabase } from "@/lib/supabase/servidor";
import { listarPlanejamentos } from "@/lib/planejar/db";
import { GeradorRoteiro } from "./gerador-roteiro";

export const metadata: Metadata = { title: "Roteiros" };

/**
 * Roteiros abre com o histórico já na primeira pintura — mesma razão do
 * Editor: buscar no cliente deixaria a lista piscando vazia, e roteiro
 * antigo é justamente o que a pessoa volta pra consultar antes de gravar.
 */
export default async function RoteirosPage({
  searchParams,
}: {
  searchParams: Promise<{ tema?: string }>;
}) {
  const supabase = await clienteSupabase();
  const historico = await listarPlanejamentos(supabase, "roteiro").catch(
    () => [],
  );
  // ?tema= vem do Trends: o termo em alta chega com o campo já preenchido.
  const { tema } = await searchParams;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Roteiros
        </h1>
        <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-zinc-500">
          Descreva o tema e receba o roteiro completo pronto pra gravar: gancho,
          blocos com tempo, o que falar e o que mostrar na tela em cada trecho.
        </p>
      </header>

      <GeradorRoteiro historicoInicial={historico} temaInicial={tema ?? ""} />
    </div>
  );
}
