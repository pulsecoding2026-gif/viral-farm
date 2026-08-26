# Plano mestre — GTA VIRAL

Escrito em **26/08/2026**. Extended Look **amanhã, 27/08**. Lançamento **19/11/2026**.

Este documento desempata os quatro relatórios. Onde ele contradiz
`posicionamento.md`, `identidade.md`, `pesquisa-jogo.md` ou
`politica-de-conteudo.md`, **ele ganha** — e o motivo está escrito ao lado.

Duas coisas já decididas pelo dono e **fechadas**: o nome é **GTA VIRAL** (INPI
pesquisado, decisão assumida — `src/lib/gta/marca.ts`) e o ângulo de venda é
**dinheiro**. Não reabro nenhum dos dois. O posicionamento recomendava trocar o
nome; perdeu.

---

## 1. O que a GTA VIRAL é

> **GTA VIRAL é a fábrica de canal de cortes de GTA para quem não quer aparecer.
> Você cola o link de uma live de RP da Twitch ou do Kick, ou de qualquer vídeo
> longo de GTA, e recebe de volta os melhores momentos já cortados em vertical,
> legendados e prontos para postar — sem câmera, sem microfone, sem rosto, sem
> audiência prévia e sem abrir editor. O GTA V criou canais enormes no Brasil em
> cima de material de streamer; os canais de GTA VI ainda não existem, e o jogo
> sai em 19 de novembro. A GTA VIRAL é a máquina para você montar um deles antes
> de todo mundo.**

O que isso corta, por decisão: não somos site de notícia, não somos agregador de
trailer, não somos ferramenta genérica de produtividade e não somos SaaS para
streamer grande clipar a própria live. **O cliente é o operador de canal de
cortes.** O streamer que cliba a si mesmo continua servido pela mesma máquina —
mas ele não é para quem a página fala.

**Desempate registrado:** `posicionamento.md` §1 decidiu "o cliente é o criador
que já transmite". Está superado. O público é mais largo e mais barato de
adquirir: quem não tem nada além de um link. Isso muda a promessa, o menu e o
onboarding — e é a razão de este documento existir.

---

## 2. O furo grave, escrito antes de qualquer plano

**Entre hoje e 19/11 não existe matéria-prima de GTA VI que a gente possa
processar.** Isso não é detalhe, é o centro:

- Ninguém jogou GTA VI. Não há live, não há gameplay, não há VOD.
- O que existe é material da Rockstar (trailer, Extended Look). Processar isso e
  devolver Shorts é exatamente o que `politica-de-conteudo.md` proíbe e o que a
  Take-Two está derrubando por DMCA **esta semana**.
- Material vazado está fora. Regra 1 da política, sem exceção.

Uma plataforma que promete "monte seu canal de cortes de GTA VI" e não tem o que
cortar até novembro entrega uma tela vazia para quem se cadastrar amanhã. Esse é
o jeito mais rápido de queimar a única primeira impressão que existe.

### A decisão que resolve: a ponte é GTA V RP

**Até 19/11 a matéria-prima é roleplay de GTA V na Twitch e no Kick, e trechos
de canais brasileiros de GTA — não GTA VI.** Isso é honesto, é abundante hoje, é
legalmente igual (material de terceiro, mesma regra de permissão da §7), e é
**exatamente a mesma habilidade** que o usuário vai aplicar em 19 de novembro.

A promessa da home não muda uma palavra — ela já está certa: *"O GTA V criou
canais milionários. Os do GTA VI ainda não existem."* O produto agora diz a
mesma coisa: **treine no GTA V agora, esteja pronto no GTA VI.** Quem chegar em
novembro com o canal já morno ganha de quem abriu o canal no dia 19.

Consequência operacional: **os módulos de descoberta filtram GTA (a franquia),
não GTA VI (o jogo)**, e o filtro tem um botão que vira para GTA VI quando
houver o que ver. Filtrar em "GTA VI" hoje devolve lista vazia, e lista vazia é
pior que lista errada.

---

## 3. O produto mínimo

O que precisa existir para a visita valer. Só isto:

1. **Cola link → cortes prontos.** VOD de Twitch, VOD/clipe de Kick, YouTube.
   Análise, corte, legenda, vertical, render, download. Já existe e funciona.
