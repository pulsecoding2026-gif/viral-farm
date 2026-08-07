/**
 * Formatos virais — presets de edição do Viral Farm.
 *
 * Gerado a partir da Galeria de Formatos (viralfarm.format.v1). Cada preset
 * carrega o estilo tipográfico completo da legenda, as regras de destaque de
 * palavra e a direção que vai pro prompt da IA na hora de escolher os cortes.
 *
 * Os campos que descrevem etapas que o worker AINDA não executa (b-roll,
 * sound design, motion, tracking de rosto) ficaram de fora de propósito:
 * preset que promete o que o render não entrega vira mentira na tela.
 */

export type SafeZone = {
  nome: string;
  regra: string;
  railDireita: { larguraPct: number; deTopoPct: number; ateBasePct: number; ocupadoPor: string };
  barraInferior: { alturaPct: number; ocupadoPor: string };
  faixaSuperior: { alturaPct: number; ocupadoPor: string };
  margemEsquerda: { larguraPct: number; ocupadoPor: string };
  areaUtil: { xPct: number[]; yPct: number[]; obs: string };
  regraPrompt: string;
  tolerancia: string;
};

export type EstiloLegendaFormato = {
  posicao: string;
  tamanhoPct: number;
  alinhamento: string;
  margemLateralPct: number;
  safeAreaTopoPct: number;
  safeAreaBasePct: number;
  safeAreaDireitaPct: number;
  espacamentoLinha: number;
  maxCaracteresLinha: number;
  maxLinhas: number;
  fonte: string;
  peso: number;
  caixa: string;
  cor: string;
  stroke: string;
  sombra: string;
  fundo: string;
  blur: number;
  opacidade: number;
  animacao: string;
  velocidadePalavrasMin?: number;
};

export type Formato = {
  id: string;
  nome: string;
  categoria: string;
  tags: string[];
  viralidade: number;
  dificuldade: string;
  duracaoIdeal: { minSeg: number; maxSeg: number; sweetSpotSeg: number };
  plataformas: string[];
  porqueFunciona: string;
  quandoUsar: string;
  sensacao: string;
  legenda: EstiloLegendaFormato;
  destaque: { cores: string[]; regras: string[] };
  hook: { s0a3: string; s3a5: string; s5a10: string };
  retencao: string[];
  promptIA: string;
};

export const SAFE_ZONE: SafeZone = {
  "nome": "Zona de UI das plataformas (9:16 · 1080×1920)",
  "regra": "Nenhum elemento de leitura obrigatória pode entrar nestas regiões — a UI nativa do app cobre o pixel.",
  "railDireita": {
    "larguraPct": 22,
    "deTopoPct": 34,
    "ateBasePct": 88,
    "ocupadoPor": "curtir, comentar, compartilhar, salvar, avatar, disco de áudio"
  },
  "barraInferior": {
    "alturaPct": 14,
    "ocupadoPor": "@usuário, legenda do post, faixa de áudio, barra de navegação"
  },
  "faixaSuperior": {
    "alturaPct": 12,
    "ocupadoPor": "abas Para você/Seguindo, busca, câmera"
  },
  "margemEsquerda": {
    "larguraPct": 6,
    "ocupadoPor": "respiro de borda"
  },
  "areaUtil": {
    "xPct": [
      6,
      78
    ],
    "yPct": [
      12,
      86
    ],
    "obs": "Toda legenda, CTA, contador e lower third deve caber aqui."
  },
  "regraPrompt": "Respeite a zona de UI das plataformas: mantenha todo texto, número, CTA e lower third dentro de x 6–78% e y 12–86% do quadro. Nada de leitura obrigatória pode entrar no rail direito (22% da largura, entre 34% e 88% da altura), na barra inferior (14%) nem na faixa superior (12%).",
  "tolerancia": "Elementos decorativos (b-roll, gradiente, grão) podem invadir. Texto, número e botão, nunca."
};

