# GTA VIRAL — identidade visual

Documento de decisão. Cada valor aqui é colável; nenhum adjetivo aqui substitui
um token.

Arquivos desta entrega:

| Arquivo | O que é |
|---|---|
| `docs/gta/identidade.md` | este documento |
| `docs/gta/tokens.css` | tokens prontos para importar |
| `public/gta-viral.svg` | o lockup em arquivo — tinta clara fixa, para superfície escura (§4) |

---

## 1. A decisão, em uma frase

**Miami à noite, não a Rockstar.** Pôr do sol de tubo de néon, chanfro art déco,
água elétrica — tudo isso vem de South Beach e de 1984, é estética de gênero e é
nossa para usar. O que é da Rockstar — o logotipo deles, a fonte proprietária
dos títulos, o letreiro dos jogos, arte-chave, personagem — não aparece em lugar
nenhum, e nada aqui foi desenhado "parecido com". O letreiro é um alfabeto
geométrico construído do zero num grid; o símbolo é um sol chanfrado com um play
vazado. Se você tapar o nome, continua sendo um logo que funciona sozinho.

### O que mudou e o que não mudou

O produto é um SaaS escuro com sotaque laranja **que já funciona**. A
arquitetura fica de pé: os mesmos nomes de token em português, o mesmo truque de
reescrever as rampas do Tailwind no `@theme`, a mesma separação de papéis entre
as cores. Trocou a pele.

| | Antes | Agora |
|---|---|---|
| Fundo | `#09090b` neutro | `#0a0712` com veio violeta — a noite tem céu |
| Laranja (ação) | `#f74111` | `#f95d1e`, mais quente, puxado ao pôr do sol |
| Azul (dado) | `#0072ff` azul de link | ciano `#00a8d6`, água de piscina à noite |
| Marca / foco | era o próprio laranja | **magenta `#ff3d9a`**, papel novo |
| Título | Geist em tudo | Space Grotesk no display, Geist no corpo |

**A cor nova é o magenta, e ela ganhou um papel próprio: identidade e foco.**
Isso resolve um problema que existia antes — o anel de foco era da mesma cor do
botão primário, então "estou com o teclado aqui" e "este é o botão principal"
diziam a mesma coisa. Agora não dizem.

### Os três papéis, e eles não se misturam

```
LARANJA  = AÇÃO      o que VOCÊ faz       botão primário, item ativo, CTA
CIANO    = DADO      o que o app DEVOLVE  gráfico, métrica, barra, score
MAGENTA  = MARCA     quem somos           logo, foco, selo de marca, hero
```

A regra que resume tudo continua valendo, agora com três cores em vez de duas:
**se mais de 10% da tela está acesa, você matou a hierarquia.** Uma ação primária
por tela. Uma superfície com gradiente por tela. No máximo dois brilhos de néon
visíveis ao mesmo tempo.

---

## 2. Paleta

Todos os números abaixo foram **calculados** pela fórmula WCAG 2.1
(`(L1+0.05)/(L2+0.05)`), não estimados. Critério: texto normal ≥ 4.5, texto
grande (≥18.66px bold ou ≥24px) ≥ 3.0, borda que carrega informação ≥ 3.0.

### 2.1 Superfícies e texto

**Escuro (padrão)**

| Papel | Token | Hex |
|---|---|---|
| Poço — lateral, overlay, rodapé | `--fundo-poco` | `#05030a` |
| Fundo do app | `--fundo` | `#0a0712` |
| Superfície — card, painel, input | `--superficie` | `#150f22` |
| Elevada — hover, dropdown | `--superficie-2` | `#1e1730` |
| Elevada 2 — tooltip, menu sobre menu | `--superficie-3` | `#2a2140` |
| Divisor decorativo | `--borda` | `#2e2545` |
| Borda que informa — campo, toggle | `--borda-forte` | `#7a6d96` |
| Texto | `--texto` | `#f5f1f7` |
| Texto secundário | `--texto-2` | `#bdb2cf` |
| Legenda, metadado, placeholder | `--texto-3` | `#948aa8` |

| Combinação | Razão | Veredito |
|---|---|---|
| `--texto` sobre `--fundo` | **17.88** | AAA |
| `--texto` sobre `--superficie` | **16.74** | AAA |
| `--texto-2` sobre `--fundo` | **9.92** | AAA |
| `--texto-2` sobre `--superficie-2` | **8.55** | AAA |
| `--texto-3` sobre `--fundo` | **6.14** | AA |
| `--texto-3` sobre `--superficie` | **5.75** | AA |
| `--texto-3` sobre `--superficie-2` | **5.29** | AA |
| `--texto-3` sobre `--superficie-3` | **4.65** | AA (o limite — não desça mais) |
| `--borda-forte` sobre `--superficie` | **3.97** | passa (≥3) |
| `--borda-forte` sobre `--superficie-2` | **3.65** | passa |
| `--borda-forte` sobre `--fundo` | **4.24** | passa |
| `--borda` sobre `--fundo` | 1.39 | decorativa — **não use em campo** |

