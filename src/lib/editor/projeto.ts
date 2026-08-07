/**
 * O modelo de um projeto de edição — a "EDL" do Viral Farm.
 *
 * ESTE ARQUIVO É O CONTRATO. A interface produz esta estrutura, o worker a
 * consome, e nada além dela atravessa a fronteira. Enquanto ela não existia,
 * cada ajuste no editor virava um render de minutos numa VPS de um núcleo.
 *
 * TRÊS REGRAS QUE NÃO SE QUEBRAM:
 *
 * 1. EDIÇÃO NÃO TOCA EM PIXEL. Nenhuma operação da interface produz vídeo.
 *    Toda ela muda números aqui dentro. O render acontece uma vez, no fim.
 *
 * 2. TEMPO DA LINHA ≠ TEMPO DA FONTE. Um item tem os dois: onde ele APARECE
 *    no vídeo final (`inicio_s`/`fim_s`) e de onde ele VEM no material
 *    original (`fonteInicio_s`/`fonteFim_s`). Confundir os dois é o bug
 *    clássico de editor — arrastar um clipe na linha passa a cortar outro
 *    trecho do vídeo, o que ninguém espera.
 *
 * 3. TUDO É RELATIVO, NUNCA PIXEL. Posição, escala e recorte vão de 0 a 1
 *    (fração do quadro). O mesmo projeto tem que renderizar igual em 9:16 e
 *    em 1:1, e tem que sobreviver a uma prévia de 320px de largura no
 *    navegador e a um render de 1080. Guardar pixel amarra o projeto a uma
 *    resolução e quebra nas duas pontas.
 *
 * O que ainda NÃO está aqui está anotado como tal — o modelo cresce por
 * necessidade, não por antecipação.
 */

export const VERSAO_PROJETO = 1;

/* ------------------------------------------------------------- proporções */

/**
 * As quatro proporções que as redes usam. O par de pixels é o render final;
 * a prévia escala isso pra caber na tela.
 */
export const PROPORCOES = {
  "9:16": { largura: 1080, altura: 1920, rotulo: "Vertical", onde: "Reels, TikTok, Shorts" },
  "1:1": { largura: 1080, altura: 1080, rotulo: "Quadrado", onde: "Feed do Instagram" },
  "4:5": { largura: 1080, altura: 1350, rotulo: "Retrato", onde: "Feed alto do Instagram" },
  "16:9": { largura: 1920, altura: 1080, rotulo: "Horizontal", onde: "YouTube" },
} as const;

export type Proporcao = keyof typeof PROPORCOES;

/* ------------------------------------------------------ enquadramento base */

/**
 * Como o quadro da fonte se encaixa no quadro de saída.
 *
 * `x`/`y` são o CENTRO do recorte em fração da fonte — 0.5/0.5 é o meio.
 * Foi escolhido centro em vez de canto porque toda operação natural do
 * usuário (arrastar o vídeo, dar zoom) é sobre o centro, e converter canto
 * ⇄ centro a cada gesto convida a erro de sinal.
 *
 * `zoom` 1 significa "cobrir o quadro de saída sem sobra". Acima disso
 * aproxima e perde borda; abaixo de 1 não é permitido pela interface, porque
 * deixaria faixa vazia.
 */
export type Enquadramento = {
  x: number;
  y: number;
  zoom: number;
  /** Graus. Raro, mas é o que permite endireitar material torto. */
  rotacao: number;
};

export const ENQUADRAMENTO_PADRAO: Enquadramento = {
  x: 0.5,
  y: 0.5,
  zoom: 1,
  rotacao: 0,
};

/**
 * Um valor de enquadramento amarrado a um instante.
 *
 * É o que faz "começa no rosto e depois abre" sem render: a prévia
 * interpola entre keyframes na hora de desenhar, e o ffmpeg recebe a mesma
 * curva como expressão de tempo.
 *
 * `t` é relativo ao ITEM (0 = começo do clipe), não à linha do tempo. Assim
 * arrastar o clipe não desmancha a animação.
 */
export type Keyframe = {
  t: number;
  valor: Partial<Enquadramento>;
  /** Suavização entre este e o próximo. */
  curva: "linear" | "suave";
};

/* ------------------------------------------------------------------ itens */

type ItemBase = {
  id: string;
  /** Onde aparece no vídeo final. */
  inicio_s: number;
  fim_s: number;
};

