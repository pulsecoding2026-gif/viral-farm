# Performance da home — GTA VIRAL

Tráfego de pico vindo do trailer de GTA VI, majoritariamente **celular em rede
móvel brasileira**. Tudo aqui foi medido nesta máquina; nada é estimativa,
e onde não deu para medir está escrito que não deu.

---

## 1. O que foi medido, antes

### O vídeo do hero — `public/hero-gta-viral.mp4`

Não há `ffmpeg` nem `ffprobe` nesta máquina (nem no `PATH`, nem em
`node_modules`, nem em `.env.local`). As medidas abaixo saíram de uma sonda que
lê as caixas do container MP4 direto do arquivo, em Node puro.

| Medida | Valor |
| --- | --- |
| Tamanho | 3 859,9 KB (3,77 MB) |
| Duração | 8,0 s |
| Resolução | 1280x720 |
| Taxa de quadros | 24,000 fps exatos (192 quadros / 8 s) |
| Bitrate de vídeo | 3 810 kbps |
| **Keyframes** | **1 (só o primeiro quadro)** |
| `faststart` (`moov` antes do `mdat`) | **já correto** |
| Trilha de áudio | **existe** — 128 kbps, 125,7 KB |

Quatro conclusões, e duas contrariam o que se suspeitava:

1. **A taxa de quadros é constante.** A primeira armadilha documentada em
   `hero-video.tsx` (taxa variável) **não se aplica** a este material.
2. **A segunda armadilha está aqui:** um único keyframe. Cada volta do loop
   reconstrói a imagem desde o começo. É o motivo real de reencodar.
3. **`+faststart` não vai render nada** — o `moov` já vem antes do `mdat`.
   Repetir a flag não é errado, mas não é dela que virá o ganho.
4. **Há uma trilha de áudio de 125,7 KB** num vídeo que toca `muted` e
   `aria-hidden`. É peso morto que ninguém jamais ouve.

3 810 kbps para 720p é aproximadamente o dobro do necessário.

### As imagens

| Arquivo | Antes | Onde aparece |
| --- | --- | --- |
| `logo-gta-viral-v3.png` | 755,1 KB — 1774x887 | home, painel, páginas legais |
| `acesso-viral-farm.png` | 1 797,8 KB — 1254x1254 | só entrar/cadastro, só desktop |

**O `next/image` está mesmo funcionando** — confirmado no HTML gerado e nas
respostas do servidor. O navegador **nunca recebeu os 755 KB**: recebia 51 KB
de WebP. Os 755 KB eram custo de repositório e de origem, não de visitante.

Mas o `srcset` do logo mostrava o desperdício real:

```
/_next/image?url=%2Flogo-gta-viral-v3.png&w=1920&q=75 1x,
/_next/image?url=%2Flogo-gta-viral-v3.png&w=3840&q=75 2x
```

O logo é exibido em **132–164 px** (o maior uso real é a lateral do painel,
~216 px). Estava sendo pedido em **1920 e 3840 px**. A causa: o `<Image>` do
logo não passa `sizes`, então o Next assume largura de tela cheia e escolhe os
maiores tamanhos da lista.

---

## 2. O que mudou, e o ganho medido

### `public/logo-gta-viral-v3.png` — reduzido na fonte

**MESMO NOME DE ARQUIVO** (a URL é a chave de cache), **mesma proporção 2:1**,
então não há salto de layout. Redimensionado para 768x384 e gravado com paleta.

768 px cobre o maior uso real (~216 px) com folga de 3x de densidade de tela.

| | Antes | Depois | Ganho |
| --- | --- | --- | --- |
| Arquivo no repositório | 755,1 KB | **47,1 KB** | **−93,8%** |
| WebP entregue | 51,0 KB | **19,1 KB** | **−62,5%** |
| AVIF entregue | não existia | 19,9 KB | — |

