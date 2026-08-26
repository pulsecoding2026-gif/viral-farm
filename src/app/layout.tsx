import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { MARCA, TEMPLATE_TITULO } from "@/lib/gta/marca";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * A fonte dos títulos.
 *
 * Space Grotesk tem o desenho geométrico meio torto que combina com letreiro
 * de rua, sem ser uma fonte "de games" — dessas que já chegam gritando e
 * envelhecem em seis meses. Fica só nos títulos: o corpo continua em Geist,
 * porque texto longo em display cansa e a interface tem muita tabela e muito
 * formulário.
 *
 * É do Google Fonts e carrega pelo `next/font`, então nada de requisição a
 * host externo em tempo de execução.
 */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: MARCA,
    template: TEMPLATE_TITULO,
  },
  description:
    "Sua live de GTA VI vira uma semana de Shorts enquanto você ainda está jogando. Cole o link e a IA devolve cortes verticais com legenda animada, prontos pra postar. Projeto independente, não afiliado à Rockstar Games.",
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
      className={`dark ${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