**Claro** (opt-in, `<html class="dark claro">`)

| Papel | Token | Hex |
|---|---|---|
| Poço | `--fundo-poco` | `#ede2db` |
| Fundo | `--fundo` | `#f7f1ee` |
| Superfície | `--superficie` | `#ffffff` |
| Elevada | `--superficie-2` | `#f0e7e2` |
| Elevada 2 | `--superficie-3` | `#e7dbd4` |
| Divisor decorativo | `--borda` | `#e2d6cf` |
| Borda que informa | `--borda-forte` | `#8d7c72` |
| Texto | `--texto` | `#17101f` |
| Texto secundário | `--texto-2` | `#4a3f57` |
| Legenda | `--texto-3` | `#6a5d78` |

| Combinação | Razão | Veredito |
|---|---|---|
| `--texto` sobre `--fundo` | **16.61** | AAA |
| `--texto` sobre `--superficie` | **18.58** | AAA |
| `--texto-2` sobre `--fundo` | **8.77** | AAA |
| `--texto-2` sobre `--superficie-2` | **8.05** | AAA |
| `--texto-3` sobre `--fundo` | **5.44** | AA |
| `--texto-3` sobre `--superficie` | **6.09** | AA |
| `--texto-3` sobre `--superficie-2` | **5.00** | AA |
| `--texto-3` sobre `--superficie-3` | **4.49** | limítrofe — **use `--texto-2` aqui** |
| `--borda-forte` sobre `--superficie` | **3.99** | passa |
| `--borda-forte` sobre `--fundo` | **3.57** | passa |
| `--borda-forte` sobre `--superficie-2` | **3.28** | passa |

O papel do tema claro não é branco: é `#f7f1ee`, papel quente com sal. Branco
puro fica só nas superfícies elevadas, onde o degrau precisa aparecer.

### 2.2 Rampas de marca

| # | Ação (laranja) | Dado (ciano) | Marca (magenta) |
|---|---|---|---|
| 300 | `#ffc48f` | `#9beeff` | `#ffa8d2` |
| 400 | `#ff9455` | `#4fd8f5` | `#ff6fb5` |
| 500 | `#ff7333` | `#22c8ea` | `#ff3d9a` |
| 600 | `#f95d1e` | `#00a8d6` | `#ec1d80` |
| 700 | `#d64510` | `#0079a8` | `#c2126a` |
| 800 | `#b03608` | `#046180` | `#a10a58` |
| 900 | `#4a1806` | `#073a4d` | `#4d0629` |
| 950 | `#2a0d03` | `#04222e` | `#2a0316` |

**Como texto sobre `--fundo` escuro**

| Cor | Razão | Veredito |
|---|---|---|
| `--acao-400` `#ff9455` | **9.14** | AAA ← o laranja de texto |
| `--acao-500` | 7.37 | AAA |
| `--acao-600` | 6.29 | AA |
| `--dado-400` `#4fd8f5` | **11.86** | AAA ← o ciano de número |
| `--dado-600` | 7.20 | AAA |
| `--neon-400` `#ff6fb5` | **7.79** | AAA ← o magenta de texto |
| `--neon-500` | 6.07 | AA |
| `--neon-600` | 4.80 | AA (o limite) |

**Como texto sobre `--fundo` claro** — aqui está a armadilha clássica:

| Cor | Razão | Veredito |
|---|---|---|
| ⚠️ `--acao-600` `#f95d1e` | **2.84** | **REPROVA** — nunca como texto no claro |
| ⚠️ `--acao-700` | 3.98 | só texto grande |
| `--acao-800` `#b03608` | **5.56** | AA ← use este |
| ⚠️ `--neon-600` | 3.71 | só texto grande |
| `--neon-700` `#c2126a` | **5.23** | AA |
| `--neon-800` | 6.95 | AA |
| ⚠️ `--dado-700` | 4.37 | quase — não use |
| `--dado-800` `#046180` | **6.20** | AA ← use este |

**Regra**: no claro, texto colorido desce **dois degraus** na rampa. Se você
escreveu `text-orange-600` num fundo claro, está errado; é `-800`.

### 2.3 Fundo sólido colorido

O botão primário é a decisão mais importante da paleta, e a saída é a mesma dos
dois lados: **laranja com texto quase preto**.

| Combinação | Razão | Veredito |
|---|---|---|
| `#0a0712` sobre `--acao-600` (escuro) | **6.29** | AA ← o botão |
| `#17101f` sobre `--acao-600` (claro) | **5.85** | AA ← o botão |
| ⚠️ branco sobre `--acao-600` | **3.18** | **REPROVA** em texto normal |
| ⚠️ branco sobre `--acao-700` | **4.45** | passa de raspão em nada — **REPROVA** |
| branco sobre `--acao-800` | 6.22 | AA — a saída se o branco for inegociável |
| `#0a0712` sobre `--neon-500` | 6.07 | AA |
| branco sobre `--neon-700` | 5.85 | AA |
| `#0a0712` sobre `--dado-600` | 7.20 | AAA |

