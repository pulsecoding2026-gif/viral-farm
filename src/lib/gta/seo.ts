/**
 * A FONTE ÚNICA do que os buscadores leem.
 *
 * Mesma lógica de `marca.ts` e `lancamento.ts`: endereço público, descrição e
 * dados estruturados são a mesma informação repetida em quatro lugares
 * (metadata do layout, sitemap, robots, JSON-LD). Espalhar isso é garantir que
 * um dia o canonical aponte para um domínio e o sitemap para outro — e esse é
 * exatamente o tipo de erro que o Google resolve escolhendo sozinho qual das
 * duas versões indexar.
 *
 * O QUE NÃO ENTRA AQUI: promessa que a plataforma não cumpre. Dado estruturado
 * é declaração feita para uma máquina que confere — preço divergente da tela e
 * FAQ que não existe na página são violação de diretriz, não esperteza.
 */

import { MARCA, DESCRITOR, NAO_AFILIADO } from "./marca";

/**
 * O endereço público, de uma variável que JÁ EXISTIA no projeto.
 *
 * `NEXT_PUBLIC_SITE_URL` é a mesma que o Checkout do Stripe usa para devolver
 * a pessoa (ver `.env.local.example`). Reaproveitar em vez de inventar uma
 * segunda variável é o que impede o site de ter dois endereços canônicos.
 *
 * A QUEDA É LOCALHOST DE PROPÓSITO, e não um domínio bonito chutado. Um
 * domínio inventado aqui produziria canonical e sitemap apontando para um
 * lugar que não existe — pior que não ter, porque o Google obedece. Localhost
 * denuncia a falta de configuração em vez de escondê-la.
 *
 * O dono precisa definir `NEXT_PUBLIC_SITE_URL` no ambiente de produção
 * (Vercel → Settings → Environment Variables) antes do primeiro deploy
 * público. Ver `docs/gta/seo.md`.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

/** `metadataBase` do Next e base de toda URL absoluta do JSON-LD. */
export const URL_BASE = new URL(SITE_URL);

/** Caminho relativo → URL absoluta, do jeito que o schema.org exige. */
export function url(caminho: string): string {
  return new URL(caminho, URL_BASE).toString();
}

/**
 * A descrição que aparece no resultado de busca.
 *
 * Cabe em ~155 caracteres porque é isso que o Google mostra antes de cortar —
 * e termina com o aviso de não-oficial, que é o mesmo compromisso do rodapé.
 * Escrita com o verbo primeiro ("Cole o link") porque snippet que descreve uma
 * ação converte melhor que snippet que descreve uma categoria.
 */
export const DESCRICAO =
  "Cole o link da sua live de GTA e a IA devolve Shorts verticais com legenda " +
  "animada, prontos pra postar. Monte um canal de cortes sem aparecer. " +
  "Projeto de fã, não oficial.";

/**
 * PALAVRAS-CHAVE — e uma ressalva honesta sobre elas.
 *
 * O Google IGNORA `<meta name="keywords">` desde 2009 e diz isso publicamente.
 * Isto não é alavanca de ranqueamento e não deve ser tratada como tal: quem
 * ranqueia é o texto da página. O que a tag ainda serve é para buscadores
 * menores e para rastreadores de IA que leem o cabeçalho.
 *
 * Por isso a lista é CURTA e só tem termo que a página realmente entrega. Meia
 * dúzia de variação de "gta 6" empilhada seria keyword stuffing — o Google pune
 * e não compra nada em troca.
 *
 * Os termos saem de `docs/gta/pesquisa-jogo.md`, não de intuição.
 */
export const PALAVRAS_CHAVE = [
  "cortes de GTA",
  "cortes de GTA 6",
  "canal de cortes",
  "Shorts de GTA",
  "cortes de live",
  "GTA RP cortes",
  "editor de cortes com IA",
  "GTA VI",
];

/**
 * AS PERGUNTAS DO FAQ, copiadas de `src/app/(site)/perguntas.tsx`.
 *
 * ISTO É DUPLICAÇÃO E EU SEI. O certo seria `perguntas.tsx` importar esta
 * lista, mas aquele arquivo é de outro agente neste momento e reescrevê-lo por
 * fora criaria conflito. A dívida está registrada em `docs/gta/seo.md`.
 *
 * ENQUANTO A DUPLICAÇÃO EXISTIR: o dado estruturado do FAQ SÓ pode ser
 * publicado se o texto aqui for idêntico ao da tela. A diretriz do Google é
 * literal — o conteúdo marcado precisa estar visível na página. FAQ marcado
 * que a pessoa não encontra é motivo de ação manual, não de rich snippet.
 *
 * As respostas foram encurtadas? NÃO. São o texto integral, palavra por
 * palavra. Se alguém mexer no FAQ da tela, mexe aqui junto.
 */
