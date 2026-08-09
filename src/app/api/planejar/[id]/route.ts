import { clienteSupabase } from "@/lib/supabase/servidor";
import { apagarPlanejamento } from "@/lib/planejar/db";

export const runtime = "nodejs";

/** Apaga um item do histórico (conversa, roteiro ou lista de hooks). */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const supabase = await clienteSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ erro: "Faça login." }, { status: 401 });

  const { id } = await ctx.params;
  // RLS restringe ao dono; apagar o que não existe é silenciosamente ok —
  // o resultado desejado ("não está mais lá") já é verdade.
  await apagarPlanejamento(supabase, id);
  return Response.json({ ok: true });
}
