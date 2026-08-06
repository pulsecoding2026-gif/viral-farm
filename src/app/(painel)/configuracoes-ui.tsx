import type { ReactNode } from "react";
import Link from "next/link";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { SECAO_CONTA } from "@/lib/modulos";
import { icone } from "./icones";

/**
 * Peças compartilhadas das telas de conta.
 *
 * Os campos ficam DESABILITADOS de propósito: ainda não existe autenticação
 * nem backend de usuário neste projeto (ver "Pendências conhecidas" no
 * README). Um formulário que parece funcionar e não salva é pior do que um
 * formulário honestamente travado — então a tela mostra o desenho final e
 * diz, em cima, exatamente o que falta pra ele funcionar.
 */

export function AbasConta({ atual }: { atual: string }) {
  return (
    <div
      role="tablist"
      aria-label="Configurações"
      className="mb-8 flex gap-1 overflow-x-auto border-b border-zinc-800"
    >
      {SECAO_CONTA.modulos.map((m) => {
        const ativo = m.slug === atual;
        const Icone = icone(m.icone);
        return (
          <Link
            key={m.slug}
            href={"/" + m.slug}
            role="tab"
            aria-selected={ativo}
            className={
              "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition " +
              (ativo
                ? "border-orange-500 font-medium text-zinc-50"
                : "border-transparent text-zinc-500 hover:text-zinc-300")
            }
          >
            <Icone size={16} weight={ativo ? "fill" : "regular"} />
            {m.rotulo}
          </Link>
        );
      })}
    </div>
  );
}

export function AvisoSemAuth() {
  return (
    <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-900/60 bg-amber-950/25 p-4 text-sm text-amber-200/90">
      <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-amber-500" />
      <p className="max-w-[72ch]">
        Os campos estão travados porque o projeto ainda não tem login nem banco
        de usuários. O desenho da tela é o final — falta a autenticação por
        trás pra ela salvar de verdade.
      </p>
    </div>
  );
}

export function Bloco({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
      <h2 className="text-sm font-semibold text-zinc-200">{titulo}</h2>
      {descricao && <p className="mt-1 text-xs text-zinc-500">{descricao}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function Campo({
  id,
  rotulo,
  valor,
  tipo = "text",
  dica,
}: {
  id: string;
  rotulo: string;
  valor?: string;
  tipo?: string;
  dica?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-zinc-300">
        {rotulo}
      </label>
      <input
        id={id}
        type={tipo}
        defaultValue={valor}
        disabled
        className="w-full max-w-md cursor-not-allowed rounded-lg border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5 text-sm text-zinc-400 disabled:opacity-70"
      />
      {dica && <p className="mt-1.5 text-xs text-zinc-500">{dica}</p>}
    </div>
  );
}

export function Alternador({
  rotulo,
  descricao,
  ligado,
}: {
  rotulo: string;
  descricao: string;
  ligado?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-zinc-300">{rotulo}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{descricao}</p>
      </div>
      <span
        role="switch"
        aria-checked={Boolean(ligado)}
        aria-label={rotulo}
        aria-disabled="true"
        className={
          "mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 opacity-60 " +
          (ligado ? "justify-end bg-orange-600" : "justify-start bg-zinc-700")
        }
      >
        <span className="h-4 w-4 rounded-full bg-white" />
      </span>
    </div>
  );
}

export function BotaoSalvar({ rotulo = "Salvar" }: { rotulo?: string }) {
  return (
    <button
      type="button"
      disabled
      className="cursor-not-allowed rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-medium text-white opacity-40"
    >
      {rotulo}
    </button>
  );
}
