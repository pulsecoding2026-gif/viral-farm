import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Viral Farm",
    template: "%s · Viral Farm",
  },
  description:
    "Farme viralização e monetização a partir de qualquer vídeo longo. Cole o link de uma live, um podcast ou uma gravação e a IA devolve cortes verticais com legenda animada, prontos pra postar.",
};

/**
 * Layout raiz: só a casca do documento.
 *
 * A lateral do app vive em (painel)/layout.tsx, não aqui — a landing e as
 * telas de acesso precisam da página inteira, sem menu. Os dois grupos de
 * rota, `(site)` e `(painel)`, não aparecem na URL.
 *
 * `overflow-hidden` também saiu: o painel trava a rolagem no próprio
 * contêiner, mas a landing precisa rolar a página normalmente.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      // `dark` fixo: o produto é escuro por identidade, não por preferência
      // do sistema. A variante `dark:` do Tailwind lê esta classe (globals.css).
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
