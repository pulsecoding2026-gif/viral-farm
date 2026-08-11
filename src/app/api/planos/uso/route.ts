import { clienteSupabase } from "@/lib/supabase/servidor";
import { lerUso } from "@/lib/planos/uso";

export const runtime = "nodejs";

/**
 * Quanto do plano já foi usado neste ciclo.
 *
 * Rota separada da listagem de análises de propósito: são preocupações
 * diferentes com ritmos diferentes. O painel faz polling da lista a cada
 * poucos segundos enquanto um job roda; recontar o uso junto seria uma
 * consulta agregada a cada volta, pra um número que muda uma vez por
 * análise.
 */
export async function GET() {
  const supabase = await clienteSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ erro: "Faça login." }, { status: 401 });

  const uso = await lerUso(supabase, user.id);

  return Response.json(
    {
      plano: uso.assinatura.plano.id,
      plano_nome: uso.assinatura.plano.nome,
      status: uso.assinatura.status,
      usadas: uso.analisesUsadas,
      limite: uso.assinatura.plano.analisesMes,
      restantes: uso.analisesRestantes,
      cortes_max: uso.assinatura.plano.cortesMax,
      duracao_max_min: uso.assinatura.plano.duracaoMaxMin,
      renova_em: uso.renovaEm.toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
