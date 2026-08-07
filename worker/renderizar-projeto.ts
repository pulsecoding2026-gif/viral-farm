import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { run, bin } from "../src/lib/proc";
import { validarUrl, baixarVideo } from "../src/lib/analise/extrair";
import { gerarAss } from "./legendas";
import { planejarRender, argumentosDeRender } from "./render-projeto";
import { supabase } from "./fila";
import { subirVideoDoCorte } from "./armazenar";
import {
  trilhaDe,
  type ItemLegenda,
  type Projeto,
} from "../src/lib/editor/projeto";
import type { Palavra } from "./transcritor";
import type { JobAnalise } from "./fila";

/**
 * Fase 3 da fila: renderizar um CORTE EDITADO no Editor Viral.
 *
 * Diferente da fase 2 (renderizar aprovados), que aplica a receita fixa
 * "janela + formato". Aqui a receita inteira vem do projeto que a pessoa
 * montou — quantos clipes, de onde, em que proporção, com que enquadramento.
 *
 * A ordem importa: o fonte é o vídeo ORIGINAL, não o MP4 já cortado. Editar
 * sobre o corte renderizado empilharia recorte sobre recorte e degradaria a
 * imagem a cada edição — o ponto da edição não-destrutiva é sempre voltar à
 * fonte.
 */

const FONTES = process.env.FONTES_DIR ?? "/var/lib/viral-farm/fontes";

function caminhoFonte(analiseId: string): string {
  return path.join(FONTES, `${analiseId}.mp4`);
}

async function dimensoesDaFonte(video: string) {
  const saida = await run(
    bin.ffprobe(),
    [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=p=0",
      video,
    ],
    { timeoutMs: 30_000 },
  );
  const [largura, altura] = saida.trim().split(",").map(Number);
  if (!largura || !altura) {
    throw new Error("Não consegui ler as dimensões do vídeo fonte.");
  }
  return { largura, altura };
}

/**
 * Legendas do projeto viram ASS.
 *
 * O gerador espera PALAVRAS com tempo; o projeto guarda BLOCOS de texto já
 * fechados. A conversão distribui o tempo do bloco entre suas palavras, o
 * que é aproximação — mas é o que preserva o karaokê. Sem isso a legenda
 * apareceria de uma vez, perdendo justamente o efeito que os formatos usam.
 */
function palavrasDasLegendas(itens: ItemLegenda[]): Palavra[] {
  const palavras: Palavra[] = [];
  for (const item of itens) {
    const partes = item.conteudo.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) continue;
    const passo = (item.fim_s - item.inicio_s) / partes.length;
    partes.forEach((texto, i) => {
      palavras.push({
        texto,
        inicio_s: item.inicio_s + i * passo,
        fim_s: item.inicio_s + (i + 1) * passo - 0.01,
      });
    });
  }
  return palavras.sort((a, b) => a.inicio_s - b.inicio_s);
}

export async function renderizarProjeto(
  job: JobAnalise,
  sinal: AbortSignal,
): Promise<void> {
  const t0 = Date.now();

  const { data: linha, error } = await supabase()
    .from("cortes")
    .select("id, ordem, projeto")
    .eq("analise_id", job.id)
    .not("projeto", "is", null)
    .order("renderizado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Não li o projeto: ${error.message}`);
  if (!linha?.projeto) {
    throw new Error("Nenhum corte desta análise tem projeto de edição.");
  }

  const projeto = linha.projeto as Projeto;
  const corteId = linha.id as string;
  console.log(`[worker] renderizar projeto do corte ${corteId} (${projeto.proporcao})`);

  const dir = path.join(os.tmpdir(), `viralfarm-edit-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });

  try {
    // O fonte guardado torna isto imediato; passou das 24h, baixa de novo.
    let video = caminhoFonte(job.id);
    const existe = await fs.stat(video).then((s) => s.isFile()).catch(() => false);
    if (!existe) {
      video = await baixarVideo(validarUrl(job.link), dir, sinal);
    }

    const fonte = await dimensoesDaFonte(video);

    // ASS num nome relativo + cwd no run(): caminho absoluto do Windows tem
    // "C:", o parser de filtro do ffmpeg divide no ":" e nenhum escape é
    // portátil. Mesmo motivo do renderizar.ts.
    const legendas = trilhaDe(projeto, "legenda").itens as ItemLegenda[];
    const nomeAss = legendas.length > 0 ? "projeto.ass" : null;
    if (nomeAss) {
      const ass = gerarAss(
        palavrasDasLegendas(legendas),
        0,
        legendas[0].formato ?? projeto.formato,
      );
      if (ass) await fs.writeFile(path.join(dir, nomeAss), ass, "utf-8");
    }

    const plano = planejarRender(projeto, fonte, nomeAss);
    for (const aviso of plano.avisos) {
      console.log(`[worker] projeto ${corteId}: ${aviso}`);
    }

    const saida = path.join(dir, "editado.mp4");
    await run(bin.ffmpeg(), argumentosDeRender(video, plano, saida), {
      timeoutMs: 20 * 60_000,
      cwd: dir,
      sinal,
    });

    await subirVideoDoCorte(corteId, job.id, job.user_id, saida);
    console.log(
      `[worker] projeto do corte ${corteId} pronto em ${Math.round((Date.now() - t0) / 1000)}s`,
    );

    await supabase()
      .from("analises")
      .update({ status: "pronto", etapa: null })
      .eq("id", job.id);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