O `--acao-700` é a pegadinha que engana: 4.45 *parece* 4.5 e não é. Se você
precisa de branco sobre laranja, o fundo é `--acao-800`, sem negociação.

### 2.4 Estados

| Papel | Escuro | Razão s/ `--fundo` | Claro | Razão s/ `--fundo` |
|---|---|---|---|---|
| Sucesso | `#3ddc97` | **11.29** AAA | `#0d7a4d` | **4.80** AA |
| Aviso | `#ffc247` | **12.41** AAA | `#8a5a00` | **5.30** AA |
| Erro | `#ff6b6b` | **7.19** AAA | `#c62828` | **5.03** AA |
| Info | `#4fd8f5` | **11.86** AAA | `#046180` | **6.20** AA |

Sobre `--superficie-2` no escuro os estados caem para 9.74 / 10.70 / 6.20 /
10.22 — todos ainda AA ou melhor.

### 2.5 Selos translúcidos

O padrão é **fundo com a própria cor a 14%** (16% no claro) e texto no tom
sólido. Nunca selo saturado sólido — vira ruído. Contrastes já compostos:

| Selo | Escuro (texto sobre 14% em `--superficie-2`) | Claro (16% sobre `--superficie`) |
|---|---|---|
| Marca | `--neon-400` → **5.68** | `--neon-800` → **6.36** |
| Ação | `--acao-400` → **6.62** | `--acao-800` → **5.17** |
| Dado | `--dado-400` → **8.43** | `--dado-800` → **5.88** |
| Sucesso | **7.38** | **4.85** |
| Aviso | **7.87** | **5.48** |
| Erro | **5.04** | **4.78** |

### 2.6 Gradientes

Três, e só em superfície grande.

```css
--grad-sol:      linear-gradient(180deg, #ffc247 0%, #ff7333 45%, #ec1d80 100%);
--grad-marquise: linear-gradient(100deg, #ff3d9a 0%, #f95d1e 55%, #ffc247 100%);
--grad-oceano:   linear-gradient(160deg, #22c8ea 0%, #0079a8 60%, #073a4d 100%);
```

`--grad-sol` é o símbolo e o avatar. `--grad-marquise` é o hero e a barra de
progresso. `--grad-oceano` é área de gráfico. **Nunca em texto abaixo de 32px,
nunca em botão de tabela, nunca dois na mesma tela.**

---

## 3. Tipografia

Duas famílias, ambas no Google Fonts. Uma delas o projeto já carrega.

### Display — **Space Grotesk** (500 / 600 / 700)

Grotesca de esqueleto geométrico com detalhes tortos de propósito (o `G`, a
perna do `R`, o `a` de um andar). Em corpo grande e tracking negativo ela soa
retrofuturista sem virar pastiche oitentista, e é justamente o registro que a
gente quer: néon, mas de 2026. É o oposto de uma fonte de pôster de videogame —
não tem serifa cortada, sombra, nem inclinação, então não há como confundir com
letreiro de jogo nenhum.

Usa em: hero, título de página, título de seção, número de métrica grande,
etiqueta caixa alta, rótulo de selo.

### Corpo — **Geist Sans** (400 / 500 / 600) — já no projeto

Fica. Trocar a fonte de corpo de um SaaS que já funciona é churn caro sem
retorno: a Geist é neutra, tem altura-x alta, foi desenhada para interface densa
e já está carregada via `next/font`. O contraste entre a Space Grotesk
característica e a Geist invisível é exatamente o que dá hierarquia — se as duas
tivessem personalidade, brigariam.

### Números — **Geist Mono** — já no projeto

Timecode, duração, ID. Em tabela e métrica use `font-variant-numeric:
tabular-nums` (já está no `tokens.css` para `table`, `.numero` e `.metrica`).

### Carregamento

```tsx
// src/app/layout.tsx
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});
```

E no `<html className={...}>` some `${spaceGrotesk.variable}` às outras. Em
`tokens.css`, troque a primeira entrada de `--fonte-titulo` por
`var(--font-space-grotesk)` — o nome literal `"Space Grotesk"` que está lá
funciona como fallback caso a fonte venha por `<link>`.

### Escala

