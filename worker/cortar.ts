import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { TranscricaoPalavras } from "./transcritor";
import { FORMATOS, acharFormato } from "../src/lib/formatos";

/**
 * Seleção dos cortes — o cérebro do produto, plugável como a transcrição.
 *
 * O modelo recebe a transcrição com timestamps e devolve blocos
 * SEMANTICAMENTE COMPLETOS: gancho no início, desenvolvimento, conclusão.
 *
 * Cada corte volta com o DIAGNÓSTICO do score (gancho, fluxo, valor,
 * tendência), não só a nota final: nota isolada é mágica, nota decomposta é
 * argumento — o usuário entende por que aquele trecho foi escolhido.
 *
 * Provedores: `deepseek` (padrão — API compatível com OpenAI, custo baixo)
 * e `claude`. Troca por env LLM, sem mexer no resto do worker.
 */

export type NotasCorte = {
  gancho: number;
  fluxo: number;
  valor: number;
  tendencia: number;
};

export type CorteEscolhido = {
  inicio_s: number;
  fim_s: number;
  titulo: string;
  titulo_tela: string;
  gancho: string;
  motivo: string;
  descricao: string;
  score: number;
  notas: NotasCorte;
  /** Formato escolhido pela IA para ESTE corte. */
  formato: string;
  /** Por que este formato combina com este trecho. */
  motivoFormato: string;
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
  /** Máximo de cortes (1–15). */
  qtd?: number;
  /** Faixa de duração alvo de cada corte. */
  duracao?: "curto" | "medio" | "longo";
  /** Direção em texto livre — vai como prioridade máxima no prompt. */
  direcao?: string;
  /**
   * Formato fixo escolhido pelo usuário. Ausente (ou "auto") deixa a IA
   * escolher o formato de cada corte pelo conteúdo do trecho.
   */
  estilo?: string;
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
      titulo_tela: z.string().optional(),
      gancho: z.string(),
      motivo: z.string(),
      descricao: z.string().optional(),
      score: z.number(),
      notas: z
        .object({
          gancho: z.number(),
          fluxo: z.number(),
          valor: z.number(),
          tendencia: z.number(),
        })
        .optional(),
      formato: z.string().optional(),
      motivoFormato: z.string().optional(),
    }),
  ),
});

/**
 * Catálogo de formatos para o prompt.
 *
 * Só id, categoria, quando usar e duração — é o que basta pra decidir. Mandar
 * o preset inteiro (tipografia, cores, safe area) gastaria contexto com
 * informação que não muda a escolha: o modelo decide pelo CONTEÚDO, não pela
 * cor da legenda.
 */
function catalogoDeFormatos(): string {
  return FORMATOS.map(
    (f) =>
      `- ${f.id} (${f.categoria}, ${f.duracaoIdeal.minSeg}-${f.duracaoIdeal.maxSeg}s): ${f.quandoUsar}`,
  ).join("\n");
}

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
  const maxCortes = Math.min(Math.max(opcoes.qtd ?? 8, 1), 15);
  const faixa = FAIXAS[opcoes.duracao ?? ""] ?? { de: 20, ate: 90 };

  // A direção do usuário entra ANTES das regras e com prioridade declarada:
  // é a autoridade dele sobre o corte — a IA obedece, não sugere.
  const direcao = opcoes.direcao?.trim()
    ? `\nDIREÇÃO DO USUÁRIO (prioridade máxima — obedeça acima de qualquer regra geral):\n"${opcoes.direcao.trim().slice(0, 500)}"\n`
    : "";

  // Formato fixo pelo usuário dispensa a escolha; "auto" (ou nada) manda a
  // IA casar cada trecho com o formato que combina com aquele conteúdo.
  const formatoFixo = opcoes.estilo && opcoes.estilo !== "auto";
  const blocoFormato = formatoFixo
    ? `\nO usuário já escolheu o formato "${opcoes.estilo}" para todos os cortes. Repita esse valor no campo "formato" e explique em "motivoFormato" como aproveitar esse estilo neste trecho.\n`
    : `
ESCOLHA DO FORMATO — para cada corte, escolha o preset de edição que melhor combina com AQUELE trecho específico:

${catalogoDeFormatos()}

Como escolher:
- case pelo CONTEÚDO e pela emoção do trecho, não pelo tema geral do vídeo;
- cortes diferentes do mesmo vídeo podem (e devem) ter formatos diferentes — uma afirmação forte pede um formato, uma história pede outro;
- respeite a faixa de duração do formato: não escolha um formato de 40-90s para um corte de 22s;
- em "motivoFormato", diga em uma frase por que esse formato serve a esse trecho.
`;

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
${blocoFormato}

