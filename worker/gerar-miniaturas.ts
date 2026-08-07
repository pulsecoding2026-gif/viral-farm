/**
 * Gera a miniatura REAL de cada formato, pra galeria mostrar o resultado em
 * vez de uma aproximação.
 *
 * Roda na VPS (é lá que as 11 tipografias existem) e comita o resultado como
 * asset estático: renderizar sob demanda gastaria ffmpeg a cada visita da
 * galeria pra produzir sempre a mesma imagem.
 *
 *   npx tsx worker/gerar-miniaturas.ts
 *
 * POR QUE ISTO EXISTE
 *
 * A galeria desenhava a prévia em HTML/CSS, aproximando a fonte pela família
 * genérica — o navegador não tem Anton nem Archivo Black. Resultado: os 15
 * formatos apareciam parecidos demais e a escolha virava chute. Como agora a
 * VPS renderiza de verdade, a miniatura pode ser o frame real.
 */
import path from "node:path";
import fs from "node:fs/promises";
import { renderizarCorte } from "./renderizar";
import { FORMATOS, type Formato } from "../src/lib/formatos";
import type { Palavra } from "./transcritor";
import { run, bin } from "../src/lib/proc";

/** Curta e com número: cabe em qualquer preset e exercita o destaque. */
const FRASE = "isso mudou tudo em 30 dias";
const DESTAQUES = ["mudou", "30"];

const DUR = 4;
const SAIDA = path.join(process.cwd(), "public", "formatos");

/**
 * A miniatura é um RECORTE da faixa da legenda, não o quadro 9:16 inteiro.
 *
 * O quadro inteiro reduzido pra largura de card deixa a legenda com ~15px:
 * a pessoa não consegue julgar a tipografia, que é justamente o que
 * diferencia um preset do outro. E como cada formato ancora numa altura
 * diferente, o resto vira fundo vazio em quantidades desiguais.
 *
 * Recortando ~800x420 em volta da âncora e escalando pra 400, o texto chega
 * a ~30px na miniatura — dá pra ver peso, caixa, contorno e cor de destaque.
 */
const RECORTE_L = 800;
const RECORTE_A = 420;
const LARGURA = 400;

/**
 * Canto superior esquerdo do recorte, centrado na âncora da legenda.
 *
 * Espelha o cálculo do gerador (worker/legendas.ts): a legenda é centrada na
 * ÁREA ÚTIL, não no quadro — com o rail direito ocupado, o centro visual
 * fica à esquerda do centro real. Recortar pelo centro do quadro deixaria a
 * legenda encostada na borda da miniatura.
 */
function ancora(f: Formato): { x: number; y: number } {
  const l = f.legenda;
  const esquerda = Math.round((l.margemLateralPct / 100) * 1080);
  const direita = Math.round(
    ((l.margemLateralPct + (l.safeAreaDireitaPct ?? 0)) / 100) * 1080,
  );
  const centroX = esquerda + (1080 - esquerda - direita) / 2;
  const pct = /(\d+(?:\.\d+)?)\s*%/.exec(l.posicao ?? "");
  const centroY = ((pct ? Number(pct[1]) : 52) / 100) * 1920;

  // Clamp: sem isto um preset ancorado bem no rodapé pediria recorte fora
  // do quadro e o ffmpeg recusaria.
  const limite = (v: number, max: number) => Math.max(0, Math.min(v, max));
  return {
    x: Math.round(limite(centroX - RECORTE_L / 2, 1080 - RECORTE_L)),
    y: Math.round(limite(centroY - RECORTE_A / 2, 1920 - RECORTE_A)),
  };
}

function palavras(): Palavra[] {
  const p = FRASE.split(" ");
  const passo = DUR / p.length;
  return p.map((texto, i) => ({
    texto,
    inicio_s: i * passo,
    fim_s: (i + 1) * passo - 0.02,
  }));
}

/**
 * Fundo neutro com um leve gradiente.
 *
 * Sem gradiente, contorno preto sobre chapado some e o preset parece não ter
 * stroke; com foto de verdade, a foto competiria com a tipografia — que é o
 * que a miniatura precisa mostrar.
 */
async function fundo(dir: string): Promise<string> {
  const arq = path.join(dir, "_fundo.mp4");
  await run(
    bin.ffmpeg(),
    [
      "-f", "lavfi",
      "-i", `gradients=s=1080x1920:c0=0x11121a:c1=0x2a2536:x0=0:y0=0:x1=1080:y1=1920:d=${DUR}:r=30`,
      "-f", "lavfi", "-i", `anullsrc=r=44100:cl=mono:d=${DUR}`,
      "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-shortest", "-y", arq,
    ],
    { timeoutMs: 60_000 },
  );
  return arq;
}

async function main() {
  const tmp = path.join(process.cwd(), "saidas", "miniaturas");
  await fs.mkdir(tmp, { recursive: true });
  await fs.mkdir(SAIDA, { recursive: true });

  const base = await fundo(tmp);
  const p = palavras();
  const corte = { inicio_s: 0, fim_s: DUR };

  for (const f of FORMATOS) {
    await renderizarCorte(base, corte, p, tmp, f.id, {
      estilo: f.id,
      destaques: DESTAQUES,
    });

    const { x, y } = ancora(f);

    // 70% do corte: a legenda já apareceu inteira e o karaokê já acendeu
    // as palavras — no começo o destaque ainda não pintou.
    await run(
      bin.ffmpeg(),
      [
        "-ss", (DUR * 0.7).toFixed(2),
        "-i", path.join(tmp, `${f.id}.mp4`),
        "-frames:v", "1",
        "-vf",
        `crop=${RECORTE_L}:${RECORTE_A}:${x}:${y},scale=${LARGURA}:-2:flags=lanczos`,
        // webp: ~4x menor que png no mesmo olho, e vira asset do repo.
        "-quality", "82",
        "-y", path.join(SAIDA, `${f.id}.webp`),
      ],
      { timeoutMs: 60_000 },
    );
    console.log(`  ${f.id}.webp  (recorte em ${x},${y})`);
  }

  const arquivos = await fs.readdir(SAIDA);
  const total = (
    await Promise.all(
      arquivos
        .filter((a) => a.endsWith(".webp"))
        .map((a) => fs.stat(path.join(SAIDA, a)).then((s) => s.size)),
    )
  ).reduce((a, b) => a + b, 0);

  console.log(
    `\n${arquivos.length} miniaturas em ${SAIDA} — ${Math.round(total / 1024)} KB no total`,
  );
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
