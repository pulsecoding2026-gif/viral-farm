import { clienteSupabase } from "@/lib/supabase/servidor";
import { enderecoBase, stripe } from "@/lib/planos/stripe";

export const runtime = "nodejs";

/**
 * Manda a pessoa pro Portal de Cobrança do Stripe.
 *
 * É lá que ela cancela, troca de plano, troca o cartão e baixa as faturas —
 * e é deliberado NÃO reimplementar nada disso aqui. Cancelamento tem regra de
 * proração, fatura tem exigência fiscal, cartão tem 3-D Secure: cada tela
 * dessas reescrita por nós seria uma superfície nova de bug em cima de
 * dinheiro de terceiro. O Portal já é certificado e traduzido.
 *
 * O que a gente continua controlando é o EFEITO: o Portal só muda o estado no
 * Stripe, e o plano no banco só muda quando o webhook confirmar.
 */
export async function POST(req: Request) {
  const supabase = await clienteSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ erro: "Faça login." }, { status: 401 });

  /**
   * O customer sai do PERFIL do usuário logado, nunca do corpo da requisição.
   * Aceitar um `customer_id` de fora abriria a porta pra qualquer pessoa
   * gerar um link de portal com os dados de cobrança de outra.
   */
  const { data: perfil } = await supabase
    .from("perfis")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerId = perfil?.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    return Response.json(
      { erro: "Você ainda não tem assinatura. Escolha um plano primeiro." },
      { status: 409 },
    );
  }

  const sessao = await stripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${enderecoBase(req)}/assinatura`,
    locale: "pt-BR",
  });

  return Response.json({ url: sessao.url });
}
