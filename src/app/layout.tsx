import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Archivo_Black,
  Bebas_Neue,
  Inter,
} from "next/font/google";
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
 * TRÊS FONTES, TRÊS PAPÉIS — e nenhuma delas tenta ser a da Rockstar.
 *
 * O lettering do GTA é proprietário: o wordmark vem da linhagem da Pricedown e
 * o display do GTA VI é a GTAArtDeco, licenciada pela Colophon para a Rockstar.
 * Nenhuma das duas é livre, e o próprio brandbook diz para não reconstruir o
 * logo digitando numa fonte qualquer. O que ele oferece é a lista de fontes
 * livres que RECRIAM A SENSAÇÃO, e é dela que estas saem.
 *
 * ARCHIVO BLACK — headline. Blocada, peso 900, contraforma apertada. É a que
 * mais se aproxima da presença do lettering da franquia: pesada e larga,
 * ocupando o espaço com autoridade. Onde a frase é curta e precisa bater.
 *
 * BEBAS NEUE — a "gamer": rótulo, número, contador, selo. Condensada e só
 * caixa alta, é a letra de placa e de thumbnail — `TRAILER 2`, `VICE CITY`,
 * `COMING SOON`, que é exatamente o exemplo que o brandbook dá para labels.
 * Em caixa alta com tracking positivo ela vira legenda de pôster de cinema.
 *
 * INTER — corpo. Neutra de propósito: a interface é cheia de tabela,
 * formulário e parágrafo, e display em texto corrido cansa na segunda linha.
 *
 * Anton saiu. Ela é ótima e é a segunda recomendação do brandbook, mas é
 * ESTREITA — some ao lado do logo, que é largo e blocado. Archivo Black
 * conversa melhor com a arte que já existe no topo da página.
 *
 * Todas do Google Fonts, carregadas pelo `next/font`: nada de requisição a
 * host externo em tempo de execução.
 */
const archivo = Archivo_Black({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: "400", // é o único peso; o desenho já é preto
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
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
      className={`dark ${geistSans.variable} ${geistMono.variable} ${archivo.variable} ${bebas.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
