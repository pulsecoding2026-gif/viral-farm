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
import {
  medirQuadro,
  decidirEnquadramento,
  ehVertical,
  type Enquadramento,
} from "./enquadramento";
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
  recuperarOrfaos,
  vigiarCancelamento,
  type JobAnalise,
} from "./fila";
import { Cancelado } from "../src/lib/proc";
import { gerarProxy, subirProxy, ProxyNaoCabe } from "./proxy";
import { renderizarProjeto } from "./renderizar-projeto";
import { rastrearRosto } from "./rastrear-rosto";
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

/**
 * Gera e sobe o proxy leve que o editor usa pra editar no navegador.
 *
 * BEST-EFFORT DE PROPÓSITO: o proxy só serve ao Editor. Se ele falhar, a
 * análise continua válida — os cortes já foram entregues. Derrubar um job
 * pronto por causa de um arquivo auxiliar seria trocar o principal pelo
 * acessório.
 *
 * Também é o último passo: numa VPS de um núcleo o encode custa minutos num
 * vídeo longo, e adiantá-lo atrasaria o que a pessoa está esperando ver.
 */
async function prepararProxy(
  job: JobAnalise,
  video: string,
  dir: string,
  sinal: AbortSignal,
): Promise<void> {
  // Cancelamento pedido ANTES de começar: aí não há o que preparar.
  if (sinal.aborted) return;

  /**
   * O proxy roda com sinal PRÓPRIO, desligado do sinal do job.
   *
   * A vigilância de cancelamento aborta quando a análise sai de
   * 'processando' — e é exatamente isso que `pararParaRevisao` faz ao
   * entregar as propostas. Como o proxy roda depois disso (de propósito, pra
   * não atrasar o Estúdio), ele herdava um sinal já abortado e desistia em
   * silêncio: NENHUM proxy era gerado, e o editor ficava preso ao corte já
   * renderizado.
   *
   * O teto de tempo entra no lugar da vigilância: sem ele, um encode travado
   * seguraria o worker pra sempre num trabalho que é só acessório.
   */
  const proprio = new AbortController();
  const teto = setTimeout(() => proprio.abort(), 25 * 60_000);

  try {
    const t0 = Date.now();
    const arquivo = await gerarProxy(video, dir, proprio.signal);
    const url = await subirProxy(job.id, job.user_id, arquivo);
    await supabase().from("analises").update({ proxy_url: url }).eq("id", job.id);
    console.log(
      `[worker] ${job.id}: proxy pronto em ${Math.round((Date.now() - t0) / 1000)}s`,
    );
  } catch (e) {
    if (e instanceof Cancelado) return;
    // "Não cabe" é decisão do sistema, não falha: vira aviso, não erro. O
    // editor já trata a ausência de proxy com mensagem própria.
    if (e instanceof ProxyNaoCabe) {
      console.log(`[worker] ${job.id}: sem proxy — ${e.message}`);
      return;
    }
    console.error(`[worker] ${job.id}: proxy falhou (a análise segue válida):`, e);
  } finally {
    // Sem isto o timer segura o processo vivo por até 25 min depois do fim.
    clearTimeout(teto);
  }
}

/**
 * Ponto de checagem entre etapas.
 *
 * O sinal mata ffmpeg e yt-dlp na hora, mas transcrição e LLM são chamadas
 * de rede que não recebem sinal — sem isto, cancelar durante a escolha dos
 * cortes só teria efeito quando a renderização começasse.
 */
function pararSeCancelado(sinal: AbortSignal): void {
  if (sinal.aborted) throw new Cancelado();
}

/**
 * Mede o trecho e decide entre crop central e fundo desfocado.
 *
 * Roda por CORTE, não por vídeo: o mesmo material tem hora de close (crop
 * enche a tela) e hora de plano aberto ou frase escrita (crop mutila). É
 * justamente essa alternância que separa corte profissional de corte
 * amador.
 *
 * Falha aqui não derruba o corte — cai no crop central, que é o
 * comportamento de sempre.
 */
