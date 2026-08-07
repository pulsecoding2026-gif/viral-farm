import { clienteSupabase } from "@/lib/supabase/servidor";
import { cancelarAnalise } from "@/lib/analises-db";

export const runtime = "nodejs";

/**
 * Interrompe uma análise em andamento.
 *
 * A rota só troca o status e volta na hora. Quem realmente para é o worker
 * na VPS: ele vigia a própria linha e mata o yt-dlp/ffmpeg assim que ela sai
 * de 'processando'. A Vercel não fala com a VPS — o banco é a ponte.
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
  const resultado = await cancelarAnalise(supabase, id);

  if (resultado === "nao_achei") {
    return Response.json(
      { erro: "Essa análise já terminou ou não está mais em andamento." },
      { status: 409 },
    );
  }

  return Response.json({ ok: true }, { status: 202 });
}
