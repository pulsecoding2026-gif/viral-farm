# Viral Shorts IA

Analisador de material bruto: cola o link do vídeo cru (sem edição, sem roteiro), a IA identifica o nicho e o que dá pra aproveitar, e devolve três roteiros originais construídos a partir desse material.

Plano completo do produto: [`../PLANO_MVP.md`](../PLANO_MVP.md)

## Rodando

### 1. Chaves de API

Copie e preencha:

```bash
cp .env.local.example .env.local
```

Duas chaves são obrigatórias, uma é opcional:

| Variável | Onde pegar | Pra quê |
|---|---|---|
| `ANTHROPIC_API_KEY` | https://platform.claude.com/settings/keys | A análise |
| `GROQ_API_KEY` | https://console.groq.com/keys | Transcrição (Whisper) |
| `YOUTUBE_API_KEY` (opcional) | https://console.cloud.google.com/apis/credentials — ative a *YouTube Data API v3* no projeto antes | Radar de tendências da Biblioteca. Sem ela, a Biblioteca mostra dados de exemplo em vez de quebrar. |
| `PEXELS_API_KEY` (opcional) | https://www.pexels.com/api/ — cadastro gratuito | Banco de B-roll da aba Viral. Sem ela, mostra dados de exemplo em vez de quebrar. |

### 2. Binários externos

`ffmpeg`, `ffprobe` e `yt-dlp` precisam existir. No Windows:

```powershell
winget install --id Gyan.FFmpeg -e
winget install --id yt-dlp.yt-dlp -e
```

Depois de instalar pelo winget, o PATH só atualiza em shell novo. Por isso o `.env.local` aceita caminhos absolutos (`FFMPEG_PATH`, `FFPROBE_PATH`, `YTDLP_PATH`) — já vêm preenchidos.

### 3. Subir

```bash
npm run dev
```

http://localhost:3000

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run analisar -- "<link>" "<nicho>"` | Análise completa pelo terminal, sem web |
| `npm run testar:midia -- "<link>"` | Só download/frames/áudio. Não usa IA nem chave. |
| `npm run check:schema` | Verifica o JSON Schema contra as regras de structured outputs |
| `npm run typecheck` | `tsc --noEmit` |

O `testar:midia` é o primeiro lugar pra olhar quando uma análise falha: se ele passa, o problema está na IA, não na extração.

## Como funciona

```
link → yt-dlp (metadados + download 720p)
     → ffmpeg (10 frames + áudio 16kHz mono)
     → Groq Whisper (transcrição com timestamps)
     → Claude (frames + transcrição + métricas → JSON estruturado)
     → apaga tudo que baixou
```

O vídeo baixado vive só dentro de `analisarLink()` e é apagado no `finally`. O que persiste é a análise, nunca o arquivo — ver seção 1 do plano.

Os 10 frames não são espaçados igualmente: metade sai dos primeiros 25% do vídeo, porque é ali que a retenção se decide.

## Estrutura

```
src/
  lib/
    env.ts               validação das variáveis de ambiente
    proc.ts              execução de binários externos (spawn, sem shell)
    jobs.ts              registro de análises em andamento (PROVISÓRIO: em disco local)
    biblioteca/
      tipos.ts           tipo compartilhado entre dados de exemplo e radar real
      videos-exemplo.ts  fallback fictício, usado quando o radar falha
      radar.ts           YouTube Data API v3 + cache local de 12h
    viral/
      tipos.ts           tipo compartilhado entre dados de exemplo e Pexels real
      clipes-exemplo.ts  fallback fictício, usado quando a busca falha
      pexels.ts          Pexels Videos API + cache local de 7 dias
    analise/
      schema.ts          formato da saída (zod -> JSON Schema)
      prompt.ts          system prompt da análise
      extrair.ts         yt-dlp: validação de URL, metadados, download
      midia.ts           ffmpeg: frames e áudio
      transcrever.ts     Groq Whisper
      analisar.ts        Claude
      pipeline.ts        orquestra e limpa
  app/
    page.tsx             Biblioteca (home)
    biblioteca-grid.tsx  filtro de nicho/ordem/período + grid
    cartao-video.tsx
    viral/page.tsx       aba Viral (banco de B-roll pra baixar)
    clipes-grid.tsx      filtro de nicho + grid
    cartao-clipe.tsx
    analisador/page.tsx  aba Analisador
    dashboard.tsx        orquestra sidebar + painel principal, faz o polling
    sidebar-analises.tsx histórico de análises (lê de GET /api/analises)
    formulario-nova-analise.tsx
    painel-progresso.tsx checklist ao vivo das etapas do pipeline
    resultado-analise.tsx
    app-shell.tsx        navegação entre as três abas
    api/analises/        POST inicia + GET lista, GET [id] acompanha uma
scripts/                 CLIs de teste
```

## Custo por análise

~US$ 0,11–0,15 com `claude-opus-5`. Cai pra ~US$ 0,05 trocando `ANTHROPIC_MODEL` para `claude-sonnet-5` no `.env.local`.

O system prompt vai marcado com `cache_control`, então a partir da segunda análise a parte fixa do prompt custa ~10%. Por isso `prompt.ts` não interpola nada dinâmico: qualquer variação ali quebraria o cache.

O custo real de cada análise aparece no rodapé do resultado e na saída do `npm run analisar`.

## Armadilhas já resolvidas (não reintroduzir)

- **`--print` do yt-dlp implica `--simulate`.** Sem `--no-simulate` ele imprime o caminho e não baixa nada.
- **yt-dlp precisa do ffmpeg pra juntar vídeo e áudio.** Sem `--ffmpeg-location` ele baixa os dois fragmentos separados, não junta, e ainda reporta sucesso — o erro só aparece depois, ao tentar extrair frames de um arquivo só de áudio.
- **Não localizar o arquivo baixado por `readdir`.** Um `video.f251.webm` (só áudio) pode vir antes do `video.mp4` mesclado. Use o caminho que o `--print after_move:filepath` devolve.
- **O YouTube devolve 403 de forma intermitente.** Por isso o download tenta três `player_client` diferentes antes de desistir.
- **`claude-haiku-4-5` rejeita o parâmetro `effort`** (erro 400 "This model does not support the effort parameter"). É um recurso só da família "5" (thinking adaptativo). `analisar.ts` só manda `effort` quando o modelo não é Haiku.

## Pendências conhecidas

- `src/lib/jobs.ts` persiste em `data/analises.json` (um arquivo local, sem controle de concorrência real). Sobrevive a restart, mas não escala pra mais de uma instância nem separa por usuário — trocar por tabela no Supabase + fila.
- Sem autenticação e sem rate limit. Antes de expor publicamente, os dois são obrigatórios: cada análise custa dinheiro de API.
- Publicação nas redes ainda não existe (Fase 4 do plano, depende das aprovações de API).
- O radar da Biblioteca (`src/lib/biblioteca/radar.ts`) usa a cota gratuita da YouTube Data API (10.000 unidades/dia). Uma atualização completa (7 nichos) gasta ~700 unidades — cabe folgado com cache de 12h, mas não dá pra tirar o cache sem repensar a cota.
- A aba Viral só busca no Pexels. O plano original (seção 2 do PLANO_MVP) também previa Pixabay — ainda não entrou.
