import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { exigir } from "../env";
import type { ItemBiblioteca } from "./tipos";

/**
 * Classifica, por visão computacional, se a thumbnail de cada vídeo já
 * mostra legenda/texto embutido na imagem.
 *
 * Isso é diferente do campo `caption` que a YouTube Data API expõe: aquele
 * só diz se existe uma faixa de CC cadastrada, não se há texto de legenda
 * queimado na imagem — a maioria dos shorts virais tem o segundo caso sem
 * ter o primeiro.
 *
 * Roda em lotes (a API recusa acima de 100 imagens por requisição) pra
 * manter custo e latência baixos: usa Haiku, e o resultado entra no mesmo
 * objeto que já vai pro cache de 12h do radar — não repete a cada
 * carregamento de página.
 */

let cliente: Anthropic | null = null;
function anthropic() {
  cliente ??= new Anthropic({ apiKey: exigir("ANTHROPIC_API_KEY") });
  return cliente;
}

// Limite real da API é 100 imagens por requisição — a folga é margem de
// segurança.
const TAMANHO_LOTE = 80;

const ClassificacaoSchema = z.strictObject({
  classificacoes: z
    .array(
      z.strictObject({
        indice: z
          .number()
          .describe("Índice do vídeo, na mesma ordem em que os 'Vídeo N:' apareceram"),
        tem_legenda_embutida: z
          .boolean()
          .describe(
            "true se a imagem já mostra texto de legenda estilo shorts/reels sobreposto ao vídeo",
          ),
      }),
    )
    .describe("Uma entrada para cada vídeo enviado, sem pular nenhum"),
});

function jsonSchema() {
  return z.toJSONSchema(ClassificacaoSchema, { target: "draft-7", io: "input" });
}

const SYSTEM = [
  "Você recebe thumbnails de vídeos curtos, uma por vídeo, cada uma precedida",
  "por um rótulo 'Vídeo N:'. Pra cada uma, diga se a IMAGEM já mostra texto de",
  "legenda sobreposto ao vídeo (o texto animado, tipo caption, que costuma",
  "aparecer em shorts/reels prontos).",
  "",
  "Não conte como legenda: logotipo do canal, marca d'água do app, título",
  "que já fazia parte da arte da thumbnail, ou texto que é parte do cenário",
  "real (placa, embalagem, letreiro). Só marque true quando for texto de",
  "legenda mesmo, adicionado na edição do vídeo.",
].join(" ");

/** Classifica um único lote (≤ TAMANHO_LOTE vídeos) e devolve id -> resultado. */
async function classificarLote(lote: ItemBiblioteca[]): Promise<Map<string, boolean>> {
  const blocos = lote.flatMap((v, i) => [
    { type: "text" as const, text: `Vídeo ${i}:` },
    {
      type: "image" as const,
      source: { type: "url" as const, url: v.thumbnail_url! },
    },
  ]);

  const resposta = await anthropic().messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    system: SYSTEM,
    output_config: {
      format: { type: "json_schema", schema: jsonSchema() },
    },
    messages: [{ role: "user", content: blocos }],
  });

  const bloco = resposta.content.find((b) => b.type === "text");
  if (!bloco || bloco.type !== "text") return new Map();

  let bruto: unknown;
  try {
    bruto = JSON.parse(bloco.text);
  } catch {
    return new Map();
  }

  const validado = ClassificacaoSchema.safeParse(bruto);
  if (!validado.success) return new Map();

  const porIndice = new Map(
    validado.data.classificacoes.map((c) => [c.indice, c.tem_legenda_embutida]),
  );

  return new Map(
    lote
      .map((v, i): [string, boolean | undefined] => [v.id, porIndice.get(i)])
      .filter((par): par is [string, boolean] => par[1] !== undefined),
  );
}

/**
 * Recebe a lista de vídeos e devolve a mesma lista com `tem_legenda_embutida`
 * preenchido nos itens que tinham thumbnail. Lotes que falharem (sem chave,
 * erro de rede, resposta fora do formato) ficam sem classificação em vez de
 * derrubar os outros lotes ou o radar inteiro.
 */
export async function marcarLegendaEmbutida(
  videos: ItemBiblioteca[],
): Promise<ItemBiblioteca[]> {
  const comThumbnail = videos.filter((v) => v.thumbnail_url);
  if (comThumbnail.length === 0) return videos;

  const lotes: ItemBiblioteca[][] = [];
  for (let i = 0; i < comThumbnail.length; i += TAMANHO_LOTE) {
    lotes.push(comThumbnail.slice(i, i + TAMANHO_LOTE));
  }

  const resultadosPorLote = await Promise.allSettled(lotes.map(classificarLote));

  const classificados = new Map<string, boolean>();
  for (const resultado of resultadosPorLote) {
    if (resultado.status === "fulfilled") {
      for (const [id, valor] of resultado.value) classificados.set(id, valor);
    } else {
      console.error("[filtro-legenda] um lote falhou:", resultado.reason);
    }
  }

  return videos.map((v) =>
    classificados.has(v.id) ? { ...v, tem_legenda_embutida: classificados.get(v.id) } : v,
  );
}
