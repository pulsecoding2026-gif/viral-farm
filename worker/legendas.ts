import type { Palavra } from "./transcritor";

/**
 * Legenda animada em formato ASS, queimada no vídeo pelo FFmpeg.
 *
 * O efeito é o clássico dos shorts: a frase aparece em blocos curtos e a
 * palavra sendo falada acende em laranja (karaokê do ASS: SecondaryColour é
 * a cor "antes de falar", PrimaryColour a "depois" — o \k faz a troca no
 * tempo certo de cada palavra).
 *
 * Cores em ASS são &HAABBGGRR (alpha + BGR invertido):
 *   branco  &H00FFFFFF · laranja #f74111 vira &H001141F7 · preto &H00000000
 */

const CABECALHO = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Fala,Arial,88,&H001141F7,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,6,3,2,60,60,420,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

function tempoAss(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = Math.floor(s % 60);
  const cs = Math.round((s - Math.floor(s)) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(seg).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/** Escapa o que quebraria a linha de Dialogue. */
function limpar(texto: string): string {
  return texto.replace(/[{}]/g, "").replace(/\n/g, " ");
}

/**
 * Agrupa palavras em blocos de exibição.
 *
 * Blocos curtos (até 3 palavras ou pausa > 0,6s) porque legenda de short é
 * lida em relance — linha longa obriga o olho a varrer e perde o ritmo.
 */
export function agruparPalavras(palavras: Palavra[]): Palavra[][] {
  const blocos: Palavra[][] = [];
  let atual: Palavra[] = [];

  for (const p of palavras) {
    const anterior = atual[atual.length - 1];
    const pausa = anterior ? p.inicio_s - anterior.fim_s : 0;

    if (atual.length >= 3 || pausa > 0.6) {
      if (atual.length > 0) blocos.push(atual);
      atual = [];
    }
    atual.push(p);
  }
  if (atual.length > 0) blocos.push(atual);
  return blocos;
}

/**
 * Gera o .ass de um corte. Recebe as palavras JÁ dentro da janela do corte;
 * os tempos são reancorados pro zero do clipe.
 */
export function gerarAss(palavras: Palavra[], inicioCorte: number): string {
  const blocos = agruparPalavras(palavras);
  const linhas: string[] = [];

  for (const bloco of blocos) {
    const inicio = bloco[0].inicio_s - inicioCorte;
    const fim = bloco[bloco.length - 1].fim_s - inicioCorte;
    if (fim <= 0) continue;

    // \k mede em centissegundos a duração de cada palavra no karaokê.
    const texto = bloco
      .map((p, i) => {
        // A 1ª palavra espera do início do bloco; as demais, da anterior.
        const de = i === 0 ? inicio : bloco[i - 1].fim_s - inicioCorte;
        const duracaoCs = Math.max(
          1,
          Math.round((p.fim_s - inicioCorte - de) * 100),
        );
        return `{\\k${duracaoCs}}${limpar(p.texto.toUpperCase())}`;
      })
      .join(" ");

    linhas.push(
      `Dialogue: 0,${tempoAss(Math.max(0, inicio))},${tempoAss(fim)},Fala,,0,0,0,,${texto}`,
    );
  }

  return CABECALHO + linhas.join("\n") + "\n";
}
