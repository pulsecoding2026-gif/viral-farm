import Anthropic from "@anthropic-ai/sdk";
import { env, exigir } from "../env";
import { AnaliseSchema, jsonSchemaDaAnalise, type Analise } from "./schema";
import { SYSTEM_ANALISE, instrucaoFinal, type ContextoDoUsuario } from "./prompt";
import type { Frame } from "./midia";
import type { Metadados } from "./extrair";
import { transcricaoParaTexto, type Transcricao } from "./transcrever";

let cliente: Anthropic | null = null;
function anthropic() {
  cliente ??= new Anthropic({ apiKey: exigir("ANTHROPIC_API_KEY") });
  return cliente;
}

export class ErroDeAnalise extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErroDeAnalise";
  }
}

export type ResultadoAnalise = {
  analise: Analise;
  uso: {
    tokens_entrada: number;
    tokens_saida: number;
    tokens_cache_escrita: number;
    tokens_cache_leitura: number;
    custo_usd_estimado: number;
  };
};

/** Preço por milhão de tokens. Ver PLANO_MVP.md seção 4. */
const PRECOS: Record<string, { entrada: number; saida: number }> = {
  "claude-opus-5": { entrada: 5, saida: 25 },
  "claude-sonnet-5": { entrada: 3, saida: 15 },
  "claude-haiku-4-5": { entrada: 1, saida: 5 },
};

function estimarCusto(
  modelo: string,
  entrada: number,
  saida: number,
  cacheEscrita: number,
  cacheLeitura: number,
) {
  const p = PRECOS[modelo];
  if (!p) return 0;
  const mi = 1_000_000;
  return (
    (entrada * p.entrada) / mi +
    (saida * p.saida) / mi +
    // escrita de cache custa ~1.25x, leitura ~0.1x
    (cacheEscrita * p.entrada * 1.25) / mi +
    (cacheLeitura * p.entrada * 0.1) / mi
  );
}

function metadadosParaTexto(m: Metadados): string {
  const num = (n: number | null) =>
    n === null ? "não informado" : n.toLocaleString("pt-BR");

  return [
    `Plataforma: ${m.plataforma}`,
    `Título: ${m.titulo}`,
    `Autor: ${m.autor}`,
    `Duração: ${m.duracao_s}s`,
    `Visualizações: ${num(m.visualizacoes)}`,
    `Curtidas: ${num(m.curtidas)}`,
    `Comentários: ${num(m.comentarios)}`,
    m.descricao ? `Descrição:\n${m.descricao}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function analisar(
  metadados: Metadados,
  frames: Frame[],
  transcricao: Transcricao,
  ctx: ContextoDoUsuario,
): Promise<ResultadoAnalise> {
  const { ANTHROPIC_MODEL, ANTHROPIC_EFFORT } = env();

  // Cada frame vai precedido de um rótulo com o segundo, senão o modelo não
  // tem como amarrar a imagem ao momento do vídeo.
  const blocosDeImagem = frames.flatMap((f) => [
    { type: "text" as const, text: `Frame em ${f.segundo.toFixed(1)}s:` },
    {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: "image/jpeg" as const,
        data: f.base64,
      },
    },
  ]);

  const resposta = await anthropic().messages.create({
    model: ANTHROPIC_MODEL,
    // No Opus 5 o thinking vem ligado por padrão e max_tokens limita
    // thinking + resposta juntos. 16000 dá folga sem risco de timeout HTTP.
    max_tokens: 16000,
    system: [
      {
        type: "text",
        text: SYSTEM_ANALISE,
        // O system prompt é idêntico em toda análise: cachear derruba o
        // custo dele para ~10% a partir da segunda chamada.
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: {
      // Haiku 4.5 não suporta o parâmetro effort (é da família "5" com
      // thinking adaptativo). Omitir nesse caso, senão a API rejeita com 400.
      ...(ANTHROPIC_MODEL.includes("haiku") ? {} : { effort: ANTHROPIC_EFFORT }),
      format: {
        type: "json_schema",
        schema: jsonSchemaDaAnalise(),
      },
    },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `## Dados do vídeo\n\n${metadadosParaTexto(metadados)}` },
          {
            type: "text",
            text: `## Transcrição\n\n${transcricaoParaTexto(transcricao)}`,
          },
          { type: "text", text: `## Frames (${frames.length} amostras)` },
          ...blocosDeImagem,
          { type: "text", text: instrucaoFinal(ctx) },
        ],
      },
    ],
  });

  if (resposta.stop_reason === "refusal") {
    throw new ErroDeAnalise(
      "O modelo recusou analisar este vídeo por política de conteúdo.",
    );
  }
  if (resposta.stop_reason === "max_tokens") {
    throw new ErroDeAnalise(
      "A resposta foi cortada por limite de tokens. Tente com menos frames.",
    );
  }

  const bloco = resposta.content.find((b) => b.type === "text");
  if (!bloco || bloco.type !== "text") {
    throw new ErroDeAnalise("O modelo não devolveu texto.");
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(bloco.text);
  } catch {
    throw new ErroDeAnalise("O modelo devolveu algo que não é JSON válido.");
  }

  const validado = AnaliseSchema.safeParse(bruto);
  if (!validado.success) {
    throw new ErroDeAnalise(
      `A análise veio fora do formato esperado: ${validado.error.issues
        .map((i) => i.path.join("."))
        .join(", ")}`,
    );
  }

  const u = resposta.usage;
  const cacheEscrita = u.cache_creation_input_tokens ?? 0;
  const cacheLeitura = u.cache_read_input_tokens ?? 0;

  return {
    analise: validado.data,
    uso: {
      tokens_entrada: u.input_tokens,
      tokens_saida: u.output_tokens,
      tokens_cache_escrita: cacheEscrita,
      tokens_cache_leitura: cacheLeitura,
      custo_usd_estimado: estimarCusto(
        ANTHROPIC_MODEL,
        u.input_tokens,
        u.output_tokens,
        cacheEscrita,
        cacheLeitura,
      ),
    },
  };
}
