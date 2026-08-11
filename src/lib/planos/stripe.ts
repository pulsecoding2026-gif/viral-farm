import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { IdPlano } from "./catalogo";

/**
 * A ponte com o Stripe — cliente, mapa de preços e a chave que o webhook usa
 * pra escrever no banco.
 *
 * =============================================================================
 * VARIÁVEIS DE AMBIENTE
 * =============================================================================
 *
 *   STRIPE_SECRET_KEY        sk_test_... / sk_live_...
 *                            Chave secreta da conta. SÓ servidor — nunca com
 *                            prefixo NEXT_PUBLIC_, senão vaza no bundle.
 *
 *   STRIPE_WEBHOOK_SECRET    whsec_...
 *                            Segredo do endpoint criado no painel do Stripe
 *                            (Developers → Webhooks). É por endpoint: o do
 *                            `stripe listen` local é OUTRO, diferente do de
 *                            produção.
 *
 *   STRIPE_PRICE_CRIADOR       price_...
 *   STRIPE_PRICE_PROFISSIONAL  price_...
 *   STRIPE_PRICE_ESTUDIO       price_...
 *                            O id do PREÇO (price_...), não o do produto
 *                            (prod_...). Cada um recorrente mensal em BRL,
 *                            batendo com `precoMensal` do catalogo.ts.
 *
 *   SUPABASE_SECRET_KEY      sb_secret_...
 *                            Já existe no projeto. O webhook precisa dela: a
 *                            migração 0012 tem um trigger que zera qualquer
 *                            mudança em plano/assinatura quando `auth.uid()`
 *                            não é nulo. Com sessão de usuário o UPDATE passa
 *                            silenciosamente e não grava nada.
 *
 *   NEXT_PUBLIC_SUPABASE_URL  já existe.
 *
 *   NEXT_PUBLIC_SITE_URL     https://seudominio.com  (opcional, recomendado)
 *                            Base dos redirects de volta do Checkout. Sem
 *                            ela caímos no cabeçalho `Origin` da requisição —
 *                            veja a nota de segurança em `enderecoBase()`.
 *
 * =============================================================================
 *
 * Tudo aqui é PREGUIÇOSO de propósito. Ler env no topo do módulo faria
 * `next build` explodir na máquina de CI, que legitimamente não tem chave de
 * pagamento nenhuma — e o erro apareceria como falha de build, não como
 * configuração faltando.
 */

/* ------------------------------------------------------------- cliente --- */

let stripeSingleton: Stripe | null = null;

export function stripe(): Stripe {
  if (stripeSingleton) return stripeSingleton;

  const chave = process.env.STRIPE_SECRET_KEY;
  if (!chave) {
    throw new Error(
      "STRIPE_SECRET_KEY não está configurada. Pegue em " +
        "dashboard.stripe.com/apikeys e coloque no .env.local (ou nas " +
        "variáveis de ambiente da Vercel).",
    );
  }

  stripeSingleton = new Stripe(chave, {
    /**
     * Sem `apiVersion` explícito: o SDK envia a versão com que foi gerado, e
     * é essa que os tipos deste pacote descrevem. Fixar uma string à mão faz
     * o TypeScript concordar com um formato que a API não devolve mais.
     */
    appInfo: { name: "Viral Farm" },
  });
  return stripeSingleton;
}

/* --------------------------------------------------------------- preços --- */

/** O grátis não se vende, então não tem preço no Stripe. */
export type IdPlanoPago = Exclude<IdPlano, "gratuito">;

const ENV_DO_PLANO: Record<IdPlanoPago, string> = {
  criador: "STRIPE_PRICE_CRIADOR",
  profissional: "STRIPE_PRICE_PROFISSIONAL",
  estudio: "STRIPE_PRICE_ESTUDIO",
};

export function ehPlanoPago(id: string): id is IdPlanoPago {
  return id in ENV_DO_PLANO;
}

/** O price id de um plano. Lança se a env não estiver configurada. */
export function precoDoPlano(plano: IdPlanoPago): string {
  const nomeEnv = ENV_DO_PLANO[plano];
  const preco = process.env[nomeEnv];
  if (!preco) {
    throw new Error(
      `${nomeEnv} não está configurada — o plano "${plano}" não tem preço no ` +
        `Stripe. Crie o preço recorrente mensal em BRL no painel e cole o id ` +
        `(price_...) nessa variável.`,
    );
  }
  return preco;
}

/**
 * O caminho inverso, que o webhook precisa: o Stripe manda o price id, e daí
 * sai o plano que a pessoa comprou.
 *
 * Devolve `null` em preço desconhecido em vez de cair no gratuito. São coisas
 * diferentes: "essa pessoa não assina" e "eu não sei o que ela comprou". Quem
 * chama decide — e o webhook usa isso pra NÃO rebaixar ninguém por engano
 * quando o que faltou foi configurar uma env.
 */