export const FAQ: { p: string; r: string }[] = [
  {
    p: "O que é a GTA VIRAL?",
    r: "É um painel que transforma live longa em cortes prontos pra postar. Você cola um link — uma stream de RP, um VOD, um vídeo de 6 horas — e a IA transcreve, acha os melhores momentos e renderiza cortes verticais com legenda animada. É a ferramenta pra montar um canal de cortes de GTA sem gravar nem aparecer.",
  },
  {
    p: "Posso usar vídeo de outra pessoa?",
    r: "Tecnicamente sim, e é o que a maioria dos canais de cortes faz. Mas o vídeo é de quem gravou, e isso não muda por passar por aqui: o certo é ter a permissão do streamer e creditar o canal de origem em todo corte. Muitos streamers liberam e até incentivam — clipe é divulgação de graça pra eles — e vários têm regra publicada sobre isso. Peça antes: um pedido educado costuma virar um sim, e um sim escrito é o que te protege se o canal crescer. O que não dá é material vazado ou de build não lançada, que a gente não aceita de jeito nenhum.",
  },
  {
    p: "Preciso ter audiência pra usar?",
    r: "Não. A análise lê o vídeo em si — o que é falado, quais trechos prendem, onde está o gancho. Um canal com zero inscrito funciona igual a um com um milhão. No pré-lançamento de GTA VI o interesse pelo tema é tão grande que o tamanho do canal deixa de ser o filtro — é justamente pra quem ainda não emplacou.",
  },
  {
    p: "De onde posso mandar o link?",
    r: "Twitch, Kick, YouTube, TikTok, Instagram e Facebook. O vídeo precisa estar público ou não listado, e ter até 90 minutos. Live em andamento ainda não funciona: espere a transmissão terminar e cole o link do VOD.",
  },
  {
    p: "Meu vídeo fica guardado?",
    r: "O arquivo original fica no máximo 24 horas no servidor de processamento — só o tempo de você revisar e reeditar os cortes — e depois é apagado automaticamente. O que fica guardado são os cortes gerados e a transcrição, na sua conta.",
  },
  {
    p: "Quanto tempo demora?",
    r: "Depende da duração: alguns minutos pra um vídeo curto, mais tempo pra uma live longa. A renderização de cada corte é a etapa mais pesada. Você pode fechar a aba — o processamento continua no servidor e os cortes aparecem no histórico.",
  },
  {
    p: "Qual IA vocês usam?",
    r: "A transcrição é feita com Whisper, que devolve o tempo exato de cada palavra falada. A seleção dos trechos é feita por um modelo de linguagem que lê essa transcrição e pontua cada corte em quatro dimensões: gancho, fluxo, valor e tendência.",
  },
  {
    p: "O que vem em cada corte?",
    r: "Um vídeo 9:16 em 1080p com legenda animada queimada, título na tela nos primeiros segundos, e uma legenda pronta pra postar. Cada corte vem com o motivo da escolha e a nota nas quatro dimensões, pra você entender por que aquele trecho foi selecionado.",
  },
  {
    p: "Eu escolho os cortes ou a IA decide?",
    r: "Você escolhe. No modo Estúdio a IA propõe os cortes e para: você vê o gancho, a nota e o trecho falado de cada um, aprova os que valem e descarta o resto — só o aprovado é renderizado. Se preferir, o modo Automático entrega tudo pronto de uma vez.",
  },
];

/**
 * OS PLANOS, copiados de `src/app/(site)/planos.tsx`.
 *
 * Mesma dívida do FAQ, e pela mesma razão: a lista de lá é `const` local de um
 * componente `"use client"`, não é exportada, e aquele arquivo não é meu agora.
 *
 * O NÚMERO AQUI TEM QUE SER O DA TELA. Dado estruturado de preço é conferido
 * pelo Google contra o que a página mostra, e divergência derruba o rich
 * result inteiro — além de ser, na prática, anunciar um preço e cobrar outro.
 *
 * ATENÇÃO — DIVERGÊNCIA REAL JÁ EXISTENTE NO REPOSITÓRIO: `src/lib/planos/
 * catalogo.ts` descreve outros planos (Criador R$ 47, Profissional R$ 97,
 * Estúdio R$ 197) e é ELE que o Stripe usa. A landing anuncia Lite/Creator/
 * Viral. Os dois não podem continuar existindo quando a cobrança ligar. Está
 * registrado em `docs/gta/seo.md` — é decisão do dono, não do SEO.
 */
export const PLANOS_ANUNCIADOS = [
  { nome: "Lite", preco: "59.90" },
  { nome: "Creator", preco: "99.90" },
  { nome: "Viral", preco: "149.90" },
];

