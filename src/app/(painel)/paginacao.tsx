"use client";

import { useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";

/**
 * Paginação compartilhada por Trends, Radar Viral e Lives.
 *
 * O prefixo `use` é exigência do React, não estilo: sem ele o
 * eslint-plugin-react-hooks não reconhece a função como hook e para de
 * verificar as regras dentro dela — uma chamada condicional passaria batido.
 * É a única exceção ao português no nome das funções.
 *
 * O ponto delicado é o reset: se o usuário está na página 5 e aperta um
 * filtro que deixa 3 resultados, sem reset ele vê uma lista vazia e conclui
 * que o filtro quebrou. Por isso o hook volta pra página 1 sempre que a
 * lista muda de identidade — o que só acontece quando os filtros mudam, já
 * que as listas de origem são memoizadas.
 */
export function usePaginacao<T>(lista: T[], porPaginaInicial = 24) {
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(porPaginaInicial);

  // Ajuste durante o render, não em efeito: é o padrão que o próprio React
  // recomenda pra "zerar estado quando uma entrada muda". Em useEffect, a
  // tela chegaria a pintar a página errada antes de corrigir — e cada troca
  // de filtro custaria duas renderizações.
  const [anterior, setAnterior] = useState<{ lista: T[]; porPagina: number }>({
    lista,
    porPagina,
  });
  if (anterior.lista !== lista || anterior.porPagina !== porPagina) {
    setAnterior({ lista, porPagina });
    setPagina(1);
  }

  const total = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const atual = Math.min(pagina, totalPaginas);
  const inicio = (atual - 1) * porPagina;
  const itens = lista.slice(inicio, inicio + porPagina);

  function irPara(n: number) {
    setPagina(Math.min(Math.max(1, n), totalPaginas));
    // Com 48 itens por página, trocar de página deixaria o usuário no rodapé
    // da lista nova. O contêiner rolável do app é o <main>.
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return {
    itens,
    pagina: atual,
    totalPaginas,
    total,
    porPagina,
    setPorPagina,
    irPara,
    primeiro: total === 0 ? 0 : inicio + 1,
    ultimo: Math.min(inicio + porPagina, total),
  };
}

/**
 * Janela de páginas em torno da atual, com elipse.
 * Sempre mostra a primeira e a última pra dar noção de tamanho.
 */
function janela(atual: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const paginas: (number | "…")[] = [1];
  const de = Math.max(2, atual - 1);
  const ate = Math.min(total - 1, atual + 1);

  if (de > 2) paginas.push("…");
  for (let i = de; i <= ate; i++) paginas.push(i);
  if (ate < total - 1) paginas.push("…");
  paginas.push(total);

  return paginas;
}

export function Paginacao({
  pagina,
  totalPaginas,
  total,
  primeiro,
  ultimo,
  porPagina,
  setPorPagina,
  irPara,
  opcoes = [12, 24, 48],
  rotulo = "itens",
}: {
  pagina: number;
  totalPaginas: number;
  total: number;
  primeiro: number;
  ultimo: number;
  porPagina: number;
  setPorPagina: (n: number) => void;
  irPara: (n: number) => void;
  opcoes?: number[];
  rotulo?: string;
}) {
  // Cabendo tudo numa página, a barra vira ruído — a contagem total já
  // aparece acima da lista em todas as telas que usam isto.
  if (totalPaginas <= 1) return null;

  const btn =
    "flex h-7 min-w-7 items-center justify-center rounded-lg border px-2 text-xs tabular-nums transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <nav
      aria-label="Paginação"
      className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4"
    >
      <p className="text-xs tabular-nums text-zinc-500">
        {primeiro}–{ultimo} de {total} {rotulo}
      </p>

      <div className="flex items-center gap-3">
        <label className="hidden items-center gap-1.5 text-xs text-zinc-600 sm:flex">
          Por página
          <select
            value={porPagina}
            onChange={(e) => setPorPagina(Number(e.target.value))}
            className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-xs text-zinc-300 outline-none transition focus:border-orange-600"
          >
            {opcoes.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => irPara(pagina - 1)}
            disabled={pagina === 1}
            aria-label="Página anterior"
            className={`${btn} border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100`}
          >
            <CaretLeft size={13} weight="bold" />
          </button>

          {janela(pagina, totalPaginas).map((p, i) =>
            p === "…" ? (
              <span
                key={`e${i}`}
                aria-hidden="true"
                className="px-1 text-xs text-zinc-700"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => irPara(p)}
                aria-current={p === pagina ? "page" : undefined}
                aria-label={`Página ${p}`}
                className={
                  btn +
                  " " +
                  (p === pagina
                    ? "border-orange-600 bg-orange-600 font-semibold text-white"
                    : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100")
                }
              >
                {p}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => irPara(pagina + 1)}
            disabled={pagina === totalPaginas}
            aria-label="Próxima página"
            className={`${btn} border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100`}
          >
            <CaretRight size={13} weight="bold" />
          </button>
        </div>
      </div>
    </nav>
  );
}
