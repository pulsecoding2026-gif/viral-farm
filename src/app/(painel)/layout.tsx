import { AppShell } from "./app-shell";

/**
 * Layout do painel: tudo aqui dentro ganha a lateral e a rolagem travada no
 * contêiner de conteúdo.
 *
 * Quando o Supabase entrar, é aqui que a verificação de sessão deve ficar —
 * um ponto só protegendo todas as rotas do app, em vez de cada página checar
 * por conta.
 */
export default function PainelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen overflow-hidden">
      <AppShell>{children}</AppShell>
    </div>
  );
}
