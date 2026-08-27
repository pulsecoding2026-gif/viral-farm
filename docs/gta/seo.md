# SEO da GTA VIRAL

Estado em 27/08/2026 — o dia em que o *Extended Look* estreou.

Este documento tem duas partes: **o que já está no código** e **o que depende de
uma decisão do dono**. A segunda é mais importante que a primeira.

---

## Resumo em uma linha

O encanamento está pronto e o conteúdo não existe. Um site de uma página só não
ranqueia para "gta 6" coisa nenhuma, por melhor que sejam os metadados — e é
justamente aí que está a oportunidade descrita no fim deste documento.

---

## 1. O que foi feito

### Metadados (`src/app/layout.tsx`, só o objeto `metadata`)

- `metadataBase` a partir de `NEXT_PUBLIC_SITE_URL`, que é a variável que o
  projeto **já usava** para o retorno do Checkout do Stripe. Não inventei uma
  segunda: dois endereços canônicos é como um site acaba indexado em duplicata.
- `title.template` (`%s · GTA VIRAL`) preservado, com o `default` agora
  carregando o que o produto é — `GTA VIRAL — cortes de GTA VI com IA` — em vez
  de só a marca. Título de resultado de busca precisa dizer o que a pessoa
  encontra.
- `description` única, em ~155 caracteres, começando por verbo.
- `alternates.canonical` na raiz e em cada página legal. Isto importa mais do
  que parece: o site vai receber link de Discord, Reddit e fórum cheio de
  `?utm_source=`, e sem canonical cada variante vira candidata a página
  separada.
- Open Graph completo (`type`, `locale: pt_BR`, `siteName`, `url`) e Twitter
  Card `summary_large_image`.
- `robots` com `max-image-preview: large` e `max-snippet: -1` — sem isso o
  Google corta o trecho curto, e aqui a descrição é o argumento de venda.
- `keywords`, com uma ressalva honesta: **o Google ignora essa tag desde 2009.**
  Ela ficou curta e só com termo que a página entrega, porque serve a
  buscadores menores e a rastreadores de IA. Quem vender `keywords` como
  alavanca de ranqueamento está vendendo consultoria.

### Imagem de compartilhamento (`src/app/opengraph-image.tsx`)