export function planoDoPreco(priceId: string | null | undefined): IdPlanoPago | null {
  if (!priceId) return null;
  for (const plano of Object.keys(ENV_DO_PLANO) as IdPlanoPago[]) {
    // Lido a cada chamada, não em mapa montado uma vez: env trocada em
    // runtime (rotação de preço na Vercel) passa a valer no próximo evento.
    if (process.env[ENV_DO_PLANO[plano]] === priceId) return plano;
  }
  return null;
}

/* -------------------------------------------------- banco pelo webhook --- */

let servicoSingleton: SupabaseClient | null = null;

/**
 * Cliente Supabase com a CHAVE DE SERVIÇO — ignora RLS.
 *
 * Existe por uma razão só: o trigger `perfis_travar_plano` (migração 0012)
 * devolve os campos de cobrança ao valor antigo sempre que `auth.uid()` não é
 * nulo. Ou seja, com o cliente de sessão o UPDATE "funciona" (sem erro) e não
 * muda nada — o pior tipo de bug, o silencioso.
 *
 * Nunca importe isto de Client Component: um `"use client"` no caminho leva a
 * chave mestra pro navegador.
 */
export function supabaseServico(): SupabaseClient {
  if (servicoSingleton) return servicoSingleton;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !chave) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY são obrigatórias pra " +
        "cobrança: o trigger da migração 0012 só deixa o plano mudar pela " +
        "chave de serviço.",
    );
  }

  servicoSingleton = createClient(url, chave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return servicoSingleton;
}

/* ------------------------------------------------------------ endereço --- */

/**
 * A base das URLs de volta do Checkout e do Portal.
 *
 * `NEXT_PUBLIC_SITE_URL` vem PRIMEIRO de propósito. O cabeçalho `Origin` é
 * escolhido por quem faz a requisição: sem a env, alguém poderia chamar a
 * rota com `Origin: https://site-do-golpe`, receber uma sessão de Checkout
 * legítima da nossa conta e devolver a pessoa, depois de pagar, numa página
 * controlada por ele. Com a env configurada, o destino é sempre nosso.
 */
export function enderecoBase(req: Request): string {
  const configurado = process.env.NEXT_PUBLIC_SITE_URL;
  if (configurado) return configurado.replace(/\/+$/, "");

  const origem = req.headers.get("origin");
  if (origem) return origem.replace(/\/+$/, "");

  throw new Error(
    "Não sei pra onde devolver a pessoa depois do pagamento. Configure " +
      "NEXT_PUBLIC_SITE_URL com o endereço público do site.",
  );
}

/* --------------------------------------------------------------- ciclo --- */

/**
 * O período vigente da assinatura.
 *
 * ATENÇÃO à mudança de API: `current_period_start`/`current_period_end` NÃO
 * ficam mais na assinatura — desde a versão 2025-03-31 eles vivem em cada
 * ITEM (`sub.items.data[].current_period_*`), porque uma assinatura pode ter
 * itens com faturamentos diferentes. Ler `sub.current_period_end` hoje devolve
 * `undefined`, e o ciclo iria pro banco como nulo sem nenhum erro aparecer.
 *
 * Vendemos um item por assinatura, então o primeiro item é o ciclo.
 */
export function cicloDaAssinatura(sub: Stripe.Subscription): {
  inicio: string | null;
  fim: string | null;
} {
  const item = sub.items?.data?.[0];
  if (!item) return { inicio: null, fim: null };
  return {
    inicio: new Date(item.current_period_start * 1000).toISOString(),
    fim: new Date(item.current_period_end * 1000).toISOString(),
  };
}

/** O price id contratado — de onde sai o plano. */
export function precoDaAssinatura(sub: Stripe.Subscription): string | null {
  return sub.items?.data?.[0]?.price?.id ?? null;
}

/* -------------------------------------------------------------- status --- */

/** O que a coluna `assinatura_status` aceita, segundo a migração 0012. */
export type StatusAssinatura = "ativa" | "cancelada" | "inadimplente";

/**
 * Traduz o status do Stripe pro vocabulário do banco.
 *
 * `trialing` conta como ativa (a pessoa tem o produto na mão). `incomplete`
 * conta como inadimplente, não como ativa: é a assinatura criada cujo primeiro
 * pagamento ainda não passou — liberar ali entregaria plano pago antes de
 * qualquer dinheiro entrar. Estado novo que o Stripe invente cai em cancelada,
 * o lado seguro.
 */
export function statusNoBanco(status: Stripe.Subscription.Status): StatusAssinatura {
  switch (status) {
    case "active":
    case "trialing":
      return "ativa";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "inadimplente";
    default:
      return "cancelada";
  }
}
