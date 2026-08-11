import type Stripe from "stripe";
import {
  cicloDaAssinatura,
  planoDoPreco,
  precoDaAssinatura,
  statusNoBanco,
  stripe,
  supabaseServico,
  type StatusAssinatura,
} from "@/lib/planos/stripe";

export const runtime = "nodejs";

/**
 * O webhook do Stripe — o ÚNICO lugar do sistema que libera plano pago.
 *
 * Nenhuma rota de front escreve `plano`: o pagamento só existe quando o Stripe
 * conta que existe, por um canal assinado. É por isso que a verificação de
 * assinatura abaixo não tem caminho de escape — sem ela, este endereço seria
 * público e um POST com JSON à mão daria plano Estúdio pra qualquer conta.
 *
 * REGRAS DE RESPOSTA (o Stripe interpreta o código HTTP):
 *   200  recebi — inclusive pra evento que não me interessa. Erro em evento
 *        desconhecido faz o Stripe reenviar e, na insistência, DESATIVAR o
 *        endpoint. Aí a próxima renovação de verdade se perde.
 *   400  assinatura inválida — não reenviar, não é falha transitória.
 *   500  quebrou aqui dentro (banco fora do ar). Aí sim quero o reenvio.
 */

type Perfil = { id: string; stripe_subscription_id: string | null };

/** O que vai pra tabela `perfis`. Só campos que a migração 0012 conhece. */
type Mudanca = {
  plano?: string;
  assinatura_status: StatusAssinatura;
  stripe_subscription_id?: string | null;
  ciclo_inicio?: string | null;
  ciclo_fim?: string | null;
};

/** O id do customer, venha ele expandido ou como string. */
function idDoCustomer(
  c: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (!c) return null;
  return typeof c === "string" ? c : c.id;
}

/**
 * Acha o dono da assinatura.
 *
 * Pela ordem: o `user_id` que nós mesmos gravamos no metadata (caminho direto
 * e imune a customer duplicado), e só então o customer id — que tem índice
 * único em `perfis` desde a migração 0012.
 */
async function acharPerfil(
  userId: string | null | undefined,
  customerId: string | null,
): Promise<Perfil | null> {
  const sb = supabaseServico();
  const campos = "id, stripe_subscription_id";

  if (userId) {
    const { data, error } = await sb
      .from("perfis")
      .select(campos)
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as Perfil;
  }

  if (customerId) {
    const { data, error } = await sb
      .from("perfis")
      .select(campos)
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) return data as Perfil;
  }

  return null;
}

async function gravar(perfilId: string, mudanca: Mudanca): Promise<void> {
  const { error } = await supabaseServico()
    .from("perfis")
    .update(mudanca)
    .eq("id", perfilId);
  // Lançar (e não engolir) é o que devolve 500 e faz o Stripe reenviar.
  if (error) throw new Error(`não gravei o perfil ${perfilId}: ${error.message}`);
}

/**
 * Transforma uma assinatura do Stripe na linha de `perfis`.
 *
 * O detalhe que importa: preço desconhecido NÃO vira downgrade. Se alguém
 * trocar um price id no painel e esquecer de atualizar a env, o mapa devolve
 * `null` — e aí a gente atualiza status e datas mas deixa `plano` como está.
 * Rebaixar um cliente pagante por erro nosso de configuração é bem pior do
 * que ficar um ciclo com o plano antigo enquanto o log grita.
 */
function mudancaDaAssinatura(sub: Stripe.Subscription): Mudanca {
  const status = statusNoBanco(sub.status);
  const ciclo = cicloDaAssinatura(sub);

  const mudanca: Mudanca = {
    assinatura_status: status,
    stripe_subscription_id: sub.id,
    ciclo_inicio: ciclo.inicio,
    ciclo_fim: ciclo.fim,
  };

  if (status === "cancelada") {
    // Cancelou: o acesso pago acaba. `lerAssinatura` já derruba pelo status,
    // mas gravar o plano fecha a porta se o status mudar por outro caminho.
    mudanca.plano = "gratuito";
    return mudanca;
  }

  const preco = precoDaAssinatura(sub);
  const plano = planoDoPreco(preco);
  if (plano) {
    mudanca.plano = plano;
  } else {
    console.error(
      `[cobranca] preço ${preco} não bate com nenhum STRIPE_PRICE_*. ` +
        `Mantive o plano atual da assinatura ${sub.id} — confira as env vars.`,
    );
  }
  return mudanca;
}

/* --------------------------------------------------------------- eventos --- */

/**
 * Pagamento aprovado no Checkout.
 *
 * A sessão vem sem os itens da assinatura, então buscamos a assinatura pra
 * ler preço e ciclo. Vale a chamada extra: é uma por compra, e é ela que
 * garante que o ciclo gravado é o que o Stripe vai cobrar, não uma conta de
 * data feita por nós.
 */
async function aoCompletarCheckout(sessao: Stripe.Checkout.Session) {
  if (sessao.mode !== "subscription") return;

  const subId =
    typeof sessao.subscription === "string"
      ? sessao.subscription
      : sessao.subscription?.id;
  if (!subId) return;

  const userId = sessao.client_reference_id ?? sessao.metadata?.user_id ?? null;
  const perfil = await acharPerfil(userId, idDoCustomer(sessao.customer));
  if (!perfil) {
    // Sem dono, não há o que atualizar — e insistir só faria o Stripe
    // reenviar pra sempre um evento que nunca vai casar.
    console.error(
      `[cobranca] checkout ${sessao.id} sem perfil (user=${userId} customer=${idDoCustomer(sessao.customer)})`,
    );
    return;
  }

  const sub = await stripe().subscriptions.retrieve(subId);
  await gravar(perfil.id, mudancaDaAssinatura(sub));
}

