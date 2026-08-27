import type { MetadataRoute } from "next";
import { url } from "@/lib/gta/seo";

/**
 * O sitemap — e ele é curto de propósito.
 *
 * Sitemap não é inventário do repositório: é a lista do que você QUER que o
 * Google indexe. Entram três rotas, e cada ausência tem motivo:
 *
 *   · `/entrar` e `/cadastro` — tela de formulário sem conteúdo. Indexada, ela
 *     compete com a home pelo nome da marca e às vezes ganha, porque é mais
 *     simples. Quem busca "gta viral" tem que cair na home.
 *   · tudo do grupo `(painel)` — exige login. Página que devolve redirecionamento
 *     para quem não está logado, no sitemap, é convite a erro de rastreamento.
 *   · `/api/*` e `/auth/callback` — não são páginas.
 *
 * A LISTA É ESCRITA À MÃO, não varrida do disco. Varrer traria o painel inteiro
 * junto e ninguém perceberia — o erro só apareceria meses depois, no Search
 * Console, como "página não indexável enviada no sitemap".
 *
 * Prioridade e frequência: o Google diz publicamente que ignora as duas. Ficam
 * porque outros buscadores (e rastreadores de IA) ainda leem, e custam nada.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  /*
   * Uma data só para todas as rotas, calculada uma vez.
   *
   * `lastModified` é um sinal, não um enfeite: se cada chamada gerasse um
   * `new Date()` novo, o arquivo diria "mudou agora" a cada rastreamento —
   * inclusive quando nada mudou. Rastreador aprende a desconfiar disso e passa
   * a ignorar o campo. Como o sitemap é estático (sem API de request), o Next
   * o gera no build: a data é a do deploy, que é exatamente a verdade.
   */
  const geradoEm = new Date();

  return [
    {
      url: url("/"),
      lastModified: geradoEm,
      // A home é a única página que muda de verdade — a cada marco do jogo.
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: url("/termos"),
      lastModified: geradoEm,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: url("/politica"),
      lastModified: geradoEm,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