async function escolherEnquadramento(
  video: string,
  corte: { inicio_s: number; fim_s: number },
  fonteVertical: boolean,
  rotulo: string,
  sinal?: AbortSignal,
): Promise<{ enquadramento: Enquadramento; filtroDeCrop: string | null }> {
  if (fonteVertical) return { enquadramento: "preencher", filtroDeCrop: null };

  let enquadramento: Enquadramento = "preencher";
  try {
    const medida = await medirQuadro(video, corte.inicio_s, corte.fim_s);
    const decisao = decidirEnquadramento(medida);
    enquadramento = decisao.enquadramento;
    console.log(`[worker] ${rotulo}: ${enquadramento} — ${decisao.motivo}`);
  } catch (e) {
    console.error(`[worker] ${rotulo}: medição falhou, usando crop central:`, e);
  }

  /**
   * Rastrear rosto só faz sentido em "preencher".
   *
   * Em "ajustar" o quadro inteiro cabe na largura e o resto é fundo
   * desfocado — não existe recorte lateral pra movimentar, então detectar
   * seria gastar CPU pra não usar o resultado.
   */
  if (enquadramento !== "preencher") return { enquadramento, filtroDeCrop: null };

  const rastreio = await rastrearRosto(
    video,
    corte,
    { largura: 1080, altura: 1920 },
    sinal,
  );
  if (rastreio) {
    console.log(
      `[worker] ${rotulo}: seguindo rosto — ${rastreio.pontos} pontos, ` +
        `rosto em ${rastreio.comRosto}/${rastreio.amostras} amostras`,
    );
  }
  return { enquadramento, filtroDeCrop: rastreio?.filtro ?? null };
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

async function analisar(job: JobAnalise, sinal: AbortSignal): Promise<void> {
  const t0 = Date.now();
  const modo = job.opcoes.modo ?? "auto";
  console.log(`[worker] analisar ${job.id} (${modo}): ${job.link}`);

  const url = validarUrl(job.link);
  const metadados = await lerMetadados(url, sinal);

  const dir = path.join(os.tmpdir(), `viralfarm-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });

  try {
    const video = await baixarVideo(url, dir, sinal);
    const duracao = await duracaoDoArquivo(video);

    // Entre etapas: as chamadas de rede (transcrição, LLM) não recebem sinal,
    // então este é o ponto onde um cancelamento durante elas é percebido.
    pararSeCancelado(sinal);

    await marcarEtapa(job.id, "transcrevendo");
    const transcritor = criarTranscritor(ambiente.transcritor(), {
      groq: process.env.GROQ_API_KEY,
    });
    const transcricao = await transcritor.transcrever(
      await extrairAudio(video, dir, sinal),
    );
    if (transcricao.palavras.length === 0) {
      throw new Error(
        "Nenhuma fala detectada — cortes dependem de conteúdo falado.",
      );
    }
    await salvarTranscricao(job.id, transcricao);
    pararSeCancelado(sinal);

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
    pararSeCancelado(sinal);

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
      // DEPOIS de liberar o Estúdio: o proxy só serve ao editor, e nesta VPS
      // de um núcleo ele custa minutos num vídeo longo. Gerar antes atrasaria
      // as propostas, que é o que a pessoa está esperando na tela.
      await prepararProxy(job, video, dir, sinal);
      return;
    }

    // Modo auto: o comportamento clássico — renderiza tudo já.
    // Fonte já vertical não precisa de enquadramento nenhum: crop e fundo
    // desfocado só teriam o que fazer se sobrasse largura.
    const vertical = await ehVertical(video);
    let prontos = 0;
    for (const [i, corte] of cortes.entries()) {
      pararSeCancelado(sinal);
      await marcarEtapa(job.id, `renderizando_${i + 1}_de_${cortes.length}`);
      const corteId = await registrarCorte(
        job.id, job.user_id, i + 1, corte, "renderizando",
      );
      try {
        const { enquadramento, filtroDeCrop } = await escolherEnquadramento(
          video, corte, vertical, `corte ${i + 1}`, sinal,
        );
        const mp4 = await renderizarCorte(
          video,
          corte,
          palavrasNaJanela(transcricao.palavras, corte),
          dir,
          `corte-${i + 1}`,
          {
            enquadramento,
            filtroDeCrop,
            sinal,
            // O formato vem por corte: a IA casou cada trecho com o preset
            // que combina com aquele conteúdo. Escolha fixa do usuário já
            // chegou aqui repetida em todos pelo prompt.
            estilo: corte.formato,
            destaques: corte.destaques,
            tituloTela: job.opcoes.titulo !== false ? corte.titulo_tela : undefined,
            limparSilencio: job.opcoes.limpar_silencio === true,
          },
        );
        await subirVideoDoCorte(corteId, job.id, job.user_id, mp4);
        prontos += 1;
      } catch (e) {
        // Cancelamento não é falha do corte: sobe e encerra o job inteiro,
        // senão o laço seguiria renderizando os outros.
        if (e instanceof Cancelado) throw e;
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
    // Depois de entregar os cortes, pelo mesmo motivo do modo Estúdio.
    await guardarFonte(video, job.id).catch(() => {});
    await prepararProxy(job, video, dir, sinal);
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

async function renderizarAprovados(
  job: JobAnalise,
  sinal: AbortSignal,
): Promise<void> {
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
      video = await baixarVideo(validarUrl(job.link), dir, sinal);
      await guardarFonte(video, job.id);
    }

    // O corte guarda o formato que a IA escolheu (ou o que a reedição trocou).
    // O da análise só entra se o corte for anterior a essa coluna.
    const formatoDaAnalise = acharFormato(job.opcoes.estilo).id;
    const vertical = await ehVertical(video);
    let prontos = 0;
    for (const [i, corte] of aprovados.entries()) {
      pararSeCancelado(sinal);
      await marcarEtapa(job.id, `renderizando_${i + 1}_de_${aprovados.length}`);
      await marcarCorteRenderizando(corte.id);
      try {
        const { enquadramento, filtroDeCrop } = await escolherEnquadramento(
          video, corte, vertical, `corte ${corte.ordem}`, sinal,
        );
        const mp4 = await renderizarCorte(
          video,
          corte,
          palavrasNaJanela(transcricao.palavras, corte),
          dir,
          `corte-${corte.ordem}`,
          {
            enquadramento,
            filtroDeCrop,
            sinal,
            // Reedição pode trocar o formato só deste corte.
            estilo: corte.estilo ?? formatoDaAnalise,
            // Vem do banco: sem isto o corte reeditado perderia o destaque
            // que o original tinha.
            destaques: corte.destaques ?? [],
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
        // Cancelamento encerra o job, não marca o corte como falho.
        if (e instanceof Cancelado) throw e;
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

  // Antes do laço: um deploy ou uma queda no meio de um job deixa a linha em
  // 'processando' numa etapa que a fila não procura mais, e o dono fica com
  // o progresso girando pra sempre.
  try {
    const recuperados = await recuperarOrfaos();
    if (recuperados > 0) {
      console.log(`[worker] ${recuperados} job(s) órfão(s) devolvido(s) à fila`);
    }
  } catch (e) {
    // Não impede o worker de trabalhar — só perde a recuperação desta vez.
    console.error("[worker] não consegui recuperar órfãos:", e);
  }

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

    // Um controlador por job: a vigilância olha a linha no banco e, quando
    // ela sai de 'processando', aborta — o que mata o yt-dlp/ffmpeg em
    // andamento em vez de esperar minutos pelo fim do render.
    const controlador = new AbortController();
    const pararVigilancia = vigiarCancelamento(job.id, () => {
      console.log(`[worker] ${job!.id}: cancelado pelo dono, interrompendo`);
      controlador.abort();
    });

    try {
      if (job.etapa === "renderizar_projeto") {
        await renderizarProjeto(job, controlador.signal);
      } else if (job.etapa === "renderizar_aprovados") {
        await renderizarAprovados(job, controlador.signal);
      } else {
        await analisar(job, controlador.signal);
      }
    } catch (e) {
      // Cancelamento não é falha: a linha já está em 'cancelado' (foi o que
      // disparou a interrupção). Marcar como erro pintaria de vermelho a
      // tela de quem acabou de mandar parar.
      if (e instanceof Cancelado || controlador.signal.aborted) {
        console.log(`[worker] job ${job.id} interrompido.`);
      } else {
        // O erro cru fica AQUI, no log da VPS, onde serve pra depurar. O que
        // vai pro banco (e pra tela) é a tradução do diagnosticar().
        console.error(`[worker] job ${job.id} falhou:`, e);
        await falharJob(job.id, e).catch(() => {});
      }
    } finally {
      // Sem isto o intervalo vaza um timer por job processado.
      pararVigilancia();
    }
  }

  console.log("[worker] encerrando.");
}

main();
