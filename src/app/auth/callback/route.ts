import { NextResponse } from "next/server";
import { clienteSupabase } from "@/lib/supabase/servidor";

/**
 * Destino dos links que o Supabase manda de volta: confirmação de e-mail e
 * OAuth (Google). O `code` da URL vira sessão em cookie e a pessoa cai
 * direto no painel.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await clienteSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/painel`);
    }
  }

  // Link vencido ou reusado: manda pro login com o aviso, não pra um erro cru.
  return NextResponse.redirect(`${origin}/entrar?aviso=link-invalido`);
}
