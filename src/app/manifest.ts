import type { MetadataRoute } from "next";
import { MARCA, DESCRITOR } from "@/lib/gta/marca";
import { DESCRICAO } from "@/lib/gta/seo";

/**
 * Manifesto de aplicativo web.
 *
 * O ganho direto é o celular: quem usa o painel toda semana instala o site na
 * tela inicial e ele abre sem barra de navegador. O ganho indireto é o
 * Lighthouse — "instalável" é um dos critérios de PWA, e a nota de Lighthouse
 * é o que a maioria das ferramentas de auditoria de SEO cita primeiro.
 *
 * NÃO é sinal de ranqueamento. Manifesto não faz o Google subir ninguém; quem
 * disser o contrário está vendendo consultoria.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${MARCA} — ${DESCRITOR}`,
    // Cabe embaixo do ícone na tela inicial: acima de ~12 caracteres o Android
    // corta com reticências, e "GTA VIRAL" tem 9.
    short_name: MARCA,
    description: DESCRICAO,
    lang: "pt-BR",
    dir: "ltr",

    /*
     * Instalado, o app abre no PAINEL, não na landing.
     *
     * Quem instalou já se cadastrou — mandá-lo para a página de venda a cada
     * abertura é fazer o usuário fiel assistir ao anúncio. Quem não estiver
     * logado é redirecionado pelo guarda de `(painel)/layout.tsx`, que é o
     * comportamento correto de qualquer jeito.
     */
    start_url: "/painel",
    scope: "/",
    display: "standalone",
    orientation: "portrait",

    /*
     * As duas cores do brandbook, e elas têm papéis DIFERENTES:
     * `background_color` é a tela de abertura enquanto o app carrega — é o
     * GTA Black (#080808), o mesmo `--fundo-poco` de `gta-tokens.css`, para
     * não haver um flash claro antes da interface aparecer.
     * `theme_color` pinta a barra do sistema. Usa o laranja do símbolo, que é
     * a cor que a pessoa associa ao ícone que ela tocou.
     */
    background_color: "#080808",
    theme_color: "#f74211",

    categories: ["entertainment", "productivity", "video"],

    icons: [
      {
        /*
         * SVG com `sizes: "any"`: um arquivo só serve de 48px a 512px sem
         * borrar, que é o motivo de o símbolo ter sido vetorizado.
         */
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        /*
         * `maskable` é o que impede o Android de desenhar o símbolo dentro de
         * um quadrado branco. O apple-icon já vem com fundo opaco e margem —
         * exatamente o que a máscara adaptativa precisa.
         */
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
