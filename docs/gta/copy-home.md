# Copy da home — revisão de 27/08/2026

Contexto que decide cada texto abaixo: hoje não existe gameplay de GTA VI para
cortar (ninguém jogou, o jogo sai em 19/11). A matéria-prima real é RP de GTA V
na Twitch e no Kick. A copy não pode prometer corte de GTA VI agora — isso
entrega tela vazia no cadastro — e não pode soar como produto de GTA V, porque
a aposta é o VI. A saída: dizer a verdade com orgulho ("ninguém jogou ainda")
e tratar o GTA V RP como o treino que paga desde já, não como substituto de
segunda categoria.

---

## 1. Subheadline do hero

Substitui o parágrafo com "Comece hoje com o RP que já bomba" em
`src/app/(site)/page.tsx`.

```
Ninguém jogou GTA VI ainda — hoje o material é o RP de GTA V, o mesmo formato
que já criou os maiores canais de corte do Brasil. Cole o link de uma live da
Twitch ou do Kick e a IA devolve os Shorts prontos: sem aparecer, sem gravar,
sem editar. Quando o VI sair, seu canal já está andando.
```

Por que resolve a tensão: a primeira frase nomeia o furo antes que o visitante
descubra sozinho — "ninguém jogou ainda" é verdade e desarma a decepção. A
segunda entrega a promessa funcional de sempre (sem aparecer/gravar/editar). A
terceira devolve a régua para o VI, que é o motivo de a marca existir. Nenhuma
linha promete corte de GTA VI hoje; nenhuma linha soa como produto de GTA V —
o RP é citado como o degrau, não como o destino.

---

## 2. Chips de capacidade sob o hero

Mantidos — descrevem o que o pipeline faz de verdade e não dependem de qual
jogo está sendo cortado, então não competem com a tensão do hero:

```
Corta live de 6h sozinho
Legenda animada palavra a palavra
A câmera segue o rosto
Título na tela
Tira os silêncios
Acha o melhor momento
```

Nenhuma mudança de texto — mudança de contexto (a subheadline já deixou claro
que hoje é RP de GTA V) faria estes chips ficarem redundantes se também
citassem o jogo. Eles continuam vendendo a máquina, não o assunto.

---

## 3. Seção "Como funciona"

Título (mantido — já é curto e correto):

```
Do link ao post
```

Subtítulo (novo — hoje a seção não tem um, e a ponte GTA V → GTA VI precisa
aparecer aqui, na explicação do fluxo, não só no hero):

```
O passo a passo é o mesmo hoje, com RP de GTA V, e vai ser o mesmo em
19 de novembro, com GTA VI.
```

Os 3 passos:

```
01 — Cola o link
Uma live de RP de GTA V na Twitch ou no Kick, um VOD do YouTube, qualquer
vídeo longo. Não precisa baixar nem cortar nada antes.

02 — A IA acha os momentos
Ela transcreve, encontra os trechos que se sustentam sozinhos, enquadra em
9:16 seguindo o rosto e legenda palavra a palavra.

03 — Você posta
Baixa os cortes prontos e sobe no TikTok, no Reels e no Shorts. Sem marca
d'água, sem editar, sem aparecer.
```

Só o passo 01 mudou (nomeia GTA V RP em vez de "RP" genérico) — é o lugar
certo para a especificidade, porque aqui a pessoa já decidiu experimentar e
precisa saber exatamente o que colar.

---

## 4. Seção de monetização

Título (mantido):

```
Onde isso vira dinheiro
```

Subtítulo (revisado — a versão atual já evita prometer resultado, só precisa
amarrar o "agora" com RP de GTA V):

```
Nenhum desses caminhos paga por um vídeo bom sozinho. Todos pagam por volume
constante — e dá pra treinar esse volume desde já, cortando RP de GTA V,
antes de o VI sair.
```

Os 4 caminhos (mantidos — já são específicos o bastante para não depender de
qual jogo está no vídeo, e todos continuam verdadeiros com RP de GTA V como
matéria-prima de hoje):

```
Fundo das plataformas
TikTok, YouTube Shorts e Reels pagam por desempenho. Cada um tem regra
própria de elegibilidade, e todos cobram a mesma entrada: publicar sem
falhar. Canal de cortes de GTA posta todo dia sem precisar de pauta — o
material já existe.

Afiliado de games
Gift card, conta de jogo, cadeira, headset, mod. O público de GTA compra o
que vê no vídeo, e link de afiliado paga por venda — não por seguidor. Quem
publica mais testa mais oferta e acha a que converte.

Servidor de RP e publicidade
Servidor de roleplay vive de gente entrando, e paga por divulgação. Marca de
periférico contrata alcance previsível, não pico. Um canal que entrega toda
semana vale mais que um que estourou uma vez.

O canal como ativo
Um canal com audiência é vendável, alugável e vira porta para produto
próprio. E o timing importa: público construído antes de 19 de novembro
custa muito menos que o construído depois, quando todo mundo estiver
postando.
```

Nenhuma cifra, nenhum "fature", nenhuma projeção — a seção já segue essa regra
hoje e a revisão só reforça o gancho temporal (agora com GTA V, mais forte em
novembro com GTA VI).

---

## 5. Título da seção de planos

Mantido — já fala a língua de quem publica em volume, sem depender do jogo:

```
Escolha pelo quanto você posta
```

Subtítulo mantido também, porque já descreve o produto sem prometer receita:

```
Cada análise lê uma live inteira e devolve vários cortes prontos. Cancele
quando quiser.
```

---

## 6. Três perguntas novas do FAQ

Adicionar em `src/app/(site)/perguntas.tsx`, no array `PERGUNTAS`. As duas
primeiras vêm do plano mestre; a terceira ataca de frente a pergunta que a
subheadline não pode responder sozinha — "cadê o GTA VI, então?".

```
Preciso aparecer ou ligar o microfone?
Não. A ferramenta lê o vídeo que você mandar e devolve o corte pronto — sua
cara e sua voz não entram em nenhuma etapa. Dá pra montar um canal inteiro
sem gravar nada, só cortando o que já existe.

Já dá pra cortar gameplay de GTA VI?
Ainda não — ninguém jogou GTA VI, o jogo só sai em 19 de novembro. O que dá
pra cortar hoje é RP de GTA V, que é o mesmo formato e o mesmo público. Quem
começa agora com GTA V chega em novembro com o canal já rodando; quem esperar
o VI sair começa do zero junto com todo mundo.

E se o GTA VI atrasar de novo?
Já atrasou duas vezes. Se atrasar de novo, muda a data no nosso contador —
não muda o produto: o canal continua sendo alimentado por RP de GTA V, que é
abundante e não depende do calendário da Rockstar. Crescer agora não depende
de o lançamento sair no dia certo.
```

---

## Onde cada texto entra no código

| Texto | Arquivo |
|---|---|
| Subheadline do hero | `src/app/(site)/page.tsx`, parágrafo após o `<h1>` |
| Chips de capacidade | `src/app/(site)/page.tsx`, array `CAPACIDADES` (sem mudança) |
| Título/subtítulo/passos "Como funciona" | `src/app/(site)/como-funciona.tsx` |
| Título/subtítulo/caminhos "Monetização" | `src/app/(site)/monetizacao.tsx` |
| Título de "Planos" | `src/app/(site)/planos.tsx` |
| 3 perguntas novas | `src/app/(site)/perguntas.tsx`, array `PERGUNTAS` |