A paleta foi verificada, não chutada: comparado pixel a pixel contra o original
composto sobre o fundo do site, a diferença média é de **0,87 / 255** (0,34%) e
o canal alfa fica praticamente intacto (média 0,105). Comparando o que o
navegador de fato recebe, o erro visível é **idêntico** ao da versão sem paleta
(1,94 contra 1,92) — ou seja, o que sobra vem do WebP em qualidade 75, não da
paleta. A paleta sai de graça.

> Cuidado: o conteúdo mudou sob o mesmo nome. Isso é seguro para quem chega
> agora, mas variantes já otimizadas podem sobreviver no cache
> (`.next/cache/images`) — ver a seção 4.

### `public/acesso-viral-farm.png` — deixado como está, de propósito

Testado e **descartado**:

- Recompressão sem perda deixa o arquivo **maior**: 1 797,8 KB → 2 390 KB. O
  PNG original já está bem codificado.
- Quantizar em paleta cortaria para ~478 KB, mas a arte é ilustração com
  gradientes de neon — é exatamente o caso em que a paleta produz faixas.
- Não está no caminho crítico da home: aparece só em entrar/cadastro, só no
  desktop (`hidden lg:flex`), já com `sizes="46vw"` e sem `priority`.

O visitante já recebe 46–69 KB de WebP (41–59 KB de AVIF). Mexer só pioraria a
arte sem devolver byte a quem importa.

### `src/app/(site)/hero-video.tsx`

**A descoberta que muda o plano:** trocar `preload="auto"` por `"metadata"`
**não economiza um único byte** quando o vídeo tem `autoplay`. Medido com os
dois valores lado a lado no mesmo navegador:

| `preload` | Transferido |
| --- | --- |
| `auto` | 3 860,2 KB |
| `metadata` | 3 860,2 KB |

`autoplay` atropela a dica de `preload`: para tocar, é preciso baixar. Quem
espera economia só dessa troca vai ficar esperando.

**O que realmente economiza:** o `src` saiu do HTML do servidor e passou a ser
ligado no efeito, depois de montar. Enquanto a fonte vinha pronta no HTML, o
download começava durante a leitura do documento — antes de qualquer JavaScript
rodar, e portanto antes de qualquer checagem possível.

Com isso:

- **Quem pede economia de dados (`saveData`) ou está em 2g/slow-2g não baixa o
  vídeo**: 3,8 MB → 0. Recebe o mesmo fundo chapado do `prefers-reduced-motion`.
- **Para todo mundo, o vídeo saiu do caminho crítico.** Medido: o mp4 passa a
  ser pedido em **914 ms**, contra `DOMContentLoaded` em **752 ms** — ou seja,
  depois. Antes ele disputava banda com fontes, CSS e JS durante o carregamento.
- **O autoplay continua funcionando** — verificado no navegador:
  `paused: false`, `readyState: 4`, `muted: true`, `playsInline: true`.

`3g` foi deixado **de fora** do corte de propósito: o Chrome carimba de `3g`
uma fatia enorme de gente em 4G congestionada (no teste aqui, 1,45 Mbps veio
como `3g`), e tirar o hero desse grupo é decisão de produto, não de
performance. A função `redeFraca()` traz a linha de uma só palavra para mudar.

### `next.config.ts`

- **`images.formats: ["image/avif", "image/webp"]`** — o padrão do Next 16 é só
  WebP. Medido pelo otimizador do próprio Next: na arte do acesso o AVIF entrega
  **41,1 KB contra 46 KB** (−11%) em 828 px e **58,6 contra 68,9 KB** (−15%) em
  1080 px. No logo dá empate técnico (19,9 contra 19,1 KB — AVIF 0,8 KB pior),
  então o ganho vem da arte. Quem não suporta AVIF cai em WebP sozinho.

  > Uma comparação feita direto no `sharp` dava o resultado oposto (AVIF ~50%
  > pior). Era engano de método: a escala de qualidade do AVIF não é a mesma do
  > WebP, e o Next ajusta isso. Vale sempre medir pelo otimizador de verdade.

