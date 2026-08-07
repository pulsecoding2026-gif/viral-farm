import { clienteSupabase } from "@/lib/supabase/servidor";
import { retomarAnalise } from "@/lib/analises-db";

export const runtime = "nodejs";

/**
 * Recoloca na fila uma análise que falhou, com as mesmas opções.
 *
 * A maioria das falhas de ingestão é transitória (verificação de robô, limite
 * de taxa, rede). Sem isto, a única saída era recomeçar do zero e reescolher
 * tudo — e o link já estava salvo aqui o tempo todo.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const supabase = await clienteSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ erro: "Faça login." }, { status: 401 });

  const { id } = await ctx.params;
  const resultado = await retomarAnalise(supabase, id);

  if (resultado === "nao_achei") {
    // RLS esconde o que não é do dono, e o status guarda contra retomar algo
    // que já está rodando — os dois casos caem aqui.
    return Response.json(
      { erro: "Essa análise não está mais em estado de erro." },
      { status: 409 },
    );
  }

  return Response.json({ ok: true }, { status: 202 });
}