/**
 * Um pedaço de vídeo. Dividir um corte em dois produz DOIS itens que
 * apontam pra mesma fonte em janelas diferentes — nenhum arquivo é criado.
 */
export type ItemVideo = ItemBase & {
  tipo: "video";
  /** Trecho do material ORIGINAL que este item mostra. */
  fonteInicio_s: number;
  fonteFim_s: number;
  enquadramento: Enquadramento;
  keyframes: Keyframe[];
  /** 0 a 1. Silenciar um trecho é volume 0, não cortar o áudio. */
  volume: number;
  efeitos: Efeito[];
  /** Transição que ENTRA neste item, vinda do anterior. */
  transicao: Transicao | null;
};

export type ItemTexto = ItemBase & {
  tipo: "texto";
  conteudo: string;
  /** Id de src/lib/formatos.ts — reusa a tipografia que o render já sabe. */
  formato: string;
  /** Centro do texto, em fração do quadro de SAÍDA. */
  x: number;
  y: number;
  /** Multiplicador sobre o corpo do formato. */
  escala: number;
  animacao: "nenhuma" | "surgir" | "subir" | "maquina" | "pulsar";
};

/**
 * Legenda vinda da transcrição.
 *
 * Separada de ItemTexto de propósito: legenda tem ORIGEM (a palavra falada,
 * com tempo medido) e é editada em bloco pelo formato. Texto é livre e
 * posicionado à mão. Tratar os dois como a mesma coisa faria a legenda
 * perder o vínculo com a fala na primeira edição.
 */
export type ItemLegenda = ItemBase & {
  tipo: "legenda";
  conteudo: string;
  /** Palavras que ganham a cor de destaque do formato. */
  destaques: string[];
  /** Nulo herda o formato do projeto. */
  formato: string | null;
};

export type ItemAudio = ItemBase & {
  tipo: "audio";
  url: string;
  nome: string;
  fonteInicio_s: number;
  volume: number;
  fadeIn_s: number;
  fadeOut_s: number;
};

export type ItemOverlay = ItemBase & {
  tipo: "overlay";
  url: string;
  /** Centro e largura em fração do quadro de saída. */
  x: number;
  y: number;
  escala: number;
  opacidade: number;
  rotacao: number;
};

export type Item =
  | ItemVideo
  | ItemTexto
  | ItemLegenda
  | ItemAudio
  | ItemOverlay;

/* ---------------------------------------------------- efeitos e transições */

/**
 * Efeito com janela própria DENTRO do item.
 *
 * `de`/`ate` são relativos ao item, pelo mesmo motivo dos keyframes: mover o
 * clipe não deve arrastar o efeito pra fora de lugar.
 */
export type Efeito = {
  id: string;
  tipo: "blur" | "nitidez" | "brilho" | "vinheta" | "saturacao" | "cinza";
  de: number;
  ate: number;
  /** 0 a 1. O que "intensidade" significa é decidido por tipo no render. */
  intensidade: number;
};

export type Transicao = {
  tipo: "fade" | "zoom" | "deslizar" | "flash" | "blur";
  duracao_s: number;
};

/* ----------------------------------------------------------------- trilhas */

/**
 * Trilhas por TIPO, não por índice numerado.
 *
 * Editor profissional deixa empilhar N trilhas de vídeo. Aqui não: o produto
 * é short vertical com uma camada de vídeo, e trilha numerada exigiria
 * resolver ordem de composição, mute por trilha e solo — complexidade que
 * ninguém pediu. Quando alguém pedir picture-in-picture, `overlay` já cobre
 * o caso sem virar árvore.
 */
export type Trilha = {
  tipo: "video" | "legenda" | "texto" | "audio" | "overlay";
  itens: Item[];
  /** Trilha muda continua no projeto, só não entra no render. */
  ativa: boolean;
};

export type Projeto = {
  versao: number;
  /** De onde o material vem. */
  fonte: {
    corteId: string;
    analiseId: string;
    /** Proxy leve pra prévia no navegador. Ausente = ainda não gerado. */
    proxyUrl: string | null;
    /** Duração do material ORIGINAL, não do corte. */
    duracao_s: number;
  };
  proporcao: Proporcao;
  /** Formato padrão das legendas que não trouxerem o seu. */
  formato: string;
  trilhas: Trilha[];
};

/* ------------------------------------------------------------- utilitários */

