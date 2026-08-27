# ⚠️ Dois catálogos de preço vivos ao mesmo tempo

**Status: não resolvido. Precisa de decisão do dono.**

Achado por dois agentes independentes (SEO e telas de conta) na mesma rodada, em
27/08/2026.

## O problema

A landing anuncia um conjunto de planos; a cobrança usa outro.

| | `src/app/(site)/planos.tsx` (o que o visitante vê) | `src/lib/planos/catalogo.ts` (o que o Stripe cobra) |
|---|---|---|
| | — | Grátis · R$ 0 · 3 análises |
| | Lite · R$ 59,90 · 60 análises | Criador · R$ 47 · 30 análises |
| | Creator · R$ 99,90 · 150 análises | Profissional · R$ 97 · 100 análises |
| | Viral · R$ 149,90 · 300 análises | Estúdio · R$ 197 · 300 análises |

Divergem em **nome, preço e limite**. Não é um número desatualizado: são duas
tabelas diferentes, cada uma com a sua verdade.

A tela de assinatura (`src/app/(painel)/assinatura/page.tsx`) lê do
**catálogo** — ou seja, quem se cadastra vendo "Creator R$ 99,90 com 150
análises" encontra "Profissional R$ 97 com 100 análises" na hora de assinar.

## Por que ainda não explodiu

A cobrança não está ligada. O próprio `planos.tsx` diz isso, e os botões levam
ao cadastro em vez de ao checkout. Enquanto for assim, ninguém é cobrado errado.

**No dia em que o checkout ligar, isso deixa de ser inconsistência de código e
vira problema de direito do consumidor** — preço anunciado diferente do preço
cobrado, com o agravante de o limite entregue ser menor que o prometido
(150 → 100 análises).

## Por que não corrigi sozinho

Qual tabela é a certa é decisão de negócio, não de engenharia. As duas são
defensáveis:

- O **catálogo** foi dimensionado sobre a capacidade real medida da VPS (1 vCPU,
  ~5 min por análise) e é o que está ligado à Stripe, com os price IDs já
  criados.
- A **landing** tem preços mais altos e limites mais generosos — foi escrita
  depois, provavelmente mirando o que o mercado cobra.

Escolher por conta própria significaria ou prometer capacidade que a máquina não
entrega, ou baixar o preço do produto sem mandato para isso.

## A correção, quando a decisão vier

Não basta acertar os números nos dois lugares: enquanto existirem duas tabelas,
elas voltam a divergir na próxima edição.

`planos.tsx` deve **importar de `catalogo.ts`** e derivar tudo dali — nome,
preço, limite, recursos. Uma tabela, um lugar. É o mesmo princípio que
`src/lib/gta/lancamento.ts` aplica às datas e `src/lib/gta/marca.ts` ao nome:
o dado que aparece em mais de uma tela mora num arquivo só.

## Enquanto isso

Antes de ligar o checkout, conferir:

1. Qual tabela vale
2. `planos.tsx` passa a ler de `catalogo.ts`
3. Os price IDs na Stripe batem com os valores da tabela escolhida
4. O texto "não existe cobrança ligada" sai da landing no mesmo deploy
