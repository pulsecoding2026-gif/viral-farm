import type { MetadataRoute } from "next";
import { url } from "@/lib/gta/seo";

/**
 * O que o rastreador pode abrir.
 *
 * REGRA DE OURO DO ARQUIVO: `Disallow` impede o rastreamento, NÃO a indexação.
 * Uma URL bloqueada aqui que receba link de fora ainda pode aparecer no Google
 * — sem título e sem descrição, porque o robô nunca pôde ler a página. Para
 * garantir que algo fique fora do índice, o certo é a página responder
 * `noindex`; o `Disallow` é para poupar rastreamento de coisa que não é
 * conteúdo.
 *
 * É por isso que a lista abaixo é só de rota que ninguém vai linkar de fora:
 * tela de painel atrás de login, rota de API e callback de autenticação.
 */

/*
 * As rotas do grupo `(painel)`, uma a uma.
 *
 * O parêntese do nome da pasta é um GRUPO DE ROTA: ele não aparece na URL.
 * `src/app/(painel)/lives/page.tsx` atende `/lives`, não `/painel/lives` — e
 * essa é justamente a pegadinha que faz alguém escrever `Disallow: /painel/`
 * achando que cobriu tudo, quando cobriu uma rota só.
 *
 * Escrever a lista à mão é feio e é o certo: uma varredura automática do disco
 * teria que entender grupos de rota, e errar aqui bloqueia a home.
 */
const ROTAS_DO_PAINEL = [
  "/agent-viral",
  "/analisador",
  "/assinatura",
  "/banco-de-videos",
  "/biblioteca",
  "/editor-viral",
  "/hooks",
  "/lives",
  "/painel",
  "/perfil",
  "/preferencias",
  "/radar-viral",
  "/roteiros",
  "/seguranca",
  "/trends",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        ...ROTAS_DO_PAINEL,
        // Rotas de API e o callback de login: resposta JSON e redirecionamento,
        // nunca conteúdo. Rastrear isso só gasta o orçamento do robô.
        "/api/",
        "/auth/",
        /*
         * Telas de acesso. Não têm conteúdo próprio e competem com a home pelo
         * nome da marca — quem busca "gta viral" precisa cair na página que
         * explica o produto, não num formulário de senha.
         *
         * O ideal seria `robots: { index: false }` no metadata dessas páginas
         * em vez de bloquear aqui (ver a regra de ouro no topo). Está anotado
         * em `docs/gta/seo.md`: é uma linha em cada `page.tsx` de acesso.
         */
        "/entrar",
        "/cadastro",
      ],
    },
    sitemap: url("/sitemap.xml"),
    /*
     * Nada de regra por rastreador de IA (GPTBot, ClaudeBot, PerplexityBot).
     * O padrão é permitir, e para um site que quer ser a referência de cortes
     * de GTA VI no Brasil ser citado por assistente é distribuição, não perda.
     * Se o dono quiser bloquear, é adicionar um bloco em `rules` — está
     * anotado em `docs/gta/seo.md`.
     */
  };
}
