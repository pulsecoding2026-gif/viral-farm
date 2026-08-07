/**
 * Testa a mecânica de renderização SEM depender de chave nenhuma:
 * corta um trecho do vídeo do hero, converte pra 9:16, queima o título de
 * abertura e a legenda animada, e valida a remoção de silêncios com
 * palavras de mentira espaçadas de propósito.
 *
 *   npm run worker:teste
 */
import path from "node:path";
import fs from "node:fs/promises";
import { renderizarCorte } from "./renderizar";
import { limparSilencios } from "./silencio";
import type { Palavra } from "./transcritor";
import { run, bin } from "../src/lib/proc";

const FRASE = "cola o link e a inteligência artificial devolve cortes prontos";

/** Palavras com uma PAUSA LONGA no meio — o alvo da limpeza. */
function palavrasComPausa(inicio: number, fim: number): Palavra[] {
  const p = FRASE.split(" ");
  const metade = Math.floor(p.length / 2);
  const passo = (fim - inicio - 2) / p.length; // 2s reservados pra pausa
  return p.map((texto, i) => {
    // Tudo depois da metade anda 2 segundos pra frente: é o buraco.
    const base = inicio + i * passo + (i >= metade ? 2 : 0);
    return { texto, inicio_s: base, fim_s: base + passo - 0.03 };
  });
}

async function duracaoDe(arquivo: string): Promise<number> {
  const saida = await run(
    bin.ffprobe(),
    ["-v", "error", "-show_entries", "format=duration",
     "-of", "default=noprint_wrappers=1:nokey=1", arquivo],
    { timeoutMs: 30_000 },
  );
  return Number.parseFloat(saida.trim());
}

/**
 * Vídeo de teste gerado na hora, COM faixa de áudio.
 *
 * O hero do site não tem áudio, e a limpeza de silêncio concatena trilhas de
 * vídeo E áudio — sem `[0:a]` o filtro nem monta. Gerar aqui deixa o teste
 * auto-contido e sempre válido.
 */
async function gerarFonte(dir: string): Promise<string> {
  const arquivo = path.join(dir, "fonte-teste.mp4");
  await run(
    bin.ffmpeg(),
    [
      "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=8",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=8",
      "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-shortest", "-y", arquivo,
    ],
    { timeoutMs: 60_000 },
  );
  return arquivo;
}

async function main() {
  const dir = path.join(process.cwd(), "saidas");
  await fs.mkdir(dir, { recursive: true });
  const fonte = await gerarFonte(dir);

  const corte = { inicio_s: 0.3, fim_s: 7.3 };
  const palavras = palavrasComPausa(corte.inicio_s, corte.fim_s);

  // ---------------------------------------------- 1. título + legenda ---
  console.log("1/3 Render com título na tela…");
  let t0 = Date.now();
  const comTitulo = await renderizarCorte(fonte, corte, palavras, dir, "teste-titulo", {
    estilo: "karaoke",
    tituloTela: "O erro que trava o seu alcance",
  });
  console.log(`    ok em ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // ------------------------------------------- 2. limpeza de silêncio ---
  const previsto = limparSilencios(palavras, corte.inicio_s, corte.fim_s);
  console.log(
    `2/3 Limpeza prevista: ${previsto.janelas.length} janela(s), ` +
      `${previsto.removido_s.toFixed(2)}s de pausa a remover`,
  );

  console.log("3/3 Render com silêncios removidos…");
  t0 = Date.now();
  const limpo = await renderizarCorte(fonte, corte, palavras, dir, "teste-limpo", {
    estilo: "neon",
    tituloTela: "Sem pausas mortas",
    limparSilencio: true,
  });
  console.log(`    ok em ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // ------------------------------------------------------- verificação ---
  const dOriginal = await duracaoDe(comTitulo);
  const dLimpo = await duracaoDe(limpo);
  const info = await run(
    bin.ffprobe(),
    ["-v", "error", "-select_streams", "v:0",
     "-show_entries", "stream=width,height", "-of", "csv=p=0", limpo],
    { timeoutMs: 30_000 },
  );

  console.log("\n--- resultado ---");
  console.log(`dimensões: ${info.trim()}`);
  console.log(`sem limpeza: ${dOriginal.toFixed(2)}s`);
  console.log(`com limpeza: ${dLimpo.toFixed(2)}s`);
  console.log(`encolheu:    ${(dOriginal - dLimpo).toFixed(2)}s`);

  if (dLimpo >= dOriginal - 0.5) {
    throw new Error("A limpeza não encurtou o vídeo — filtro de janelas falhou.");
  }

  // Frame do começo pra conferir o título na tela.
  for (const [nome, arq] of [["titulo", comTitulo], ["limpo", limpo]] as const) {
    await run(
      bin.ffmpeg(),
      ["-ss", "1.5", "-i", arq, "-frames:v", "1", "-y",
       path.join(dir, `teste-${nome}-frame.png`)],
      { timeoutMs: 30_000 },
    );
  }
  console.log("\nframes em saidas/teste-titulo-frame.png e teste-limpo-frame.png");
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
