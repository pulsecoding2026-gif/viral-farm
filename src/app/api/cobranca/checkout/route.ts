import { z } from "zod";
import { clienteSupabase } from "@/lib/supabase/servidor";
import {
  ehPlanoPago,
  enderecoBase,
  precoDoPlano,
  stripe,
  supabaseServico,
} from "@/lib/planos/stripe";

export const runtime = "nodejs";

/**
 * Abre o Checkout do Stripe pra um plano.
 *
 * A rota não cobra nada — ela só cria a sessão e devolve a URL hospedada pelo
 * Stripe. Cartão, 3-D Secure e recibo acontecem lá; nenhum dado de pagamento
 * passa por este servidor, que é o que mantém o escopo de PCI no mínimo.
 *
 * Quem realmente LIBERA o plano é o webhook. Esta rota não escreve `plano` em
 * lugar nenhum: se escrevesse, bastaria chamá-la e fechar a aba pra sair com
 * plano Estúdio sem pagar.
 */

const Corpo = z.object({
  plano: z.string().trim(),
});

export async function POST(req: Request) {
  const supabase = await clienteSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ erro: "Faça login." }, { status: 401 });

  let cru: unknown;
  try {
    cru = await req.json();
  } catch {
    return Response.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  const parsed = Corpo.safeParse(cru);
  if (!parsed.success || !ehPlanoPago(parsed.data.plano)) {
    return Response.json(
      { erro: "Escolha um dos planos: criador, profissional ou estudio." },
      { status: 400 },
    );
  }
  const plano = parsed.data.plano;

  /**
   * O preço vem do catálogo do servidor, NUNCA do corpo da requisição. Aceitar
   * um price id do cliente deixaria qualquer pessoa assinar o Estúdio pelo
   * preço de um plano de teste criado por ela na conta dela — ou por R$ 0.
   */
  const price = precoDoPlano(plano);

  /**
   * A leitura do perfil usa a sessão (RLS garante que é o próprio), mas a
   * ESCRITA usa a chave de serviço: o trigger `perfis_travar_plano` reverte
   * `stripe_customer_id` quando a chamada tem usuário logado, e faz isso sem
   * erro — o customer id simplesmente não seria gravado.
   */
  const { data: perfil, error: erroPerfil } = await supabase
    .from("perfis")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (erroPerfil) {
    return Response.json(
      { erro: "Não consegui ler sua conta. Tente de novo." },
      { status: 500 },
    );
  }

  const sdk = stripe();
  let customerId = perfil?.stripe_customer_id as string | null | undefined;

  if (!customerId) {
    const customer = await sdk.customers.create({
      email: user.email ?? undefined,
      // O webhook chega com o customer, não com o usuário. Guardar o id da
      // conta aqui dá um caminho de volta mesmo se a linha em `perfis`
      // ficar sem o customer id por qualquer motivo.
      metadata: { user_id: user.id },
    });
    customerId = customer.id;

    const { error } = await supabaseServico()
      .from("perfis")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);

    if (error) {
      // Sem o vínculo gravado, a próxima visita criaria OUTRO customer e a
      // pessoa acabaria com duas assinaturas cobrando. Melhor parar aqui.
      console.error("[cobranca] não gravei o customer:", error.message);
      return Response.json(
        { erro: "Não consegui iniciar o pagamento. Tente de novo." },
        { status: 500 },
      );
    }
  }

  const base = enderecoBase(req);

  const sessao = await sdk.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    /**
     * As duas amarras que o webhook usa pra saber DE QUEM foi o pagamento.
     * Duas e não uma porque são caminhos diferentes: `client_reference_id`
     * chega no `checkout.session.completed`, e o `metadata` desce pra
     * assinatura, aparecendo também nos eventos de renovação.
     */
    client_reference_id: user.id,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
    success_url: `${base}/assinatura?ok=1`,
    cancel_url: `${base}/assinatura`,
    // Mercado brasileiro: CPF/CNPJ na fatura e endereço de cobrança.
    billing_address_collection: "auto",
    tax_id_collection: { enabled: true },
    locale: "pt-BR",
    // Campo de cupom na própria tela do Stripe — sem cupom criado no painel
    // ele não aparece, então ligar já não custa nada.
    allow_promotion_codes: true,
  });

  if (!sessao.url) {
    return Response.json(
      { erro: "O Stripe não devolveu o endereço de pagamento." },
      { status: 502 },
    );
  }

  return Response.json({ url: sessao.url });
}
