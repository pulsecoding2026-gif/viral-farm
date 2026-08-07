import { runBinario, run, bin } from "../src/lib/proc";

/**
 * Escolha de enquadramento por corte.
 *
 * O crop central fixo (o comportamento antigo) descarta 22% de cada lado de
 * uma fonte 16:9. Quando o que importa está no meio — rosto, close, alguém
 * falando — isso é ótimo: aproxima e enche a tela. Quando NÃO está — frase
 * escrita na tela, plano aberto, duas pessoas, gráfico — o corte come
 * justamente o conteúdo.
 *
 * Dois enquadramentos:
 *
 *   preencher  crop central. Tela cheia, nada de barra. Perde as laterais.
 *   ajustar    o quadro inteiro cabe na largura e o fundo é uma cópia
 *              ampliada e desfocada do próprio vídeo. Não perde nada.
 *
 * A decisão é por MEDIÇÃO, não por adivinhação: a transcrição não sabe se
 * tem texto na tela — quem sabe é o pixel. Amostramos frames do trecho e
 * comparamos o detalhe das faixas que o crop descartaria com o detalhe do
 * centro. Faixa lateral com detalhe = cortar perde informação.
 */

export type Enquadramento = "preencher" | "ajustar";

/** Proporção que o crop 9:16 descarta de cada lado numa fonte 16:9. */
const FAIXA_PERDIDA = 0.22;

/** Frames analisados ao longo do trecho. Ímpar pra ter um no meio exato. */
const AMOSTRAS = 7;

/** Resolução da análise. Pequena de propósito: procuramos massa de detalhe,
 *  não legibilidade — e 160x90 lê 7 frames em fração de segundo. */
const LARGURA_ANALISE = 160;
const ALTURA_ANALISE = 90;

export type MedidaQuadro = {
  /** Detalhe médio das faixas laterais (0–255). */
  laterais: number;
  /** Detalhe médio da faixa central que o crop preserva. */
  centro: number;
  /** laterais / centro. Alto = as bordas carregam conteúdo. */
  razao: number;
  frames: number;
};

/** Desvio padrão da luminância — proxy barato de "quanta coisa tem aqui". */
function desvio(pixels: number[]): number {
  if (pixels.length === 0) return 0;
  const media = pixels.reduce((a, b) => a + b, 0) / pixels.length;
  const variancia =
    pixels.reduce((a, p) => a + (p - media) ** 2, 0) / pixels.length;
  return Math.sqrt(variancia);
}

/**
 * Lê um frame em cinza cru e mede o detalhe por região.
 *
 * rawvideo em gray: 1 byte por pixel, sem cabeçalho, sem compressão. É o
 * formato mais direto que existe pra isso — nada de decodificar PNG.
 */
async function medirFrame(
  video: string,
  segundo: number,
): Promise<{ laterais: number; centro: number } | null> {
  let buf: Buffer;
  try {
    buf = await runBinario(
      bin.ffmpeg(),
      [
        // -ss antes do -i: busca por keyframe, ordens de grandeza mais rápido.
        // Precisão de frame não importa aqui — queremos o conteúdo da cena.
        "-ss", segundo.toFixed(2),
        "-i", video,
        "-frames:v", "1",
        "-vf", `scale=${LARGURA_ANALISE}:${ALTURA_ANALISE}`,
        "-pix_fmt", "gray",
        "-f", "rawvideo",
        "-",
      ],
      { timeoutMs: 20_000 },
    );
  } catch {
    // Frame fora do vídeo ou ilegível: some da amostra em vez de derrubar
    // a análise inteira.
    return null;
  }

  const esperado = LARGURA_ANALISE * ALTURA_ANALISE;
  if (buf.length < esperado) return null;

  const corte = Math.round(LARGURA_ANALISE * FAIXA_PERDIDA);
  const laterais: number[] = [];
  const centro: number[] = [];

  for (let y = 0; y < ALTURA_ANALISE; y++) {
    for (let x = 0; x < LARGURA_ANALISE; x++) {
      const v = buf[y * LARGURA_ANALISE + x];
      if (x < corte || x >= LARGURA_ANALISE - corte) laterais.push(v);
      else centro.push(v);
    }
  }

  return { laterais: desvio(laterais), centro: desvio(centro) };
}

