import { z } from "zod";
import { clienteSupabase } from "@/lib/supabase/servidor";
import { reeditarCorte } from "@/lib/analises-db";

export const runtime = "nodejs";

const Corpo = z.object({
  inicio_s: z.number().min(0),
  fim_s: z.number().positive(),
  estilo: z.enum(["karaoke", "neon", "minimal", "sem"]).optional(),
});

/**
 * Reedição de um corte pronto: nova janela de tempo e/ou novo estilo de
 * legenda. O corte volta pra fila como 'aprovado' e o worker re-renderiza
 * por cima do mesmo arquivo — o link não muda.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
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
  if (parsed.data.fim_s - parsed.data.inicio_s < 5) {
    return Response.json(
      { erro: "O corte precisa ter pelo menos 5 segundos." },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const resultado = await reeditarCorte(supabase, id, parsed.data);

  if (resultado === "ocupada") {
    return Response.json(
      { erro: "Espere a análise terminar o que está fazendo e tente de novo." },
      { status: 409 },
    );
  }
  if (resultado === "nao_achei") {
    return Response.json({ erro: "Corte não encontrado." }, { status: 404 });
  }

  return Response.json({ ok: true }, { status: 202 });
}
