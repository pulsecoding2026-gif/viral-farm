import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Modulo } from "@/lib/modulos";
import { icone } from "./icones";

/**
 * Casca visual de um módulo ainda não implementado. Não finge que funciona:
 * diz o que o módulo vai fazer e aponta pro que já existe hoje, pra estrutura
 * do painel ficar navegável de ponta a ponta enquanto o backend não existe.
 */
export function ModuloPlaceholder({ modulo }: { modulo: Modulo }) {
  const Icone = icone(modulo.icone);

  return (
    <div>
      <header className="mb-8 flex items-start gap-4">
        <div
          className={
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white " +
            modulo.cor
          }
        >
          {/* `icone()` não cria componente: devolve referência estável de um
              mapa de módulo (ver icones.tsx), então não há remontagem — que é
              o que a regra existe pra evitar. */}
          {/* eslint-disable-next-line react-hooks/static-components */}
          <Icone size={26} weight="fill" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {modulo.rotulo}
            </h1>
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              Em construção
            </span>
          </div>
          <p className="mt-2 max-w-[62ch] text-base text-zinc-600 dark:text-zinc-400">
            {modulo.resumo}.
          </p>
        </div>
      </header>

      {modulo.recursos && modulo.recursos.length > 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/60 p-6 dark:border-zinc-800 dark:bg-zinc-900/30">
          <p className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            O que vem aqui
          </p>
          <ul className="space-y-2.5">
            {modulo.recursos.map((r) => (
              <li
                key={r}
                className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-400"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-zinc-500 dark:text-zinc-500">
          Enquanto isso, o que já funciona:
        </span>
        <Link
          href="/analisador"
          className="inline-flex items-center gap-1.5 font-medium text-orange-600 hover:underline dark:text-orange-500"
        >
          Analisador
          <ArrowRight size={15} weight="bold" />
        </Link>
        <Link
          href="/biblioteca"
          className="inline-flex items-center gap-1.5 font-medium text-orange-600 hover:underline dark:text-orange-500"
        >
          Biblioteca Viral
          <ArrowRight size={15} weight="bold" />
        </Link>
      </div>
    </div>
  );
}
