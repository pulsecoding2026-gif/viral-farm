import type { Metadata } from "next";
import { Geist, Geist_Mono, Anton, Inter } from "next/font/google";
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
 * ANTON — a fonte dos títulos, conforme o guia de marca.
 *
 * Tem um peso só (400, que já é praticamente preto). Isso não é limitação: é
 * como a fonte foi desenhada. Pedir 700 dela faria o navegador simular o
 * negrito engrossando o contorno, o que borra a letra em tamanho grande —
 * exatamente onde ela é usada.
 *
 * INTER no corpo, também do guia. A interface é cheia de tabela, formulário e
 * número, e Inter foi desenhada para isso; Anton em texto corrido fica
 * ilegível depois da segunda linha.
 *
 * As duas são do Google Fonts e carregam pelo `next/font`, então nada de
 * requisição a host externo em tempo de execução.
 */
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
      className={`dark ${geistSans.variable} ${geistMono.variable} ${anton.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
