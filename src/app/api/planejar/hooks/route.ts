import { z } from "zod";
import { clienteSupabase } from "@/lib/supabase/servidor";
import { gerarJson, IaIndisponivel } from "@/lib/planejar/deepseek";
import { pedidoDeHooks, sistemaDosHooks } from "@/lib/planejar/prompts";
import { criarPlanejamento } from "@/lib/planejar/db";
import {
  ESTILOS_DE_HOOK,
  type DadosHooks,
  type EstiloDeHook,
  type Hook,
} from "@/lib/planejar/tipos";

export const runtime = "nodejs";
export const maxDuration = 180;

const Corpo = z.object({
  tema: z.string().trim().min(3, "Descreva o tema.").max(500),
  nicho: z.string().max(200).optional(),
  quantidade: z.number().min(4).max(16),
});

function validarHooks(cru: unknown): Hook[] {
  const lista = (cru as { hooks?: unknown[] } | null)?.hooks;
  if (!Array.isArray(lista)) throw new IaIndisponivel();

  const validos = ESTILOS_DE_HOOK as readonly string[];
  const hooks = lista
    .map((h) => h as Partial<Hook>)
    .filter((h) => typeof h.texto === "string" && h.texto.trim())
    .map((h) => ({
      // Estilo inventado cai em "curiosidade" em vez de derrubar a lista: um
      // rótulo errado não tira o valor da frase.
      estilo: (validos.includes(String(h.estilo))
        ? String(h.estilo)
        : "curiosidade") as EstiloDeHook,
      texto: String(h.texto).trim(),
      por_que_funciona: String(h.por_que_funciona ?? "").trim(),
    }));
  if (hooks.length === 0) throw new IaIndisponivel();
  return hooks;
}

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

  try {
    const cru = await gerarJson(sistemaDosHooks(), pedidoDeHooks(parsed.data));
    const hooks = validarHooks(cru);
    const dados: DadosHooks = { entrada: parsed.data, hooks };
    const id = await criarPlanejamento(
      supabase,
      user.id,
      "hooks",
      parsed.data.tema.slice(0, 60),
      dados,
    );
    return Response.json({ id, hooks });
  } catch (e) {
    if (e instanceof IaIndisponivel) {
      return Response.json({ erro: e.message }, { status: 503 });
    }
    throw e;
  }
}
