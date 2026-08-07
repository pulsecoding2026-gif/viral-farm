import { redirect } from "next/navigation";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { clienteSupabase } from "@/lib/supabase/servidor";
import { AppShell } from "./app-shell";

/**
 * Layout do painel: tudo aqui dentro ganha a lateral e a rolagem travada no
 * contêiner de conteúdo, e a sessão é conferida num ponto só — em vez de cada
 * página checar por conta.
 */
export default async function PainelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await clienteSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  /*
    `getUser()` devolve user = null em DOIS casos muito diferentes: a pessoa
    não está logada, ou não deu pra falar com o Supabase (rede, timeout,
    certificado). Tratar os dois como "deslogado" derrubava a sessão a cada
    soluço de rede — era o "toda hora fica deslogando".

    Falha de rede não é resposta sobre identidade: em vez de destruir a
    sessão, deixamos o erro subir pro error.tsx, que oferece tentar de novo
    com o cookie intacto.
  */
  if (error && isAuthRetryableFetchError(error)) {
    throw new Error("Não deu pra confirmar sua sessão agora.");
  }

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
