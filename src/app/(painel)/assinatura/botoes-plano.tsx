"use client";

import { useState } from "react";
import {
  ArrowSquareOut,
  Check,
  CreditCard,
  Gear,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { PLANOS, type IdPlano } from "@/lib/planos/catalogo";

/**
 * Os botões que levam ao dinheiro.
 *
 * Toda a tela de assinatura é servidor menos isto: o checkout precisa de
 * clique, estado de espera e um lugar pra mostrar a recusa. Manter só os
 * botões como cliente deixa preço, limite e uso renderizados no servidor,
 * onde não dá pra adulterar pelo devtools.
 *
 * As duas rotas devolvem a MESMA forma — {url} pra onde ir, {erro} pra
 * mostrar —, então quem fala com elas é uma função só.
 */

async function pedirUrl(rota: string, corpo: Record<string, unknown>) {
  const res = await fetch(rota, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });

  /*
    `json()` cru quebraria aqui: rota que ainda não existe devolve a página
    404 do Next em HTML, e o erro de parse apareceria como "Unexpected token
    <" — mensagem que não ajuda ninguém. Sem corpo legível, o status vira a
    mensagem.
  */
  const dados = (await res.json().catch(() => null)) as {
    url?: string;
    erro?: string;
  } | null;

  if (!res.ok) {
    throw new Error(
      dados?.erro ??
        `A cobrança respondeu ${res.status}. Tente de novo em instantes.`,
    );
  }
  if (!dados?.url) {
    throw new Error("A cobrança não devolveu o endereço do checkout.");
  }

  return dados.url;
}

/** O aviso de recusa, igual nos dois botões. */
function Erro({ texto }: { texto: string }) {
  return (
    <p
      role="alert"
      className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-rose-400"
    >
      <WarningCircle size={13} weight="fill" className="mt-0.5 shrink-0" />
      {texto}
    </p>
  );
}

/* ---------------------------------------------------------------- assinar */

export function BotaoAssinar({
  plano,
  atual,
}: {
  plano: IdPlano;
  /** É o plano que a pessoa já paga — vira rótulo morto, não botão. */
  atual: boolean;
}) {
  const [indo, setIndo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // O destaque sai do catálogo, não de uma prop: a fonte do "mais popular"
  // é a mesma que a do preço, então não tem como as duas discordarem.
  const destaque = PLANOS[plano]?.destaque === true;

  async function assinar() {
    setErro(null);
    setIndo(true);
    try {
      window.location.href = await pedirUrl("/api/cobranca/checkout", { plano });
      /*
        Nada de `setIndo(false)` no sucesso: a navegação pro Stripe leva
        alguns segundos e o botão voltaria a dizer "Assinar" com a página
        já saindo — convite pro segundo clique e pra duas sessões abertas.
        O spinner some quando a página troca.
      */
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui abrir o checkout.");
      setIndo(false);
    }
  }

  if (atual) {
    return (
      <button
        type="button"
        disabled
        className="mt-5 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-2.5 text-sm font-semibold text-emerald-300"
      >
        <Check size={15} weight="bold" />
        Plano atual
      </button>
    );
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={assinar}
        disabled={indo}
        className={
          "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 " +
          (destaque
            ? "bg-orange-600 text-white shadow-[0_2px_16px_rgb(255_62_2/0.35)] hover:bg-orange-500 disabled:shadow-none"
            : "border border-zinc-700 text-zinc-100 hover:border-zinc-600 hover:bg-white/[0.04]")
        }
      >
        {indo ? (
          <>
            <SpinnerGap size={16} className="animate-spin" />
            Abrindo checkout…
          </>
        ) : (
          <>
            <CreditCard size={16} weight="fill" />
            Assinar
          </>
        )}
      </button>
      {erro && <Erro texto={erro} />}
    </div>
  );
}

/* -------------------------------------------------------------- gerenciar */

/**
 * O portal do Stripe — trocar cartão, ver faturas, cancelar.
 *
 * Só aparece pra quem já assina: quem está no gratuito não tem nada pra
 * gerenciar, e o portal responderia com erro de cliente inexistente.
 */
export function BotaoGerenciar() {
  const [indo, setIndo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function gerenciar() {
    setErro(null);
    setIndo(true);
    try {
      window.location.href = await pedirUrl("/api/cobranca/portal", {});
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui abrir o portal.");
      setIndo(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={gerenciar}
        disabled={indo}
        className="flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-white/[0.04] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
      >
        {indo ? (
          <>
            <SpinnerGap size={15} className="animate-spin" />
            Abrindo portal…
          </>
        ) : (
          <>
            <Gear size={15} />
            Gerenciar assinatura
            <ArrowSquareOut size={13} className="text-zinc-500" />
          </>
        )}
      </button>
      {erro && <Erro texto={erro} />}
    </div>
  );
}
