/**
 * Testa a mecânica de renderização SEM depender de chave nenhuma:
 * corta um trecho do vídeo do hero, converte pra 9:16 e queima uma legenda
 * animada com palavras de mentira. Se isto sai certo, o que falta pro
 * pipeline real é só plugar transcrição e seleção — que são APIs.
 *
 *   npx tsx worker/testar-render.ts
 */
import path from "node:path";
import fs from "node:fs/promises";
import { renderizarCorte } from "./renderizar";
import type { Palavra } from "./transcritor";
import { run, bin } from "../src/lib/proc";

const FRASE =
  "cola o link do seu vídeo e a inteligência artificial devolve cortes prontos pra viralizar";

function palavrasFalsas(inicio: number, fim: number): Palavra[] {
  const palavras = FRASE.split(" ");
  const passo = (fim - inicio) / palavras.length;
  return palavras.map((texto, i) => ({
    texto,
    inicio_s: inicio + i * passo,
    fim_s: inicio + (i + 1) * passo - 0.03,
  }));
}

async function main() {
  const fonte = path.join(process.cwd(), "public", "hero-farm-v7.mp4");
  const dir = path.join(process.cwd(), "saidas");
  await fs.mkdir(dir, { recursive: true });

  const corte = {
    inicio_s: 0.5,
    fim_s: 8.5,
    titulo: "Teste mecânico",
    gancho: FRASE,
    motivo: "validar o render",
    score: 100,
  };

  console.log("Renderizando corte de teste (8s, 9:16, legenda animada)...");
  const t0 = Date.now();
  const saida = await renderizarCorte(
    fonte,
    corte,
    palavrasFalsas(corte.inicio_s, corte.fim_s),
    dir,
    "teste-mecanico",
  );
  console.log(`Render em ${((Date.now() - t0) / 1000).toFixed(1)}s: ${saida}`);

  const info = await run(
    bin.ffprobe(),
    [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height,r_frame_rate",
      "-of", "csv=p=0",
      saida,
    ],
    { timeoutMs: 30_000 },
  );
  console.log(`Vídeo final (largura,altura,fps): ${info.trim()}`);

  // Um frame do meio pra inspeção visual da legenda.
  const frame = path.join(dir, "teste-mecanico-frame.png");
  await run(
    bin.ffmpeg(),
    ["-ss", "4", "-i", saida, "-frames:v", "1", "-y", frame],
    { timeoutMs: 30_000 },
  );
  console.log(`Frame pra conferir a legenda: ${frame}`);
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
