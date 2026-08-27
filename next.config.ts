import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Liga a integração do <ViewTransition> do React com a navegação do
    // App Router — é o que faz a troca de página animar em vez de estalar.
    // Sem suporte no navegador, tudo funciona igual, só não anima.
    viewTransition: true,
  },

  images: {
    /*
     * AVIF antes de WebP. O padrão do Next 16 é só `['image/webp']`.
     * AVIF comprime ~20% menos bytes que WebP para a mesma qualidade, e o
     * público aqui é celular em rede móvel — byte economizado é o que importa.
     *
     * A ordem manda: o Next casa o `Accept` do navegador com a lista e usa o
     * PRIMEIRO que bater. Quem não suporta AVIF cai em WebP; quem não suporta
     * nenhum dos dois recebe o formato original. Ninguém fica sem imagem.
     *
     * O custo é do servidor, não do visitante: AVIF demora ~50% mais para
     * codificar na primeira vez. Como cada tamanho é cacheado depois disso — e
     * são poucas imagens no site — o custo é pago uma vez por variante.
     */
    formats: ["image/avif", "image/webp"],

    /*
     * 31 dias, contra as 4 horas do padrão.
     *
     * Isto é o TTL do cache das imagens JÁ otimizadas. Com 4 horas, num pico
     * de tráfego o servidor volta a reotimizar o mesmo logo várias vezes por
     * dia — trabalho de CPU repetido justamente na hora em que ele está mais
     * caro. As imagens do site são de marca e não mudam sozinhas.
     *
     * Não existe invalidação de cache aqui: para trocar a arte, troca-se o
     * nome do arquivo (é a convenção que o `-v3` do logo já segue).
     */
    minimumCacheTTL: 2678400,
  },

  async headers() {
    return [
      {
        /*
         * O vídeo do hero é o arquivo mais pesado do site e é servido direto
         * de `public/`, que por padrão NÃO ganha cache longo — diferente de
         * `/_next/static/`, que já vem com um ano e `immutable` porque tem
         * hash no nome.
         *
         * Sem isto, quem volta ao site revalida um arquivo de megabytes a
         * cada visita. Com `immutable`, o navegador nem pergunta.
         *
         * Seguro porque o nome é versionado por convenção: trocar o material
         * significa trocar o nome do arquivo, nunca o conteúdo por baixo do
         * mesmo nome — que é o bug que só aparece para quem já visitou.
         */
        source: "/:arquivo*.mp4",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  /*
   * `compress` fica no padrão (true): o Next aplica gzip no HTML e nos
   * arquivos estáticos. Não foi mexido de propósito — e vale saber que ele
   * NÃO ajuda no mp4 nem no WebP/AVIF, que já são formatos comprimidos.
   * O ganho neles vem de codificar melhor, não de comprimir de novo.
   */
};

export default nextConfig;