PNG 1200x630 gerado pelo `ImageResponse` do `next/og`. Logo do próprio produto,
paleta da marca (`--fundo-poco` #080808, Vice Pink, o gradiente do símbolo),
promessa em duas linhas e o aviso **"Projeto de fã · não oficial" dentro da
arte** — porque esta imagem circula sozinha no WhatsApp, e disclaimer que só
existe no HTML não existe para quem só viu o card.

Nada de material da Rockstar: nem arte, nem lettering, nem paleta do oficial.

Duas armadilhas do Satori que custaram tempo e estão comentadas no arquivo, para
quem for mexer:

- ele **descarta espaço no fim de nó de texto** — `{" "}` e `"Receba os "`
  saíram os dois como `Receba osShorts`, sem erro no console. A correção é
  ` `;
- nó de texto irmão ganha folga visível; o ponto final teve de ir para dentro
  do `span` colorido.

O logo é lido com `readFile` em vez de `import`: o PNG tem 773 KB e o Satori tem
teto de 500 KB para o pacote inteiro.

### Dados estruturados (`src/lib/gta/seo.ts`)

Um `@graph` só, com `@id` cruzado — `Organization`, `WebSite` e
`SoftwareApplication` com os três planos em `offers`. Publicado em toda página
pública por `src/app/(site)/layout.tsx`, que é um layout que não desenha nada.

O que **deliberadamente não entrou**, e o motivo:

| Fora | Por quê |
|---|---|
| `aggregateRating` | É o que mais rende estrela no resultado — e o que mais rende penalidade quando é inventado. A plataforma não tem nota de usuário nenhuma hoje. |
| `SearchAction` | O site não tem busca interna. Declará-la geraria um sitelink que leva a lugar nenhum. |
| `sameAs` | Não há perfil de rede social confirmado. A propriedade serve para provar identidade; apontar para perfil que não é nosso é o oposto disso. |

E uma escolha que precisa de aval: as ofertas estão como
**`availability: PreOrder`**, não `InStock`. A própria `planos.tsx` diz que não
existe cobrança ligada e que os botões levam ao cadastro — marcar como
disponível seria declarar à máquina uma compra que a pessoa não consegue
concluir. **Vira `InStock` no dia em que o Checkout entrar no ar.**

O `disambiguatingDescription` da `Organization` carrega o aviso de
não-afiliação inteiro. É o que impede o painel de conhecimento do Google de
concluir sozinho que este site é da Rockstar.

### `sitemap.ts`, `robots.ts`, `manifest.ts`

- **Sitemap:** três rotas — `/`, `/termos`, `/politica`. Escrito à mão, não
  varrido do disco: varrer traria o painel inteiro junto e o erro só apareceria
  meses depois no Search Console.
- **Robots:** libera `/`, bloqueia as 15 rotas do painel (uma a uma — o grupo
  `(painel)` **não aparece na URL**, então `Disallow: /painel/` cobriria uma
  rota só), mais `/api/`, `/auth/`, `/entrar` e `/cadastro`.
- **Manifest:** `start_url: /painel`, porque quem instalou já se cadastrou —
  mandá-lo para a página de venda a cada abertura é fazer o usuário fiel
  assistir ao anúncio. Manifesto **não é sinal de ranqueamento**; o ganho é
  instalação no celular e o critério de PWA no Lighthouse.

### Páginas legais

`title` curto (o sufixo vem do template), `canonical` próprio e descrição que
diz o que a página tem de incomum — em `/politica`, o prazo de 24 horas do
vídeo original, que é a dúvida concreta que traz alguém ali.

### Verificado rodando

`robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `/opengraph-image` e
`/apple-icon` respondem 200; o `@graph` faz parse; `/termos` traz exatamente um
bloco de JSON-LD (o do site, sem o FAQ). `npx tsc --noEmit` e o ESLint passam
limpos **nos arquivos deste trabalho**.

> Há um erro de tipos pré-existente e alheio a este trabalho em
> `src/lib/viral/pexels.ts`: `NICHOS_BIBLIOTECA` foi estreitado para os nichos
> de GTA e o mapa de consultas do Pexels não acompanhou. Está registrado como
> tarefa à parte.

---

## 2. O que depende de decisão do dono

Em ordem de urgência.

### 2.1. O domínio — **isto bloqueia todo o resto**

Hoje `NEXT_PUBLIC_SITE_URL` é `http://localhost:3000`, e é isso que o canonical,
o sitemap e o `og:image` estão anunciando. **Nada disso funciona em produção
até a variável ser definida.**

A queda é localhost de propósito, e não um domínio bonito chutado: domínio
inventado produziria canonical apontando para um lugar que não existe — pior
que não ter, porque o Google obedece.

**Ação:** registrar o domínio e definir `NEXT_PUBLIC_SITE_URL` na Vercel
(Settings → Environment Variables) **antes do primeiro deploy público**. Depois
disso não mude mais: trocar de domínio depois de indexado custa meses.

### 2.2. Uma linha para o FAQPage entrar no ar

`src/app/(site)/faq-estruturado.tsx` está pronto e **não está montado**. Falta,
em `src/app/(site)/page.tsx`:

```tsx
import { FaqEstruturado } from "./faq-estruturado";
// ...
<Perguntas />
<FaqEstruturado />
```

Não fiz a edição porque `page.tsx` estava sendo alterado por outro agente no
mesmo momento. Ele fica na home e **só na home**, porque a diretriz do Google é
literal: o conteúdo marcado precisa estar visível na mesma página. FAQ marcado
em `/termos`, onde não há pergunta na tela, é caminho para ação manual — que
derruba o rich result do domínio inteiro, não só o do FAQ.

**Calibre a expectativa:** o briefing chamou o FAQPage de "vitória mais rápida
disponível". Isso era verdade até agosto de 2023, quando o Google restringiu o
rich result de FAQ a sites de **governo e saúde**. Este bloco **não vai render
sanfona no resultado de busca**. Ele continua valendo — entrega pergunta e
resposta em formato limpo para buscadores menores e para assistentes de IA, que
hoje são caminho real de descoberta — mas não é a alavanca. A alavanca é o
item 2.6.

### 2.3. Search Console e Bing Webmaster Tools

Sem isso você fica cego: não vê o que indexou, o que quebrou, nem por quais
termos aparece.

1. Search Console → adicionar a propriedade de domínio, verificar por DNS.
2. Enviar `https://SEU-DOMINIO/sitemap.xml`.
3. Bing Webmaster Tools — importa direto do Search Console em dois cliques, e é
   ele que alimenta as respostas do Copilot.

Se preferir verificar por meta tag em vez de DNS, o campo é
`verification: { google: "..." }` no `metadata` de `layout.tsx`.

### 2.4. Divergência de planos — **isto cobra errado, não é só SEO**

Existem **dois catálogos de planos vivos no repositório**:

| Origem | Planos |
|---|---|
| `src/app/(site)/planos.tsx` (o que a landing mostra) | Lite R$ 59,90 · Creator R$ 99,90 · Viral R$ 149,90 |
| `src/lib/planos/catalogo.ts` (o que o Stripe usa) | Criador R$ 47 · Profissional R$ 97 · Estúdio R$ 197 |

O JSON-LD segue a **landing**, porque dado estruturado é conferido contra o que
a página mostra. Mas os dois não podem coexistir quando a cobrança ligar:
anunciar um preço e cobrar outro é problema de CDC, não de SEO. **Decisão do
dono:** qual dos dois vale, e unificar.

### 2.5. Dívidas técnicas que eu não podia pagar agora

- **FAQ e planos estão duplicados** em `src/lib/gta/seo.ts`, copiados de
  `perguntas.tsx` e `planos.tsx`. As listas de lá são `const` local de
  componente `"use client"`, não são exportadas, e os arquivos estavam com
  outro agente. **Enquanto a duplicação existir, mexer no FAQ ou no preço da
  tela obriga a mexer em `seo.ts` junto** — senão a marcação passa a descrever
  uma página que não existe mais. O conserto certo é extrair as duas listas
  para módulos de dados e os componentes importarem.
- **`/entrar` e `/cadastro` estão bloqueados por `robots.txt`, e o certo seria
  `noindex`.** `Disallow` impede o rastreamento, não a indexação: uma URL
  bloqueada que receba link de fora ainda pode aparecer no Google, sem título e
  sem descrição. O ideal é `robots: { index: false }` no `metadata` de cada
  `page.tsx` de acesso — uma linha em cada, e ambos os arquivos estavam com
  outro agente.
- **Peso da home.** `hero-gta-viral.mp4` tem 3,9 MB e `logo-gta-viral-v3.png`
  tem 773 KB, os dois na primeira tela. Isso é LCP, e page experience é sinal de
  ranqueamento de verdade — diferente de `keywords`. Vale medir no PageSpeed
  Insights depois do deploy e, se confirmar, comprimir o vídeo e servir um
  poster antes dele.

### 2.6. Conteúdo editorial — **a maior oportunidade, e a única que move o ponteiro**

A pesquisa (`docs/gta/pesquisa-jogo.md`) é direta:

- **"gta 6 trailer": ~3,4 milhões de buscas/mês.**
- Os derivados de *breakdown* têm **concorrência muito menor** que o termo
  genérico — é o nicho com a melhor relação demanda/oferta que existe hoje.
- *Trailer breakdown / "coisas que você não viu"* é o formato **campeão
  absoluto** da comunidade, e ele **se renova a cada material oficial**. A
  comunidade ainda faz isso com o Trailer 1, três anos depois.

E o relógio: o *Extended Look* estreou **hoje**. A onda de breakdowns dura cerca
de uma semana. Depois dela, os próximos picos previsíveis são **11/11**
(resultados da Take-Two), **12/11** (preload) e **19/11** (lançamento).

**O problema:** o site tem **uma página**. Não existe URL para ranquear em nada
disso. Todo o trabalho acima é encanamento para um prédio sem andares.

**O que eu recomendo, concretamente:**

1. Criar uma seção editorial — `/breakdown/[slug]` — com uma página por
   material oficial. A primeira: *"An Extended Look: tudo que apareceu no
   trailer"*. Texto e análise, publicada **esta semana**.
2. Uma página **"tudo o que sabemos até agora"**, atualizada a cada notícia.
   Ela vive de ser atualizada e captura quem chega novo ao hype — e vai chegar
   muita gente nova até novembro. É o tipo de página que acumula link.
3. `Article` + `datePublished`/`dateModified` no JSON-LD dessas páginas, e
   incluí-las no `sitemap.ts` (a lista é escrita à mão de propósito — cada nova
   página entra lá).
4. Ligar as duas ao produto: quem chega para ler o breakdown é exatamente quem
   quer montar canal de cortes.

**A regra que não pode ser quebrada nisso:** nada de rehospedar material da
Rockstar. A política do próprio projeto (`docs/gta/politica-de-conteudo.md`)
proíbe, e a Take-Two está derrubando por DMCA — a pesquisa registra intimações
em curso. Análise em texto é nossa; o vídeo se cita pelo player oficial
incorporado, nunca por arquivo nosso.

### 2.7. Decisões menores, mas que são suas

- **Rastreadores de IA** (GPTBot, ClaudeBot, PerplexityBot) estão **liberados**,
  que é o padrão. Para um site que quer ser a referência de cortes de GTA VI no
  Brasil, ser citado por assistente é distribuição. Se quiser bloquear, é
  adicionar um bloco em `rules` no `robots.ts`.
- **Analytics.** Não há nenhum instalado. Vercel Analytics ou Plausible, os dois
  sem cookie — o que mantém a Política de Privacidade como está, já que ela
  hoje afirma não usar rastreamento de terceiros. Instalar Google Analytics
  obriga a atualizar aquele texto.
- **Perfis sociais.** Quando existirem, entram em `sameAs` na `Organization` —
  é o que amarra site e redes numa identidade só aos olhos do Google.

---

## 3. Checklist do dia do deploy

- [ ] Domínio registrado e `NEXT_PUBLIC_SITE_URL` definido na Vercel
- [ ] `<FaqEstruturado />` montado na home (item 2.2)
- [ ] Search Console verificado e sitemap enviado
- [ ] Bing Webmaster importado
- [ ] Rich Results Test do Google na home e em `/termos`
- [ ] Card conferido de verdade: colar o link no WhatsApp, no X e no Discord
- [ ] PageSpeed Insights na home (ver 2.5)
- [ ] `availability` das ofertas → `InStock` quando o Checkout entrar no ar
