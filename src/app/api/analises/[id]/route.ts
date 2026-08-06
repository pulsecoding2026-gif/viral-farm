import { lerJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/analises/[id]">,
) {
  const { id } = await ctx.params;
  const job = lerJob(id);

  if (!job) {
    return Response.json(
      { erro: "Análise não encontrada ou expirada." },
      { status: 404 },
    );
  }

  return Response.json(job, {
    // Polling não pode ser cacheado, nem pelo browser nem por CDN.
    headers: { "Cache-Control": "no-store" },
  });
}
