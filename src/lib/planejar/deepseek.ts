import type { Mensagem } from "./tipos";

/**
 * Transporte DeepSeek pras rotas do Planejar.
 *
 * SEPARADO do worker/cortar.ts de propósito: aquele roda na VPS dentro do
 * pipeline de vídeo e conhece transcrição; este roda na Vercel, em rota de
 * API, e só conhece texto. Importar o worker aqui arrastaria ffmpeg e
 * sistema de arquivos pro bundle do site.
 *
 * A diferença de uso também é real: o Analisador quer SEMPRE JSON travado;
 * o Agent Viral quer prosa de chat. Daí as duas portas, `conversar` e
 * `gerarJson`.
 */

const URL_API = "https://api.deepseek.com/chat/completions";
const MODELO = "deepseek-chat";

/**
 * Falha do NOSSO lado (saldo, chave, provedor fora).
 *
 * Classe própria pra rota devolver a mensagem honesta — a mesma lição do
 * diagnóstico do Analisador: mandar a pessoa "tentar outro tema" quando o
 * problema é a nossa conta seria conselho ativamente errado.
 */
export class IaIndisponivel extends Error {
  constructor() {
    super(
      "Nosso serviço de IA está indisponível no momento — é um problema nosso, " +
        "não do seu pedido. Nada foi cobrado de você. Tente de novo em alguns minutos.",
    );
    this.name = "IaIndisponivel";
  }
}

type Papel = "system" | "user" | "assistant";

async function chamar(
  mensagens: { role: Papel; content: string }[],
  json: boolean,
): Promise<string> {
  const chave = process.env.DEEPSEEK_API_KEY;
  if (!chave) throw new IaIndisponivel();

  let resposta: Response;
  try {
    resposta = await fetch(URL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${chave}`,
      },
      body: JSON.stringify({
        model: MODELO,
        messages: mensagens,
        ...(json ? { response_format: { type: "json_object" } } : {}),
        max_tokens: 8192,
      }),
      // Abaixo do maxDuration da rota: melhor a gente cortar com mensagem
      // limpa do que a plataforma matar a função no meio.
      signal: AbortSignal.timeout(150_000),
    });
  } catch {
    throw new IaIndisponivel();
  }

  if (!resposta.ok) {
    // 4xx/5xx da API são todos problema NOSSO (saldo, chave, cota, queda) —
    // nenhum deles é culpa do que a pessoa digitou.
    const corpo = await resposta.text().catch(() => "");
    console.error(`[planejar] DeepSeek ${resposta.status}: ${corpo.slice(0, 300)}`);
    throw new IaIndisponivel();
  }

  const dados = (await resposta.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const texto = dados.choices?.[0]?.message?.content;
  if (!texto) throw new IaIndisponivel();
  return texto;
}

/** Chat multi-turno: devolve a resposta do agente em texto corrido. */
export async function conversar(
  sistema: string,
  historico: Mensagem[],
): Promise<string> {
  // As últimas 24 mensagens bastam de contexto: conversa de planejamento não
  // referencia o que foi dito há uma hora, e o custo cresce com a cauda.
  const recentes = historico.slice(-24);
  return chamar(
    [
      { role: "system", content: sistema },
      ...recentes.map((m) => ({
        role: (m.papel === "usuario" ? "user" : "assistant") as Papel,
        content: m.texto,
      })),
    ],
    false,
  );
}

/** Geração estruturada: prompt → objeto já parseado. */
export async function gerarJson(sistema: string, pedido: string): Promise<unknown> {
  const texto = await chamar(
    [
      { role: "system", content: sistema },
      { role: "user", content: pedido },
    ],
    true,
  );
  try {
    return JSON.parse(texto);
  } catch {
    // JSON quebrado apesar do response_format: acontece quando o teto de
    // tokens corta a resposta. Tratado como indisponibilidade, porque não há
    // nada que a pessoa possa corrigir do lado dela.
    console.error(`[planejar] JSON inválido do DeepSeek: ${texto.slice(0, 200)}`);
    throw new IaIndisponivel();
  }
}