/** Renovação, troca de plano, cancelamento agendado — tudo passa por aqui. */
async function aoAtualizarAssinatura(sub: Stripe.Subscription) {
  const perfil = await acharPerfil(
    sub.metadata?.user_id,
    idDoCustomer(sub.customer),
  );
  if (!perfil) {
    console.error(`[cobranca] assinatura ${sub.id} sem perfil correspondente`);
    return;
  }
  await gravar(perfil.id, mudancaDaAssinatura(sub));
}

/**
 * Assinatura encerrada de vez.
 *
 * A guarda do `stripe_subscription_id` não é preciosismo: o Stripe não promete
 * ordem de entrega. Se alguém cancela e reassina no mesmo minuto, o `deleted`
 * da assinatura VELHA pode chegar depois do `completed` da nova — e sem essa
 * conferência ele derrubaria pro gratuito uma assinatura recém-paga.
 */
async function aoApagarAssinatura(sub: Stripe.Subscription) {
  const perfil = await acharPerfil(
    sub.metadata?.user_id,
    idDoCustomer(sub.customer),
  );
  if (!perfil) return;

  if (perfil.stripe_subscription_id && perfil.stripe_subscription_id !== sub.id) {
    console.warn(
      `[cobranca] ignorei o fim da assinatura ${sub.id}: o perfil já está em ${perfil.stripe_subscription_id}`,
    );
    return;
  }

  await gravar(perfil.id, {
    plano: "gratuito",
    assinatura_status: "cancelada",
    stripe_subscription_id: null,
    // `ciclo_fim` fica como está: é o dia até quando ela já pagou, e a tela
    // de assinatura usa essa data pra dizer até quando o acesso vale.
  });
}

/**
 * Cartão recusado.
 *
 * Marca inadimplente e PRONTO — não apaga plano nem ciclo. O Stripe ainda vai
 * tentar cobrar de novo nos próximos dias (Smart Retries); quem decide o fim
 * é o `customer.subscription.deleted`. Cortar o acesso na primeira recusa
 * puniria quem só trocou de cartão.
 */
async function aoFalharPagamento(fatura: Stripe.Invoice) {
  const detalhes = fatura.parent?.subscription_details;
  // Fatura avulsa (sem assinatura) não muda estado de plano nenhum.
  if (!detalhes?.subscription) return;

  const perfil = await acharPerfil(
    detalhes.metadata?.user_id,
    idDoCustomer(fatura.customer),
  );
  if (!perfil) return;

  await gravar(perfil.id, { assinatura_status: "inadimplente" });
}

/* ----------------------------------------------------------------- rota --- */

export async function POST(req: Request) {
  const segredo = process.env.STRIPE_WEBHOOK_SECRET;
  if (!segredo) {
    console.error("[cobranca] STRIPE_WEBHOOK_SECRET não configurado.");
    // 500 e não 200: é falha de configuração NOSSA, e o reenvio do Stripe é
    // exatamente o que salva os eventos perdidos depois que alguém corrigir.
    return Response.json({ erro: "Webhook não configurado." }, { status: 500 });
  }

  const assinatura = req.headers.get("stripe-signature");
  if (!assinatura) {
    return Response.json({ erro: "Sem assinatura." }, { status: 400 });
  }

  /**
   * CORPO CRU, obrigatoriamente.
   *
   * A assinatura é um HMAC do texto exato que o Stripe enviou. `req.json()`
   * faria parse e perderia o original — ordem de chaves, espaços, escapes —,
   * e a conferência falharia em 100% dos eventos. Só `text()` serve.
   */
  const corpo = await req.text();

  let evento: Stripe.Event;
  try {
    evento = await stripe().webhooks.constructEventAsync(
      corpo,
      assinatura,
      segredo,
    );
  } catch (e) {
    // Assinatura ruim ou timestamp velho demais (defesa contra replay). Nunca
    // logar o corpo aqui: não foi verificado, é entrada de estranho.
    const motivo = e instanceof Error ? e.message : "desconhecido";
    console.warn(`[cobranca] assinatura recusada: ${motivo}`);
    return Response.json({ erro: "Assinatura inválida." }, { status: 400 });
  }

  try {
    switch (evento.type) {
      case "checkout.session.completed":
        await aoCompletarCheckout(evento.data.object);
        break;

      case "customer.subscription.updated":
        await aoAtualizarAssinatura(evento.data.object);
        break;

      case "customer.subscription.deleted":
        await aoApagarAssinatura(evento.data.object);
        break;

      case "invoice.payment_failed":
        await aoFalharPagamento(evento.data.object);
        break;

      default:
        // Evento que não nos interessa (e são dezenas). 200 silencioso.
        break;
    }
  } catch (e) {
    const motivo = e instanceof Error ? e.message : String(e);
    console.error(`[cobranca] falhei no evento ${evento.type}: ${motivo}`);
    return Response.json({ erro: "Falha ao processar." }, { status: 500 });
  }

  return Response.json({ recebido: true });
}
