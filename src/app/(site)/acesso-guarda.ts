import { redirect } from "next/navigation";
import { clienteSupabase } from "@/lib/supabase/servidor";

/**
 * Quem já está logado não tem o que fazer em /entrar ou /cadastro.
 *
 * Sem isto, chegar nessas telas com sessão válida mostrava o formulário de
 * login — que lê exatamente como "fui deslogado", mesmo com a sessão de pé.
 *
 * Falha de rede aqui é ignorada de propósito: no máximo a pessoa vê o
 * formulário à toa. Barrar seria pior — travaria o login de quem realmente
 * precisa entrar.
 */
export async function mandarLogadoProPainel() {
  const supabase = await clienteSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/painel");
}
