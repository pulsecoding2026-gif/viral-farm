import type { Metadata } from "next";
import { clienteSupabase } from "@/lib/supabase/servidor";
import { listarPlanejamentos } from "@/lib/planejar/db";
import { GeradorHooks } from "./gerador-hooks";

export const metadata: Metadata = { title: "Hooks" };

/**
 * O gerador de Hooks abre já com o histórico na mão.
 *
 * Buscar no servidor evita a lista piscando vazia na primeira pintura — mesma
 * decisão do Editor Viral. Se o banco falhar, a página abre sem histórico em
 * vez de quebrar: gerar hooks novos continua funcionando.
 */
export default async function HooksPage() {
  const supabase = await clienteSupabase();
  const historico = await listarPlanejamentos(supabase, "hooks").catch(
    () => [],
  );

  return <GeradorHooks historicoInicial={historico} />;
}
