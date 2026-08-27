import { grafoDoSite } from "@/lib/gta/seo";

/**
 * Layout do grupo público — e ele NÃO desenha nada.
 *
 * Existe por um motivo só: pendurar o JSON-LD em toda página pública sem
 * repetir o bloco em cada `page.tsx`. Por isso devolve um Fragment, e não uma
 * `div`: um wrapper aqui viraria um elemento a mais entre o `<body>` e o
 * `min-h-screen` da landing, e é assim que se quebra uma altura de tela sem
 * ninguém entender por quê.
 *
 * O QUE ENTRA E O QUE NÃO ENTRA NESTE GRAFO
 *
 * Só declaração que é verdadeira em QUALQUER rota deste grupo: quem publica
 * (Organization), que site é (WebSite) e que software é oferecido
 * (SoftwareApplication). Essas três valem igual na home, nos termos e na
 * política.
 *
 * O FAQPage fica de fora de propósito. A diretriz do Google é literal: o
 * conteúdo marcado tem que estar VISÍVEL na página que o marca. O FAQ só
 * existe na home — marcá-lo aqui o publicaria também em `/termos` e
 * `/politica`, onde não há pergunta nenhuma na tela. Isso não é otimização, é
 * o tipo de dado estruturado que rende ação manual. Ele mora em
 * `faq-estruturado.tsx` e é montado só na home.
 */
export default function LayoutSite({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      {/*
        `dangerouslySetInnerHTML` é o jeito CERTO aqui, por mais que o nome
        assuste — é o que a documentação do Next recomenda para JSON-LD. O
        React escaparia as aspas se o objeto fosse passado como filho de texto,
        e o resultado seria um JSON inválido que nenhum validador lê.

        Não há risco de injeção: o conteúdo é `JSON.stringify` de um objeto
        montado em `seo.ts` a partir de constantes do próprio código — nada
        vem de usuário, de URL nem do banco.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(grafoDoSite()) }}
      />
    </>
  );
}
