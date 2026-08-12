/**
 * Mede a largura REAL de cada CARACTERE em cada tipografia.
 *
 *   npx tsx worker/calibrar-fontes.ts        (precisa rodar na VPS)
 *
 * POR QUE POR CARACTERE, E NÃO UMA MÉDIA
 *
 * A versão anterior media uma frase inteira e guardava a média por letra.
 * Isso funciona pra texto longo, onde as letras se compensam, e ERRA FEIO
 * em legenda de short: "porque não" no Kinetic (corpo 187) estourava o
 * quadro porque a frase é curta e cheia de letras largas — "p", "q", "o",
 * "ã" — enquanto a média foi calculada num texto com "i", "l" e espaços.
 *
 * Média é o número certo pra pergunta errada. A pergunta é "quanto ESTA
 * frase ocupa", e a resposta é a soma das letras dela.
 *
 * O resultado é uma tabela por família com a largura de cada caractere em
 * fração do corpo. Somar é exato: sem erro acumulado, sem folga inventada,
 * e a quebra de linha, o corpo da fonte e a âncora passam a concordar com
 * o que o libass realmente desenha.
 */
import path from "node:path";
import fs from "node:fs/promises";
import { run, runBinario, bin } from "../src/lib/proc";
import { FORMATOS } from "../src/lib/formatos";

const LARGURA = 4000;
const ALTURA = 300;
const CORPO = 100;

/**
 * O alfabeto que a legenda usa de verdade.
 *
 * Português com acento, dígitos e a pontuação que sobrevive à transcrição.
 * Caractere fora desta lista cai numa média no gerador — é o caso raro
 * (emoji, símbolo), e ali a média é aceitável porque não domina a linha.
 */
const ALFABETO =
  "abcdefghijklmnopqrstuvwxyz" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
  "0123456789" +
  "áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ" +
  ".,!?:;-—'\"()% ";

function familias(): string[] {
  const vistas = new Set<string>();
  for (const f of FORMATOS) vistas.add((f.legenda.fonte ?? "Arial").split("/")[0].trim());
  return [...vistas].sort();
}

/** Escreve o ASS de medição com o texto dado e devolve a largura em pixels. */
async function medir(
  familia: string,
  texto: string,
  negrito: boolean,
  dir: string,
): Promise<number> {
  const escapado = texto.replaceAll("\\", "").replaceAll("{", "").replaceAll("}", "");
  await fs.writeFile(
    path.join(dir, "m.ass"),
    `[Script Info]
ScriptType: v4.00+
PlayResX: ${LARGURA}
PlayResY: ${ALTURA}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: M,${familia},${CORPO},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,${negrito ? -1 : 0},0,0,0,100,100,0,0,1,0,0,5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:02.00,M,,0,0,0,,{\\pos(${LARGURA / 2},${ALTURA / 2})}${escapado}
`,
    "utf-8",
  );

  const buf = await runBinario(
    bin.ffmpeg(),
    [
      "-f", "lavfi", "-i", `color=c=black:s=${LARGURA}x${ALTURA}:d=1`,
      "-vf", "ass=m.ass",
      "-frames:v", "1", "-pix_fmt", "gray", "-f", "rawvideo", "-",
    ],
    { timeoutMs: 60_000, cwd: dir },
  );

  let x0 = LARGURA;
  let x1 = -1;
  for (let y = 0; y < ALTURA; y++) {
    for (let x = 0; x < LARGURA; x++) {
      if (buf[y * LARGURA + x] > 128) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
      }
    }
  }
  if (x1 < 0) return 0;
  if (x0 <= 1 || x1 >= LARGURA - 2) {
    throw new Error(`${familia}: texto encostou na borda — medida seria da tela.`);
  }
  return x1 - x0 + 1;
}

/**
 * Largura de UM caractere, isolando o avanço dele.
 *
 * Medir a letra sozinha daria a tinta, não o AVANÇO (o quanto o cursor anda,
 * incluindo o respiro lateral). A diferença importa: "i" tem tinta estreita
 * e avanço bem maior.
 *
 * O truque é medir "HH" e "HcH": a diferença é exatamente o avanço de `c`
 * mais o kerning com H dos dois lados — que é o que acontece numa palavra
 * real. O espaço, que não tem tinta nenhuma, só existe nessa forma.
 */
async function larguraDoCaractere(
  familia: string,
  c: string,
  negrito: boolean,
  baseHH: number,
  dir: string,
): Promise<number> {
  const comLetra = await medir(familia, `H${c}H`, negrito, dir);
  return Math.max(0, comLetra - baseHH);
}

async function main() {
  const dir = path.join(process.cwd(), "saidas", "calibracao");
  await fs.mkdir(dir, { recursive: true });

  const tabela: Record<string, Record<string, number>> = {};

  for (const familia of familias()) {
    console.log(`medindo ${familia}…`);
    const baseHH = await medir(familia, "HH", true, dir);
    const larguras: Record<string, number> = {};

    for (const c of ALFABETO) {
      const px = await larguraDoCaractere(familia, c, true, baseHH, dir);
      larguras[c] = Number((px / CORPO).toFixed(4));
    }

    tabela[familia.toLowerCase()] = larguras;
    const media =
      Object.values(larguras).reduce((a, b) => a + b, 0) / Object.keys(larguras).length;
    console.log(
      `  ${familia.padEnd(18)} média ${media.toFixed(3)} | ` +
        `i=${larguras["i"]} m=${larguras["m"]} M=${larguras["M"]} espaço=${larguras[" "]}`,
    );
  }

  const saida = path.join(process.cwd(), "src", "lib", "larguras-fonte.json");
  await fs.writeFile(saida, JSON.stringify(tabela, null, 1), "utf-8");
  console.log(`\ntabela gravada em ${saida}`);
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
