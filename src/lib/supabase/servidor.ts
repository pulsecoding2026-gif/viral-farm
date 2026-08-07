import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Cliente Supabase para código de servidor — Server Components, Server
 * Actions e Route Handlers. A sessão vive em cookies, então cada request
 * monta o cliente em cima do jar da própria request.
 *
 * Sempre `auth.getUser()` pra decidir acesso, nunca `getSession()`: o user
 * é validado contra o servidor do Supabase; a sessão é só o que está no
 * cookie, que qualquer um pode forjar.
 */
export async function clienteSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não estão configuradas. " +
        "Copie .env.local.example para .env.local e preencha.",
    );
  }

  const jar = await cookies();

  return createServerClient(url, chave, {
    cookies: {
      getAll() {
        return jar.getAll();
      },
      setAll(lista) {
        try {
          for (const { name, value, options } of lista) {
            jar.set(name, value, options);
          }
        } catch {
          // Server Component não pode escrever cookie — quem renova o token
          // nesse caso é o proxy.ts, então engolir aqui é seguro.
        }
      },
    },
  });
}
