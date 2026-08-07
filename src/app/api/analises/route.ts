import { z } from "zod";
import { clienteSupabase } from "@/lib/supabase/servidor";
import { criarAnalise, listarAnalises } from "@/lib/analises-db";
import { validarUrl, ErroDeEntrada } from "@/lib/analise/extrair";
import { ehEscolhaDeFormato } from "@/lib/formatos";

export const runtime = "nodejs";

const Corpo = z.object({
  link: z.string().min(1, "Cole o link do vídeo."),
  // Opcional: é uma dica pra IA, que identifica o nicho pelo material de
  // qualquer forma.
  nicho: z.string().max(120).optional(),
  // As escolhas do Estúdio — tudo com padrão seguro.
  opcoes: z
    .object({
      modo: z.enum(["auto", "manual"]).optional(),
      qtd: z.number().int().min(1).max(15).optional(),
      duracao: z.enum(["curto", "medio", "longo"]).optional(),
      direcao: z.string().max(500).optional(),
      // Id da galeria de formatos, ou "auto" pra IA escolher corte a corte.
      estilo: z.string().refine(ehEscolhaDeFormato, "Formato desconhecido.").optional(),
      titulo: z.boolean().optional(),
      limpar_silencio: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Cria o pedido de análise — e SÓ isso. Quem processa é o worker na VPS:
 * a linha entra na fila (etapa na_fila) e a resposta volta na hora. A Vercel
 * nunca baixa nem renderiza vídeo.
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

  // Barra link inválido AQUI, antes de entrar na fila: erro na cara do
  // usuário em vez de um job que nasce pra falhar na VPS.
  try {
    validarUrl(parsed.data.link);
  } catch (err) {
    if (err instanceof ErroDeEntrada) {
      return Response.json({ erro: err.message }, { status: 400 });
    }
    throw err;
  }

  const id = await criarAnalise(
    supabase,
    user.id,
    parsed.data.link.trim(),
    parsed.data.nicho ?? "",
    parsed.data.opcoes ?? {},
  );

  return Response.json({ id }, { status: 202 });
}

export async function GET() {
  const supabase = await clienteSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ erro: "Faça login." }, { status: 401 });

  return Response.json(await listarAnalises(supabase), {
    headers: { "Cache-Control": "no-store" },
  });
}
