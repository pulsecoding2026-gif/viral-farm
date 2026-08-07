import { redirect } from "next/navigation";
import { clienteSupabase } from "@/lib/supabase/servidor";
import { AppShell } from "./app-shell";

/**
 * Layout do painel: tudo aqui dentro ganha a lateral e a rolagem travada no
 * contêiner de conteúdo.
 *
 * A verificação de sessão fica AQUI — um ponto só protegendo todas as rotas
 * do app, em vez de cada página checar por conta. `getUser()` valida contra
 * o servidor do Supabase; cookie forjado não passa.
 */
export default async function PainelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await clienteSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const nome =
    (user.user_metadata?.nome as string | undefined) ??
    user.email?.split("@")[0] ??
    "Você";

  return (
    <div className="h-screen overflow-hidden">
      <AppShell usuario={{ nome, email: user.email ?? "" }}>
        {children}
      </AppShell>
    </div>
  );
}