export const FORMATOS: Formato[] = [
  {
    "id": "hormozi",
    "nome": "Hormozi",
    "categoria": "Negócios",
    "tags": [
      "legenda grande",
      "alta densidade",
      "autoridade",
      "talking head"
    ],
    "viralidade": 5,
    "dificuldade": "Baixa",
    "duracaoIdeal": {
      "minSeg": 25,
      "maxSeg": 60,
      "sweetSpotSeg": 38
    },
    "plataformas": [
      "Reels",
      "Shorts",
      "TikTok",
      "LinkedIn"
    ],
    "porqueFunciona": "A legenda ocupa o centro óptico e obriga o olho a ler mesmo sem som. Cada palavra entra em pop, criando um micro-evento visual a cada 300 ms — o cérebro não consegue desengajar.",
    "quandoUsar": "Conteúdo denso de valor: frameworks, números, opiniões fortes, respostas diretas.",
    "sensacao": "Urgência, autoridade, 'isso é importante'.",
    "legenda": {
      "posicao": "Centro vertical (52% da altura)",
      "tamanhoPct": 9.5,
      "alinhamento": "Centralizada",
      "margemLateralPct": 8,
      "safeAreaTopoPct": 14,
      "safeAreaBasePct": 18,
      "safeAreaDireitaPct": 22,
      "espacamentoLinha": 1.05,
      "maxCaracteresLinha": 14,
      "maxLinhas": 2,
      "fonte": "Montserrat / Space Grotesk",
      "peso": 900,
      "caixa": "UPPERCASE",
      "cor": "#FFFFFF",
      "stroke": "6 px #000000",
      "sombra": "0 6px 0 rgba(0,0,0,.55)",
      "fundo": "nenhum",
      "blur": 0,
      "opacidade": 1,
      "animacao": "Word-by-word pop (scale 0.86 → 1.0 em 90 ms)",
      "velocidadePalavrasMin": 170
    },
    "destaque": {
      "cores": [
        "#FFD400",
        "#00E08A",
        "#FF4D2E"
      ],
      "regras": [
        "Amarelo em números e valores",
        "Verde em resultados positivos",
        "Vermelho em dor, erro e perda",
        "Máx. 2 palavras destacadas por frase"
      ]
    },
    "hook": {
      "s0a3": "Afirmação contrária ao senso comum, já com legenda na tela no frame 1",
      "s3a5": "Prometer o mecanismo ('o motivo é este')",
      "s5a10": "Entregar a primeira parte do valor — sem enrolação"
    },
    "retencao": [
      "Legenda sempre presente",
      "Corte a cada 2–3 s",
      "Zoom alternado",
      "Zero silêncio",
      "Curiosity gap na virada de frase"
    ],
    "promptIA": "Gere um corte vertical 9:16 estilo Hormozi. Selecione o trecho com maior densidade de valor e menor divagação. Reenquadre com face tracking mantendo o rosto no terço superior. Aplique legenda centralizada em UPPERCASE, Montserrat 900, máx. 14 caracteres por linha e 2 linhas, branco com stroke preto de 6 px e sombra dura. Anime palavra a palavra com pop de 90 ms. Destaque números em #FFD400, resultados positivos em #00E08A e dores em #FF4D2E, no máximo 2 destaques por frase. Remova todas as pausas acima de 250 ms. Alterne close e medium a cada 6–8 s com zoom de 6–10%. Sem emojis. Finalize com CTA de 1,5 s."
  },
  {
    "id": "podcast-premium",
    "nome": "Podcast Premium",
    "categoria": "Podcast",
    "tags": [
      "dois participantes",
      "switch de câmera",
      "estúdio"
    ],
    "viralidade": 4,
    "dificuldade": "Média",
    "duracaoIdeal": {
      "minSeg": 35,
      "maxSeg": 90,
      "sweetSpotSeg": 55
    },
    "plataformas": [
      "Reels",
      "Shorts",
      "TikTok",
      "X"
    ],
    "porqueFunciona": "O corte segue quem fala, o que reproduz a dinâmica natural de uma conversa. O espectador sente que está na sala.",
    "quandoUsar": "Trechos de debate, revelação, discordância ou história contada por um convidado.",
    "sensacao": "Conversa real, intimidade, credibilidade.",
    "legenda": {
      "posicao": "Inferior (76% da altura)",
      "tamanhoPct": 6.2,
      "alinhamento": "Centralizada",
      "margemLateralPct": 10,
      "safeAreaTopoPct": 12,
      "safeAreaBasePct": 16,
      "safeAreaDireitaPct": 22,
      "espacamentoLinha": 1.2,
      "maxCaracteresLinha": 22,
      "maxLinhas": 3,
      "fonte": "Inter Tight / Archivo",
      "peso": 700,
      "caixa": "Sentence case",
      "cor": "#FFFFFF",
      "stroke": "0",
      "sombra": "0 2px 14px rgba(0,0,0,.6)",
      "fundo": "nenhum",
      "blur": 0,
      "opacidade": 1,
      "animacao": "Highlight deslizante sobre a palavra ativa",
      "velocidadePalavrasMin": 150
    },
    "destaque": {
      "cores": [
        "#FFD400"
      ],
      "regras": [
        "Só a palavra que carrega a tese da frase",
        "Nunca mais de 1 por linha"
      ]
    },
    "hook": {
      "s0a3": "A frase mais polêmica do trecho, fora de ordem cronológica",
      "s3a5": "Corte para o contexto que a explica",
      "s5a10": "Entrar na história completa"
    },
    "retencao": [
      "Troca de câmera a cada 3–5 s",
      "Reação do ouvinte",
      "Nome na tela cria contexto",
      "Áudio limpo e nivelado"
    ],
    "promptIA": "Gere um corte de podcast 9:16. Faça diarização e corte sempre para o falante ativo, com L/J cuts de 200 ms. Reenquadre em close com face tracking; use wide de dois participantes em risadas e reações. Insira a reação do ouvinte 0,4 s antes do pico. Legenda inferior em Inter Tight 700, sentence case, 3 linhas de até 22 caracteres, branca com sombra suave, sem stroke. Destaque uma única palavra-tese por frase em #FFD400. Exiba nome e @ do convidado nos primeiros 3 s. Trilha ambiente a -30 dB. Sem emojis."
  },
  {
    "id": "split-gameplay",
    "nome": "Split Gameplay",
    "categoria": "Games",
    "tags": [
      "tela dividida",
      "satisfying",
      "faceless"
    ],
    "viralidade": 5,
    "dificuldade": "Baixa",
    "duracaoIdeal": {
      "minSeg": 30,
      "maxSeg": 75,
      "sweetSpotSeg": 48
    },
    "plataformas": [
      "TikTok",
      "Reels",
      "Shorts"
    ],
    "porqueFunciona": "O gameplay ocupa o córtex visual ocioso e impede o scroll enquanto o áudio entrega o conteúdo. É um estacionamento de atenção.",
    "quandoUsar": "Conteúdo falado longo, denso ou sem apelo visual próprio.",
    "sensacao": "Hipnótico, fácil, zero esforço.",
    "legenda": {
      "posicao": "Centro da metade superior (32% da altura)",
      "tamanhoPct": 8,
      "alinhamento": "Centralizada",
      "margemLateralPct": 7,
      "safeAreaTopoPct": 10,
      "safeAreaBasePct": 42,
      "safeAreaDireitaPct": 22,
      "espacamentoLinha": 1.1,
      "maxCaracteresLinha": 16,
      "maxLinhas": 2,
      "fonte": "Poppins / Space Grotesk",
      "peso": 800,
      "caixa": "UPPERCASE",
      "cor": "#FFFFFF",
      "stroke": "5 px #000000",
      "sombra": "0 4px 0 rgba(0,0,0,.5)",
      "fundo": "nenhum",
      "blur": 0,
      "opacidade": 1,
      "animacao": "Karaoke word-by-word",
      "velocidadePalavrasMin": 180
    },
    "destaque": {
      "cores": [
        "#00E08A",
        "#FFD400"
      ],
      "regras": [
        "Verde no verbo de ação",
        "Amarelo em número"
      ]
    },
    "hook": {
      "s0a3": "Pergunta direta em UPPERCASE já com gameplay rodando",
      "s3a5": "Promessa da resposta",
      "s5a10": "Primeira revelação parcial"
    },
    "retencao": [
      "Movimento constante embaixo",
      "Barra de progresso",
      "Loop perfeito no fim",
      "Legenda rápida"
    ],
    "promptIA": "Gere um vídeo 9:16 em split screen. Metade superior (60%) recebe o conteúdo principal reenquadrado; metade inferior (40%) recebe gameplay vertical em loop contínuo, sem cortes, com SFX nativo a -34 dB. Legenda no centro da metade superior, Poppins 800 UPPERCASE, máx. 16 caracteres por linha, branca com stroke preto de 5 px, animação karaoke a 180 ppm. Verbos em #00E08A e números em #FFD400. Até 4 emojis contextuais. Barra de progresso no topo. Corte todas as pausas. Faça o último frame casar com o primeiro para loop."
  },
  {
    "id": "reddit-stories",
    "nome": "Reddit Story",
    "categoria": "Storytelling",
    "tags": [
      "faceless",
      "TTS",
      "narrativa"
    ],
    "viralidade": 5,
    "dificuldade": "Baixa",
    "duracaoIdeal": {
      "minSeg": 40,
      "maxSeg": 90,
      "sweetSpotSeg": 60
    },
    "plataformas": [
      "TikTok",
      "Shorts"
    ],
    "porqueFunciona": "O card de post inicial funciona como capa de livro: entrega o conflito em uma linha e o cérebro precisa saber o desfecho.",
    "quandoUsar": "Histórias com conflito, traição, vingança, dilema moral.",
    "sensacao": "Fofoca, cumplicidade, 'preciso saber o final'.",
    "legenda": {
      "posicao": "Centro (50%)",
      "tamanhoPct": 7.5,
      "alinhamento": "Centralizada",
      "margemLateralPct": 9,
      "safeAreaTopoPct": 12,
      "safeAreaBasePct": 16,
      "safeAreaDireitaPct": 22,
      "espacamentoLinha": 1.15,
      "maxCaracteresLinha": 18,
      "maxLinhas": 3,
      "fonte": "Inter / Space Grotesk",
      "peso": 700,
      "caixa": "Sentence case",
      "cor": "#FFFFFF",
      "stroke": "4 px #000000",
      "sombra": "0 3px 10px rgba(0,0,0,.5)",
      "fundo": "nenhum",
      "blur": 0,
      "opacidade": 1,
      "animacao": "Word-by-word sincronizado com TTS",
      "velocidadePalavrasMin": 165
    },
    "destaque": {
      "cores": [
        "#FF4D2E"
      ],
      "regras": [
        "Vermelho só na palavra que vira a história",
        "Máx. 3 no vídeo inteiro"
      ]
    },
    "hook": {
      "s0a3": "Ler o título do post em voz alta com o card na tela",
      "s3a5": "Primeira frase que estabelece o conflito",
      "s5a10": "Aumentar a aposta — o que está em jogo"
    },
    "retencao": [
      "Curiosity gap no título",
      "Silêncio antes da revelação",
      "Fundo em movimento",
      "Barra de progresso"
    ],
    "promptIA": "Gere um vídeo 9:16 estilo Reddit Story. Renderize um card de post (avatar, título, votos, comentários) no topo durante os 4 s iniciais e narre o título via TTS; depois deslize o card para fora. Fundo: b-roll ambiental ou gameplay com Ken Burns de 3% a cada 10 s. Legenda central em Inter 700 sentence case, máx. 18 caracteres por linha, branca com stroke preto de 4 px, sincronizada palavra a palavra com o TTS a 165 ppm. Destaque no máximo 3 palavras de virada em #FF4D2E. Sem emojis. Insira 300 ms de silêncio antes da revelação e suba a trilha 5 dB nos 8 s finais."
  },
  {
    "id": "hype-challenge",
    "nome": "Hype Challenge",
    "categoria": "Motivação",
    "tags": [
      "alta energia",
      "contador",
      "prêmio"
    ],
    "viralidade": 5,
    "dificuldade": "Alta",
    "duracaoIdeal": {
      "minSeg": 20,
      "maxSeg": 60,
      "sweetSpotSeg": 35
    },
    "plataformas": [
      "Shorts",
      "TikTok",
      "Reels"
    ],
    "porqueFunciona": "Aposta declarada + contador visível criam um relógio mental. O espectador fica para ver se dá certo.",
    "quandoUsar": "Desafios, apostas, experimentos, transformações com resultado mensurável.",
    "sensacao": "Adrenalina, torcida, evento ao vivo.",
    "legenda": {
      "posicao": "Inferior (80%)",
      "tamanhoPct": 8.5,
      "alinhamento": "Centralizada",
      "margemLateralPct": 8,
      "safeAreaTopoPct": 18,
      "safeAreaBasePct": 14,
      "safeAreaDireitaPct": 22,
      "espacamentoLinha": 1,
      "maxCaracteresLinha": 12,
      "maxLinhas": 2,
      "fonte": "Anton / Archivo Black",
      "peso": 900,
      "caixa": "UPPERCASE",
      "cor": "#FFFFFF",
      "stroke": "7 px #000000",
      "sombra": "0 6px 0 #000",
      "fundo": "nenhum",
      "blur": 0,
      "opacidade": 1,
      "animacao": "Bounce + shake em palavra gritada",
      "velocidadePalavrasMin": 200
    },
    "destaque": {
      "cores": [
        "#FFD400",
        "#FF4D2E"
      ],
      "regras": [
        "Amarelo em prêmio e valor",
        "Vermelho em risco e prazo"
      ]
    },
    "hook": {
      "s0a3": "Declarar a aposta em uma frase + contador já rodando",
      "s3a5": "Mostrar o obstáculo",
      "s5a10": "Primeira tentativa falhando"
    },
    "retencao": [
      "Contador visível",
      "Corte a cada 1,5 s",
      "Escalada de aposta",
      "Resultado adiado até o fim"
    ],
    "promptIA": "Gere um corte 9:16 de altíssima energia. Corte a cada 1,5 s alternando close, wide e POV, sem repetir plano. Exiba um contador persistente no topo (tempo, valor ou quantidade). Legenda inferior Anton 900 UPPERCASE, máx. 12 caracteres por linha, stroke preto de 7 px, com bounce e shake nas palavras gritadas a 200 ppm. Prêmios em #FFD400, riscos em #FF4D2E, até 6 emojis. Aplique speed ramp, whip e zoom de 15–25% em cada pico de áudio. Trilha trap com drop no resultado e silêncio de 200 ms antes da revelação."
  },
  {
    "id": "dark-luxury",
    "nome": "Dark Luxury",
    "categoria": "Lifestyle",
    "tags": [
      "cinematográfico",
      "aspiracional",
      "premium"
    ],
    "viralidade": 4,
    "dificuldade": "Alta",
    "duracaoIdeal": {
      "minSeg": 30,
      "maxSeg": 75,
      "sweetSpotSeg": 45
    },
    "plataformas": [
      "Reels",
      "TikTok"
    ],
    "porqueFunciona": "Contraste alto, teal & orange e câmera lenta comunicam produção cara antes de qualquer palavra. O valor percebido do conselho sobe junto.",
    "quandoUsar": "Discurso de mentalidade, disciplina, dinheiro, bastidores de viagem.",
    "sensacao": "Sofisticação, distância, desejo.",
    "legenda": {
      "posicao": "Inferior (80%)",
      "tamanhoPct": 5,
      "alinhamento": "Centralizada",
      "margemLateralPct": 14,
      "safeAreaTopoPct": 12,
      "safeAreaBasePct": 14,
      "safeAreaDireitaPct": 22,
      "espacamentoLinha": 1.35,
      "maxCaracteresLinha": 26,
      "maxLinhas": 2,
      "fonte": "Playfair Display / Space Grotesk Light",
      "peso": 400,
      "caixa": "Sentence case",
      "cor": "#F2EFE9",
      "stroke": "0",
      "sombra": "0 2px 20px rgba(0,0,0,.7)",
      "fundo": "nenhum",
      "blur": 0,
      "opacidade": 0.92,
      "animacao": "Fade in por frase (não por palavra)",
      "velocidadePalavrasMin": 120
    },
    "destaque": {
      "cores": [
        "#C9A227"
      ],
      "regras": [
        "Dourado apenas em substantivos-chave",
        "Máx. 1 por frase"
      ]
    },
    "hook": {
      "s0a3": "Imagem forte em slow motion + uma frase curta",
      "s3a5": "Estabelecer a tensão pessoal",
      "s5a10": "Entregar o princípio"
    },
    "retencao": [
      "Beleza visual sustenta sem cortes rápidos",
      "Frase final memorável",
      "Trilha crescente"
    ],
    "promptIA": "Gere um corte 9:16 cinematográfico premium. Aplique LUT teal & orange, vinheta e film grain leve. Use planos medium e wide com push in contínuo de 2–4% e speed ramps suaves. Insira b-rolls de 2,5 s a cada 6–8 s (cidade noturna, detalhes, slow motion). Legenda inferior discreta em Playfair Display 400, sentence case, 2 linhas de até 26 caracteres, #F2EFE9 sem stroke, fade por frase a 120 ppm. Destaque no máximo 1 substantivo por frase em #C9A227. Transições por match cut e cross dissolve de 300 ms. Trilha cinematográfica a -22 dB. Sem emojis."
  },
  {
    "id": "documentary",
    "nome": "Documentary",
    "categoria": "Documentário",
    "tags": [
      "narração",
      "arquivo",
      "dados"
    ],
    "viralidade": 4,
    "dificuldade": "Alta",
    "duracaoIdeal": {
      "minSeg": 45,
      "maxSeg": 120,
      "sweetSpotSeg": 75
    },
    "plataformas": [
      "Shorts",
      "Reels"
    ],
    "porqueFunciona": "Narração em terceira pessoa + imagens de arquivo ativam o modo 'estou aprendendo algo real'. A credibilidade compra tempo de tela.",
    "quandoUsar": "História de empresa, ascensão e queda, explicação de evento real.",
    "sensacao": "Seriedade, revelação, peso histórico.",
    "legenda": {
      "posicao": "Inferior (78%)",
      "tamanhoPct": 5.4,
      "alinhamento": "Centralizada",
      "margemLateralPct": 10,
      "safeAreaTopoPct": 12,
      "safeAreaBasePct": 16,
      "safeAreaDireitaPct": 22,
      "espacamentoLinha": 1.3,
      "maxCaracteresLinha": 28,
      "maxLinhas": 2,
      "fonte": "IBM Plex Sans / Archivo",
      "peso": 600,
      "caixa": "Sentence case",
      "cor": "#FFFFFF",
      "stroke": "0",
      "sombra": "0 2px 12px rgba(0,0,0,.75)",
      "fundo": "nenhum",
      "blur": 0,
      "opacidade": 1,
      "animacao": "Fade por frase",
      "velocidadePalavrasMin": 140
    },
    "destaque": {
      "cores": [
        "#FFD400"
      ],
      "regras": [
        "Datas, valores e nomes próprios"
      ]
    },
    "hook": {
      "s0a3": "Fato improvável dito como manchete",
      "s3a5": "Contextualizar tempo e lugar",
      "s5a10": "Abrir o mistério central"
    },
    "retencao": [
      "Estrutura em 3 atos",
      "Números na tela",
      "Troca de imagem a cada 3 s",
      "Pergunta aberta no meio"
    ],
    "promptIA": "Gere um corte 9:16 estilo documentário. Transforme a fala em narração offscreen e cubra 90% do tempo com b-rolls, imagens de arquivo, manchetes, mapas e gráficos, trocando a cada 3 s com Ken Burns de 5%. Legenda inferior IBM Plex Sans 600, sentence case, 2 linhas de até 28 caracteres, fade por frase a 140 ppm, destaques de datas e valores em #FFD400. Insira lower thirds em mono com data e local. Aplique grain e leve desaturação. Score de tensão progressiva a -24 dB, com silêncio no dado mais impactante."
  },
  {
    "id": "kinetic-typography",
    "nome": "Kinetic Typography",
    "categoria": "Marketing",
    "tags": [
      "faceless",
      "tipografia",
      "sem rosto"
    ],
    "viralidade": 4,
    "dificuldade": "Média",
    "duracaoIdeal": {
      "minSeg": 15,
      "maxSeg": 45,
      "sweetSpotSeg": 25
    },
    "plataformas": [
      "Reels",
      "TikTok",
      "LinkedIn"
    ],
    "porqueFunciona": "O texto é o único elemento e se comporta como personagem: cresce, gira, quebra. Cada palavra é um frame novo, o que zera o tempo morto.",
    "quandoUsar": "Frases de impacto, manifestos, listas curtas, citações.",
    "sensacao": "Ritmo, design, controle.",
    "legenda": {
      "posicao": "Variável — o texto É o vídeo",
      "tamanhoPct": 14,
      "alinhamento": "Alternando esquerda / centro",
      "margemLateralPct": 8,
      "safeAreaTopoPct": 12,
      "safeAreaBasePct": 14,
      "safeAreaDireitaPct": 22,
      "espacamentoLinha": 0.95,
      "maxCaracteresLinha": 10,
      "maxLinhas": 3,
      "fonte": "Space Grotesk / Archivo Black",
      "peso": 800,
      "caixa": "Mista intencional",
      "cor": "#FFFFFF",
      "stroke": "0",
      "sombra": "nenhuma",
      "fundo": "cor sólida do tema",
      "blur": 0,
      "opacidade": 1,
      "animacao": "Scale + slide + máscara por palavra",
      "velocidadePalavrasMin": 190
    },
    "destaque": {
      "cores": [
        "#FF4D2E",
        "#000000"
      ],
      "regras": [
        "Inverter fundo/texto na palavra-chave",
        "Caixa colorida atrás da palavra"
      ]
    },
    "hook": {
      "s0a3": "Uma palavra sozinha em tela cheia",
      "s3a5": "A frase que a contextualiza",
      "s5a10": "Desdobrar em 3 blocos"
    },
    "retencao": [
      "Mudança visual a cada 500 ms",
      "Sincronia com a música",
      "Frase final memorável"
    ],
    "promptIA": "Gere um vídeo 9:16 de tipografia cinética sem imagem de vídeo. Fundo sólido do tema. Divida a fala em blocos de 1 a 3 palavras e anime cada bloco com scale, slide e máscara de revelação em Space Grotesk 800, tamanho variando entre 10% e 18% da altura. Alterne alinhamento entre esquerda e centro. Na palavra-chave, inverta fundo e texto ou use caixa em #FF4D2E. Sincronize todos os cortes com a batida da trilha a -16 dB. Click por palavra e impact na frase final. Sem emojis."
  },
  {
    "id": "fake-chat",
    "nome": "Fake Chat",
    "categoria": "Humor",
    "tags": [
      "conversa",
      "screenshot",
      "narrativa curta"
    ],
    "viralidade": 5,
    "dificuldade": "Média",
    "duracaoIdeal": {
      "minSeg": 20,
      "maxSeg": 50,
      "sweetSpotSeg": 30
    },
    "plataformas": [
      "TikTok",
      "Reels"
    ],
    "porqueFunciona": "A interface de mensagem é lida instantaneamente e cada balão novo é um mini cliffhanger. O espectador lê no ritmo da história.",
    "quandoUsar": "Diálogo curto, resposta afiada, situação constrangedora.",
    "sensacao": "Voyeurismo, riso, 'isso já aconteceu comigo'.",
    "legenda": {
      "posicao": "Rodapé (86%) — secundária",
      "tamanhoPct": 4.5,
      "alinhamento": "Centralizada",
      "margemLateralPct": 10,
      "safeAreaTopoPct": 10,
      "safeAreaBasePct": 10,
      "safeAreaDireitaPct": 22,
      "espacamentoLinha": 1.2,
      "maxCaracteresLinha": 30,
      "maxLinhas": 1,
      "fonte": "Inter",
      "peso": 600,
      "caixa": "Sentence case",
      "cor": "#FFFFFF",
      "stroke": "0",
      "sombra": "0 2px 8px rgba(0,0,0,.6)",
      "fundo": "nenhum",
      "blur": 0,
      "opacidade": 0.9,
      "animacao": "Fade",
      "velocidadePalavrasMin": 150
    },
    "destaque": {
      "cores": [
        "#FF4D2E"
      ],
      "regras": [
        "Só na mensagem de virada"
      ]
    },
    "hook": {
      "s0a3": "Primeira mensagem já polêmica na tela",
      "s3a5": "Resposta que escala o conflito",
      "s5a10": "Indicador de digitando segurando a resposta"
    },
    "retencao": [
      "Ritmo de leitura controlado",
      "Typing indicator como pausa dramática",
      "Reação final"
    ],
    "promptIA": "Gere um vídeo 9:16 em formato de conversa. Converta o diálogo em uma thread de mensagens centralizada ocupando 80% da largura, sobre fundo desfocado. Anime cada balão com slide up e pop, sincronizado com SFX de envio. Antes da mensagem decisiva, exiba indicador de digitando por 1,2 s e silencie a trilha por 400 ms. Aplique push in de 12% na virada. Use emojis dentro das mensagens de forma natural. Termine com smash cut para um plano de reação de 1,5 s."
  },
  {
    "id": "ai-explainer",
    "nome": "AI Explainer",
    "categoria": "IA",
    "tags": [
      "tutorial",
      "screen recording",
      "tech"
    ],
    "viralidade": 4,
    "dificuldade": "Média",
    "duracaoIdeal": {
      "minSeg": 30,
      "maxSeg": 70,
      "sweetSpotSeg": 45
    },
    "plataformas": [
      "Reels",
      "Shorts",
      "LinkedIn",
      "X"
    ],
    "porqueFunciona": "Mostrar a ferramenta funcionando é prova. O espectador salva o vídeo para replicar depois — e save é o sinal mais forte do algoritmo.",
    "quandoUsar": "Demonstração de ferramenta, prompt, automação, comparativo de modelos.",
    "sensacao": "Descoberta, vantagem competitiva, 'preciso testar isso'.",
    "legenda": {
      "posicao": "Inferior (82%)",
      "tamanhoPct": 5.6,
      "alinhamento": "Centralizada",
      "margemLateralPct": 8,
      "safeAreaTopoPct": 14,
      "safeAreaBasePct": 12,
      "safeAreaDireitaPct": 22,
      "espacamentoLinha": 1.2,
      "maxCaracteresLinha": 24,
      "maxLinhas": 2,
      "fonte": "Space Grotesk / JetBrains Mono nos termos",
      "peso": 700,
      "caixa": "Sentence case",
      "cor": "#FFFFFF",
      "stroke": "0",
      "sombra": "0 2px 10px rgba(0,0,0,.7)",
      "fundo": "pill escura 70% opacidade",
      "blur": 12,
      "opacidade": 1,
      "animacao": "Word-by-word com underline",
      "velocidadePalavrasMin": 160
    },
    "destaque": {
      "cores": [
        "#00E08A",
        "#7C5CFF"
      ],
      "regras": [
        "Verde em nomes de ferramenta",
        "Roxo em termos técnicos",
        "Termos em JetBrains Mono"
      ]
    },
    "hook": {
      "s0a3": "Mostrar o RESULTADO final antes do processo",
      "s3a5": "Nomear a ferramenta",
      "s5a10": "Passo 1 já em execução"
    },
    "retencao": [
      "Resultado antes do processo",
      "Numeração de passos",
      "Acelerar esperas",
      "Prova visual constante"
    ],
    "promptIA": "Gere um tutorial 9:16 de ferramenta de IA. Comece mostrando o resultado final nos primeiros 3 s. Reenquadre o screen recording em card central de 70% com cantos arredondados sobre fundo escuro desfocado. Aplique zoom de 40% no cursor a cada clique relevante, com retorno em 500 ms. Acelere esperas de carregamento em 4x. Exiba indicador de passo (1/4) no canto e nome da ferramenta em mono no topo. Legenda inferior em pill escura com blur, Space Grotesk 700, até 24 caracteres por linha; nomes de ferramenta em #00E08A e termos técnicos em JetBrains Mono #7C5CFF. Sem emojis. CTA de 3 s."
  },
  {
    "id": "minimal-premium",
    "nome": "Minimal Premium",
    "categoria": "Educação",
    "tags": [
      "clean",
      "keynote",
      "alto valor percebido"
    ],
    "viralidade": 3,
    "dificuldade": "Média",
    "duracaoIdeal": {
      "minSeg": 30,
      "maxSeg": 80,
      "sweetSpotSeg": 50
    },
    "plataformas": [
      "LinkedIn",
      "Reels",
      "Shorts"
    ],
    "porqueFunciona": "Silêncio visual. Em um feed saturado de shake e emoji, um vídeo calmo com tipografia impecável se destaca por contraste.",
    "quandoUsar": "Conteúdo analítico, pensamento estruturado, posicionamento de marca.",
    "sensacao": "Confiança, calma, competência.",
    "legenda": {
      "posicao": "Inferior (81%)",
      "tamanhoPct": 5,
      "alinhamento": "Centralizada",
      "margemLateralPct": 14,
      "safeAreaTopoPct": 12,
      "safeAreaBasePct": 14,
      "safeAreaDireitaPct": 22,
      "espacamentoLinha": 1.4,
      "maxCaracteresLinha": 30,
      "maxLinhas": 2,
      "fonte": "Archivo / Space Grotesk",
      "peso": 500,
      "caixa": "Sentence case",
      "cor": "#0B0B0C sobre claro / #FFFFFF sobre escuro",
      "stroke": "0",
      "sombra": "nenhuma",
      "fundo": "faixa 92% opacidade",
      "blur": 20,
      "opacidade": 1,
      "animacao": "Fade por frase, 200 ms",
      "velocidadePalavrasMin": 135
    },
    "destaque": {
      "cores": [
        "#FF4D2E"
      ],
      "regras": [
        "Só sublinhado fino, nunca cor de fundo",
        "Máx. 1 por frase"
      ]
    },
    "hook": {
      "s0a3": "Tese em uma frase, dita com calma",
      "s3a5": "Anunciar a estrutura ('três razões')",
      "s5a10": "Razão 1"
    },
    "retencao": [
      "Estrutura numerada anunciada no início",
      "Cartões dão previsibilidade",
      "Contraste com o feed"
    ],
    "promptIA": "Gere um corte 9:16 minimalista premium. Mantenha a câmera quase imóvel em plano medium com composição em terços. Legenda inferior em Archivo 500, sentence case, até 30 caracteres por linha, sobre faixa translúcida com blur de 20, fade por frase de 200 ms a 135 ppm, sem stroke nem sombra dura. Destaque no máximo 1 palavra por frase com sublinhado fino em #FF4D2E. A cada nova ideia, deslize um cartão tipográfico pela lateral em 300 ms ease-out. Respeite grid de 8 px. Sem emojis, sem shake, sem zoom. Trilha de piano a -30 dB ou nenhuma."
  },
  {
    "id": "meme-cut",
    "nome": "Meme Cut",
    "categoria": "Humor",
    "tags": [
      "reação",
      "cultura de internet",
      "rápido"
    ],
    "viralidade": 5,
    "dificuldade": "Baixa",
    "duracaoIdeal": {
      "minSeg": 12,
      "maxSeg": 35,
      "sweetSpotSeg": 20
    },
    "plataformas": [
      "TikTok",
      "Reels",
      "Shorts"
    ],
    "porqueFunciona": "O meme injetado carrega contexto cultural inteiro em 0,8 s. É compressão de piada — e gera compartilhamento, não só view.",
    "quandoUsar": "Qualquer fala com potencial cômico, gafe, contradição ou exagero.",
    "sensacao": "Riso, cumplicidade, vontade de marcar alguém.",
    "legenda": {
      "posicao": "Inferior (82%)",
      "tamanhoPct": 7,
      "alinhamento": "Centralizada",
      "margemLateralPct": 8,
      "safeAreaTopoPct": 14,
      "safeAreaBasePct": 14,
      "safeAreaDireitaPct": 22,
      "espacamentoLinha": 1.05,
      "maxCaracteresLinha": 16,
      "maxLinhas": 2,
      "fonte": "Poppins / Archivo Black",
      "peso": 800,
      "caixa": "UPPERCASE",
      "cor": "#FFFFFF",
      "stroke": "5 px #000000",
      "sombra": "0 4px 0 #000",
      "fundo": "nenhum",
      "blur": 0,
      "opacidade": 1,
      "animacao": "Pop com overshoot",
      "velocidadePalavrasMin": 190
    },
    "destaque": {
      "cores": [
        "#FFD400",
        "#FF4D2E"
      ],
      "regras": [
        "Amarelo na punchline",
        "Vermelho no absurdo"
      ]
    },
    "hook": {
      "s0a3": "Cortar direto na frase mais absurda",
      "s3a5": "Primeiro meme de reação",
      "s5a10": "Escalar o absurdo"
    },
    "retencao": [
      "Meme a cada 3 s",
      "Ritmo imprevisível",
      "Punchline no fim",
      "Loop"
    ],
    "promptIA": "Gere um corte 9:16 cômico. Selecione o trecho mais absurdo ou contraditório e comece por ele. Aplique close com face tracking e punch in de 25–40% nas expressões-chave. Insira memes, gifs e clipes de reação de 0,8 s a cada 3–4 s, em tela cheia ou canto a 35%. Legenda inferior Poppins 800 UPPERCASE, máx. 16 caracteres por linha, stroke preto de 5 px, pop com overshoot a 190 ppm; punchline em #FFD400. Use até 8 emojis animados. SFX cômicos (vine boom, record scratch) nos picos. Feche com loop perfeito."
  },
  {
    "id": "top-countdown",
    "nome": "Top 10 / Countdown",
    "categoria": "Educação",
    "tags": [
      "lista",
      "ranking",
      "estrutura"
    ],
    "viralidade": 4,
    "dificuldade": "Baixa",
    "duracaoIdeal": {
      "minSeg": 30,
      "maxSeg": 70,
      "sweetSpotSeg": 45
    },
    "plataformas": [
      "Shorts",
      "Reels",
      "TikTok"
    ],
    "porqueFunciona": "A contagem regressiva promete um fim e um clímax. O espectador fica pelo número 1 mesmo sem se importar com o 7.",
    "quandoUsar": "Rankings, erros comuns, ferramentas, dicas.",
    "sensacao": "Organização, expectativa, completude.",
    "legenda": {
      "posicao": "Inferior (79%)",
      "tamanhoPct": 6.5,
      "alinhamento": "Centralizada",
      "margemLateralPct": 8,
      "safeAreaTopoPct": 20,
      "safeAreaBasePct": 14,
      "safeAreaDireitaPct": 22,
      "espacamentoLinha": 1.1,
      "maxCaracteresLinha": 18,
      "maxLinhas": 2,
      "fonte": "Archivo / Space Grotesk",
      "peso": 800,
      "caixa": "UPPERCASE",
      "cor": "#FFFFFF",
      "stroke": "4 px #000000",
      "sombra": "0 4px 0 rgba(0,0,0,.5)",
      "fundo": "nenhum",
      "blur": 0,
      "opacidade": 1,
      "animacao": "Word-by-word pop",
      "velocidadePalavrasMin": 175
    },
    "destaque": {
      "cores": [
        "#FFD400",
        "#00E08A"
      ],
      "regras": [
        "Amarelo no nome do item",
        "Verde no benefício"
      ]
    },
    "hook": {
      "s0a3": "Anunciar a lista e o prêmio do nº 1",
      "s3a5": "Ir direto para o item 10",
      "s5a10": "Item 9 já em ritmo"
    },
    "retencao": [
      "Progressão numérica",
      "Barra segmentada",
      "Promessa do nº 1",
      "Itens curtos"
    ],
    "promptIA": "Gere um corte 9:16 em formato de contagem regressiva. Segmente a fala em itens numerados e exiba um numeral gigante com slide + whoosh a cada troca. Faixa superior com o título do item; barra de progresso segmentada no rodapé. Cubra cada item com 2 s de b-roll. Legenda inferior Archivo 800 UPPERCASE, até 18 caracteres por linha, stroke preto de 4 px, pop word-by-word a 175 ppm; item em #FFD400 e benefício em #00E08A. Punch in de 10% na entrada de cada item. Silêncio de 300 ms antes do número 1, com impact."
  },
  {
    "id": "before-after",
    "nome": "Before & After",
    "categoria": "Marketing",
    "tags": [
      "prova",
      "transformação",
      "comparação"
    ],
    "viralidade": 5,
    "dificuldade": "Baixa",
    "duracaoIdeal": {
      "minSeg": 15,
      "maxSeg": 40,
      "sweetSpotSeg": 22
    },
    "plataformas": [
      "Reels",
      "TikTok",
      "Shorts"
    ],
    "porqueFunciona": "A comparação é a forma mais rápida de comunicar valor. O cérebro mede a diferença em menos de um segundo, sem precisar de argumento.",
    "quandoUsar": "Resultado de serviço, redesign, treino, reforma, uso de ferramenta.",
    "sensacao": "Prova, satisfação, desejo de replicar.",
    "legenda": {
      "posicao": "Inferior (84%)",
      "tamanhoPct": 5.8,
      "alinhamento": "Centralizada",
      "margemLateralPct": 8,
      "safeAreaTopoPct": 12,
      "safeAreaBasePct": 12,
      "safeAreaDireitaPct": 22,
      "espacamentoLinha": 1.15,
      "maxCaracteresLinha": 22,
      "maxLinhas": 2,
      "fonte": "Space Grotesk",
      "peso": 700,
      "caixa": "Sentence case",
      "cor": "#FFFFFF",
      "stroke": "3 px #000000",
      "sombra": "0 3px 10px rgba(0,0,0,.5)",
      "fundo": "nenhum",
      "blur": 0,
      "opacidade": 1,
      "animacao": "Fade + slide de 8 px",
      "velocidadePalavrasMin": 155
    },
    "destaque": {
      "cores": [
        "#00E08A",
        "#FF4D2E"
      ],
      "regras": [
        "Verde no ganho",
        "Vermelho no estado anterior"
      ]
    },
    "hook": {
      "s0a3": "Mostrar o DEPOIS primeiro, por 1 s",
      "s3a5": "Cortar para o antes",
      "s5a10": "Revelar o mecanismo"
    },
    "retencao": [
      "Reveal adiado",
      "Contador de métrica",
      "Timelapse do meio",
      "Loop antes/depois"
    ],
    "promptIA": "Gere um vídeo 9:16 de comparação. Alinhe os planos de antes e depois no mesmo enquadramento por homografia. Abra mostrando 1 s do resultado final, corte para o antes e revele com wipe animado sincronizado a whoosh + impact. Rótulos ANTES/DEPOIS em pill fixa e contador numérico crescente da métrica principal. Cubra o meio com timelapse de 3 s. Legenda inferior Space Grotesk 700, até 22 caracteres por linha, stroke preto de 3 px; ganho em #00E08A, estado anterior em #FF4D2E. Sem emojis. Faça loop entre antes e depois no fim."
  },
  {
    "id": "true-crime",
    "nome": "True Crime",
    "categoria": "True Crime",
    "tags": [
      "suspense",
      "arquivo",
      "narração"
    ],
    "viralidade": 5,
    "dificuldade": "Alta",
    "duracaoIdeal": {
      "minSeg": 50,
      "maxSeg": 120,
      "sweetSpotSeg": 80
    },
    "plataformas": [
      "TikTok",
      "Shorts",
      "Reels"
    ],
    "porqueFunciona": "Mistério com data e nome real ativa o instinto investigativo. A narração em tom baixo cria intimidade e o espectador quer o desfecho.",
    "quandoUsar": "Casos reais, desaparecimentos, investigações, mistérios não resolvidos.",
    "sensacao": "Tensão, arrepio, obsessão.",
    "legenda": {
      "posicao": "Inferior (78%)",
      "tamanhoPct": 5.4,
      "alinhamento": "Centralizada",
      "margemLateralPct": 10,
      "safeAreaTopoPct": 12,
      "safeAreaBasePct": 16,
      "safeAreaDireitaPct": 22,
      "espacamentoLinha": 1.3,
      "maxCaracteresLinha": 26,
      "maxLinhas": 2,
      "fonte": "IBM Plex Sans",
      "peso": 600,
      "caixa": "Sentence case",
      "cor": "#EDEDEF",
      "stroke": "0",
      "sombra": "0 2px 14px rgba(0,0,0,.8)",
      "fundo": "nenhum",
      "blur": 0,
      "opacidade": 1,
      "animacao": "Fade por frase, 250 ms",
      "velocidadePalavrasMin": 130
    },
    "destaque": {
      "cores": [
        "#FF4D2E"
      ],
      "regras": [
        "Datas, horários e nomes em vermelho",
        "Máx. 4 no vídeo"
      ]
    },
    "hook": {
      "s0a3": "Uma frase com data e local exatos",
      "s3a5": "O detalhe que não faz sentido",
      "s5a10": "Apresentar a vítima ou o caso"
    },
    "retencao": [
      "Cliffhanger a cada 15 s",
      "Detalhes específicos (hora, rua, nome)",
      "Silêncio dramático",
      "Final em pergunta aberta"
    ],
    "promptIA": "Gere um corte 9:16 de true crime. Narre em tom baixo e cubra 100% do tempo com fotos de arquivo, documentos, mapas e recortes de jornal, trocando a cada 3,5 s com Ken Burns de 6% em direção ao detalhe citado. Aplique desaturação fria, vinheta pesada e grão. Exiba lower thirds em mono com data, hora e cidade; marque fotos com círculos e setas em #FF4D2E. Legenda inferior IBM Plex Sans 600, até 26 caracteres por linha, fade por frase de 250 ms a 130 ppm, com no máximo 4 destaques em vermelho. Drone de suspense a -24 dB, silêncio total 500 ms antes de cada revelação e cliffhanger a cada 15 s."
  }
];

/** Formato padrão quando o usuário não escolhe nenhum. */
export const FORMATO_PADRAO = "hormozi";

export function acharFormato(id: string | null | undefined): Formato {
  return (
    FORMATOS.find((f) => f.id === id) ??
    FORMATOS.find((f) => f.id === FORMATO_PADRAO)!
  );
}

/** Categorias presentes, para os filtros da galeria. */
export const CATEGORIAS = [...new Set(FORMATOS.map((f) => f.categoria))].sort();
