import type { Metadata } from "next";
import { clienteSupabase } from "@/lib/supabase/servidor";
import { listarPlanejamentos } from "@/lib/planejar/db";
import { ChatAgente } from "./chat-agente";

export const metadata: Metadata = { title: "Agent Viral" };

/**
 * O chat abre já com o histórico de conversas na lateral.
 *
 * As conversas vêm do servidor na primeira pintura — buscar no cliente
 * deixaria a coluna piscando vazia, e ela é o que diz "você já esteve aqui".
 * Se o banco falhar, a lista nasce vazia e o chat segue funcionando: conversar
 * não depende de conseguir ler o passado.
 */
export default async function AgentViralPage() {
  const supabase = await clienteSupabase();
  const conversas = await listarPlanejamentos(supabase, "agente").catch(
    () => [],
  );

  return <ChatAgente conversasIniciais={conversas} />;
}
