import { z } from "zod";
import { clienteSupabase } from "@/lib/supabase/servidor";
import { gerarJson, IaIndisponivel } from "@/lib/planejar/deepseek";
import { pedidoDeRoteiro, sistemaDoRoteiro } from "@/lib/planejar/prompts";
import { criarPlanejamento } from "@/lib/planejar/db";
import { acharFormato, IDS_FORMATO } from "@/lib/formatos";
import type { BlocoRoteiro, DadosRoteiro, Roteiro } from "@/lib/planejar/tipos";

export const runtime = "nodejs";
export const maxDuration = 180;

const Corpo = z.object({
  tema: z.string().trim().min(3, "Descreva o tema.").max(500),
  duracao_s: z.number().min(15).max(180),
  tom: z.enum(["educativo", "storytelling", "polemico", "vendas", "humor"]),
  formato: z.enum(IDS_FORMATO as [string, ...string[]]).optional(),
  referencia: z.string().max(4000).optional(),
});

/**
 * A IA escreve solto; isto aperta a saída no contrato.
 *
 * A mesma postura do escolherCortes: campo faltando não derruba o pedido —
 * ganha valor seguro — mas estrutura irreconhecível é IaIndisponivel, porque
 * não existe nada que a pessoa possa corrigir do lado dela.
 */
function validarRoteiro(cru: unknown, duracaoPedida: number): Roteiro {
  const r = cru as Partial<Roteiro> | null;
  if (!r || !Array.isArray(r.blocos) || r.blocos.length === 0) {
    throw new IaIndisponivel();
  }
  const blocos: BlocoRoteiro[] = r.blocos
    .filter((b) => b && typeof b.fala === "string" && b.fala.trim())
    .map((b) => ({
      inicio_s: Number(b.inicio_s) || 0,
      fim_s: Number(b.fim_s) || 0,
      fala: String(b.fala).trim(),
      na_tela: String(b.na_tela ?? "").trim(),
    }))
    .sort((a, b) => a.inicio_s - b.inicio_s);
  if (blocos.length === 0) throw new IaIndisponivel();

  return {
    titulo: String(r.titulo ?? "Roteiro").trim(),
    gancho_falado: String(r.gancho_falado ?? blocos[0].fala).trim(),
    titulo_tela: String(r.titulo_tela ?? "").trim(),
    // acharFormato normaliza id inventado pro padrão — mesma rede de
    // segurança do Analisador.
    formato: acharFormato(String(r.formato ?? "")).id,
    blocos,
    cta: String(r.cta ?? "").trim(),
    hashtags: Array.isArray(r.hashtags)
      ? r.hashtags.map((h) => String(h).replace(/^#/, "").trim()).filter(Boolean).slice(0, 8)
      : [],
    // A duração pedida fica registrada via blocos; se a IA passou muito do
    // alvo, ainda é um roteiro usável — a tela mostra a soma real.
  };
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
    const cru = await gerarJson(sistemaDoRoteiro(), pedidoDeRoteiro(parsed.data));
    const roteiro = validarRoteiro(cru, parsed.data.duracao_s);
    const dados: DadosRoteiro = { entrada: parsed.data, roteiro };
    const id = await criarPlanejamento(
      supabase,
      user.id,
      "roteiro",
      roteiro.titulo,
      dados,
    );
    return Response.json({ id, roteiro });
  } catch (e) {
    if (e instanceof IaIndisponivel) {
      return Response.json({ erro: e.message }, { status: 503 });
    }
    throw e;
  }
}
