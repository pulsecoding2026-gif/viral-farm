import Anthropic from "@anthropic-ai/sdk";
import type { TranscricaoPalavras } from "./transcritor";

/**
 * Seleção dos cortes — o coração do produto.
 *
 * O modelo recebe a transcrição com timestamps e devolve blocos
 * SEMANTICAMENTE COMPLETOS: gancho no início, desenvolvimento, conclusão.
 * As regras (20–90s, funciona isolado, evita intro/despedida) vêm direto da
 * referência de como o Opus Clip opera.
 */

export type CorteEscolhido = {
  inicio_s: number;
  fim_s: number;
  titulo: string;
  gancho: string;
  motivo: string;
  score: number;
};

const FERRAMENTA = {
  name: "entregar_cortes",
  description: "Entrega os cortes escolhidos do vídeo.",
  input_schema: {
    type: "object" as const,
    properties: {
      cortes: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            inicio_s: { type: "number" as const },
            fim_s: { type: "number" as const },
            titulo: {
              type: "string" as const,
              description: "Título curto e clicável pro corte, em português.",
            },
            gancho: {
              type: "string" as const,
              description: "A primeira frase falada no corte, literal.",
            },
            motivo: {
              type: "string" as const,
              description: "Uma frase: por que este trecho segura atenção.",
            },
            score: {
              type: "number" as const,
              description: "0-100, adequação ao formato curto.",
            },
          },
          required: ["inicio_s", "fim_s", "titulo", "gancho", "motivo", "score"],
        },
      },
    },
    required: ["cortes"],
  },
};

function transcricaoComTempo(t: TranscricaoPalavras): string {
  // Uma marca de tempo a cada ~12 palavras: granular o bastante pra cortar,
  // curto o bastante pra não estourar o contexto em vídeo longo.
  const blocos: string[] = [];
  for (let i = 0; i < t.palavras.length; i += 12) {
    const grupo = t.palavras.slice(i, i + 12);
    const inicio = grupo[0].inicio_s.toFixed(1);
    blocos.push(`[${inicio}s] ${grupo.map((p) => p.texto).join(" ")}`);
  }
  return blocos.join("\n");
}

export async function escolherCortes(
  chaveAnthropic: string,
  modelo: string,
  transcricao: TranscricaoPalavras,
  duracaoVideo: number,
  maxCortes: number,
): Promise<CorteEscolhido[]> {
  const anthropic = new Anthropic({ apiKey: chaveAnthropic });

  const prompt = `Você seleciona cortes virais de vídeos longos, no padrão dos melhores editores de shorts.

Transcrição com timestamps (vídeo tem ${Math.round(duracaoVideo)}s no total):

${transcricaoComTempo(transcricao)}

Escolha até ${maxCortes} trechos que:
- comecem com um gancho forte (pergunta, promessa, conflito, número, afirmação polêmica);
- tenham contexto suficiente pra funcionar FORA do vídeo original;
- terminem com uma conclusão, não no meio de uma ideia;
- durem entre 20 e 90 segundos;
- evitem introduções, despedidas e propaganda;
- nunca comecem no meio de uma frase — ajuste inicio_s pro começo exato da fala.

Pontue cada corte de 0 a 100 pesando: força do gancho (25%), clareza isolada (20%), potencial de retenção (15%), intensidade emocional (15%), conclusão (10%), novidade (10%), atividade (5%).

Se o vídeo não render ${maxCortes} cortes BONS, entregue menos. Corte fraco não entra.`;

  const resposta = await anthropic.messages.create({
    model: modelo,
    max_tokens: 4096,
    tools: [FERRAMENTA],
    tool_choice: { type: "tool", name: "entregar_cortes" },
    messages: [{ role: "user", content: prompt }],
  });

  const uso = resposta.content.find((b) => b.type === "tool_use");
  if (!uso || uso.type !== "tool_use") {
    throw new Error("O modelo não devolveu os cortes no formato esperado.");
  }

  const { cortes } = uso.input as { cortes: CorteEscolhido[] };

  return cortes
    .filter(
      (c) =>
        c.fim_s > c.inicio_s &&
        c.inicio_s >= 0 &&
        c.fim_s <= duracaoVideo + 1 &&
        c.fim_s - c.inicio_s >= 10,
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCortes);
}