2. **Lives** — a tela que responde "de onde eu tiro vídeo agora", com Twitch e
   Kick de GTA/RP. É a primeira tela do público novo, não a última.
3. **Editor Viral** para ajustar o que a automação errou.
4. **Biblioteca** para o corte não sumir.
5. **A landing curta**, com aviso de não-afiliação e o FAQ de direitos.
6. **A regra de material** visível no fluxo, não só nos termos (§7).

### O que fica de fora da primeira versão — decidido, não adiado

- **Live em andamento.** O worker espera arquivo com fim definido
  (`src/lib/analise/extrair.ts`). Capturar live em 1 vCPU é comprar o gargalo em
  dobro. **O que se constrói no lugar:** detectar URL de live e responder
  *"esta live ainda está no ar — cole o VOD quando ela acabar"*, com um botão de
  avisar. Custa uma tarde; capturar live custa semanas e derruba a VPS.
- **Publicar nas redes / Conexões.** Não existe (`pronto` ausente). Sai do menu.
  A esteira termina no download.
- **Viralytics, Concorrentes, Voice Viral.** Não existem. Saem do menu.
- **Sistema de spoiler tag.** `politica-de-conteudo.md` pede como requisito de
  lançamento. **Desempato contra:** spoiler tag protege uma *galeria pública*, e
  nós não temos galeria — o vídeo é processado, entregue e apagado. Vira
  requisito no dia em que existir feed público, e não antes. O que fica no lugar
  agora é a regra de material vazado, que é a que de fato protege.
- **Pack Lançamento (R$ 147).** Boa ideia, hora errada. Vender pacote de
  novembro em agosto para uma base de zero pessoas não arrecada nada e ocupa a
  semana. **Volta em 20/10.**
- **Qualquer preset de outro jogo.** Março de 2027, conforme `posicionamento.md`
  §8. Mantido.

---

## 4. A ordem de construção, e o porquê de cada passo

1. **Fechar o caminho do link até o corte, para Twitch e Kick, com um VOD real
   de RP.** Se isso falhar, nada mais importa — é o produto inteiro. Inclui a
   mensagem de live em andamento, porque é o erro nº 1 que o público novo vai
   provocar no primeiro minuto.
2. **Cortar o menu.** É edição de lista, custa uma hora e é o que faz o painel
   parecer com a promessa da home. Vem cedo porque é barato e porque cada módulo
   genérico visível é uma pergunta que o suporte vai responder.
3. **Apontar Lives e Radar para GTA/RP por padrão.** A primeira tela do usuário
   novo precisa ter conteúdo. Depois do menu, porque a ordem do menu decide qual
   tela é a primeira.
4. **Landing curta na ordem da §6.** Depois do produto, não antes: mandar
   tráfego para uma promessa que o painel não cumpre gasta a aquisição.
5. **Onboarding de três passos e a regra de material no fluxo.** Só faz sentido
   quando existe fluxo para embrulhar.
6. **Termos e política revisados.** Por último, com conteúdo revisto — hoje
   descrevem uma ferramenta genérica (`mapa-da-marca.md`). Último porque é o
   único item que precisa de revisão humana e não bloqueia o resto.

A cada passo, `npx tsc --noEmit` limpo. Se reclamar de `RouteContext`, é
`npx next typegen`, não bug (`mapa-da-marca.md`).

---

## 5. O menu: 15 módulos viram 5

`src/lib/modulos.ts`. **Operação é tirar de `SECOES`, nunca apagar arquivo.**
Módulo com `pronto: true` tem rota real em `src/app/<slug>/` e continua
funcionando por URL direta mesmo fora do menu — nada se perde, só some da vista.

### Ficam — dois blocos, cinco módulos

| Bloco | Módulos | Por quê |
|---|---|---|
| **Descobrir** | **Lives**, **Radar Viral** | "De onde eu tiro vídeo agora." É a primeira pergunta de quem não grava nada. Lives vem antes do Radar: é a fonte ao vivo. |
| **Criar** | **Analisador** (principal), **Editor Viral**, **Biblioteca** | A esteira. O Analisador é o produto; o Editor conserta; a Biblioteca guarda. |