| Uso | Token | Tam. | Peso | Família | Tracking | Cor |
|---|---|---|---|---|---|---|
| Hero | `--t-hero` | clamp 36→64 | 700 | título | -0.035em | `--texto` |
| Título de página | `--t-pagina` | 24 | 600 | título | -0.02em | `--texto` |
| Título de seção | `--t-secao` | 18 | 600 | título | -0.015em | `--texto` |
| Rótulo de bloco | `--t-rotulo` | 14 | 600 | corpo | 0 | `--texto` |
| Corpo | `--t-corpo` | 14 | 400 | corpo | 0 | `--texto-2` |
| Corpo pequeno | `--t-corpo-p` | 13 | 400 | corpo | 0 | `--texto-2` |
| Legenda / meta | `--t-meta` | 12 | 400 | corpo | 0 | `--texto-3` |
| Etiqueta caixa alta | `--t-etiqueta` | 11 | 600 | título | 0.09em | `--texto-3` |

Regras que não se negociam:

- **Nada abaixo de 11px**, e 11px só em caixa alta com tracking positivo.
- **Máximo ~70 caracteres por linha** em texto corrido: `max-width: 65ch`.
- Título grande pede tracking negativo; caixa alta pequena pede positivo.
- **No máximo dois pesos por tela.**

---

## 4. O logo

### Como foi construído

**Símbolo** — um octógono chanfrado (o chanfro a 45° é vocabulário art déco,
não de ninguém em particular) preenchido com o gradiente do pôr do sol: ouro em
cima, magenta na água. Dentro dele, dois vazados: um triângulo de *play* e três
lâminas horizontais na base. As lâminas são o sol descendo atrás do horizonte —
e são também a leitura de scanline. O vazado é feito com `mask`, então o buraco
é **transparente de verdade**: o mesmo arquivo assenta em fundo claro, escuro ou
foto sem knockout de cor.

**Letreiro** — alfabeto construído do zero num grid de 100 de altura, traço
único de 15, cantos chanfrados. Cada letra é um `path` de traço, não uma fonte:
não há dependência de webfont, não borra em nenhum tamanho, e não existe em
nenhum outro lugar do mundo. As letras nasceram da mesma geometria do símbolo
(chanfro de 16, ângulos retos e 45°), então lockup e ícone parecem irmãos.

**O trocadilho é a arte-final.** No nome GTA VIRAL o "VI" fica aceso no
gradiente e o resto na tinta do tema: você lê *GTA VIRAL* e enxerga *GTA VI*
dentro. É a única coisa colorida no letreiro, então o olho vai direto.

### Tamanhos

| Tamanho | O que usar | Lâminas do sol |
|---|---|---|
| **Favicon 32px e abaixo** | só o símbolo | **não** — some e vira sujeira |
| Lateral recolhida (28px) | só o símbolo | não |
| Cabeçalho (20–28px de altura) | lockup completo | não |
| Hero (48px+) | lockup completo | sim |

Área de respiro mínima em volta: metade da altura do símbolo, em qualquer lado.

### Componente

```tsx
// src/app/logo.tsx  — substitui o PNG e o Simbolo antigos
const BADGE = "M22 2H78L98 22V78L78 98H22L2 78V22Z";
const PLAY = "M38 28L76 50L38 72Z";

/** Sol chanfrado com o play vazado. `lâminas` só a partir de ~40px. */
export function Simbolo({ tamanho = 24, laminas = tamanho >= 40, id = "s" }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id={`sol-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc247" />
          <stop offset="0.45" stopColor="#ff7333" />
          <stop offset="1" stopColor="#ec1d80" />
        </linearGradient>
        <mask id={`vaz-${id}`}>
          <path d={BADGE} fill="#fff" />
          <path d={PLAY} fill="#000" />
          {laminas && (
            <>
              <rect x="0" y="76" width="100" height="4" fill="#000" />
              <rect x="0" y="84" width="100" height="5" fill="#000" />
              <rect x="0" y="91" width="100" height="5" fill="#000" />
            </>
          )}
        </mask>
      </defs>
      <path d={BADGE} fill={`url(#sol-${id})`} mask={`url(#vaz-${id})`} />
    </svg>
  );
}

/**
 * Lockup. Proporção 7,74:1. A tinta é `currentColor`: quem chama define
 * com `text-[var(--texto)]`, e o tema resolve sozinho.
 */
