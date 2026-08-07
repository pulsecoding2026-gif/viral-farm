import { clienteSupabase } from "@/lib/supabase/servidor";

export const runtime = "nodejs";

/**
 * Manda o projeto de edição pra fila de render.
 *
 * A rota NÃO recebe o projeto no corpo: ele já foi salvo pelo PUT
 * /api/cortes/[id]/projeto durante a edição. Aceitar de novo aqui abriria a
 * chance de renderizar uma versão diferente da que está guardada — e a
 * pessoa veria um vídeo que não corresponde ao que ficou no editor.
 *
 * Como todo o resto do sistema, quem trabalha é o worker na VPS: isto só
 * troca o estado da análise, e o banco é a ponte.
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

  // RLS esconde corte alheio, então não achar aqui já é a autorização.
  const { data: corte } = await supabase
    .from("cortes")
    .select("id, analise_id, projeto")
    .eq("id", id)
    .maybeSingle();

  if (!corte) {
    return Response.json({ erro: "Corte não encontrado." }, { status: 404 });
  }
  if (!corte.projeto) {
    return Response.json(
      { erro: "Este corte ainda não tem edição salva." },
      { status: 400 },
    );
  }

  // O filtro por status é a trava contra clique duplo e contra atropelar uma
  // análise que já está trabalhando: só sai da prateleira o que está parado.
  const { data: fila, error } = await supabase
    .from("analises")
    .update({ status: "processando", etapa: "renderizar_projeto", mensagem: null })
    .eq("id", corte.analise_id as string)
    .in("status", ["pronto", "erro", "cancelado"])
    .select("id");

  if (error) {
    return Response.json(
      { erro: `Não consegui enfileirar: ${error.message}` },
      { status: 500 },
    );
  }
  if (!fila || fila.length === 0) {
    return Response.json(
      { erro: "Esta análise já está processando. Espere terminar." },
      { status: 409 },
    );
  }

  return Response.json({ ok: true }, { status: 202 });
}