export async function medirQuadro(
  video: string,
  inicio: number,
  fim: number,
): Promise<MedidaQuadro> {
  const duracao = Math.max(fim - inicio, 0.5);
  // Evita a primeira e a última fração: transição e fade sujam a leitura.
  const pontos = Array.from({ length: AMOSTRAS }, (_, i) =>
    inicio + duracao * ((i + 0.5) / AMOSTRAS),
  );

  const medidas = (await Promise.all(pontos.map((s) => medirFrame(video, s))))
    .filter((m): m is { laterais: number; centro: number } => m !== null);

  if (medidas.length === 0) {
    return { laterais: 0, centro: 0, razao: 0, frames: 0 };
  }

  const laterais = medidas.reduce((a, m) => a + m.laterais, 0) / medidas.length;
  const centro = medidas.reduce((a, m) => a + m.centro, 0) / medidas.length;

  return {
    laterais,
    centro,
    // centro ~0 é tela lisa; sem detalhe em lugar nenhum, crop não perde nada.
    razao: centro > 1 ? laterais / centro : 0,
    frames: medidas.length,
  };
}

/**
 * Limiares.
 *
 * RAZAO_ALTA: acima disso as bordas carregam tanto quanto o centro — plano
 * aberto, texto ocupando a largura, duas pessoas. Cortar mutila.
 *
 * LATERAL_MINIMA: guarda contra o caso em que o centro é liso demais (fundo
 * infinito, tela preta). Aí a razão dispara sem que as bordas tenham nada de
 * verdade, e o crop continua sendo a melhor escolha.
 */
const RAZAO_ALTA = 0.75;
const LATERAL_MINIMA = 12;

export function decidirEnquadramento(m: MedidaQuadro): {
  enquadramento: Enquadramento;
  motivo: string;
} {
  if (m.frames === 0) {
    return {
      enquadramento: "preencher",
      motivo: "não consegui ler frames; mantive o corte central",
    };
  }

  if (m.laterais < LATERAL_MINIMA) {
    return {
      enquadramento: "preencher",
      motivo: `laterais quase lisas (${m.laterais.toFixed(1)}), o corte não perde nada`,
    };
  }

  if (m.razao >= RAZAO_ALTA) {
    return {
      enquadramento: "ajustar",
      motivo: `as bordas têm ${Math.round(m.razao * 100)}% do detalhe do centro — cortar perderia conteúdo`,
    };
  }

  return {
    enquadramento: "preencher",
    motivo: `conteúdo concentrado no centro (bordas em ${Math.round(m.razao * 100)}%)`,
  };
}

/**
 * A cadeia de filtros de cada enquadramento, até o vídeo 1080x1920.
 *
 * `ajustar` usa split: a MESMA fonte vira fundo e frente. O fundo é ampliado
 * até cobrir, desfocado e escurecido (senão compete com a frente); a frente
 * entra inteira, na largura, centralizada. É o "letterbox com fundo vivo" —
 * ninguém vê barra preta e nada do quadro é perdido.
 */
export function filtroDeEnquadramento(e: Enquadramento): string {
  if (e === "ajustar") {
    return [
      "split=2[bg][fg]",
      "[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920," +
        // sigma alto o bastante pra virar textura, não imagem reconhecível.
        "gblur=sigma=28,eq=brightness=-0.16:saturation=1.15[bgb]",
      "[fg]scale=1080:-2[fgs]",
      "[bgb][fgs]overlay=(W-w)/2:(H-h)/2",
    ].join(";");
  }
  return "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920";
}

/** Proporção da fonte — 9:16 nativo não precisa de nenhum dos dois. */
export async function ehVertical(video: string): Promise<boolean> {
  try {
    const saida = await run(
      bin.ffprobe(),
      [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=p=0",
        video,
      ],
      { timeoutMs: 20_000 },
    );
    const [l, a] = saida.trim().split(",").map(Number);
    return Boolean(l && a && l / a <= 1);
  } catch {
    return false;
  }
}
