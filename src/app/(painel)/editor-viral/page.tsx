import type { Metadata } from "next";
import { clienteSupabase } from "@/lib/supabase/servidor";
import { listarCortesProntos } from "@/lib/analises-db";
import { EditorViral } from "./editor-viral";

export const metadata: Metadata = { title: "Editor Viral IA" };

/**
 * O Editor abre em cima do que o Analisador já entregou.
 *
 * Os cortes vêm do servidor na primeira pintura — buscar no cliente deixaria
 * a estante piscando vazia, e ela é a primeira coisa que a pessoa procura.
 */
export default async function EditorViralPage() {
  const supabase = await clienteSupabase();
  const cortes = await listarCortesProntos(supabase).catch(() => []);

  return <EditorViral cortesIniciais={cortes} />;
}