**Lives sobe para primeira tela do painel.** É a mudança de hierarquia mais
importante desta virada: o antigo usuário chegava com um vídeo próprio na mão e
ia direto ao Analisador; o novo chega sem nada e precisa de matéria-prima antes
de precisar de máquina.

### Saem do menu — código intacto

| Módulo | Destino | Motivo |
|---|---|---|
| **Trends** | fora | Redundante com o Radar dentro de um nicho só. Duas telas para a mesma pergunta é hesitação. |
| **Agent Viral** | fora | Canal de cortes não conversa com IA, cola link. |
| **Roteiros** | fora | Quem não aparece não escreve roteiro. |
| **Hooks** | fora | O título e o gancho já saem da análise. Se faltar, volta como aba do Editor — não como item de menu. |
| **Banco de Vídeos** | fora | Clipe genérico não serve a canal de GTA. |
| **Voice Viral** | fora | Não existe. E "sem aparecer" não significa narrar. |
| **Redes Sociais** (Conexões, Publicar) | fora | Não existe. Promessa sem código é a pior linha do menu. |
| **Viralytics** | fora | Não existe. |
| **Concorrentes** | fora | Não existe. |

O bloco **Planejar** desaparece inteiro. O bloco **Viralizar** também. Ficam
dois blocos — e um menu de dois blocos com cinco itens é a declaração mais clara
que o produto pode fazer sobre o que ele é.

**Aviso técnico para o programador:** `SLUGS_PLACEHOLDER` deriva de
`TODOS_MODULOS`. Tirar de `SECOES` um módulo **sem** `pronto` (voice-viral,
conexoes, publicar, viralytics, concorrentes) apaga também a rota placeholder
dele — passa a 404. É o comportamento desejado, mas confira se algum link
interno aponta para esses slugs antes de cortar.

---

## 6. A landing: cinco seções, nesta ordem

O código já está em cinco (`src/app/(site)/page.tsx`) — o briefing fala em nove
porque o corte é mais novo que o documento. **Confirmo as cinco e mudo uma
posição:**

| # | Seção | O que responde |
|---|---|---|
| 1 | **Hero** (já pronto) | O que é e por que agora |
| 2 | **Metodo** | Como funciona, em três passos |
| 3 | **Monetizacao** | **Por que isso dá dinheiro** ← sobe uma posição |
| 4 | **DestaqueGrande** | Prova de que a máquina funciona |
| 5 | **Planos** | Quanto custa |
| 6 | **Perguntas** | A dúvida que trava a compra |

**Por que Monetizacao sobe na frente de DestaqueGrande:** o ângulo é dinheiro.
Quem chega pelo hero ainda não perguntou "funciona bem?" — perguntou "vale a
pena?". Responder a qualidade antes do motivo é responder na ordem errada. A
prova vem logo depois, como resposta à objeção que o dinheiro cria.

**Ficam fora, e não voltam sem outra sair:** VisaoIA, DestaquesDuplos,
DestaqueBiblioteca. Eram passeio pelos recursos da ferramenta genérica.

**A regra:** a landing tem teto de cinco seções abaixo do hero. Sexta seção só
entra removendo uma. Página que cansa não converte, e esta vende urgência —
urgência não sobrevive a rolagem longa.

**Três textos que precisam existir na Perguntas, e são de venda, não de
burocracia:** *"Posso usar a live de outra pessoa?"*, *"Preciso aparecer?"* e
*"E se o GTA VI atrasar de novo?"*. As três são a objeção real deste público.

---

## 7. Riscos, sem maquiagem

### 7.1 O público-alvo usa material de terceiros — este é o maior risco, não o menor

Vendemos "monte um canal com material de outras pessoas". Isso é, no caso comum,
uso de obra alheia. Três verdades que o dono precisa ler:

- **O risco imediato é do usuário**, não nosso: é o canal dele que toma strike.
- **O nosso risco existe** e é de reputação e de plataforma: uma ferramenta cuja
  página de vendas ensina a usar material alheio é uma ferramenta fácil de
  pintar como máquina de pirataria, e a Twitch/YouTube/TikTok podem cortar
  nossas integrações antes de qualquer juiz falar.
- **`politica-de-conteudo.md` diz "conteúdo ORIGINAL do usuário".** O novo
  público contradiz isso frontalmente. **Desempato assim:**

