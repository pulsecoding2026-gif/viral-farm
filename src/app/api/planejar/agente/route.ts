import { z } from "zod";
import { clienteSupabase } from "@/lib/supabase/servidor";
import { conversar, IaIndisponivel } from "@/lib/planejar/deepseek";
import { sistemaDoAgente, tituloDaConversa } from "@/lib/planejar/prompts";
import {
  atualizarPlanejamento,
  criarPlanejamento,
  lerPlanejamento,
} from "@/lib/planejar/db";
import type { DadosConversa, Mensagem } from "@/lib/planejar/tipos";

export const runtime = "nodejs";
// O DeepSeek leva de 10 a 40s numa resposta de chat; o padrão da plataforma
// mataria a função no meio e a pessoa veria erro de rede num pedido que ia
// dar certo.
export const maxDuration = 180;

const Corpo = z.object({
  /** Ausente = conversa nova. */
  id: z.string().uuid().optional(),
  mensagem: z.string().trim().min(1, "Escreva uma mensagem.").max(4000),
});

/**
 * Um turno do Agent Viral: recebe a mensagem, responde e persiste a conversa.
 *
 * A conversa INTEIRA vive numa linha só e é reescrita a cada turno. Um chat
 * de planejamento tem dezenas de mensagens, não milhares — normalizar em
 * tabela de mensagens compraria join e ordenação pra um caso que jsonb
 * resolve inteiro.
 */
export async function POST(req: Request) {
  const supabase = await clienteSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ erro: "Faça login." }, { status: 401 });

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return Response.json({ erro: "Corpo inválido." }, { status: 400 });
  }
  const parsed = Corpo.safeParse(corpo);
  if (!parsed.success) {
    return Response.json(
      { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const { id, mensagem } = parsed.data;

  // Histórico existente, ou conversa nascendo agora.
  let mensagens: Mensagem[] = [];
  if (id) {
    const item = await lerPlanejamento(supabase, id);
    if (!item || item.tipo !== "agente") {
      return Response.json({ erro: "Conversa não encontrada." }, { status: 404 });
    }
    mensagens = (item.dados as DadosConversa).mensagens ?? [];
  }
  mensagens = [...mensagens, { papel: "usuario", texto: mensagem }];

  let resposta: string;
  try {
    resposta = await conversar(sistemaDoAgente(), mensagens);
  } catch (e) {
    if (e instanceof IaIndisponivel) {
      return Response.json({ erro: e.message }, { status: 503 });
    }
    throw e;
  }

  mensagens = [...mensagens, { papel: "agente", texto: resposta }];
  const dados: DadosConversa = { mensagens };

  // Persistir DEPOIS de responder: conversa sem resposta não vale guardar, e
  // uma falha da IA não deve deixar meia-mensagem no histórico.
  let idFinal = id;
  if (idFinal) {
    await atualizarPlanejamento(supabase, idFinal, dados);
  } else {
    idFinal = await criarPlanejamento(
      supabase,
      user.id,
      "agente",
      tituloDaConversa(mensagem),
      dados,
    );
  }

  return Response.json({ id: idFinal, resposta });
}
