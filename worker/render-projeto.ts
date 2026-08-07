import {
  PROPORCOES,
  trilhaDe,
  type Enquadramento,
  type ItemVideo,
  type Projeto,
} from "../src/lib/editor/projeto";

/**
 * Traduz um projeto de edição no grafo de filtros do ffmpeg.
 *
 * É a outra ponta do contrato: a interface produz o Projeto, isto o executa.
 * Um render só, no fim — que é o ponto inteiro da edição não-destrutiva.
 *
 * O QUE ESTA VERSÃO FAZ
 *   · vários clipes do mesmo material, concatenados
 *   · qualquer uma das 4 proporções de saída
 *   · enquadramento por clipe: zoom, posição X/Y, com recorte de verdade
 *   · volume por clipe
 *   · legendas queimadas, reusando o gerador de ASS dos cortes automáticos
 *
 * O QUE AINDA NÃO FAZ, e por quê
 *   · KEYFRAMES animados. O `crop` do ffmpeg avalia largura e altura só na
 *     inicialização — só x e y mudam por frame. Zoom animado exige o filtro
 *     `zoompan`, que trabalha por número de frame e não por segundo, e num
 *     núcleo só é caro. O enquadramento renderiza ESTÁTICO (o valor base do
 *     clipe); o modelo e a prévia já animam.
 *   · texto avulso, overlay, música e efeitos. O modelo os carrega; aqui
 *     eles ainda não viram filtro.
 *
 * Renderizar em silêncio o que não sabe fazer seria pior que não fazer: a
 * pessoa exportaria e receberia um vídeo diferente do que viu na prévia. Por
 * isso `avisosDoProjeto()` devolve, em texto, tudo que foi ignorado.
 */

export type Dimensoes = { largura: number; altura: number };

/** yuv420p exige lado par; ímpar faz o ffmpeg recusar o filtro. */
function par(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2);
}

function limite(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(v, max));
}

/**
 * Cadeia de escala + recorte que encaixa a fonte no quadro de saída.
 *
 * `zoom` 1 é "cobrir sem sobra" — o equivalente ao object-fit: cover do CSS.
 * A conta parte da escala que cobre o quadro e multiplica pelo zoom; assim o
 * mesmo valor de zoom significa a mesma coisa em 9:16 e em 16:9, que é o que
 * permite trocar de proporção sem refazer o enquadramento.
 *
 * `x`/`y` são o CENTRO desejado em fração da fonte. O deslocamento é preso
 * às bordas: sem isso, arrastar demais deixaria faixa preta, que é o defeito
 * que o recorte existe pra evitar.
 */
export function filtroDeEnquadramento(
  fonte: Dimensoes,
  saida: Dimensoes,
  e: Enquadramento,
): string {
  const cobrir = Math.max(
    saida.largura / fonte.largura,
    saida.altura / fonte.altura,
  );
  const escala = cobrir * Math.max(1, e.zoom);

  const largura = par(fonte.largura * escala);
  const altura = par(fonte.altura * escala);

  const x = Math.round(
    limite(e.x * largura - saida.largura / 2, 0, Math.max(0, largura - saida.largura)),
  );
  const y = Math.round(
    limite(e.y * altura - saida.altura / 2, 0, Math.max(0, altura - saida.altura)),
  );

  return `scale=${largura}:${altura},crop=${saida.largura}:${saida.altura}:${x}:${y}`;
}

/**
 * Buracos entre clipes na linha do tempo.
 *
 * O `concat` do ffmpeg COLA um clipe no outro: ele só conhece as janelas da
 * fonte, não a posição na linha. Então um vazio deixado ao aparar some no
 * MP4, e o vídeo final sai mais curto que a prévia mostrou — sem que nada
 * avise. É a divergência prévia↔render mais séria que existe aqui, porque a
 * pessoa só descobre depois de esperar o render inteiro.
 *
 * Devolve o total de segundos que serão engolidos.
 */
export function buracosNaLinha(videos: ItemVideo[]): number {
  const ordem = [...videos].sort((a, b) => a.inicio_s - b.inicio_s);
  // Tolerância de um frame a 30fps: fronteira calculada em ponto flutuante
  // quase nunca fecha exata, e avisar por 0,01s seria ruído.
  const TOLERANCIA = 1 / 30;
  let total = ordem.length > 0 && ordem[0].inicio_s > TOLERANCIA ? ordem[0].inicio_s : 0;
  for (let i = 1; i < ordem.length; i++) {
    const vao = ordem[i].inicio_s - ordem[i - 1].fim_s;
    if (vao > TOLERANCIA) total += vao;
  }
  return total;
}