- **`images.minimumCacheTTL: 2678400`** (31 dias, contra 4 horas do padrão) —
  evita reotimizar as mesmas imagens várias vezes por dia justamente durante o
  pico, quando CPU é o recurso mais caro.

- **`headers()` com cache imutável de 1 ano para `*.mp4`** — arquivos de
  `public/` não ganham cache longo por padrão. **Confirmado no servidor:** o mp4
  respondia `Cache-Control: public, max-age=0` e agora responde
  `public, max-age=31536000, immutable`. Sem isso, quem volta ao site revalida
  um arquivo de megabytes a cada visita.

- **`compress`** ficou no padrão (`true`). Não adianta nada para mp4/WebP/AVIF,
  que já são formatos comprimidos — o ganho neles vem de codificar melhor.

---

## 3. PENDENTE NA VPS — reencode do vídeo

**Não deu para fazer aqui:** não existe `ffmpeg` nem `ffprobe` nesta máquina.
Procurado no `PATH`, em `node_modules` e em `.env.local` (`FFMPEG_PATH` /
`FFPROBE_PATH`) — nada. Os comandos abaixo são para rodar na VPS.

### 3.1 O pôster que ainda não existe

Hoje quem tem `prefers-reduced-motion` (ou cai no corte de rede) vê um bloco
`#080808` chapado. Funciona e é honesto, mas uma imagem seria melhor.

```bash
ffmpeg -ss 1 -i public/hero-gta-viral.mp4 -frames:v 1 -q:v 3 \
  public/hero-gta-viral-poster.jpg
```

Depois: apontar o `poster` do `<video>` e o fundo do fallback em
`hero-video.tsx` para esse arquivo. **Só criar a referência depois que o arquivo
existir** — apontar antes vira 404.

### 3.2 O reencode principal

Respeita as duas armadilhas documentadas em `hero-video.tsx`: **taxa constante**
e **um keyframe por segundo** (`-g 24`, com 24 fps). Sem `-g 24`, o arquivo
continua com um keyframe só e o loop volta a engasgar — que é o defeito medido
no arquivo atual.

```bash
ffmpeg -i public/hero-gta-viral.mp4 \
  -c:v libx264 -profile:v high -pix_fmt yuv420p \
  -b:v 1200k -maxrate 1600k -bufsize 2400k \
  -vf "fps=24" -fps_mode cfr \
  -g 24 -keyint_min 24 -sc_threshold 0 \
  -an \
  -movflags +faststart \
  public/hero-gta-viral-v2.mp4
```

Ponto a ponto:

- `-b:v 1200k` — contra os 3 810 kbps atuais. 720p a 1200 kbps é confortável
  para vídeo de fundo desfocado atrás de texto.
- `-vf "fps=24" -fps_mode cfr` — trava a taxa constante.
- `-g 24 -keyint_min 24 -sc_threshold 0` — **um keyframe por segundo**, o
  conserto do loop.
- `-an` — **remove a trilha de áudio**. São 125,7 KB garantidos, num vídeo que
  toca sem som. Sozinho já é −3,3%.
- `-movflags +faststart` — mantido por higiene, mas o arquivo atual já está
  correto nisso; não espere ganho daqui.

**Ganho esperado: 3,77 MB → ~1,2 MB (−68%).** É estimativa aritmética a partir
do bitrate alvo (1200 kbps de vídeo x 8 s ≈ 1,2 MB), não medição — só dá para
confirmar rodando. **Conferir o resultado antes de publicar:** o alvo é ficar
abaixo de 1,5 MB com o loop sem engasgo.

### 3.3 Versão para celular (opcional, depois do 3.2)

Se mesmo com ~1,2 MB o celular pesar, gerar uma versão 854x480:

```bash
ffmpeg -i public/hero-gta-viral.mp4 \
  -c:v libx264 -profile:v high -pix_fmt yuv420p \
  -b:v 600k -maxrate 800k -bufsize 1200k \
  -vf "scale=854:480,fps=24" -fps_mode cfr \
  -g 24 -keyint_min 24 -sc_threshold 0 \
  -an -movflags +faststart \
  public/hero-gta-viral-v2-mobile.mp4
```

