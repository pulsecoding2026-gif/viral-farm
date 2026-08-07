import { z } from "zod";
import { clienteSupabase } from "@/lib/supabase/servidor";
import { aprovarCortes } from "@/lib/analises-db";

export const runtime = "nodejs";

const Corpo = z.object({
  // Os cortes que o dono aprovou no Estúdio. Pelo menos um.
  cortes: z.array(z.string().uuid()).min(1, "Escolha pelo menos um corte."),
});

/**
 * A decisão do Estúdio vira trabalho: aprova os escolhidos, descarta o
 * resto e devolve a análise pra fila da VPS renderizar só o que importa.
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

  const { id } = await ctx.params;
  // RLS faz a autorização: os updates só acham linhas do próprio usuário.
  await aprovarCortes(supabase, id, parsed.data.cortes);

  return Response.json({ ok: true }, { status: 202 });
}