export function Logo({ altura = 24, id = "l" }: { altura?: number; id?: string }) {
  const laminas = altura >= 34;
  return (
    <svg
      height={altura}
      width={altura * 7.74}
      viewBox="0 0 774 100"
      role="img"
      aria-label="GTA VIRAL"
    >
      <defs>
        <linearGradient id={`sol-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffc247" />
          <stop offset="0.45" stopColor="#ff7333" />
          <stop offset="1" stopColor="#ec1d80" />
        </linearGradient>
        <linearGradient
          id={`vi-${id}`}
          gradientUnits="userSpaceOnUse"
          x1="286" y1="0" x2="384" y2="0"
        >
          <stop offset="0" stopColor="var(--gv-q1, #ff3d9a)" />
          <stop offset="0.55" stopColor="var(--gv-q2, #f95d1e)" />
          <stop offset="1" stopColor="var(--gv-q3, #ffc247)" />
        </linearGradient>
        <mask id={`vaz-${id}`}>
          <path d={BADGE} fill="#fff" />
          <path d={PLAY} fill="#000" />
          {laminas && (
            <>
              <rect x="0" y="76" width="100" height="4" fill="#000" />
              <rect x="0" y="84" width="100" height="5" fill="#000" />
              <rect x="0" y="91" width="100" height="5" fill="#000" />
            </>
          )}
        </mask>
      </defs>

      <path d={BADGE} fill={`url(#sol-${id})`} mask={`url(#vaz-${id})`} />

      <g
        transform="translate(144,0)"
        fill="none"
        strokeWidth="15"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        strokeMiterlimit="10"
      >
        <g stroke="currentColor">
          <path d="M54 24L38 8L24 8L8 24L8 76L24 92L38 92L54 76L54 54L34 54" />
          <path d="M82 8L144 8M113 8L113 92" />
          <path d="M172 92L178 8L212 8L218 92M174.4 58L215.6 58" />
        </g>
        <g stroke={`url(#vi-${id})`}>
          <path d="M294 8L317 92L340 8" />
          <path d="M376 8L376 92" />
        </g>
        <g stroke="currentColor">
          <path d="M412 92L412 8L442 8L458 24L458 34L442 50L412 50M438 50L458 92" />
          <path d="M494 92L500 8L534 8L540 92M496.4 58L537.6 58" />
          <path d="M576 8L576 76L592 92L622 92" />
        </g>
      </g>
    </svg>
  );
}
```

**Passe `id` diferente por instância na mesma página** — `<defs>` com id repetido
faz o navegador resolver todas para a primeira.

### Os dois temas

A tinta é `currentColor`, então herda. O que precisa de ajuste é o gradiente do
"VI": no papel claro o dourado do fim some. Adicione ao `globals.css`:

```css
:root {                 /* escuro: pode ir até o ouro */
  --gv-q1: #ff3d9a;
  --gv-q2: #f95d1e;
  --gv-q3: #ffc247;
}
:root:where(.claro) {   /* claro: fecha em laranja queimado (3.98 sobre o papel) */
  --gv-q1: #ec1d80;
  --gv-q2: #e04a13;
  --gv-q3: #d64510;
}
```

O arquivo `public/gta-viral.svg` **não** faz essa troca, e a decisão é
deliberada: ele tem a tinta clara `#f5f1f7` fixa.

A tentação era resolver por `@media (prefers-color-scheme: dark)` dentro do
próprio SVG, que é o certo para um arquivo que não sabe onde vai ser exibido.
Aqui não é: esta aplicação é escura **por identidade, não por preferência** —
o `<html>` leva a classe `dark` fixa (`layout.tsx`). Quem estivesse com o
sistema operacional no modo claro receberia o letreiro em `#17101f` sobre o
fundo `#0a0712` — preto sobre preto, invisível, e sem nenhum erro no console
para denunciar. O SVG não enxerga a classe do documento quando carregado via
`<img>`, e `currentColor` também não chega ali; então a cor é fixa e casa com o
único fundo que existe.

Consequência prática: **o arquivo serve para superfície escura** — favicon, OG
image, e-mail com fundo escuro. Dentro do app, use o componente, que herda a
tinta. Se um dia o tema claro sair do opt-in e virar padrão de alguma tela, este
arquivo precisa virar componente inline para herdar a cor — não basta editar o
`<style>`.

### O que o logo não faz

Não tem sombra projetada, não tem contorno, não tem versão inclinada, não vira
padrão de fundo, não é recolorido fora das duas variantes de gradiente acima, e
não recebe glow abaixo de 48px de altura.

---

## 5. Componentes

CSS real, com os tokens. Se o projeto preferir Tailwind, as classes utilitárias
equivalentes estão em cada bloco.

### 5.1 Botão

```css
.gv-botao {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;            /* 44 no toque — ver §7 */
  min-width: 44px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: var(--r-md);
  font: 500 var(--t-corpo)/1 var(--fonte-corpo);
  cursor: pointer;
  transition:
    background-color 150ms ease-out,
    border-color 150ms ease-out,
    transform var(--saida) ease-out;
}
.gv-botao:active { transform: scale(0.98); }
.gv-botao:focus-visible {
  outline: 2px solid var(--foco);
  outline-offset: 2px;
  box-shadow: var(--anel-foco);
}
.gv-botao[disabled] { opacity: 0.55; cursor: not-allowed; transform: none; }

/* PRIMÁRIO — um por tela. É o único elemento com brilho. */
.gv-botao--primario {
  background: var(--primaria);
  color: var(--primaria-texto);   /* quase preto: 6.29 escuro / 5.85 claro */
  font-weight: 600;
  box-shadow: var(--brilho-acao);
}
.gv-botao--primario:hover  { background: var(--primaria-hover); }
.gv-botao--primario:active { background: var(--primaria-ativa); }

/* SECUNDÁRIO */
.gv-botao--secundario {
  background: var(--superficie-2);
  color: var(--texto);
  border-color: var(--borda-forte);
}
.gv-botao--secundario:hover { border-color: var(--texto-3); background: var(--superficie-3); }

/* FANTASMA */
.gv-botao--fantasma { background: transparent; color: var(--texto-2); }
.gv-botao--fantasma:hover {
  background: color-mix(in srgb, var(--texto) 8%, transparent);
  color: var(--texto);
}

/* DESTRUTIVO — só vira fundo sólido na tela de confirmação. */
.gv-botao--destrutivo { background: transparent; color: var(--erro); }
.gv-botao--destrutivo:hover { background: color-mix(in srgb, var(--erro) 12%, transparent); }
```

Carregando: **troque o rótulo por spinner mantendo a largura**
(`min-width` gravado antes do clique, ou um `<span>` invisível com o rótulo
original). Botão que encolhe faz o layout saltar.

### 5.2 Cartão

```css
.gv-cartao {
  background: var(--superficie);
  border: 1px solid var(--borda);
  border-radius: var(--r-lg);
  padding: 20px;
}
.gv-cartao__titulo {
  font: 600 var(--t-secao)/1.3 var(--fonte-titulo);
  letter-spacing: -0.015em;
  color: var(--texto);
  margin: 0 0 6px;
}
.gv-cartao__corpo {
  font: 400 var(--t-corpo-p)/1.55 var(--fonte-corpo);
  color: var(--texto-2);
  margin: 0 0 14px;
  max-width: 65ch;
}

/* Clicável. Sombra OU borda forte, nunca as duas. */
a.gv-cartao, .gv-cartao--clicavel {
  transition:
    transform var(--entrada) var(--mola),
    box-shadow var(--entrada) var(--mola),
    border-color 150ms ease-out;
}
a.gv-cartao:hover, .gv-cartao--clicavel:hover {
  transform: translateY(-2px);
  box-shadow: var(--sombra-2);
  border-color: var(--borda-forte);
}
```

### 5.3 Campo de formulário

```css
.gv-rotulo {
  display: block;
  font: 600 var(--t-rotulo)/1.4 var(--fonte-corpo);
  color: var(--texto);
  margin-bottom: 6px;
}
.gv-campo {
  width: 100%;
  height: 40px;
  padding: 0 14px;
  background: var(--superficie);
  color: var(--texto);
  border: 1px solid var(--borda-forte);   /* ≥3.28:1 em toda superfície */
  border-radius: var(--r-md);
  font: 400 var(--t-corpo) var(--fonte-corpo);
  outline: none;
  transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
}
.gv-campo::placeholder { color: var(--texto-3); }
.gv-campo:focus {
  border-color: var(--foco);              /* magenta: 6.07 escuro / 5.23 claro */
  box-shadow: var(--anel-foco);
}
.gv-campo[aria-invalid="true"] { border-color: var(--erro); }
.gv-campo[disabled] { opacity: 0.6; cursor: not-allowed; }

.gv-dica { font: 400 var(--t-meta)/1.5 var(--fonte-corpo); color: var(--texto-3); margin: 6px 0 0; }
.gv-erro { font: 400 var(--t-meta)/1.5 var(--fonte-corpo); color: var(--erro);    margin: 6px 0 0; }
```

Rótulo sempre **acima**. Dica abaixo. Erro abaixo da dica, com
`aria-describedby` apontando para ele.

**Por que o foco é magenta e não laranja**: se o anel de foco tivesse a cor do
botão primário, um campo focado e um botão principal diriam a mesma coisa
visualmente. O magenta é a marca, não a ação — ele marca "o teclado está aqui"
sem sugerir "clique isto".

### 5.4 Navegação lateral

```css
.gv-lateral {
  width: 240px;                         /* 68px recolhida */
  background: var(--fundo-poco);        /* mais escura que o conteúdo: recua */
  border-right: 1px solid var(--borda);
  display: flex;
  flex-direction: column;
}
.gv-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;                     /* alvo de toque */
  padding: 0 12px;
  border-radius: var(--r-md);
  color: var(--texto-2);
  font: 500 var(--t-corpo)/1 var(--fonte-corpo);
  text-decoration: none;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}
.gv-nav:hover {
  background: color-mix(in srgb, var(--texto) 7%, transparent);
  color: var(--texto);
}
/* ATIVO — laranja sólido. Sem brilho: o brilho é do botão primário, e dois
   objetos acesos na mesma tela empatam a hierarquia. */
.gv-nav[aria-current="page"] {
  background: var(--primaria);
  color: var(--primaria-texto);
  font-weight: 600;
}
.gv-nav:focus-visible { outline: 2px solid var(--foco); outline-offset: -2px; }
```

Máximo 5 a 7 itens de topo. Profundidade vira aba dentro da página, não item de
menu. Ícone preenchido quando ativo, contorno quando não — uma biblioteca só
(o projeto usa Phosphor; mantenha).

### 5.5 Selo / etiqueta

```css
.gv-selo {
  display: inline-flex;
  align-items: center;
  border-radius: var(--r-sm);
  padding: 3px 8px;
  font: 600 var(--t-etiqueta)/1.5 var(--fonte-titulo);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.gv-selo--neutro  { background: var(--superficie-2); color: var(--texto-3); }
.gv-selo--marca   { background: color-mix(in srgb, var(--neon-500) 14%, transparent); color: var(--neon-400); }
.gv-selo--acao    { background: color-mix(in srgb, var(--acao-600) 14%, transparent); color: var(--acao-400); }
.gv-selo--dado    { background: color-mix(in srgb, var(--dado-600) 14%, transparent); color: var(--dado-400); }
.gv-selo--sucesso { background: color-mix(in srgb, var(--sucesso)  14%, transparent); color: var(--sucesso); }
.gv-selo--erro    { background: color-mix(in srgb, var(--erro)     14%, transparent); color: var(--erro); }

/* No claro o texto do selo desce dois degraus na rampa. */
:root:where(.claro) .gv-selo--marca { color: var(--neon-800); }
:root:where(.claro) .gv-selo--acao  { color: var(--acao-800); }
:root:where(.claro) .gv-selo--dado  { color: var(--dado-800); }
```

Opcional, só no hero e no cartão de destaque: `.gv-selo--chanfro` com
`border-radius: 0; clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);`
Fora do hero, não — o chanfro em componente de trabalho cansa em três telas.

---

## 6. Movimento e textura

### Movimento

O princípio não muda: **a saída é mais rápida que a entrada.**

| Evento | Duração | Curva |
|---|---|---|
| Hover, cor, borda | 150ms | ease-out |
| Sai da tela | `--saida` 130ms | ease-in |
| Entra na tela | `--entrada` 220ms | ease-out, atrasado em `--saida` |
| Altura (acordeão) | 200ms | ease-out, `grid-template-rows: 0fr → 1fr` |
| Troca de página | 220ms + 8px subindo | `--mola` |

Nada acima de 400ms. A lateral **não se mexe** na troca de página — ela é a
âncora espacial (o `view-transition-group(lateral)` congelado já está no
`globals.css` atual; mantenha).

O que **não** entra nesse produto: néon pulsando em loop, letreiro piscando,
scanline rolando, texto com efeito de digitação. Movimento infinito em SaaS é
carga cognitiva permanente por zero informação.

### Textura — a dose

Três texturas, cada uma com um lugar e um teto.

**1. Grão (`--grao-opacidade: 0.035`)** — quebra a chapa do gradiente e tira o
plástico. Sobreposição fixa, sem custo de rede:

```css
.gv-grao::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: var(--grao-opacidade);
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
}
```

Onde entra: hero, seção de landing, estado vazio, cartão de destaque, avatar.
**Onde NÃO entra: formulário, tabela, lista densa, qualquer bloco de texto
corrido, e nenhuma superfície menor que ~200×200px.** Grão em cima de texto de
14px baixa a nitidez da fonte de verdade — não é impressão.

**2. Scanline (`--scanline-opacidade: 0.025`)**

```css
.gv-scanline::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: var(--scanline-opacidade);
  background: repeating-linear-gradient(
    180deg, #000 0 1px, transparent 1px 3px
  );
}
```

Onde entra: **só por cima de mídia** — thumb de vídeo, player, poster do hero.
É a piscada de VHS que combina com o assunto do produto.
**Onde NÃO entra: em qualquer lugar que não seja vídeo.** Scanline sobre UI é
o erro que mais rápido transforma retrô em poluição, e sobre texto pequeno
produz moiré em tela de alta densidade.

**3. Néon (brilho)** — `--brilho-acao` e `--brilho-neon` são `box-shadow`
coloridas, e valem por serem raras.

Regras: **no máximo dois objetos acesos por tela**, e na prática um. O botão
primário tem brilho. O item ativo da lateral **não** — o preenchimento sólido já
o distingue. Nunca brilho em texto abaixo de 24px (`text-shadow` colorido em
corpo de 14px destrói a leitura). Nunca brilho em elemento de tabela ou de
formulário. Nunca dois brilhos de cores diferentes se tocando.

**4. Grid de horizonte** — a perspectiva synthwave, se usada, aparece **uma vez
por sessão**: no hero da landing ou no estado vazio grande, sempre com
`mask-image: linear-gradient(to top, #000, transparent)` para sumir antes de
encostar em qualquer texto. Nunca como fundo de página do painel.

### Resumo do que evita

| Textura | Sim | Não |
|---|---|---|
| Grão 3,5% | hero, vazio, cartão de destaque, avatar | formulário, tabela, texto corrido, <200px |
| Scanline 2,5% | thumb, player, poster | qualquer coisa que não seja vídeo |
| Brilho néon | botão primário (1 por tela) | item de lista, tabela, campo, texto <24px |
| Gradiente | superfície ≥200px, hero, barra, avatar | texto <32px, botão de tabela, 2 por tela |
| Horizonte em perspectiva | hero, estado vazio grande | fundo do painel |

---

## 7. Acessibilidade

**Foco visível** — global, já em `tokens.css`:

```css
:focus-visible {
  outline: 2px solid var(--foco);
  outline-offset: 2px;
  border-radius: var(--r-sm);
}
```

Nunca `outline: none` sem substituto. Em item que encosta na borda do container
(item de lateral, linha de tabela) use `outline-offset: -2px` para o anel não
ser cortado. O anel magenta mede **6.07:1** sobre `--fundo` escuro e **5.23:1**
sobre o claro — visível nos dois.

**Alvo de toque ≥ 44×44px.** O botão tem 40px de altura por densidade; em
qualquer superfície tocável isso sobe. Para ícone pequeno, mantenha o ícone e
cresça o alvo sem crescer o desenho:

```css
.gv-alvo { position: relative; }
.gv-alvo::before {
  content: "";
  position: absolute;
  inset: 50% auto auto 50%;
  width: 44px; height: 44px;
  transform: translate(-50%, -50%);
}
@media (pointer: coarse) {
  .gv-botao, .gv-campo { height: 44px; }
}
```

O `.gv-nav` já nasce com `min-height: 44px`.

**`prefers-reduced-motion`** — o `tokens.css` já zera durações globalmente e o
`globals.css` já neutraliza as view transitions. Mantenha os dois. Nada neste
sistema depende de animação para comunicar estado: o item ativo é cor sólida, o
carregando é rótulo trocado, o erro é borda mais texto.

**Cor nunca é o único sinal.** Erro tem borda **e** mensagem. Item ativo tem
fundo **e** `aria-current="page"` **e** ícone preenchido. Selo de status tem cor
**e** palavra.

**Checklist antes de mandar tela**

- [ ] Uma única ação primária, um único objeto com brilho
- [ ] Todo texto ≥4.5 — no claro, texto colorido está em `-800`
- [ ] Borda de campo é `--borda-forte`, nunca `--borda`
- [ ] `:focus-visible` em tudo que recebe teclado, sem corte
- [ ] Alvo ≥44px em ponteiro grosso
- [ ] Estados cobertos: vazio, carregando, erro, sucesso
- [ ] Números com `tabular-nums`
- [ ] Testado em 375px
- [ ] Tabela e código rolam no próprio container
- [ ] `prefers-reduced-motion` respeitado
- [ ] Nada abaixo de 11px
- [ ] Zero grão e zero scanline em formulário e tabela

---

## 8. Como aplicar

1. Copie `docs/gta/tokens.css` para `src/app/gta-tokens.css`.
2. Em `src/app/globals.css`, logo depois de `@import "tailwindcss";`, adicione
   `@import "./gta-tokens.css";` e **remova o bloco `:root` antigo e os dois
   `@theme` antigos** — eles são substituídos.
3. Adicione `Space_Grotesk` ao `layout.tsx` (§3) e troque a primeira entrada de
   `--fonte-titulo` por `var(--font-space-grotesk)`.
4. Substitua `src/app/logo.tsx` pelo componente da §4. Some `/logo-viral-farm.png`
   do `app-shell.tsx`; `Logo` agora recebe `altura` e herda a tinta de
   `currentColor` — envolva num elemento com `color: var(--texto)`.
5. As classes `bg-orange-*`, `text-blue-*` etc. espalhadas pelos componentes
   **não precisam mudar**: as rampas foram reescritas.
6. Faça uma varredura por dois pontos que as rampas não resolvem sozinhas:
   - `text-white` em cima de laranja → troque por `text-[var(--primaria-texto)]`
     (o branco reprova em 3.18);
   - `text-orange-600` / `text-blue-600` em superfície clara → suba para `-800`.

---

## 9. Sobre a linha que não se atravessa

Registrado, para quem herdar isto:

- Néon, entardecer rosa e laranja, palmeira, chanfro art déco, grão de VHS,
  scanline, sol de lâminas — **estética de gênero**, vem de Miami e dos anos 80.
  Livre.
- Logotipo da Rockstar, a marca "GTA" como eles a desenham, o letreiro dos
  jogos, a fonte proprietária dos títulos, arte-chave, captura oficial, retrato
  de personagem — **não aparecem**, nem redesenhados, nem "inspirados".
- Este letreiro é um alfabeto geométrico construído num grid, sem serifa
  cortada, sem sombra projetada, sem inclinação, sem contorno duplo. Não se
  parece com letreiro de jogo nenhum, e é essa a intenção.
- Fontes: **Space Grotesk** e **Geist** / **Geist Mono**, todas no Google Fonts,
  todas com licença livre (OFL / SIL). Nenhuma outra é necessária.
