---
name: design-saas
description: Sistema de design para SaaS escuro — paleta laranja #f74211 / marinho #0a0f2d / preto, com tokens, componentes, movimento e pares de contraste já medidos em WCAG. Use ao criar, revisar ou refinar qualquer interface: tela, página, dashboard, formulário, componente, card, tabela, modal, e-mail ou landing. Dispara em pedidos como "cria a tela", "monta o componente", "melhora o visual", "deixa mais bonito", "aplica a identidade", "qual cor uso", "paleta", "cor da marca", "espaçamento", "tipografia", "deixa mais fluido", "premium", "moderno".
---

# Design de SaaS — Viral Shorts IA

Sistema escuro, denso e calmo. A referência é Linear, Vercel, Stripe e Arc: **muito preto, pouca cor, e a cor que aparece significa alguma coisa**.

A regra que resume tudo: *o laranja é o dedo apontando*. Se tudo é laranja, nada é.

## Antes de escrever qualquer CSS

1. **Superfície escura, não cinza-azulada lavada.** O fundo é quase preto. Profundidade vem de degraus sutis de superfície, não de bordas grossas.
2. **Uma ação primária por tela.** Só ela usa laranja sólido. O resto é fantasma ou texto.
3. **Hierarquia por peso e cor de texto, não por tamanho.** Três níveis de texto resolvem 95% dos casos.
4. **Espaço em branco é o item mais barato e mais eficaz.** Na dúvida, tire elemento e aumente respiro.

---

## Tokens

Cole em `globals.css`. Nomes em português para bater com o resto do código.

```css
:root {
  /* --- superfícies (escuro) --- */
  --preto-950: #06070b;  /* fundo mais profundo, modais, overlay */
  --preto-900: #0b0d13;  /* FUNDO PADRÃO DO APP */
  --preto-800: #13161f;  /* superfície: card, painel, input */
  --preto-700: #1c202b;  /* superfície elevada: hover, dropdown, popover */
  --preto-600: #262a36;  /* divisor sutil (decorativo) */
  --preto-500: #3a4152;  /* borda visível */
  --preto-400: #767e90;  /* borda interativa (campo de formulário) */

  /* --- texto --- */
  --texto:    #f6f6f6;  /* títulos e corpo */
  --texto-2:  #aab1c0;  /* secundário, descrições */
  --texto-3:  #838b9c;  /* legendas, metadados, placeholder */

  /* --- marca --- */
  --marca-300: #ffc4b6;  /* topo do gradiente de fogo */
  --marca-400: #ff7a4d;  /* TEXTO laranja sobre escuro (link, destaque) */
  --marca-500: #ff5c2b;  /* hover de botão sólido */
  --marca:     #f74211;  /* A COR DA MARCA — fundo sólido, foco, ativo */
  --marca-700: #d6380e;  /* fundo laranja quando o texto PRECISA ser branco */
  --marca-800: #c6330c;  /* texto laranja sobre fundo CLARO */
  --marca-900: #56180b;  /* base do gradiente de fogo */

  /* --- apoio --- */
  --marinho:  #0a0f2d;  /* seções de destaque, hero, rodapé */
  --ardosia:  #525663;  /* ícone apagado, ilustração, borda em tema claro */
  --claro:    #f6f6f6;  /* tema claro / superfície invertida */

  /* --- estados --- */
  --sucesso: #2fbf71;
  --aviso:   #f5a524;
  --erro:    #f04438;
  --info:    #8fa2f0;   /* como TEXTO sobre escuro */
  --info-bg: #3e54b5;   /* como FUNDO, com texto branco */

  /* --- gradientes (use com parcimônia: hero, card de destaque, avatar) --- */
  --grad-fogo:   linear-gradient(135deg, #ffc4b6 0%, #f74211 55%, #56180b 100%);
  --grad-oceano: linear-gradient(135deg, #bbc9f9 0%, #3e54b5 55%, #0a0f2d 100%);

  /* --- raio --- */
  --r-sm: 8px;    /* badge, pílula, checkbox */
  --r-md: 12px;   /* botão, input */
  --r-lg: 16px;   /* card, painel */
  --r-xl: 24px;   /* hero, modal, seção grande */

  /* --- sombra (escura: sombra é preta e difusa, nunca cinza) --- */
  --sombra-1: 0 1px 2px rgb(0 0 0 / 0.4);
  --sombra-2: 0 4px 16px rgb(0 0 0 / 0.45);
  --sombra-3: 0 16px 48px rgb(0 0 0 / 0.55);
  --brilho-marca: 0 4px 16px rgb(247 66 17 / 0.28);  /* só no botão primário */

  /* --- movimento --- */
  --saida:   130ms;
  --entrada: 220ms;
  --mola:    cubic-bezier(0.22, 1, 0.36, 1);
}
```

Em Tailwind 4, exponha no `@theme` e **reescreva a rampa laranja** para não precisar tocar em classe nenhuma:

```css
@theme {
  --color-orange-400: #ff7a4d;
  --color-orange-500: #ff5c2b;
  --color-orange-600: #f74211;
  --color-orange-700: #d6380e;
}
```

