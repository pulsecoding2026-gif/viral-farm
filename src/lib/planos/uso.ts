import type { SupabaseClient } from "@supabase/supabase-js";
import { acharPlano, type Plano } from "./catalogo";

/**
 * Quanto a pessoa já usou do plano, e o que ela ainda pode fazer.
 *
 * Este arquivo é o PORTÃO. Toda operação que custa CPU ou token de IA
 * passa por aqui antes de existir — se o limite não for checado antes de
 * enfileirar, o trabalho já foi gasto quando alguém perceber.
 */

export type Assinatura = {
  plano: Plano;
  status: string;
  /** Começo do período vigente. Nulo em conta que nunca assinou. */
  cicloInicio: Date | null;
  cicloFim: Date | null;
};

export type Uso = {
  assinatura: Assinatura;
  analisesUsadas: number;
  analisesRestantes: number;
  /** Quando o contador zera. */
  renovaEm: Date;
};

/**
 * O começo do ciclo de quem NÃO assina.
 *
 * Conta gratuita não tem data de cobrança, então o ciclo é o mês
 * calendário — previsível pra pessoa ("zera dia 1º") e sem estado extra
 * pra guardar.
 */
function inicioDoMes(): Date {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), 1);
}

function fimDoMes(): Date {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
}

export async function lerAssinatura(
  sb: SupabaseClient,
  userId: string,
): Promise<Assinatura> {
  /**
   * `select("*")` e não a lista de colunas.
   *
   * Nomear as colunas faz o PostgREST recusar a consulta INTEIRA enquanto a
   * migração de assinatura não rodou — e o erro não vem como exceção aqui,
   * vem como `data` nulo, que silenciosamente rebaixa todo mundo pro
   * gratuito. Com `*` a leitura funciona antes e depois da migração: o que
   * ainda não existe simplesmente chega indefinido, e o código já trata.
   */
  const { data } = await sb
    .from("perfis")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  /**
   * Assinatura vencida vale como gratuito, mesmo com `plano` ainda gravado.
   *
   * Entre o cancelamento e o webhook chegar existe uma janela; e um webhook
   * perdido deixaria o plano pago valendo pra sempre. Conferir a data aqui
   * fecha as duas portas sem depender de o Stripe avisar na hora.
   */
  const fim = data?.ciclo_fim ? new Date(data.ciclo_fim as string) : null;
  const vencida = fim !== null && fim.getTime() < Date.now();
  const status = (data?.assinatura_status as string) ?? "nenhuma";
  const plano = (data?.plano as string) ?? "gratuito";

  /**
   * Plano pago SEM assinatura no Stripe é concessão manual — e vale.
   *
   * É o caso da conta do dono, do beta fechado e da cortesia de suporte:
   * alguém com acesso de serviço gravou o plano direto, sem passar por
   * cobrança. Exigir `status = 'ativa'` pra todo mundo tornaria isso
   * impossível e obrigaria a inventar uma assinatura falsa no Stripe só
   * pra liberar a própria conta.
   *
   * Não é buraco de segurança porque quem grava `plano` é só a chave de
   * serviço: o trigger `perfis_travar_plano` (migração 0012) reverte
   * qualquer tentativa vinda de sessão de usuário. É ESSE trigger que
   * sustenta a regra — sem ele aplicado, o campo fica editável pelo
   * cliente, que é o motivo de a migração ser obrigatória antes de abrir
   * cadastro público.
   */
  const concedido = plano !== "gratuito" && status === "nenhuma" && fim === null;
  const ativa = (status === "ativa" && !vencida) || concedido;

  return {
    plano: acharPlano(ativa ? plano : "gratuito"),
    status,
    cicloInicio: data?.ciclo_inicio ? new Date(data.ciclo_inicio as string) : null,
    cicloFim: fim,
  };
}

/**
 * Análises criadas no ciclo vigente.
 *
 * Conta TODAS, inclusive as que falharam ou foram canceladas. É deliberado:
 * análise que falhou já consumiu download, transcrição e provavelmente a
 * chamada de IA — o custo aconteceu. Não cobrar por ela abriria o caminho
 * de cancelar tudo no fim e refazer pra sempre.
 */
export async function contarAnalisesDoCiclo(
  sb: SupabaseClient,
  desde: Date,
): Promise<number> {
  const { count, error } = await sb
    .from("analises")
    .select("id", { count: "exact", head: true })
    .gte("criado_em", desde.toISOString());

  if (error) throw new Error(`Não contei o uso: ${error.message}`);
  return count ?? 0;
}

export async function lerUso(
  sb: SupabaseClient,
  userId: string,
): Promise<Uso> {
  const assinatura = await lerAssinatura(sb, userId);
  const ativa = assinatura.plano.id !== "gratuito";

  const desde = ativa && assinatura.cicloInicio ? assinatura.cicloInicio : inicioDoMes();
  const renovaEm = ativa && assinatura.cicloFim ? assinatura.cicloFim : fimDoMes();

  const usadas = await contarAnalisesDoCiclo(sb, desde);
  return {
    assinatura,
    analisesUsadas: usadas,
    analisesRestantes: Math.max(0, assinatura.plano.analisesMes - usadas),
    renovaEm,
  };
}

/* ---------------------------------------------------------------- portão */

export type Veredito =
  | { pode: true; uso: Uso }
  | { pode: false; motivo: string; codigo: MotivoBloqueio; uso: Uso };

export type MotivoBloqueio = "sem_analises" | "cortes_demais" | "video_longo";

/** Data em pt-BR curta, pra mensagem de bloqueio. */
function dia(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

/**
 * Decide se a análise pode ser criada.
 *
 * A mensagem de recusa é sempre CONCRETA: quantas foram usadas, quando
 * renova, e qual plano resolve. "Limite atingido" sozinho deixa a pessoa
 * sem saber se espera ou se paga.
 */
export async function podeCriarAnalise(
  sb: SupabaseClient,
  userId: string,
  pedido: { qtdCortes: number; duracaoSegundos?: number },
): Promise<Veredito> {
  const uso = await lerUso(sb, userId);
  const p = uso.assinatura.plano;

  if (uso.analisesRestantes <= 0) {
    return {
      pode: false,
      codigo: "sem_analises",
      uso,
      motivo:
        `Você usou as ${p.analisesMes} análises do plano ${p.nome} neste ciclo. ` +
        `O contador zera em ${dia(uso.renovaEm)} — ou mude de plano pra continuar agora.`,
    };
  }

  if (pedido.qtdCortes > p.cortesMax) {
    return {
      pode: false,
      codigo: "cortes_demais",
      uso,
      motivo:
        `O plano ${p.nome} permite até ${p.cortesMax} cortes por análise. ` +
        `Reduza a quantidade ou mude de plano.`,
    };
  }

  const limiteSegundos = p.duracaoMaxMin * 60;
  if (pedido.duracaoSegundos && pedido.duracaoSegundos > limiteSegundos) {
    const min = Math.round(pedido.duracaoSegundos / 60);
    return {
      pode: false,
      codigo: "video_longo",
      uso,
      motivo:
        `Este vídeo tem ${min} minutos e o plano ${p.nome} vai até ` +
        `${p.duracaoMaxMin}. Escolha um vídeo menor ou mude de plano.`,
    };
  }

  return { pode: true, uso };
}