**A regra da casa, decidida:**
1. Nunca escrever, em lugar nenhum, "use a live de qualquer um". A palavra é
   **permissão**. O produto ensina o caminho certo: pedir ao streamer, muitos
   liberam clipagem publicamente, e vários pedem só crédito e link.
2. **Checkbox obrigatório** no envio: *"tenho direito ou permissão de usar este
   vídeo"*. É uma linha de código e move o eixo da responsabilidade.
3. **Crédito automático** no corte: nome do canal de origem gravado no vídeo e
   sugerido na descrição. Isso é produto, não só proteção — é o que faz o
   streamer aceitar em vez de denunciar.
4. **Nada de material vazado, nunca.** Regra 1 da política, mantida integral.
   Bloqueio no validador, não só no texto.
5. **Nada de biblioteca pública.** O vídeo é processado, entregue e apagado —
   como já é hoje. Isso é o que nos mantém sendo ferramenta, e não host.
6. **Canal de denúncia e endereço para titulares publicado** antes de divulgar.

Sem os itens 1 a 3, a virada é vendável e indefensável. Com eles, é o mesmo
negócio com um flanco a menos.

### 7.2 O hype tem prazo, e o jogo pode adiar de novo

Já adiou duas vezes. Hoje a confiança é alta (guidance da Take-Two ancorado em
novembro, pré-venda aberta, preload datado em 12/11, Zelnick negando adiamento),
mas nada disso é garantia.

**Mitigação, e ela já está em execução:** a data mora numa fonte única
(`src/lib/gta/`) e nunca em código de tela. **E a ponte da §2 é a mitigação real:
se o produto vive de GTA V RP desde já, um adiamento tira a urgência da
campanha, não a matéria-prima do produto.** É a diferença entre perder um
trimestre e perder a empresa. Um produto que só funciona depois de 19/11 morre
com um comunicado da Rockstar; este não.

Marcos mantidos de `posicionamento.md` §8: medir em 01/01/2027, abrir presets em
01/03/2027, condição de fracasso em 31/12/2026.

### 7.3 Dependência de marca de terceiro

O nome está decidido e o desenho está limpo — `identidade.md` garante que nada
visual vem da Rockstar, e isso é a maior parte da proteção real. O que falta é
disciplina de operação:

- Aviso de não-afiliação acima do rodapé em toda página pública. Já está.
- **Descritor da fatura no Stripe sem "GTA"** — use o nome legal da empresa.
  Item pequeno, ainda não feito, e é o que aparece no extrato de todo cliente.
- **Reservar os @ e o domínio de um nome alternativo agora**, sem usar. Não é
  reabrir a decisão do nome: é seguro. Trocar de nome sob notificação, com base
  instalada e sem @ reservado, é o pior dia possível.
- Nenhum material da Rockstar como conteúdo nosso — nem no hero, nem no TikTok.
- Advogado de PI antes de gastar em anúncio pago. Não antes disso.

### 7.4 A VPS de 1 vCPU

**1 vCPU, um job por vez, ~5 min por análise.** Teto físico ~280 análises/dia se
nada mais rodar; realista, ~120. O catálogo assume ~2.000 análises/mês somando
todos os planos, e o Estúdio sozinho promete 300.

**Isso já é gargalo hoje e vai estourar em novembro.** Fila de duas horas no dia
do lançamento vira thread no Reddit, e a thread é permanente.

**Mitigação, em três tempos:**
- **Agora:** fila com posição e tempo estimado visíveis. Espera informada é
  espera aceita; espera muda é churn. Custa pouco e compra meses.
- **Agora:** teto duro de análises simultâneas por conta, para um usuário não
  ocupar a máquina inteira.
- **Até 20/10, inegociável:** segunda máquina para o worker, ou fila com
  autoescala. **Em outubro, não em novembro** — a compra de capacidade precisa
  estar testada antes do pico, e não durante.

E a decisão de escopo que protege a VPS: **live em andamento fica fora** (§3).
Capturar live é ocupar 1 vCPU por horas para um único usuário.

---

## 8. Sucesso em 30 dias

Janela: **26/08 a 25/09/2026**. Linha de base hoje é zero em tudo.

**O número que manda:**

> **40 pessoas que rodaram 3 ou mais análises em uma mesma semana.**

