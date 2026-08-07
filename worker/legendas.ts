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

/**
 * Predefinições de legenda — o "Predefinições rápidas" do Estúdio.
 *
 * Cada estilo é só cores e karaokê ligado/desligado; a mecânica de blocos e
 * tempos é a mesma. `sem` pula a legenda por inteiro.
 */
export type EstiloLegenda = "karaoke" | "neon" | "minimal" | "sem";

const CORES: Record<
  Exclude<EstiloLegenda, "sem">,
  { primaria: string; secundaria: string; karaoke: boolean }
> = {
  // Palavra acende no laranja da marca (#f74111 → &H001141F7 em BGR).
  karaoke: { primaria: "&H001141F7", secundaria: "&H00FFFFFF", karaoke: true },
  // Verde vibrante estilo Mozi (#3DFC8C → BGR 8CFC3D).
  neon: { primaria: "&H008CFC3D", secundaria: "&H00FFFFFF", karaoke: true },
  // Branco puro, sem destaque — pra vídeo sóbrio.
  minimal: { primaria: "&H00FFFFFF", secundaria: "&H00FFFFFF", karaoke: false },
};

function cabecalho(estilo: Exclude<EstiloLegenda, "sem">): string {
  const c = CORES[estilo];
  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Fala,Arial,88,${c.primaria},${c.secundaria},&H00000000,&H96000000,-1,0,0,0,100,100,0,0,1,6,3,2,60,60,420,1
${ESTILO_TITULO}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
}

/** Estilo da caixa de título que abre o corte — fundo branco, texto preto. */
const ESTILO_TITULO =
  "Style: Titulo,Arial,58,&H00000000,&H00000000,&H00FFFFFF,&H00FFFFFF,-1,0,0,0,100,100,0,0,3,14,0,8,90,90,150,1";

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
 * os tempos são reancorados pro zero do clipe. Devolve null quando o estilo
 * é "sem" — o render pula o filtro de legenda.
 */
export function gerarAss(
  palavras: Palavra[],
  inicioCorte: number,
  estilo: EstiloLegenda = "karaoke",
  tituloTela?: string,
): string | null {
  // Sem legenda mas COM título ainda vale um .ass: o título é o gancho
  // escrito, e some junto com a legenda seria perder as duas coisas.
  if (estilo === "sem" && !tituloTela) return null;
  // "sem" ainda precisa de UM estilo declarado no cabeçalho do .ass, senão o
  // arquivo é inválido — usamos o karaokê como base e não emitimos falas.
  const base = estilo === "sem" ? "karaoke" : estilo;
  const config = CORES[base];

  const blocos = estilo === "sem" ? [] : agruparPalavras(palavras);
  const linhas: string[] = [];

  // Caixa de título nos primeiros 5s — o gancho que se LÊ enquanto a fala
  // ainda está começando. Quebra em duas linhas pra não estourar a largura.
  if (tituloTela?.trim()) {
    const t = limpar(tituloTela.trim());
    const meio = t.length > 26 ? t.lastIndexOf(" ", Math.ceil(t.length / 2)) : -1;
    const texto = meio > 0 ? `${t.slice(0, meio)}\\N${t.slice(meio + 1)}` : t;
    linhas.push(
      `Dialogue: 1,${tempoAss(0)},${tempoAss(5)},Titulo,,0,0,0,,${texto}`,
    );
  }

  for (const bloco of blocos) {
    const inicio = bloco[0].inicio_s - inicioCorte;
    const fim = bloco[bloco.length - 1].fim_s - inicioCorte;
    if (fim <= 0) continue;

    // \k mede em centissegundos a duração de cada palavra no karaokê.
    // Sem karaokê, o bloco aparece inteiro já na cor primária.
    const texto = bloco
      .map((p, i) => {
        if (!config.karaoke) return limpar(p.texto.toUpperCase());
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

  return cabecalho(base) + linhas.join("\n") + "\n";
}
