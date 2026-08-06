/**
 * Testa só a parte de mídia do pipeline: metadados, download, frames e áudio.
 * Não chama IA, então roda sem ANTHROPIC_API_KEY nem GROQ_API_KEY.
 *
 *   npm run testar:midia -- "<link>"
 */
import "./_env";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";

import { validarUrl, lerMetadados, baixarVideo } from "../src/lib/analise/extrair";
import {
  extrairFrames,
  extrairAudio,
  duracaoDoArquivo,
} from "../src/lib/analise/midia";

async function main() {
  const link = process.argv[2];
  if (!link) {
    console.error('Uso: npm run testar:midia -- "<link>"');
    process.exit(1);
  }

  const t0 = Date.now();
  const marco = (s: string) =>
    console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s] ${s}`);

  const url = validarUrl(link);
  marco(`URL válida: ${url.hostname}`);

  const meta = await lerMetadados(url);
  marco(`Metadados: "${meta.titulo}" — ${meta.autor} — ${meta.duracao_s}s`);
  console.log(
    `        views=${meta.visualizacoes} curtidas=${meta.curtidas} plataforma=${meta.plataforma}`,
  );

  const dir = path.join(os.tmpdir(), `viralx-teste-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });

  try {
    const video = await baixarVideo(url, dir);
    const stat = await fs.stat(video);
    marco(`Baixado: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);

    const dur = await duracaoDoArquivo(video);
    marco(`Duração medida no arquivo: ${dur.toFixed(1)}s`);

    const frames = await extrairFrames(video, dir);
    const kb = frames.map((f) => (f.base64.length * 0.75) / 1024);
    const total = kb.reduce((a, b) => a + b, 0);
    marco(`${frames.length} frames extraídos`);
    console.log(
      `        segundos: ${frames.map((f) => f.segundo).join(", ")}`,
    );
    console.log(
      `        tamanho: ${total.toFixed(0)} KB total, ` +
        `${(total / frames.length).toFixed(0)} KB por frame`,
    );

    const audio = await extrairAudio(video, dir);
    const sa = await fs.stat(audio);
    marco(`Áudio extraído: ${(sa.size / 1024).toFixed(0)} KB`);

    // Salva um frame de amostra pra dar pra conferir a olho.
    await fs.mkdir("saidas", { recursive: true });
    const amostra = path.join("saidas", "frame-amostra.jpg");
    await fs.writeFile(amostra, Buffer.from(frames[0].base64, "base64"));
    marco(`Amostra salva em ${amostra}`);

    console.log("\nParte de mídia: OK.");
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    marco("Temporários limpos");
  }
}

main().catch((err) => {
  console.error(`\nFalhou: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
