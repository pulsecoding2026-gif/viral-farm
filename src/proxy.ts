import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Renovação de sessão (Next 16: o antigo middleware agora se chama proxy).
 *
 * Server Component lê cookie mas não escreve — quando o access token vence,
 * alguém precisa gravar o token renovado de volta. É só isso que este proxy
 * faz: `getUser()` renova se preciso e o `setAll` grava na resposta.
 *
 * A DECISÃO de acesso não fica aqui — fica no layout do (painel), um ponto
 * só protegendo todas as rotas do app. A doc do Next é explícita em não usar
 * proxy como solução de autorização.
 */
export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Sem env (ex.: preview sem Supabase), segue sem sessão em vez de derrubar
  // o site inteiro — o layout do painel é quem barra.
  if (!url || !chave) return resposta;

  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(lista) {
        for (const { name, value } of lista) {
          request.cookies.set(name, value);
        }
        resposta = NextResponse.next({ request });
        for (const { name, value, options } of lista) {
          resposta.cookies.set(name, value, options);
        }
      },
    },
  });

  // O efeito colateral é o ponto: renova o token vencido.
  await supabase.auth.getUser();

  return resposta;
}

export const config = {
  // Estáticos ficam de fora — renovar token em request de imagem é custo puro.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|.*\\.(?:png|jpg|jpeg|webp|svg|mp4|webm|txt)$).*)",
  ],
};