---

## Contraste — valores medidos, não estimados

Cada número abaixo foi calculado pela fórmula WCAG 2.1. **Respeite as três armadilhas** marcadas.

| Combinação | Razão | Veredito |
|---|---|---|
| `--texto` sobre `--preto-900` | 17.97 | AAA |
| `--texto-2` sobre `--preto-900` | 9.03 | AAA |
| `--texto-3` sobre `--preto-900` | 5.68 | AA |
| `--texto-3` sobre `--preto-700` | 5.28 | AA |
| `--marca` como texto sobre `--preto-900` | 5.31 | AA |
| `--marca-400` como texto sobre `--preto-900` | 7.53 | AAA ← prefira este |
| **preto `#06070b` sobre `--marca`** | **5.51** | **AA ← use este no botão** |
| ⚠️ branco sobre `--marca` | 3.66 | **só texto grande** |
| ⚠️ `--marca` como texto sobre `--claro` | 3.38 | **só texto grande** |
| ⚠️ `--info-bg` como texto sobre escuro | 2.90 | **REPROVA** |
| branco sobre `--marca-700` | 4.74 | AA |
| `--marca-800` sobre `--claro` | 5.01 | AA |
| branco sobre `--info-bg` | 6.69 | AA |
| `--sucesso` sobre `--preto-900` | 8.15 | AAA |
| `--aviso` sobre `--preto-900` | 9.52 | AAA |
| `--erro` sobre `--preto-900` | 5.17 | AA |
| `--info` sobre `--preto-900` | 7.95 | AAA |

### As três armadilhas

1. **Botão laranja com texto branco reprova.** O `#f74211` é claro demais: branco em cima dá 3.66, e texto normal precisa de 4.5. Duas saídas legítimas:
   - **Texto quase preto sobre o laranja** (5.51). É o visual mais moderno e é o padrão da casa.
   - Se o branco for inegociável, escureça o fundo para `--marca-700` (4.74).

2. **Laranja como texto sobre fundo claro reprova** (3.38). Em tema claro use `--marca-800`.

3. **O azul `#3e54b5` só serve como fundo.** Como texto sobre escuro dá 2.90. Para texto informativo use `--info` (`#8fa2f0`, 7.95).

### Bordas

Divisor decorativo pode ser baixo contraste (`--preto-600`, 1.36) — ele não carrega informação. Mas **borda de campo de formulário carrega**: ela diz onde o campo começa. Essas precisam de ≥3:1, então use `--preto-400` (4.77).

---

## Tipografia

Uma família só. Geist, Inter ou a do sistema. Peso faz o trabalho que tamanho faria.

| Uso | Tamanho | Peso | Cor | Tracking |
|---|---|---|---|---|
| Título de página | 24px | 600 | `--texto` | -0.02em |
| Título de seção | 18px | 600 | `--texto` | -0.01em |
| Rótulo de bloco | 14px | 600 | `--texto` | normal |
| Corpo | 14px | 400 | `--texto-2` | normal |
| Corpo pequeno | 13px | 400 | `--texto-2` | normal |
| Legenda / meta | 12px | 400 | `--texto-3` | normal |
| Etiqueta caixa alta | 11px | 600 | `--texto-3` | 0.08em |

Regras:
- **Nunca abaixo de 11px.** E 11px só em caixa alta com tracking.
- **Máximo 70 caracteres por linha** em texto corrido (`max-width: 65ch`).
- **Números tabulares** em tabela e métrica: `font-variant-numeric: tabular-nums`. Sem isso as colunas dançam.
- Título grande pede tracking negativo; caixa alta pequena pede tracking positivo.

---

## Espaçamento

Escala de 4px: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 64`.

- Dentro de um componente: 8 a 12
- Entre componentes irmãos: 16 a 24
- Entre seções: 40 a 64
- Respiro interno de card: 20 a 24
- Largura máxima de conteúdo: 1024px (`max-w-5xl`)

**Agrupe por proximidade.** Se dois elementos se relacionam, aproxime-os mais do que do resto. Isso comunica hierarquia sem desenhar caixa nenhuma.

---

## Componentes

### Botão

```
primário    fundo --marca, texto #06070b, peso 500, --r-md, --brilho-marca
            hover: --marca-500      ativo: scale(0.98)
