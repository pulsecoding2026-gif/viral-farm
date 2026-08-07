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
import { acharFormato } from "../src/lib/formatos";
import {
  supabase,
  pegarProximoJob,
  marcarEtapa,
  concluirJob,
  falharJob,
  pararParaRevisao,
  salvarTranscricao,
  lerTranscricao,
  type JobAnalise,
} from "./fila";
import {
  registrarCorte,
  subirVideoDoCorte,
  falharCorte,
  lerCortesAprovados,
  marcarCorteRenderizando,
} from "./armazenar";

/**
 * O worker da VPS — agora em duas fases, no desenho do Estúdio:
 *
 *   FASE ANALISAR (etapa na_fila):
 *     baixa → transcreve → IA propõe cortes (SEM renderizar)
 *     modo manual → para em status 'revisao' e guarda o vídeo fonte
 *     modo auto   → aprova tudo sozinho e já renderiza
 *
 *   FASE RENDERIZAR (etapa renderizar_aprovados):
 *     o dono aprovou no Estúdio → renderiza só os aprovados,
 *     usando o fonte guardado (ou baixando de novo se expirou)
 *
 * Um job por vez de propósito: render satura CPU, e dois em paralelo
 * terminam mais devagar que dois em série.
 */

/** Onde os vídeos fonte esperam a revisão do Estúdio. */
const FONTES =
  process.env.FONTES_DIR ?? path.join(os.tmpdir(), "viral-farm-fontes");

/** Quanto tempo um fonte espera a revisão antes de ser apagado. */
const FONTE_VALIDADE_MS = 24 * 60 * 60 * 1000;

function caminhoFonte(analiseId: string): string {
  return path.join(FONTES, `${analiseId}.mp4`);
}

async function guardarFonte(video: string, analiseId: string): Promise<void> {
  await fs.mkdir(FONTES, { recursive: true });
  // copyFile, não rename: o tmpdir do job pode estar em outro filesystem.
  await fs.copyFile(video, caminhoFonte(analiseId));
}

/** Apaga fontes com mais de 24h — a promessa de "processado e apagado". */
async function limparFontesVencidas(): Promise<void> {
  const nomes = await fs.readdir(FONTES).catch(() => [] as string[]);
  const agora = Date.now();
  for (const nome of nomes) {
    const arquivo = path.join(FONTES, nome);
    const stat = await fs.stat(arquivo).catch(() => null);
    if (stat && agora - stat.mtimeMs > FONTE_VALIDADE_MS) {
      await fs.rm(arquivo, { force: true }).catch(() => {});
    }
  }
}

/* ------------------------------------------------------- fase 1: analisar */

async function analisar(job: JobAnalise): Promise<void> {
  const t0 = Date.now();
  const modo = job.opcoes.modo ?? "auto";
  console.log(`[worker] analisar ${job.id} (${modo}): ${job.link}`);

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
    await salvarTranscricao(job.id, transcricao);

    await marcarEtapa(job.id, "escolhendo_cortes");
    const cortes = await escolherCortes(
      ambiente.llm(),
      transcricao,
      duracao,
      job.opcoes,
    );
    if (cortes.length === 0) {
      throw new Error("O vídeo não rendeu nenhum corte bom o bastante.");
    }

    if (modo === "manual") {
      // Propõe e para: a decisão agora é do dono, no Estúdio. O fonte fica
      // guardado pra renderização ser imediata quando ele aprovar.
      for (const [i, corte] of cortes.entries()) {
        await registrarCorte(job.id, job.user_id, i + 1, corte, "proposto");
      }
      await guardarFonte(video, job.id);
      await supabaseResultadoParcial(job.id, metadados.titulo, duracao, transcricao.idioma, cortes.length, t0);
      await pararParaRevisao(job.id);
      console.log(
        `[worker] ${job.id} em revisão: ${cortes.length} proposta(s) esperando o Estúdio`,
      );
      return;
    }

    // Modo auto: o comportamento clássico — renderiza tudo já.
    let prontos = 0;
    for (const [i, corte] of cortes.entries()) {
      await marcarEtapa(job.id, `renderizando_${i + 1}_de_${cortes.length}`);
      const corteId = await registrarCorte(
        job.id, job.user_id, i + 1, corte, "renderizando",
      );
      try {
        const mp4 = await renderizarCorte(
          video,
          corte,
          palavrasNaJanela(transcricao.palavras, corte),
          dir,
          `corte-${i + 1}`,
          {
            // O formato vem por corte: a IA casou cada trecho com o preset
            // que combina com aquele conteúdo. Escolha fixa do usuário já
            // chegou aqui repetida em todos pelo prompt.
            estilo: corte.formato,
            tituloTela: job.opcoes.titulo !== false ? corte.titulo_tela : undefined,
            limparSilencio: job.opcoes.limpar_silencio === true,
          },
        );
        await subirVideoDoCorte(corteId, job.id, job.user_id, mp4);
        prontos += 1;
      } catch (e) {
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
      `[worker] ${job.id} pronto: ${prontos} corte(s) em ${Math.round((Date.now() - t0) / 1000)}s`,
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {
      // O SO limpa o tmpdir eventualmente; falha aqui não derruba o job.
    });
  }
}