Para CADA corte, avalie 4 dimensões de 0 a 100:
- gancho: força dos primeiros 3 segundos em segurar quem está rolando o feed
- fluxo: o trecho se sustenta sozinho, com começo, meio e fim
- valor: entrega informação, emoção ou entretenimento real
- tendencia: o assunto tem apelo atual e busca

O score final é a média ponderada: gancho 35%, fluxo 25%, valor 25%, tendencia 15%.

Se o vídeo não render ${maxCortes} cortes BONS, entregue menos. Corte fraco não entra.

Responda APENAS com JSON válido, sem markdown, exatamente neste formato:
{"cortes":[{
"inicio_s":12.4,
"fim_s":58.9,
"titulo":"nome curto do corte para a lista",
"titulo_tela":"frase de ate 45 caracteres que aparece ESCRITA na tela nos primeiros segundos, provocativa",
"gancho":"primeira frase falada, literal",
"motivo":"uma frase: por que este trecho segura atencao",
"descricao":"legenda pronta para postar, 2 frases, com chamada final",
"score":87,
"notas":{"gancho":92,"fluxo":85,"valor":88,"tendencia":78},
"formato":"${formatoFixo ? opcoes.estilo : "id de um dos formatos da lista acima"}",
"motivoFormato":"uma frase: por que este formato serve a este trecho"
}]}`;
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
      // Mais cortes e mais campos por corte: o teto antigo (4096) cortava a
      // resposta no meio e o JSON chegava quebrado.
      max_tokens: 8192,
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
    max_tokens: 8192,
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

/** Média ponderada das 4 dimensões — a mesma fórmula que o prompt declara. */
function scoreDasNotas(n: NotasCorte): number {
  return Math.round(
    n.gancho * 0.35 + n.fluxo * 0.25 + n.valor * 0.25 + n.tendencia * 0.15,
  );
}

export async function escolherCortes(
  config: ConfigLlm,
  transcricao: TranscricaoPalavras,
  duracaoVideo: number,
  opcoes: OpcoesCorte,
): Promise<CorteEscolhido[]> {
  const maxCortes = Math.min(Math.max(opcoes.qtd ?? 8, 1), 15);
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
    .map((c) => {
      const notas = c.notas ?? {
        // Modelo que ignorou as dimensões: espalha o score final nas quatro
        // pra UI não quebrar, sem inventar diferença que não foi avaliada.
        gancho: c.score,
        fluxo: c.score,
        valor: c.score,
        tendencia: c.score,
      };
      return {
        inicio_s: c.inicio_s,
        fim_s: c.fim_s,
        titulo: c.titulo,
        // O título de tela é opcional no schema; sem ele, o do card serve.
        titulo_tela: (c.titulo_tela ?? c.titulo).slice(0, 60),
        gancho: c.gancho,
        motivo: c.motivo,
        descricao: c.descricao ?? "",
        // Recalcula pela fórmula: o modelo às vezes devolve um score que não
        // bate com as notas que ele mesmo deu.
        score: c.notas ? scoreDasNotas(notas) : c.score,
        notas,
        // acharFormato cai no padrão se o modelo inventar um id que não
        // existe — formato inválido não pode derrubar a renderização.
        formato: acharFormato(c.formato).id,
        motivoFormato: c.motivoFormato ?? "",
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCortes);
}