/** O que o projeto pede e este render ainda não entrega. */
export function avisosDoProjeto(p: Projeto): string[] {
  const avisos: string[] = [];
  const videos = trilhaDe(p, "video").itens as ItemVideo[];

  const buraco = buracosNaLinha(videos);
  if (buraco > 0) {
    avisos.push(
      `Há ${buraco.toFixed(1)}s de vazio entre os clipes na linha do tempo. ` +
        `O render cola um clipe no outro, então o vídeo final sai mais curto — ` +
        `encoste os clipes se não era isso que você queria.`,
    );
  }

  if (videos.some((v) => v.keyframes.length > 0)) {
    avisos.push(
      "Keyframes de enquadramento ainda não animam no render — sai o valor inicial do clipe.",
    );
  }
  if (videos.some((v) => v.efeitos.length > 0)) {
    avisos.push("Efeitos ainda não entram no render.");
  }
  if (videos.some((v) => v.transicao)) {
    avisos.push("Transições entre clipes ainda não entram no render.");
  }
  if (videos.some((v) => v.enquadramento.rotacao !== 0)) {
    avisos.push("Rotação ainda não entra no render.");
  }
  if (trilhaDe(p, "texto").itens.length > 0) {
    avisos.push("Textos avulsos ainda não entram no render.");
  }
  if (trilhaDe(p, "overlay").itens.length > 0) {
    avisos.push("Overlays ainda não entram no render.");
  }
  if (trilhaDe(p, "audio").itens.length > 0) {
    avisos.push("Trilha de áudio ainda não entra no render.");
  }
  return avisos;
}

export type PlanoDeRender = {
  /** Grafo completo, pronto pro -filter_complex. */
  grafo: string;
  /** Rótulos finais pro -map. */
  saidaVideo: string;
  saidaAudio: string;
  duracao_s: number;
  avisos: string[];
};

/**
 * Monta o grafo do projeto inteiro.
 *
 * `nomeAss` entra como filtro no fim da cadeia de vídeo, depois do concat:
 * a legenda é do vídeo FINAL, com os tempos da linha do tempo, então aplicá-la
 * por clipe erraria o tempo de todo clipe que não fosse o primeiro.
 */
export function planejarRender(
  projeto: Projeto,
  fonte: Dimensoes,
  nomeAss: string | null,
): PlanoDeRender {
  const saida = PROPORCOES[projeto.proporcao];
  const videos = (trilhaDe(projeto, "video").itens as ItemVideo[])
    .slice()
    .sort((a, b) => a.inicio_s - b.inicio_s);

  if (videos.length === 0) {
    throw new Error("O projeto não tem nenhum clipe de vídeo.");
  }

  const partes: string[] = [];

  videos.forEach((v, i) => {
    const enq = filtroDeEnquadramento(fonte, saida, v.enquadramento);
    // setpts zerando o relógio a cada clipe é o que permite o concat: sem
    // isso o segundo clipe entraria com o tempo do material original e o
    // player pularia o intervalo inteiro.
    partes.push(
      `[0:v]trim=start=${v.fonteInicio_s.toFixed(3)}:end=${v.fonteFim_s.toFixed(3)},` +
        `setpts=PTS-STARTPTS,${enq},setsar=1[v${i}]`,
    );
    partes.push(
      `[0:a]atrim=start=${v.fonteInicio_s.toFixed(3)}:end=${v.fonteFim_s.toFixed(3)},` +
        `asetpts=PTS-STARTPTS,volume=${v.volume.toFixed(2)}[a${i}]`,
    );
  });

  const entradas = videos.map((_, i) => `[v${i}][a${i}]`).join("");
  partes.push(`${entradas}concat=n=${videos.length}:v=1:a=1[vc][aout]`);

  // A legenda entra por último, no vídeo já concatenado.
  if (nomeAss) partes.push(`[vc]ass=${nomeAss}[vout]`);

  return {
    grafo: partes.join(";"),
    saidaVideo: nomeAss ? "[vout]" : "[vc]",
    saidaAudio: "[aout]",
    // A soma das janelas da FONTE, não `duracaoDoProjeto()` (o maior fim_s).
    // O concat cola os clipes, então buraco na linha não vira duração — usar
    // o fim_s faria este número mentir sobre o arquivo que sai.
    duracao_s: videos.reduce((s, v) => s + (v.fonteFim_s - v.fonteInicio_s), 0),
    avisos: avisosDoProjeto(projeto),
  };
}

/**
 * Argumentos completos do ffmpeg.
 *
 * Mesmo par de encoder dos cortes automáticos (veryfast + crf 20), medido em
 * worker/medir-render.ts: mesma qualidade que fast+crf21 em um quarto do
 * tempo, o que importa numa VPS de um núcleo.
 */
export function argumentosDeRender(
  fonteArquivo: string,
  plano: PlanoDeRender,
  saidaArquivo: string,
): string[] {
  return [
    "-i", fonteArquivo,
    "-filter_complex", plano.grafo,
    "-map", plano.saidaVideo,
    "-map", plano.saidaAudio,
    "-r", "30",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    "-y", saidaArquivo,
  ];
}
