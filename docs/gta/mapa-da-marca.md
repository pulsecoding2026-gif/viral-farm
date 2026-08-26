# O mapa da renomeação — o que vira GTA VIRAL e o que NÃO pode encostar

Levantamento feito antes de qualquer edição: **105 ocorrências de "Viral Farm" / "viral-farm" em 52 arquivos.**

Trocar as 105 com um localizar-e-substituir derruba a plataforma. Este documento existe para isso não acontecer.

## A distinção que governa tudo

**Marca é texto de tela. Identificador é contrato.**

O nome "Viral Farm" aparece em dois papéis completamente diferentes no mesmo repositório:

1. Como **marca** — o que o usuário lê. Trocar é o objetivo desta virada.
2. Como **identificador** — caminho de servidor, nome de bucket, chave de configuração, nome de tabela. Isso não é texto: é o endereço combinado entre duas máquinas. Trocar de um lado sem trocar do outro quebra em silêncio, e quebra em produção, não aqui.

Quando estiver em dúvida sobre qual é qual, pergunte: *alguma máquina procura por esta string?* Se sim, é identificador.

---

## PODE TROCAR — texto que o usuário lê

| Arquivo | O que é |
|---|---|
| `src/app/layout.tsx` | título do site e template das abas |
| `src/app/logo.tsx` | `alt` do logo |
| `src/app/(painel)/app-shell.tsx` | `aria-label` e `title` da navegação (4 pontos) |
| `src/app/(site)/navegacao-site.tsx` | `aria-label` |
| `src/app/(site)/acesso-layout.tsx` | `aria-label` |
| `src/app/(site)/pagina-legal.tsx` | `aria-label` |
| `src/app/(site)/entrar/page.tsx` | descrição da página |
| `src/app/(site)/cadastro/page.tsx` | descrição da página |
| `src/app/(site)/perguntas.tsx` | o FAQ inteiro fala da ferramenta genérica |
| `src/lib/planejar/prompts.ts` | a persona do Agent Viral se apresenta pelo nome |
| `src/lib/planos/stripe.ts` | `appInfo.name` — só rótulo no painel da Stripe |

### Cuidado especial: termos e política

`src/app/(site)/termos/page.tsx` (8 ocorrências) e `src/app/(site)/politica/page.tsx` (4) nomeiam o **controlador dos dados** perante a LGPD. Aqui o nome não é decoração, é a parte que responde juridicamente.

Trocar o nome é correto, mas estes dois documentos precisam de uma revisão de conteúdo além do nome — eles descrevem uma ferramenta genérica de cortes, e a plataforma passou a ser outra coisa. Renomear sem revisar deixa um documento legal que descreve um produto que não existe mais.

**Não invente cláusula nova.** Troque o nome, sinalize o que ficou desatualizado, e deixe a revisão para o dono decidir com um advogado.

---

## NÃO PODE ENCOSTAR — identificadores

### O servidor
`worker/vps/*.sh` (10 ocorrências só no `instalar.sh`), `ecosystem.config.cjs`, `atualizar.sh`, `cookies-keepalive.sh`, `instalar-visao.sh`, `instalar-fontes.sh`, `instalar-cookies.sh`

Todos apontam para **`/opt/viral-farm`**, que é o diretório real onde a aplicação roda na VPS, e para o processo registrado no PM2. Renomear no repositório e não na máquina quebra o deploy no próximo `git pull`. Renomear nos dois exige migrar o diretório com a aplicação parada.

**Isso não é trabalho desta virada.** O diretório pode continuar `/opt/viral-farm` para sempre sem que nenhum usuário jamais saiba.

### Os caminhos no worker
`worker/rastrear-rosto.ts`, `worker/proxy.ts`, `worker/indice.ts`, `worker/deteccao/rostos.py`, `worker/diagnosticar-rastreio.ts`, `worker/inspecionar-trecho.ts`, `worker/teto-do-rastreio.ts`, `worker/renderizar-projeto.ts`, `worker/testar-rastreio-real.ts`

São valores-padrão de caminho (`/opt/viral-farm/.venv-visao/bin/python`, o modelo YuNet, o diretório de fontes). Mesmo caso do anterior.

### O banco
`supabase/migrations/0001` a `0012` — 12 arquivos

**Migração já aplicada é história, não código.** Editar o texto de uma migration que já rodou não muda o banco; só faz o arquivo mentir sobre o que aconteceu. Se o nome aparece num bucket de Storage ou num comentário de tabela, ele fica.

### O webhook do TikTok
`src/app/api/webhooks/tiktok/route.ts:101` — devolve `servico: "viral-farm"` numa resposta de API. É identificador de serviço num contrato externo, e o app do TikTok já está cadastrado. Mexer aqui é mexer numa integração que já está em análise de aprovação.

### O pacote
`package.json` e `package-lock.json` — o campo `name`. Não aparece para usuário nenhum e mudá-lo obriga a mexer no lock. Ganho zero, risco não-zero.

---

## O que fazer com os módulos que não são do nicho

O menu (`src/lib/modulos.ts`) tem 4 blocos e ~15 módulos, muitos genéricos (Banco de Vídeos, Voice Viral, Viralytics, Concorrentes). O estrategista decide quais sobrevivem à virada.

Quando um módulo não couber mais, o caminho é **tirar do menu**, não apagar o código. `SLUGS_PLACEHOLDER` já trata módulos sem rota real, e a arquitetura de `SECOES` torna isso uma edição de lista — barata e reversível.

Apagar um módulo que funciona para "focar" é destruir trabalho pago para ganhar uma sensação de limpeza. Se ele não aparece no menu, ele não atrapalha ninguém.

---

## Antes de acusar o typecheck de quebrado

Se `npx tsc --noEmit` reclamar de **`Cannot find name 'RouteContext'`** em `src/app/api/**/route.ts`, não procure o bug no código: `RouteContext` é um tipo GERADO pelo Next, que mora em `.next/types` e não é versionado. Num checkout limpo ele não existe, e o erro aparece sozinho sem ninguém ter tocado em nada.

```bash
npx next typegen
```

Isso resolve em segundos. Aconteceu durante esta virada e custou uma investigação — fica registrado para não custar duas.

## A ordem segura

1. Marca visível (layout, logo, navegação, metadados) — reversível, aparece na hora
2. Identidade visual (tokens, tipografia, componentes)
3. Home reescrita
4. Menu reorganizado para o nicho
5. Módulos novos do nicho
6. Termos e política — por último, com revisão de conteúdo, não só troca de nome

A cada passo: `npx tsc --noEmit` limpo. Nunca os seis de uma vez.