/** Resumo que o Estúdio mostra enquanto a análise espera revisão. */
async function supabaseResultadoParcial(
  id: string,
  titulo: string,
  duracao: number,
  idioma: string | null,
  qtdPropostas: number,
  t0: number,
): Promise<void> {
  await supabase()
    .from("analises")
    .update({
      resultado: {
        tipo: "cortes",
        titulo,
        duracao_video_s: Math.round(duracao),
        idioma,
        qtd_cortes: qtdPropostas,
        duracao_total_ms: Date.now() - t0,
      },
    })
    .eq("id", id);
}

/* ---------------------------------------------------- fase 2: renderizar */

async function renderizarAprovados(job: JobAnalise): Promise<void> {
  const t0 = Date.now();
  console.log(`[worker] renderizar aprovados de ${job.id}`);

  const aprovados = await lerCortesAprovados(job.id);
  if (aprovados.length === 0) {
    throw new Error("Nenhum corte aprovado pra renderizar.");
  }

  const transcricao = await lerTranscricao(job.id);
  if (!transcricao) {
    throw new Error("A transcrição dessa análise não está mais disponível.");
  }

  const dir = path.join(os.tmpdir(), `viralfarm-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });

  try {
    // O fonte guardado torna isso imediato; se passou das 24h, baixa de novo
    // — e volta pro cache, porque uma edição raramente vem sozinha.
    let video = caminhoFonte(job.id);
    const existe = await fs.stat(video).then((s) => s.isFile()).catch(() => false);
    if (!existe) {
      await marcarEtapa(job.id, "baixando");
      video = await baixarVideo(validarUrl(job.link), dir);
      await guardarFonte(video, job.id);
    }

    // O corte guarda o formato que a IA escolheu (ou o que a reedição trocou).
    // O da análise só entra se o corte for anterior a essa coluna.
    const formatoDaAnalise = acharFormato(job.opcoes.estilo).id;
    let prontos = 0;
    for (const [i, corte] of aprovados.entries()) {
      await marcarEtapa(job.id, `renderizando_${i + 1}_de_${aprovados.length}`);
      await marcarCorteRenderizando(corte.id);
      try {
        const mp4 = await renderizarCorte(
          video,
          corte,
          palavrasNaJanela(transcricao.palavras, corte),
          dir,
          `corte-${corte.ordem}`,
          {
            // Reedição pode trocar o formato só deste corte.
            estilo: corte.estilo ?? formatoDaAnalise,
            tituloTela:
              job.opcoes.titulo !== false
                ? (corte.titulo_tela ?? undefined)
                : undefined,
            limparSilencio: job.opcoes.limpar_silencio === true,
          },
        );
        await subirVideoDoCorte(corte.id, job.id, job.user_id, mp4);
        prontos += 1;
      } catch (e) {
        console.error(`[worker] corte ${corte.ordem} falhou:`, e);
        await falharCorte(corte.id);
      }
    }

    if (prontos === 0) {
      throw new Error("Nenhum corte sobreviveu à renderização.");
    }

    // O fonte FICA até a limpeza de 24h: reeditar um corte pronto (trocar
    // estilo, ajustar tempo) volta pra cá, e com o fonte vivo é imediato.

    const { data } = await supabase()
      .from("analises")
      .select("resultado")
      .eq("id", job.id)
      .single();
    const resultado = (data?.resultado ?? {}) as Record<string, unknown>;
    // Conta no banco, não no loop: uma REEDIÇÃO renderiza só 1 corte, mas o
    // resumo precisa continuar dizendo o total de prontos da análise.
    const { count } = await supabase()
      .from("cortes")
      .select("id", { count: "exact", head: true })
      .eq("analise_id", job.id)
      .eq("status", "pronto");
    await concluirJob(job.id, {
      ...resultado,
      qtd_cortes: count ?? prontos,
      duracao_total_ms: Date.now() - t0,
    });
    console.log(
      `[worker] ${job.id} pronto: ${prontos} corte(s) aprovados renderizados em ${Math.round((Date.now() - t0) / 1000)}s`,
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/* ------------------------------------------------------------------ loop */

let vivo = true;
process.on("SIGINT", () => (vivo = false));
process.on("SIGTERM", () => (vivo = false));

async function main() {
  const llm = ambiente.llm();
  console.log(
    `[worker] de pé. transcritor=${ambiente.transcritor()} llm=${llm.provedor}/${llm.modelo} fontes=${FONTES}`,
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
      await limparFontesVencidas();
      await new Promise((r) =>
        setTimeout(r, ambiente.intervaloSegundos() * 1000),
      );
      continue;
    }

    try {
      if (job.etapa === "renderizar_aprovados") {
        await renderizarAprovados(job);
      } else {
        await analisar(job);
      }
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : "Falha inesperada.";
      console.error(`[worker] job ${job.id} falhou:`, e);
      await falharJob(job.id, mensagem).catch(() => {});
    }
  }

  console.log("[worker] encerrando.");
}

main();
