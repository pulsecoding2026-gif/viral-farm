import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { TranscricaoPalavras } from "./transcritor";

/**
 * Seleção dos cortes — o cérebro do produto, plugável como a transcrição.
 *
 * O modelo recebe a transcrição com timestamps e devolve blocos
 * SEMANTICAMENTE COMPLETOS: gancho no início, desenvolvimento, conclusão.
 * As regras (20–90s, funciona isolado, evita intro/despedida) vêm direto da
 * referência de como o Opus Clip opera.
 *
 * Provedores: `deepseek` (padrão — API compatível com OpenAI, custo baixo)
 * e `claude`. Troca por env LLM, sem mexer no resto do worker.
 */

export type CorteEscolhido = {
  inicio_s: number;
  fim_s: number;
  titulo: string;
  gancho: string;
  motivo: string;
  score: number;
};

export type ConfigLlm = {
  provedor: "deepseek" | "claude";
  chave: string;
  modelo: string;
};

/**
 * As escolhas do usuário no envio — a "autoridade" do Estúdio.
 * Tudo opcional: sem nada, vale o comportamento automático padrão.
 */
export type OpcoesCorte = {
  /** Máximo de cortes (1–10). */
  qtd?: number;
  /** Faixa de duração alvo de cada corte. */
  duracao?: "curto" | "medio" | "longo";
  /** Direção em texto livre — vai como prioridade máxima no prompt. */
  direcao?: string;
};

const FAIXAS: Record<string, { de: number; ate: number }> = {
  curto: { de: 20, ate: 40 },
  medio: { de: 40, ate: 60 },
  longo: { de: 60, ate: 90 },
};

const EsquemaCortes = z.object({
  cortes: z.array(
    z.object({
      inicio_s: z.number(),
      fim_s: z.number(),
      titulo: z.string(),
      gancho: z.string(),
      motivo: z.string(),
      score: z.number(),
    }),
  ),
});

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

function montarPrompt(
  transcricao: TranscricaoPalavras,
  duracaoVideo: number,
  opcoes: OpcoesCorte,
): string {
  const maxCortes = Math.min(Math.max(opcoes.qtd ?? 5, 1), 10);
  const faixa = FAIXAS[opcoes.duracao ?? ""] ?? { de: 20, ate: 90 };

  // A direção do usuário entra ANTES das regras e com prioridade declarada:
  // é a autoridade dele sobre o corte — a IA obedece, não sugere.
  const direcao = opcoes.direcao?.trim()
    ? `\nDIREÇÃO DO USUÁRIO (prioridade máxima — obedeça acima de qualquer regra geral):\n"${opcoes.direcao.trim().slice(0, 500)}"\n`
    : "";

  return `Você seleciona cortes virais de vídeos longos, no padrão dos melhores editores de shorts.
${direcao}
Transcrição com timestamps (vídeo tem ${Math.round(duracaoVideo)}s no total):

${transcricaoComTempo(transcricao)}

Escolha até ${maxCortes} trechos que:
- comecem com um gancho forte (pergunta, promessa, conflito, número, afirmação polêmica);
- tenham contexto suficiente pra funcionar FORA do vídeo original;
- terminem com uma conclusão, não no meio de uma ideia;
- durem entre ${faixa.de} e ${faixa.ate} segundos;
- evitem introduções, despedidas e propaganda;
- nunca comecem no meio de uma frase — ajuste inicio_s pro começo exato da fala.

Pontue cada corte de 0 a 100 pesando: força do gancho (25%), clareza isolada (20%), potencial de retenção (15%), intensidade emocional (15%), conclusão (10%), novidade (10%), atividade (5%).

Se o vídeo não render ${maxCortes} cortes BONS, entregue menos. Corte fraco não entra.

Responda APENAS com JSON válido, sem markdown, exatamente neste formato:
{"cortes":[{"inicio_s":12.4,"fim_s":58.9,"titulo":"...","gancho":"primeira frase falada, literal","motivo":"por que segura atenção","score":87}]}`;
}

/* --------------------------------------------------------------- deepseek */

async function viaDeepseek(
  config: ConfigLlm,
  prompt: string,
): Promise<unknown> {
  const resposta = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.chave}`,
    },
    body: JSON.stringify({
      model: config.modelo,
      messages: [{ role: "user", content: prompt }],
      // Trava a saída em JSON — junto com o "APENAS JSON" do prompt, que a
      // própria doc do DeepSeek recomenda pra ancorar o formato.
      response_format: { type: "json_object" },
      max_tokens: 4096,
    }),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => "");
    throw new Error(
      `DeepSeek respondeu ${resposta.status}: ${corpo.slice(0, 300)}`,
    );
  }

  const dados = (await resposta.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const texto = dados.choices?.[0]?.message?.content;
  if (!texto) throw new Error("DeepSeek devolveu resposta vazia.");

  return JSON.parse(texto);
}

/* ----------------------------------------------------------------- claude */

async function viaClaude(config: ConfigLlm, prompt: string): Promise<unknown> {
  const anthropic = new Anthropic({ apiKey: config.chave });

  const resposta = await anthropic.messages.create({
    model: config.modelo,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const bloco = resposta.content.find((b) => b.type === "text");
  if (!bloco || bloco.type !== "text") {
    throw new Error("Claude devolveu resposta vazia.");
  }
  // Tolera cerca de markdown que o prompt proíbe mas modelos às vezes põem.
  const texto = bloco.text.replace(/^```(?:json)?\s*|\s*```$/g, "");
  return JSON.parse(texto);
}

/* ------------------------------------------------------------------ público */

export async function escolherCortes(
  config: ConfigLlm,
  transcricao: TranscricaoPalavras,
  duracaoVideo: number,
  opcoes: OpcoesCorte,
): Promise<CorteEscolhido[]> {
  const maxCortes = Math.min(Math.max(opcoes.qtd ?? 5, 1), 10);
  const prompt = montarPrompt(transcricao, duracaoVideo, opcoes);

  const bruto =
    config.provedor === "deepseek"
      ? await viaDeepseek(config, prompt)
      : await viaClaude(config, prompt);

  const parsed = EsquemaCortes.safeParse(bruto);
  if (!parsed.success) {
    throw new Error(
      `O modelo devolveu cortes num formato inesperado: ${parsed.error.issues[0]?.message}`,
    );
  }

  return parsed.data.cortes
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