/* ------------------------------------------------------------------ JSON-LD */

/*
 * Um @graph só, com @id cruzado, em vez de três blocos soltos.
 *
 * É a forma que o Google recomenda quando as entidades se referenciam: o
 * WebSite aponta para a Organization como publisher, e o SoftwareApplication
 * aponta para a mesma Organization como autora. Em blocos separados, cada
 * bloco vira uma organização diferente aos olhos do parser.
 */

const ID_ORG = url("/#organizacao");
const ID_SITE = url("/#site");

/**
 * O grafo que vale em QUALQUER página pública: quem publica, que site é, que
 * software é vendido. Nada aqui depende de estar na home.
 */
export function grafoDoSite() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ID_ORG,
        name: MARCA,
        url: url("/"),
        logo: {
          "@type": "ImageObject",
          url: url("/logo-gta-viral-v3.png"),
          width: 1774,
          height: 887,
        },
        description: DESCRITOR,
        /*
         * O aviso de não-afiliação entra no dado estruturado, não só no
         * rodapé. É a mesma frase de `marca.ts`, e ela existe justamente para
         * a máquina que monta o painel de conhecimento não concluir sozinha
         * que este site é da Rockstar.
         */
        disambiguatingDescription: NAO_AFILIADO,
        email: "contato@viralfarm.com.br",
        /*
         * `sameAs` fica FORA até existirem perfis de verdade. A propriedade
         * serve para confirmar identidade entre o site e as redes; apontar
         * para perfil que não é nosso (ou que não existe) é o oposto disso.
         */
      },
      {
        "@type": "WebSite",
        "@id": ID_SITE,
        name: MARCA,
        alternateName: "GTA VIRAL — cortes de GTA VI",
        url: url("/"),
        description: DESCRICAO,
        inLanguage: "pt-BR",
        publisher: { "@id": ID_ORG },
        /*
         * `potentialAction: SearchAction` NÃO entra: o site não tem busca
         * interna. Declarar uma caixa de busca inexistente é pedir para o
         * Google gerar um sitelink que leva a lugar nenhum.
         */
      },
      {
        "@type": "SoftwareApplication",
        "@id": url("/#aplicativo"),
        name: MARCA,
        applicationCategory: "MultimediaApplication",
        applicationSubCategory: "Editor de vídeo",
        operatingSystem: "Web",
        url: url("/"),
        description: DESCRICAO,
        inLanguage: "pt-BR",
        author: { "@id": ID_ORG },
        publisher: { "@id": ID_ORG },
        featureList: [
          "Transcrição automática de live longa",
          "Seleção dos melhores momentos por IA",
          "Corte vertical 9:16 em 1080p",
          "Legenda animada palavra a palavra",
          "Enquadramento que segue o rosto",
          "Remoção de silêncios",
        ],
        /*
         * `aggregateRating` fica FORA. É a propriedade que mais rende estrela
         * no resultado de busca e a que mais dá penalidade quando é inventada:
         * a plataforma não tem nota de usuário nenhuma hoje. Entra quando
         * houver avaliação real coletada.
         */
        offers: PLANOS_ANUNCIADOS.map((p) => ({
          "@type": "Offer",
          name: `${MARCA} ${p.nome}`,
          price: p.preco,
          priceCurrency: "BRL",
          url: url("/#planos"),
          category: "Assinatura mensal",
          /*
           * `PreOrder`, não `InStock`, e isto é literal: a própria
           * `planos.tsx` diz que não existe cobrança ligada e que os botões
           * levam ao cadastro. Marcar como disponível seria declarar à
           * máquina uma compra que a pessoa não consegue concluir.
           * Vira `InStock` no dia em que o Checkout entrar no ar.
           */
          availability: "https://schema.org/PreOrder",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: p.preco,
            priceCurrency: "BRL",
            // Mensal: 1 mês de cobrança por 1 mês de serviço.
            billingDuration: 1,
            billingIncrement: 1,
            unitCode: "MON",
          },
        })),
      },
    ],
  };
}

/**
 * O FAQ, em bloco separado — porque ele só pode ir na página que MOSTRA o FAQ.
 *
 * Ver a nota em `FAQ` acima: a diretriz do Google exige o texto visível na
 * mesma página. Por isso isto não está no grafo do site, que roda em toda
 * rota pública.
 */
export function grafoDoFaq() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": url("/#faq"),
    inLanguage: "pt-BR",
    isPartOf: { "@id": ID_SITE },
    mainEntity: FAQ.map((q) => ({
      "@type": "Question",
      name: q.p,
      acceptedAnswer: { "@type": "Answer", text: q.r },
    })),
  };
}
