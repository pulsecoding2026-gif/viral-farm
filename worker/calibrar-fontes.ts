/**
 * Mede a largura REAL de cada tipografia, renderizando e olhando os pixels.
 *
 *   npx tsx worker/calibrar-fontes.ts        (precisa rodar na VPS)
 *
 * POR QUE ISTO EXISTE
 *
 * `fatorLargura()` em legendas.ts carrega uma tabela de "quanto um caractere
 * ocupa, em fração do corpo da fonte" que eu escrevi de cabeça. Medindo um
 * frame renderizado, a conta errou 57% pra Montserrat em caixa alta: estimei
 * 529px onde o texto ocupa 336.
 *
 * Esse número é usado em TRÊS decisões, e errar pra cima estraga as três:
 *   · corpoDaFonte()      — acha que não cabe e encolhe a fonte
 *   · caracteresPorLinha() — quebra a linha antes da hora
 *   · ancoraX()           — desvia do centro achando que vai bater no rail
 *
 * O piso de legibilidade que eu precisei criar era, em boa parte, remendo
 * deste erro.
 *
 * A medição: desenha uma régua de caracteres num quadro preto, lê o frame em
 * cinza e acha a caixa dos pixels claros. Largura ÷ (nº de caracteres × corpo)
 * é o fator real da família.
 */
import path from "node:path";
import fs from "node:fs/promises";
import { run, runBinario, bin } from "../src/lib/proc";
import { FORMATOS } from "../src/lib/formatos";

const LARGURA = 1080;
const ALTURA = 400;
const CORPO = 100;

/**
 * Amostra representativa de português, não "AAAA".
 *
 * Largura média depende da mistura de letras: um texto de "iiii" mediria
 * metade de um de "MMMM". Esta frase tem a distribuição aproximada do que as
 * legendas realmente exibem, incluindo acento e espaço.
 */
const AMOSTRA = "as regras do jogo mudaram e ninguem avisou";

function familias(): string[] {
  const vistas = new Set<string>();
  for (const f of FORMATOS) {
    vistas.add((f.legenda.fonte ?? "Arial").split("/")[0].trim());
  }
  return [...vistas].sort();
}

/** Caixa dos pixels claros do frame, em pixels. */
async function larguraRenderizada(
  familia: string,
  texto: string,
  negrito: boolean,
  dir: string,
): Promise<number> {
  const ass = path.join(dir, "m.ass");
  await fs.writeFile(
    ass,
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
Dialogue: 0,0:00:00.00,0:00:02.00,M,,0,0,0,,{\\pos(${LARGURA / 2},${ALTURA / 2})}${texto}
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
  return x1 < 0 ? 0 : x1 - x0 + 1;
}

async function main() {
  const dir = path.join(process.cwd(), "saidas", "calibracao");
  await fs.mkdir(dir, { recursive: true });

  console.log(`corpo ${CORPO}px · amostra de ${AMOSTRA.length} caracteres\n`);
  console.log(
    "familia".padEnd(20) +
      "minusc.".padStart(9) +
      "MAIUSC.".padStart(9) +
      "  (fator por caractere)",
  );

  const tabela: Record<string, { baixa: number; alta: number }> = {};

  for (const familia of familias()) {
    const baixaPx = await larguraRenderizada(familia, AMOSTRA, true, dir);
    const altaPx = await larguraRenderizada(
      familia, AMOSTRA.toUpperCase(), true, dir,
    );
    const baixa = baixaPx / (AMOSTRA.length * CORPO);
    const alta = altaPx / (AMOSTRA.length * CORPO);
    tabela[familia.toLowerCase()] = {
      baixa: Number(baixa.toFixed(3)),
      alta: Number(alta.toFixed(3)),
    };
    console.log(
      familia.padEnd(20) +
        baixa.toFixed(3).padStart(9) +
        alta.toFixed(3).padStart(9),
    );
  }

  console.log("\n--- cole em legendas.ts ---\n");
  console.log("const LARGURA_POR_FAMILIA: Record<string, { baixa: number; alta: number }> = {");
  for (const [nome, v] of Object.entries(tabela)) {
    console.log(`  "${nome}": { baixa: ${v.baixa}, alta: ${v.alta} },`);
  }
  console.log("};");
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