Atenção: como o `src` agora é ligado por JavaScript (e não por `<source>`), a
escolha por tamanho de tela também se faz **no efeito**, com `matchMedia`, e não
com o atributo `media` de um `<source>`.

### 3.4 Ao trocar o arquivo, TROQUE O NOME

Os comandos acima gravam em `-v2` de propósito. A URL é a chave de cache, e o
mp4 agora responde com `immutable` por um ano: sobrescrever o conteúdo mantendo
`hero-gta-viral.mp4` faria quem já visitou continuar com o arquivo velho **por
até um ano**. Trocando o nome, é preciso atualizar a referência em
`hero-video.tsx` (uma linha, no efeito).

---

## 4. Pendências e avisos

- **Cache de imagem antigo.** O conteúdo do logo mudou sob o mesmo nome, e o
  `minimumCacheTTL` subiu para 31 dias. Num deploy novo o cache nasce vazio e não
  há problema. **Numa VPS onde `.next/cache/images` sobrevive entre deploys,
  apagar essa pasta ao publicar** — senão variantes da arte antiga podem ficar
  servidas por até 31 dias. Foi observado na prática aqui: depois da troca, a
  largura já cacheada continuou devolvendo 51 KB enquanto larguras novas
  devolviam 19,1 KB.

- **O maior ganho que sobrou não está no meu escopo.** O `<Image>` do logo, em
  `src/app/logo.tsx`, não passa `sizes` — por isso o navegador pede 1920/3840 px
  para desenhar 132 px. Com a fonte reduzida para 768 px o estrago está contido,
  mas a correção certa é uma linha:

  ```tsx
  sizes="(max-width: 768px) 164px, 216px"
  ```

  Medido: levaria o WebP entregue de 19,1 KB para **4,5 KB**. Também vale
  atualizar `width`/`height` para `768`/`384`, e trocar `priority` por
  `preload` — **no Next 16 `priority` está deprecado** em favor de `preload`.
  Nada disso quebra nada hoje; é ganho que ficou na mesa.

- **Arquivos órfãos em `public/`, 2,1 MB.** `hero-farm-v7.mp4` (2 013,2 KB) e
  `hero-farm-v7-poster.jpg` (155 KB) **não são referenciados em lugar nenhum**
  do código. Não foram apagados por não ser decisão minha — mas podem sair do
  repositório. (Curiosidade útil: o vídeo antigo **não tinha trilha de áudio**,
  ou seja, alguém já sabia removê-la; o material novo entrou cru.)

- **`acesso-viral-farm.png` continua com 1,8 MB no repositório.** Sem ganho
  possível sem degradar a arte (ver seção 2). Se o peso do repositório incomodar,
  o caminho é pedir ao autor uma exportação em JPEG de qualidade alta — trocaria
  o nome do arquivo e exigiria mexer em `acesso-layout.tsx`.

---

## Como remedir

A sonda de MP4 usada aqui não depende de `ffprobe` e cabe num arquivo: lê as
caixas `moov`/`mdhd`/`stsz`/`stss` e reporta duração, fps, keyframes, ordem
`faststart` e os bytes de cada trilha. Vale reescrevê-la ao conferir o resultado
do reencode — em especial para confirmar que os keyframes saíram de 1 para 8.

Para conferir o que o navegador recebe de fato, sem depender de ferramenta
externa:

```bash
# formato e tamanho por negociação de conteúdo
curl -s -o /dev/null -w '%{content_type} %{size_download}\n' \
  -H 'Accept: image/avif,image/webp,*/*' \
  'http://localhost:3000/_next/image?url=%2Flogo-gta-viral-v3.png&w=828&q=75'

# cabeçalho de cache do vídeo
curl -sI http://localhost:3000/hero-gta-viral.mp4 | grep -i cache-control
```

Cuidado ao remedir imagem: pedir uma largura **já cacheada** devolve o resultado
antigo. Use uma largura ainda não pedida para forçar codificação nova.
