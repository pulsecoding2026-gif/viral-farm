import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Check,
  Confetti,
  Lightning,
  SealCheck,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { clienteSupabase } from "@/lib/supabase/servidor";
import { PLANOS_PAGOS, precoEmReais, type Plano } from "@/lib/planos/catalogo";
import { lerUso, type Uso } from "@/lib/planos/uso";
import { BotaoAssinar, BotaoGerenciar } from "./botoes-plano";

export const metadata: Metadata = { title: "Assinatura" };

/**
 * A assinatura vista de dentro do painel.
 *
 * A tela de planos do SITE vende pra quem não tem conta; esta responde outra
 * pergunta, de quem já está dentro: "quanto ainda me resta e o que eu ganho
 * se subir?". Por isso o uso vem PRIMEIRO e o preço depois — invertido em
 * relação ao site.
 *
 * Tudo que é número (plano, limite, quanto foi gasto) é renderizado no
 * servidor a partir de lerUso. Cliente só recebe os botões, então não existe
 * caminho em que a tela diga um limite e a API aplique outro.
 */

/** "12 de agosto de 2026" — a data que a barra de uso promete. */
function dataLonga(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;

  const supabase = await clienteSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // O layout do painel já barra quem não está logado; isto é só o cinto de
  // segurança pro caso de a página ser renderizada fora dele.
  if (!user) redirect("/entrar");

  /*
    Se a leitura do uso falhar (banco fora, tabela em migração), a página NÃO
    cai: os planos continuam à venda e só a barra de consumo some. Deixar o
    erro subir tiraria do ar justamente a tela onde a pessoa ia pagar.
  */
  const uso = await lerUso(supabase, user.id).catch(() => null);
  const planoAtual = uso?.assinatura.plano ?? null;
  const assina = planoAtual !== null && planoAtual.id !== "gratuito";

  return (
    <div className="surgir mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="fonte-titulo text-2xl font-semibold tracking-tight text-zinc-50">
          Assinatura
        </h1>
        {/* zinc-500 media 4,02:1 — abaixo do mínimo de 4,5:1. zinc-400 mede 7,58:1.
            Mesma correção repetida nesta tela onde o texto carrega informação
            (não em ícone nem em decoração). */}
        <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-zinc-400">
          Onde você está no ciclo de hoje e o que muda se você subir de plano.
        </p>
      </header>

      {/* Veio do checkout. A faixa é verde e some no primeiro recarregamento
          sem o ?ok=1 — é comemoração, não estado permanente. */}
      {ok === "1" && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-900/60 bg-emerald-950/30 p-4">
          <Confetti
            size={20}
            weight="fill"
            className="mt-0.5 shrink-0 text-emerald-400"
          />
          <div>
            <p className="text-sm font-semibold text-emerald-100">
              Pagamento confirmado. Bem-vindo!
            </p>
            <p className="mt-1 text-sm leading-relaxed text-emerald-200/80">
              Seu plano já está valendo — pode mandar a próxima análise. Se o
              limite abaixo ainda mostrar o número antigo, recarregue em alguns
              segundos: a confirmação do pagamento chega por webhook.
            </p>
          </div>
        </div>
      )}

      {uso ? <CartaoUso uso={uso} /> : <UsoIndisponivel />}

      <section>
        <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">
          {assina ? "Trocar de plano" : "Planos"}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Cada análise lê um vídeo inteiro e devolve vários cortes prontos.
          Cancele quando quiser.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {PLANOS_PAGOS.map((p) => (
            <CartaoPlano key={p.id} plano={p} atual={planoAtual?.id === p.id} />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------- o plano de hoje */

function CartaoUso({ uso }: { uso: Uso }) {
  const p = uso.assinatura.plano;
  const usadas = uso.analisesUsadas;
  const total = p.analisesMes;

  // Passar do limite é possível (plano rebaixado com uso já feito), então a
  // barra trava em 100% em vez de vazar pra fora do trilho.
  const pct = total > 0 ? Math.min(100, Math.round((usadas / total) * 100)) : 100;

  /*
    Duas cores, não três. Laranja é "seguindo o jogo"; âmbar entra a partir de
    80% e é o MESMO âmbar do aviso de limite — quem vê a barra amarelar aqui
    reconhece o cartão que aparece no formulário depois. Vermelho ficaria de
    fora de propósito: acabar a cota não é falha.
  */
  const apertado = uso.analisesRestantes === 0 || pct >= 80;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-zinc-400 uppercase">
            Seu plano
          </span>
          <h2 className="mt-1.5 flex items-center gap-2 text-xl font-semibold tracking-tight text-zinc-50">
            <SealCheck
              size={20}
              weight="fill"
              className={
                p.id === "gratuito" ? "text-zinc-600" : "text-orange-500"
              }
            />
            {p.nome}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">{p.resumo}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="text-sm text-zinc-400">
            {p.precoMensal === 0 ? (
              "Sem cobrança"
            ) : (
              <>
                <span className="font-semibold text-zinc-200">
                  {precoEmReais(p.precoMensal)}
                </span>
                {" /mês"}
              </>
            )}
          </span>
          {/* Só quem paga tem o que gerenciar no portal. */}
          {p.id !== "gratuito" && <BotaoGerenciar />}
        </div>
      </div>

      {/* ------------------------------------------------------ consumo */}
      <div className="mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-sm text-zinc-300">
            <span
              className={
                "text-lg font-semibold tabular-nums " +
                (apertado ? "text-amber-300" : "text-zinc-50")
              }
            >
              {usadas}
            </span>{" "}
            de <span className="tabular-nums">{total}</span> análises usadas
            neste ciclo
          </p>
          <p className="text-xs text-zinc-400">
            renova em{" "}
            <span className="text-zinc-300">{dataLonga(uso.renovaEm)}</span>
          </p>
        </div>

        <div
          role="progressbar"
          aria-valuenow={usadas}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Análises usadas neste ciclo"
          className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-800"
        >
          <div
            className={
              "h-full rounded-full transition-all " +
              (apertado ? "bg-amber-500" : "bg-orange-600")
            }
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="mt-2 text-xs text-zinc-400">
          {uso.analisesRestantes > 0 ? (
            <>
              Restam{" "}
              <span className="font-medium tabular-nums text-zinc-300">
                {uso.analisesRestantes}
              </span>{" "}
              — cada uma vale até {p.cortesMax} cortes, em vídeo de até{" "}
              {p.duracaoMaxMin} minutos.
            </>
          ) : (
            <span className="text-amber-300">
              Acabaram as análises deste ciclo. Mude de plano pra continuar
              agora, ou espere o contador zerar.
            </span>
          )}
        </p>
      </div>

      {/* O que o plano de hoje inclui, pra comparar com a grade de baixo. */}
      <ul className="mt-5 grid gap-2 border-t border-zinc-800 pt-5 sm:grid-cols-2">
        {p.recursos.map((r) => (
          <li key={r} className="flex items-start gap-2.5 text-sm">
            <Check
              size={14}
              weight="bold"
              className="mt-0.5 shrink-0 text-orange-500"
            />
            <span className="text-zinc-300">{r}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Sem o uso, a tela ainda vende — só não mente sobre o consumo. */
function UsoIndisponivel() {
  return (
    <section className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <WarningCircle size={20} className="mt-0.5 shrink-0 text-zinc-600" />
      <div>
        <p className="text-sm font-medium text-zinc-300">
          Não consegui ler o seu consumo agora
        </p>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">
          Recarregue em instantes. Sua assinatura não foi afetada — só este
          resumo não carregou.
        </p>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- grade de venda */

function CartaoPlano({ plano: p, atual }: { plano: Plano; atual: boolean }) {
  return (
    <div
      className={
        "relative flex flex-col rounded-2xl border p-6 " +
        (p.destaque
          ? "border-orange-900/60 bg-gradient-to-b from-orange-600/10 to-zinc-900/40"
          : "border-zinc-800 bg-zinc-900/30")
      }
    >
      {/* orange-600 (rosa da marca) com texto branco em 11px mede 3,39:1 —
          reprova o mínimo de 4,5:1. orange-700 mede 4,85:1 e passa; mesmo
          selo, um degrau mais escuro. */}
      {p.destaque && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-700 px-3 py-1 text-[11px] font-bold text-white">
          Mais popular
        </span>
      )}

      <h3 className="text-lg font-semibold tracking-tight text-zinc-50">
        {p.nome}
      </h3>
      <p className="mt-1.5 min-h-[2.5rem] text-sm leading-relaxed text-zinc-400">
        {p.resumo}
      </p>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tracking-tight tabular-nums text-zinc-50">
          {precoEmReais(p.precoMensal)}
        </span>
        <span className="text-sm text-zinc-400">/mês</span>
      </div>
      {/* zinc-600 media ~2,5:1 aqui — bem abaixo do mínimo. zinc-400 mede 7,58:1. */}
      <p className="mt-1 text-xs text-zinc-400">cancele a qualquer momento</p>

      <div
        className={
          "mt-5 flex items-center gap-2 rounded-xl px-3.5 py-2.5 " +
          (p.destaque ? "bg-orange-600/15" : "bg-zinc-800/60")
        }
      >
        <Lightning
          size={15}
          weight="fill"
          className={p.destaque ? "text-orange-400" : "text-zinc-500"}
        />
        <span className="text-sm tabular-nums text-zinc-200">
          {p.analisesMes} análises por mês
        </span>
      </div>

      <BotaoAssinar plano={p.id} atual={atual} />

      <ul className="mt-6 space-y-2.5 border-t border-zinc-800 pt-5">
        {p.recursos.map((r) => (
          <li key={r} className="flex items-start gap-2.5 text-sm">
            <Check
              size={14}
              weight="bold"
              className="mt-0.5 shrink-0 text-orange-500"
            />
            <span className="text-zinc-300">{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
