import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";

import { validarUrl, lerMetadados, baixarVideo } from "../src/lib/analise/extrair";
import { extrairAudio, duracaoDoArquivo } from "../src/lib/analise/midia";
import { ambiente } from "./ambiente";
import { criarTranscritor } from "./transcritor";
import { escolherCortes } from "./cortar";
import { renderizarCorte, palavrasNaJanela } from "./renderizar";
import { pegarProximoJob, marcarEtapa, concluirJob, falharJob, type JobAnalise } from "./fila";
import { registrarCorte, subirVideoDoCorte, falharCorte } from "./armazenar";

/**
 * O worker da VPS: consome a fila de análises e produz cortes renderizados.
 *
 *   na_fila → baixando → transcrevendo → escolhendo_cortes
 *           → renderizando (1 de N) → status: pronto
 *
 * Roda pra sempre sob pm2. Um job por vez de propósito: render de vídeo
 * satura CPU, e dois em paralelo terminam mais devagar que dois em série.
 */

async function processar(job: JobAnalise): Promise<void> {
  const t0 = Date.now();
  console.log(`[worker] job ${job.id}: ${job.link}`);

  const url = validarUrl(job.link);
  const metadados = await lerMetadados(url);

  const dir = path.join(os.tmpdir(), `viralfarm-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });

  try {
    const video = await baixarVideo(url, dir);
    const duracao = await duracaoDoArquivo(video);

    await marcarEtapa(job.id, "transcrevendo");
    const transcritor = criarTranscritor(ambiente.transcritor(), {
      groq: process.env.GROQ_API_KEY,
    });
    const transcricao = await transcritor.transcrever(
      await extrairAudio(video, dir),
    );
    if (transcricao.palavras.length === 0) {
      throw new Error(
        "Nenhuma fala detectada — cortes dependem de conteúdo falado.",
      );
    }

    await marcarEtapa(job.id, "escolhendo_cortes");
    const cortes = await escolherCortes(
      ambiente.anthropic(),
      ambiente.modelo(),
      transcricao,
      duracao,
      ambiente.maxCortes(),
    );
    if (cortes.length === 0) {
      throw new Error("O vídeo não rendeu nenhum corte bom o bastante.");
    }

    let prontos = 0;
    for (const [i, corte] of cortes.entries()) {
      await marcarEtapa(job.id, `renderizando_${i + 1}_de_${cortes.length}`);
      const corteId = await registrarCorte(job.id, job.user_id, i + 1, corte);

      try {
        const mp4 = await renderizarCorte(
          video,
          corte,
          palavrasNaJanela(transcricao.palavras, corte),
          dir,
          `corte-${i + 1}`,
        );
        await subirVideoDoCorte(corteId, job.id, job.user_id, mp4);
        prontos += 1;
      } catch (e) {
        // Um corte quebrado não derruba os outros — marca e segue.
        console.error(`[worker] corte ${i + 1} falhou:`, e);
        await falharCorte(corteId);
      }
    }

    if (prontos === 0) {
      throw new Error("Nenhum corte sobreviveu à renderização.");
    }

    await concluirJob(job.id, {
      tipo: "cortes",
      titulo: metadados.titulo,
      duracao_video_s: Math.round(duracao),
      idioma: transcricao.idioma,
      qtd_cortes: prontos,
      duracao_total_ms: Date.now() - t0,
    });
    console.log(
      `[worker] job ${job.id} pronto: ${prontos} corte(s) em ${Math.round((Date.now() - t0) / 1000)}s`,
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {
      // O SO limpa o tmpdir eventualmente; falha aqui não derruba o job.
    });
  }
}

let vivo = true;
process.on("SIGINT", () => (vivo = false));
process.on("SIGTERM", () => (vivo = false));

async function main() {
  console.log(
    `[worker] de pé. transcritor=${ambiente.transcritor()} modelo=${ambiente.modelo()}`,
  );

  while (vivo) {
    let job: JobAnalise | null = null;
    try {
      job = await pegarProximoJob();
    } catch (e) {
      // Supabase fora do ar não pode matar o worker — espera e tenta de novo.
      console.error("[worker] fila indisponível:", e);
    }

    if (!job) {
      await new Promise((r) =>
        setTimeout(r, ambiente.intervaloSegundos() * 1000),
      );
      continue;
    }

    try {
      await processar(job);
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Falha inesperada.";
      console.error(`[worker] job ${job.id} falhou:`, e);
      await falharJob(job.id, mensagem).catch(() => {});
    }
  }

  console.log("[worker] encerrando.");
}

main();