export function projetoVazio(fonte: Projeto["fonte"]): Projeto {
  return {
    versao: VERSAO_PROJETO,
    fonte,
    proporcao: "9:16",
    formato: "hormozi",
    trilhas: [
      { tipo: "video", itens: [], ativa: true },
      { tipo: "legenda", itens: [], ativa: true },
      { tipo: "texto", itens: [], ativa: true },
      { tipo: "overlay", itens: [], ativa: true },
      { tipo: "audio", itens: [], ativa: true },
    ],
  };
}

export function trilhaDe(p: Projeto, tipo: Trilha["tipo"]): Trilha {
  const t = p.trilhas.find((x) => x.tipo === tipo);
  if (t) return t;
  // Projeto salvo por uma versão anterior pode não ter a trilha nova.
  const nova: Trilha = { tipo, itens: [], ativa: true };
  p.trilhas.push(nova);
  return nova;
}

/** Duração do vídeo final: onde termina o último item de qualquer trilha. */
export function duracaoDoProjeto(p: Projeto): number {
  let fim = 0;
  for (const t of p.trilhas) {
    for (const i of t.itens) fim = Math.max(fim, i.fim_s);
  }
  return fim;
}

/**
 * Divide um item de vídeo no instante da linha do tempo.
 *
 * A conta que importa é a da fonte: o ponto de corte na linha vira uma
 * posição PROPORCIONAL dentro da janela de origem. Sem isso, dividir um
 * clipe que já foi esticado ou encurtado pegaria o frame errado.
 *
 * Devolve null quando o corte cai fora do item ou deixaria um pedaço curto
 * demais pra existir.
 */
export function dividirVideo(
  item: ItemVideo,
  emSegundos: number,
  novoId: string,
): [ItemVideo, ItemVideo] | null {
  const MINIMO = 0.3;
  if (
    emSegundos <= item.inicio_s + MINIMO ||
    emSegundos >= item.fim_s - MINIMO
  ) {
    return null;
  }

  const fracao = (emSegundos - item.inicio_s) / (item.fim_s - item.inicio_s);
  const fonteCorte =
    item.fonteInicio_s + (item.fonteFim_s - item.fonteInicio_s) * fracao;

  const esquerda: ItemVideo = {
    ...item,
    fim_s: emSegundos,
    fonteFim_s: fonteCorte,
    // Keyframes do lado direito não pertencem mais a este pedaço.
    keyframes: item.keyframes.filter((k) => k.t <= emSegundos - item.inicio_s),
  };

  const direita: ItemVideo = {
    ...item,
    id: novoId,
    inicio_s: emSegundos,
    fonteInicio_s: fonteCorte,
    // A transição de entrada era do começo do clipe original: o pedaço da
    // direita nasce colado no da esquerda e não deve repetir o efeito.
    transicao: null,
    keyframes: item.keyframes
      .filter((k) => k.t > emSegundos - item.inicio_s)
      .map((k) => ({ ...k, t: k.t - (emSegundos - item.inicio_s) })),
  };

  return [esquerda, direita];
}

/**
 * Valor do enquadramento num instante, interpolando os keyframes.
 *
 * Mesma função pra prévia e pra geração do filtro do ffmpeg — dois cálculos
 * separados divergiriam, e a pessoa veria uma coisa na tela e outra no MP4.
 */
export function enquadramentoEm(item: ItemVideo, t: number): Enquadramento {
  const base = item.enquadramento;
  if (item.keyframes.length === 0) return base;

  const ks = [...item.keyframes].sort((a, b) => a.t - b.t);
  const antes = [...ks].reverse().find((k) => k.t <= t);
  const depois = ks.find((k) => k.t > t);

  if (!antes) return { ...base, ...(depois?.valor ?? {}) };
  if (!depois) return { ...base, ...antes.valor };

  const bruto = (t - antes.t) / (depois.t - antes.t);
  // "suave" é ease-in-out cúbico: acelera e desacelera, que é como o olho
  // espera que uma câmera se mova. Linear parece mecânico.
  const p =
    antes.curva === "suave"
      ? bruto < 0.5
        ? 4 * bruto ** 3
        : 1 - (-2 * bruto + 2) ** 3 / 2
      : bruto;

  const entre = (a: number, b: number) => a + (b - a) * p;
  const de = { ...base, ...antes.valor };
  const ate = { ...base, ...depois.valor };

  return {
    x: entre(de.x, ate.x),
    y: entre(de.y, ate.y),
    zoom: entre(de.zoom, ate.zoom),
    rotacao: entre(de.rotacao, ate.rotacao),
  };
}