Não é cadastro, é hábito. Cadastro no pico do Extended Look mede curiosidade;
três análises na mesma semana mede que a pessoa está montando um canal de
verdade. É a única métrica que prevê receita em novembro.

**Os quatro de apoio:**

| Métrica | Meta em 30 dias |
|---|---|
| Contas criadas | 500 |
| Análises concluídas com sucesso | 1.200 |
| Assinantes pagos (qualquer plano) | 12 (~R$ 600 de MRR) |
| Views no nosso próprio canal de cortes | 20.000 |

O último não é vaidade: **se a nossa própria conta não cresce usando a
ferramenta, a promessa da home é falsa** — e é melhor descobrir isso em setembro
do que em novembro.

**A condição de alerta, escrita agora para não ser negociada depois:** se em
25/09 o número que manda estiver **abaixo de 10**, o problema não é aquisição —
é o corte. Nesse caso pare a divulgação e conserte o score em cima de RP antes
de gastar mais um dia de tráfego.

---

# O QUE CONSTRUIR AGORA

Em ordem. Não comece o seguinte com o anterior pela metade.

1. **VOD de Twitch e Kick, ponta a ponta, com material real de RP.**
   Rodar 3 VODs longos de RP de GTA V de verdade e olhar os cortes com olho
   crítico. Se os cortes forem ruins, **pare aqui**. Escopo: nenhum código novo
   se já funcionar — é validação, e o resultado dela decide o item 2.

2. **Mensagem de live em andamento.**
   Em `src/lib/analise/extrair.ts`: detectar URL de canal ao vivo antes de
   chamar o worker e devolver *"esta live ainda está no ar — cole o link do VOD
   quando ela terminar"*. Escopo: uma detecção, uma mensagem. **Não** capturar
   live.

3. **Cortar o menu para 2 blocos e 5 módulos.**
   `src/lib/modulos.ts`, conforme §5. Só editar a lista `SECOES` — nenhum
   arquivo apagado. Conferir links internos para os slugs removidos que não têm
   `pronto`.

4. **Lives como primeira tela do painel, filtrada em GTA/RP.**
   Filtro padrão na franquia GTA (não em "GTA VI", que hoje devolve vazio), com
   opção de virar para GTA VI. Mesmo filtro no Radar. Escopo: preset de filtro,
   sem tela nova.

5. **Checkbox de direitos + crédito automático da origem.**
   No envio: *"tenho direito ou permissão de usar este vídeo"*, obrigatório.
   No corte: nome do canal de origem gravado no vídeo e sugerido na descrição.
   Escopo: um campo, um texto no render. É o item de §7.1 que não pode faltar.

6. **Bloqueio de material vazado no validador.**
   Recusar host e padrão conhecido de vazamento, com mensagem que explica.
   Escopo: lista de bloqueio no mesmo arquivo do item 2.

7. **Landing na ordem da §6.**
   Trocar `Monetizacao` e `DestaqueGrande` de lugar em `src/app/(site)/page.tsx`.
   Escopo: duas linhas.

8. **As três perguntas novas no FAQ.**
   "Posso usar a live de outra pessoa?", "Preciso aparecer?", "E se o GTA VI
   atrasar de novo?". Escopo: `src/app/(site)/perguntas.tsx`, três blocos.

9. **Fila visível e teto por conta.**
   Posição na fila e tempo estimado na tela de análise; limite de análises
   simultâneas por conta. Escopo: sem infraestrutura nova — é UI mais uma trava.

10. **Descritor da fatura no Stripe sem "GTA".**
    Escopo: uma configuração no painel da Stripe. Cinco minutos, risco removido.

11. **Termos e política revisados de conteúdo, não só de nome.**
    Regra de material vazado, regra de permissão de terceiros, endereço para
    titulares de direitos. Escopo: revisão de texto — não inventar cláusula sem
    o dono ler.

**Fora desta lista, nada.** Publicar nas redes, Viralytics, Voice Viral, Pack
Lançamento e captura de live não entram até que os onze acima estejam de pé.

**Duas datas no calendário, agora:**
- **28 a 31/08** — a onda de breakdowns do Extended Look. É a janela de
  aquisição desta semana; o pico de amanhã já era.
- **20/10** — capacidade de worker resolvida. Depois disso é tarde.
