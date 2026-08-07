import { clienteSupabase } from "@/lib/supabase/servidor";
import { lerAnalise } from "@/lib/analises-db";

export const runtime = "nodejs";

/** Detalhe de uma análise, com os cortes — é o que o polling da UI consome. */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/analises/[id]">,
) {
  const supabase = await clienteSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ erro: "Faça login." }, { status: 401 });

  const { id } = await ctx.params;
  // RLS filtra: se a análise for de outra pessoa, volta null — mesmo 404.
  const job = await lerAnalise(supabase, id);

  if (!job) {
    return Response.json({ erro: "Análise não encontrada." }, { status: 404 });
  }

  return Response.json(job, {
    // Polling não pode ser cacheado, nem pelo browser nem por CDN.
    headers: { "Cache-Control": "no-store" },
  });
}
