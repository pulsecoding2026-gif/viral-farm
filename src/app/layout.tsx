import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Archivo,
  Bebas_Neue,
  Inter,
} from "next/font/google";
import "./globals.css";
import { MARCA, TEMPLATE_TITULO } from "@/lib/gta/marca";
import {
  DESCRICAO,
  PALAVRAS_CHAVE,
  SITE_URL,
  URL_BASE,
} from "@/lib/gta/seo";

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
/*
 * ARCHIVO — a família inteira, não a Black.
 *
 * Isto veio de MEDIR o site do GTA VI em vez de supor. Os títulos de lá usam
 * peso 700 com tracking de +0,15em, e o corpo usa 500. A presença vem do
 * espaçamento aberto em caixa alta — desenho art déco —, não de peso extremo.
 *
 * Archivo Black é 900 e tem um peso só. Colada, ela vira um tijolo: foi o que
 * deixou o FAQ "grosso demais". Com a família variável dá para usar 700 nos
 * títulos, 600 nos subtítulos e 500 no corpo, que é a hierarquia real.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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

/**
 * METADADOS DA RAIZ — o que o Google, o WhatsApp e o Discord leem.
 *
 * Herdado por TODA rota. Cada página pública sobrescreve só o que muda
 * (`title`, `description`), e o resto — imagem de compartilhamento, locale,
 * regras de robô — desce daqui de graça. Ver a regra de merge em
 * `node_modules/next/dist/docs/.../generate-metadata.md`: campos aninhados
 * como `openGraph` são SUBSTITUÍDOS por inteiro quando a página redefine o
 * objeto, então página nenhuma deve redeclarar `openGraph` só para trocar o
 * título.
 *
 * `metadataBase` é o que permite escrever caminho relativo aqui embaixo — sem
 * ele, canonical e og:image relativos quebram o build.
 */
export const metadata: Metadata = {
  metadataBase: URL_BASE,

  title: {
    default: `${MARCA} — cortes de GTA VI com IA`,
    template: TEMPLATE_TITULO,
  },
  description: DESCRICAO,
  keywords: PALAVRAS_CHAVE,

  applicationName: MARCA,
  category: "technology",
  /*
   * `authors`/`creator`/`publisher` são a mesma entidade porque isto é um
   * projeto de uma pessoa só. Repetir o nome nos três é o que o Google usa
   * para amarrar site, autoria e organização — e é a mesma entidade declarada
   * no JSON-LD de `src/lib/gta/seo.ts`.
   */
  authors: [{ name: MARCA, url: SITE_URL }],
  creator: MARCA,
  publisher: MARCA,

  /*
   * Canonical na raiz aponta para a raiz. Cada página define a sua própria em
   * `alternates.canonical`, e o `metadataBase` monta a URL absoluta.
   *
   * Isto importa mais do que parece aqui: o site vai receber link de fórum,
   * Discord e Reddit cheios de `?utm_source=...`. Sem canonical, cada variante
   * de parâmetro vira um candidato a página separada.
   */
  alternates: { canonical: "/" },

  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: MARCA,
    title: `${MARCA} — cortes de GTA VI com IA`,
    description: DESCRICAO,
    url: "/",
    /*
     * A imagem NÃO é listada aqui: `src/app/opengraph-image.tsx` a gera e o
     * Next injeta `og:image` (com tipo, largura e altura) sozinho. Declarar
     * nos dois lugares produziria duas og:image e o WhatsApp escolheria uma.
     */
  },

  twitter: {
    // O card grande é o que faz diferença em nicho de games: a arte é metade
    // do motivo de alguém clicar num link colado no meio de uma thread.
    card: "summary_large_image",
    title: `${MARCA} — cortes de GTA VI com IA`,
    description: DESCRICAO,
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Sem teto de trecho, de imagem nem de vídeo na pré-visualização: o
      // padrão do Google corta o snippet curto, e aqui a descrição é o
      // argumento de venda.
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  formatDetection: { telephone: false, address: false, email: false },
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