secundário  fundo --preto-700, texto --texto, borda --preto-500
fantasma    sem fundo, texto --texto-2, hover: fundo branco/5%
destrutivo  texto --erro, borda transparente; só vira fundo sólido na confirmação
```

Altura 40px (`py-2.5 px-4`). Ícone à esquerda, 16–18px. **Uma primária por tela.**

Estado de carregando: troque o rótulo por spinner + mantenha a largura. Botão que encolhe faz o layout pular.

### Card

```
fundo --preto-800, borda --preto-600, --r-lg, padding 20–24px
hover (se clicável): translateY(-2px) + --sombra-2 + borda --preto-500
transição 200ms --mola
```

Não empilhe sombra com borda forte. Escolha uma.

### Campo de formulário

```
fundo --preto-800, borda --preto-400, --r-md, padding 10px 14px, texto 14px
placeholder --texto-3
foco: borda --marca + ring 3px rgb(247 66 17 / 0.15)
erro: borda --erro + mensagem 12px --erro embaixo
desabilitado: opacidade 60% + cursor not-allowed
```

Rótulo sempre acima, 14px, `--texto`. Dica abaixo, 12px, `--texto-3`.

### Badge / pílula

```
--r-sm, 11px, peso 600, padding 2px 8px
neutro   fundo --preto-700, texto --texto-3
marca    fundo rgb(247 66 17 / 0.12), texto --marca-400
sucesso  fundo rgb(47 191 113 / 0.12), texto --sucesso
```

Fundo translúcido da própria cor a 12% é o padrão. Nunca badge sólido saturado — vira ruído.

### Tabela

- Cabeçalho: 11px caixa alta, `--texto-3`, sem fundo, só borda inferior `--preto-600`
- Linha: 44–52px de altura, borda inferior `--preto-600`
- Hover: fundo branco/3%
- **Zebra não.** Em tema escuro polui.
- Números à direita, com `tabular-nums`

### Estado vazio

Sempre três partes: **ícone apagado** (`--ardosia`, 32px) → **frase que diz o que falta** → **ação primária**. Nunca só "nenhum resultado".

### Modal

```
overlay: rgb(6 7 11 / 0.7) + backdrop-blur(4px)
painel: fundo --preto-800, --r-xl, --sombra-3, max-width 520px
```

Fecha com Esc e clique fora. Foco travado dentro. Ao abrir, foco no primeiro campo — ou no botão seguro, se houver ação destrutiva.

---

## Movimento

O princípio: **a saída é sempre mais rápida que a entrada**. O que está indo embora não deve disputar atenção com o que está chegando.

| Evento | Duração | Curva |
|---|---|---|
| Hover, cor, borda | 150ms | ease-out |
| Sai da tela | `--saida` (130ms) | ease-in |
| Entra na tela | `--entrada` (220ms) | ease-out, atrasado em `--saida` |
| Altura (acordeão) | 200ms | ease-out |
| Transição de página | 220ms + 8px subindo | `--mola` |

Truques que valem:
- **Altura animada sem saber a altura:** `grid-template-rows: 0fr → 1fr` com `overflow: hidden` no filho.
- **Menu lateral não se mexe na troca de página.** Ele é a âncora espacial. Se escorregar junto, o usuário perde a referência de que só o conteúdo mudou.
- **Sempre** feche com `@media (prefers-reduced-motion: reduce)` zerando durações.

Nada acima de 400ms. Movimento longo parece travamento.

---

## Layout de app

```
lateral fixa 240px  │  conteúdo (max 1024px, centralizado)
   recolhida 68px   │
```

- Lateral: fundo `--preto-950`, borda direita `--preto-600`. Mais escura que o conteúdo — ela recua, o conteúdo avança.
- Item ativo: fundo `--marca` sólido, texto `#06070b`, `--r-md`.
- Item inativo: texto `--texto-2`, hover fundo branco/5%.
- Rodapé da lateral: avatar + nome + menu de conta.
- **Máximo 5 a 7 itens de topo.** Profundidade vira aba dentro da página, não item de menu.

Ícones: uma biblioteca só, um peso só. Preenchido quando ativo, contorno quando não.

---

## Anti-padrões

Não faça:

- **Laranja em tudo.** Se mais de 10% da tela é laranja, você matou a hierarquia.
- **Branco puro `#ffffff` como texto.** Vibra no escuro. Use `--texto` (`#f6f6f6`).
- **Preto puro `#000000` como fundo.** Some no OLED e some as bordas junto. Use `--preto-900`.
- **Borda de 1px em cinza claro.** No escuro, borda é escura; separação vem de mudança de superfície.
- **Sombra cinza.** Sombra em tema escuro é preta e difusa.
- **Mais de dois pesos de fonte por tela.**
- **Gradiente em texto pequeno.** Só em superfície grande.
- **Dois menus mostrando a mesma coisa.** Lateral e abas devem cobrir níveis diferentes.
- **Botão que muda de largura** ao carregar.
- **Densidade uniforme.** Tela toda com o mesmo espaçamento não tem hierarquia.

---

## Checklist antes de entregar

- [ ] Uma única ação primária por tela
- [ ] Todo texto passa AA (4.5) — atenção às três armadilhas acima
- [ ] Borda de campo de formulário com ≥3:1
- [ ] `:focus-visible` visível em tudo que recebe teclado
- [ ] Estados cobertos: vazio, carregando, erro, sucesso
- [ ] Números com `tabular-nums`
- [ ] Testado em 375px de largura
- [ ] Conteúdo largo (tabela, código) rola dentro do próprio container, não empurra a página
- [ ] `prefers-reduced-motion` respeitado
- [ ] Nada abaixo de 11px
- [ ] O que não funciona está honestamente marcado — nunca finja funcionalidade
