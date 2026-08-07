import { z } from "zod";
import { clienteSupabase } from "@/lib/supabase/servidor";
import { aprovarCortes } from "@/lib/analises-db";
import { IDS_FORMATO } from "@/lib/formatos";

export const runtime = "nodejs";

/**
 * Aceita o id sozinho (formato antigo) ou o id com a janela ajustada.
 *
 * A janela vem quando o dono mexeu no início/fim pelo ajuste de palavras —
 * é o conserto do corte que entrava no meio da frase.
 */
const Escolhido = z.union([
  z.string().uuid(),
  z
    .object({
      id: z.string().uuid(),
      inicio_s: z.number().min(0).optional(),
      fim_s: z.number().min(0).optional(),
      // Só id conhecido: formato inventado faria o worker cair no padrão em
      // silêncio, e a pessoa veria um corte diferente do que escolheu.
      estilo: z.enum(IDS_FORMATO as [string, ...string[]]).optional(),
    })
    // Validado no servidor porque o cliente é editável: janela invertida ou
    // longa demais faria o ffmpeg produzir lixo ou queimar minutos à toa.
    .refine(
      (c) =>
        c.inicio_s === undefined ||
        c.fim_s === undefined ||
        c.fim_s - c.inicio_s >= 3,
      "Corte curto demais.",
    )
    .refine(
      (c) =>
        c.inicio_s === undefined ||
        c.fim_s === undefined ||
        c.fim_s - c.inicio_s <= 180,
      "Corte longo demais.",
    ),
]);

const Corpo = z.object({
  // Os cortes que o dono aprovou no Estúdio. Pelo menos um.
  cortes: z.array(Escolhido).min(1, "Escolha pelo menos um corte."),
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
  const escolhidos = parsed.data.cortes.map((c) =>
    typeof c === "string" ? { id: c } : c,
  );
  // RLS faz a autorização: os updates só acham linhas do próprio usuário.
  await aprovarCortes(supabase, id, escolhidos);

  return Response.json({ ok: true }, { status: 202 });
}
