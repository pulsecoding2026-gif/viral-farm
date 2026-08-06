import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";

import { validarUrl, lerMetadados, baixarVideo, type Metadados } from "./extrair";
import { extrairFrames, extrairAudio } from "./midia";
import { transcrever, type Transcricao } from "./transcrever";
import { analisar, type ResultadoAnalise } from "./analisar";
import type { ContextoDoUsuario } from "./prompt";

export type Etapa =
  | "validando"
  | "lendo-metadados"
  | "baixando"
  | "extraindo-frames"
  | "transcrevendo"
  | "analisando"
  | "limpando"
  | "pronto";

export type SaidaDoPipeline = ResultadoAnalise & {
  metadados: Metadados;
  transcricao: Transcricao;
  duracao_total_ms: number;
};

/**
 * Roda a análise completa de um link.
 *
 * Regra que não muda: o vídeo baixado vive só dentro desta função. O `finally`
 * apaga o diretório temporário aconteça o que acontecer. O que persiste é o
 * resultado da análise, nunca o arquivo. Ver PLANO_MVP.md seção 1.
 */
export async function analisarLink(
  link: string,
  ctx: ContextoDoUsuario,
  onEtapa: (etapa: Etapa) => void = () => {},
): Promise<SaidaDoPipeline> {
  const inicio = Date.now();

  onEtapa("validando");
  const url = validarUrl(link);

  onEtapa("lendo-metadados");
  const metadados = await lerMetadados(url);

  const dir = path.join(os.tmpdir(), `viralx-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });

  try {
    onEtapa("baixando");
    const video = await baixarVideo(url, dir);

    onEtapa("extraindo-frames");
    const frames = await extrairFrames(video, dir);

    onEtapa("transcrevendo");
    const audio = await extrairAudio(video, dir);
    const transcricao = await transcrever(audio);

    onEtapa("analisando");
    const resultado = await analisar(metadados, frames, transcricao, ctx);

    onEtapa("pronto");
    return {
      ...resultado,
      metadados,
      transcricao,
      duracao_total_ms: Date.now() - inicio,
    };
  } finally {
    onEtapa("limpando");
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {
      // Falhar na limpeza não pode derrubar uma análise que deu certo.
      // O SO limpa o tmpdir eventualmente.
    });
  }
}
