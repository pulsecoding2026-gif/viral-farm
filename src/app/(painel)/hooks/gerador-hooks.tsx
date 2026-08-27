"use client";

import { useRef, useState } from "react";
import {
  Check,
  ClockCounterClockwise,
  Copy,
  CopySimple,
  Lightning,
  SpinnerGap,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import type {
  DadosHooks,
  EstiloDeHook,
  Hook,
  ItemPlanejamento,
} from "@/lib/planejar/tipos";

/**
 * Cada estilo tem uma cor fixa: quem usa o gerador toda semana aprende a ler
 * a grade de relance — "muito rosa, tá polêmico demais". Fundo translúcido a
 * 15% + texto na variante clara, o padrão de badge da casa.
 */
const COR_DO_ESTILO: Record<EstiloDeHook, string> = {
  curiosidade: "bg-amber-500/15 text-amber-300",
  numero: "bg-blue-500/15 text-blue-300",
  polemica: "bg-pink-500/15 text-pink-300",
  historia: "bg-purple-500/15 text-purple-300",
  erro: "bg-red-500/15 text-red-300",
  autoridade: "bg-green-500/15 text-green-300",
  pergunta: "bg-cyan-500/15 text-cyan-300",
  contraste: "bg-orange-500/15 text-orange-300",
};

const QUANTIDADES = [6, 8, 10, 12];

/** Uma geração aberta na tela — recém-criada ou reaberta do histórico. */
type Geracao = {
  id: string;
  titulo: string;
  hooks: Hook[];
};

function dataCurta(ms: number): string {
  return new Date(ms).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/** O histórico guarda os três tipos no mesmo formato; só hooks nos servem. */
function hooksDoItem(item: ItemPlanejamento): Hook[] {
  const dados = item.dados as Partial<DadosHooks>;
  return Array.isArray(dados.hooks) ? dados.hooks : [];
}

/* ------------------------------------------------------------------ cartão */

function CartaoHook({ hook }: { hook: Hook }) {
  const [copiado, setCopiado] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function copiar() {
    navigator.clipboard.writeText(hook.texto).catch(() => {});
    setCopiado(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <span
          className={
            "rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase " +
            COR_DO_ESTILO[hook.estilo]
          }
        >
          {hook.estilo}
        </span>
        <button
          type="button"
          onClick={copiar}
          aria-label={copiado ? "Copiado" : "Copiar hook"}
          className={
            "flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition " +
            (copiado
              ? "text-emerald-400"
              : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200")
          }
        >
          {copiado ? (
            <>
              <Check size={14} weight="bold" />
              copiado
            </>
          ) : (
            <Copy size={14} />
          )}
        </button>
      </div>

      {/* O texto é a estrela: é ele que a pessoa fala na frente da câmera. */}
      <p className="mt-3 text-base leading-snug font-semibold text-zinc-100">
        {hook.texto}
      </p>

      {hook.por_que_funciona && (
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          {hook.por_que_funciona}
        </p>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- gerador */

export function GeradorHooks({
  historicoInicial,
  temaInicial = "",
}: {
  historicoInicial: ItemPlanejamento[];
  /** Vem do Trends: clicar num termo em alta chega aqui com o campo pronto. */
  temaInicial?: string;
}) {
  const [tema, setTema] = useState(temaInicial);
  const [nicho, setNicho] = useState("");
  const [quantidade, setQuantidade] = useState(8);

  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [geracao, setGeracao] = useState<Geracao | null>(null);
  const [historico, setHistorico] = useState(historicoInicial);

  const [copiadoTodos, setCopiadoTodos] = useState(false);
  const timerTodos = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setGerando(true);

    try {
      const res = await fetch("/api/planejar/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tema,
          ...(nicho.trim() ? { nicho: nicho.trim() } : {}),
          quantidade,
        }),
      });
      const dados = await res.json();
      if (!res.ok) {
        setErro(dados.erro ?? "Não consegui gerar os hooks.");
        return;
      }

      const titulo = tema.trim().slice(0, 60);
      setGeracao({ id: dados.id, titulo, hooks: dados.hooks });
      // Espelha localmente o que a rota acabou de salvar — sem refetch.
      setHistorico((h) => [
        {
          id: dados.id,
          tipo: "hooks",
          titulo,
          dados: {
            entrada: {
              tema: tema.trim(),
              ...(nicho.trim() ? { nicho: nicho.trim() } : {}),
              quantidade,
            },
            hooks: dados.hooks,
          },
          criado_em: Date.now(),
          atualizado_em: Date.now(),
        },
        ...h,
      ]);
    } catch {
      setErro("Falha de rede. Confira sua conexão.");
    } finally {
      setGerando(false);
    }
  }

  function copiarTodos() {
    if (!geracao) return;
    const texto = geracao.hooks
      .map((h) => `[${h.estilo}] ${h.texto}`)
      .join("\n");
    navigator.clipboard.writeText(texto).catch(() => {});
    setCopiadoTodos(true);
    if (timerTodos.current) clearTimeout(timerTodos.current);
    timerTodos.current = setTimeout(() => setCopiadoTodos(false), 2000);
  }

  function reabrir(item: ItemPlanejamento) {
    setErro(null);
    setGeracao({ id: item.id, titulo: item.titulo, hooks: hooksDoItem(item) });
  }

  async function apagar(id: string) {
    // Otimista: some da lista já; se a rede falhar, o refresh traz de volta.
    setHistorico((h) => h.filter((i) => i.id !== id));
    if (geracao?.id === id) setGeracao(null);
    await fetch(`/api/planejar/${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <div className="surgir mx-auto max-w-4xl space-y-8">
      {/* ------------------------------------------------------- cabeçalho */}
      <header>
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-zinc-100">
          <Lightning size={24} weight="fill" className="text-amber-400" />
          Hooks
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Os primeiros segundos que seguram o dedo — variações de abertura pro
          mesmo tema, cada uma com o porquê.
        </p>
      </header>

      {/* -------------------------------------------------- barra do tema */}
      <form onSubmit={gerar}>
        <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-2 sm:flex-row sm:items-center">
          <input
            type="text"
            required
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            maxLength={500}
            placeholder="Sobre o que é o vídeo?"
            aria-label="Tema do vídeo"
            className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-600"
          />
          <input
            type="text"
            value={nicho}
            onChange={(e) => setNicho(e.target.value)}
            maxLength={200}
            placeholder="nicho do canal — opcional"
            aria-label="Nicho do canal"
            className="min-w-0 rounded-xl border border-transparent bg-transparent px-3 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-600 sm:w-52"
          />
          <select
            value={quantidade}
            onChange={(e) => setQuantidade(Number(e.target.value))}
            aria-label="Quantidade de hooks"
            className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-orange-600"
          >
            {QUANTIDADES.map((n) => (
              <option key={n} value={n}>
                {n} hooks
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={gerando}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_16px_rgb(199_58_125/0.35)] transition hover:bg-orange-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {gerando ? (
              <>
                <SpinnerGap size={16} className="animate-spin" />
                Gerando…
              </>
            ) : (
              <>
                <Lightning size={16} weight="fill" />
                Gerar hooks
              </>
            )}
          </button>
        </div>
        {/* A IA leva de 10 a 40s; sem este aviso, o spinner parece travado. */}
        {gerando && (
          <p className="mt-2 text-xs text-zinc-600">
            Escrevendo {quantidade} aberturas — costuma levar até 40 segundos.
          </p>
        )}
      </form>

      {erro && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-300">
          <WarningCircle
            size={18}
            weight="fill"
            className="mt-0.5 shrink-0 text-rose-500"
          />
          <p>{erro}</p>
        </div>
      )}

      {/* -------------------------------------------------------- resultado */}
      {geracao && (
        <section className="surgir space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 truncate text-sm font-semibold text-zinc-200">
              {geracao.titulo}
            </h2>
            <button
              type="button"
              onClick={copiarTodos}
              className={
                "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition " +
                (copiadoTodos
                  ? "border-emerald-900/60 text-emerald-400"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200")
              }
            >
              {copiadoTodos ? (
                <>
                  <Check size={14} weight="bold" />
                  copiado
                </>
              ) : (
                <>
                  <CopySimple size={14} />
                  Copiar todos
                </>
              )}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {geracao.hooks.map((hook, i) => (
              <CartaoHook key={geracao.id + i} hook={hook} />
            ))}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------- histórico */}
      {historico.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
            <ClockCounterClockwise size={16} className="text-zinc-600" />
            Gerações anteriores
          </h2>
          <ul className="space-y-2">
            {historico.map((item) => {
              const ativo = item.id === geracao?.id;
              const qtd = hooksDoItem(item).length;
              return (
                <li key={item.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => reabrir(item)}
                    aria-current={ativo ? "true" : undefined}
                    className={
                      "flex min-w-0 flex-1 items-center gap-3 rounded-xl border px-4 py-3 text-left transition " +
                      (ativo
                        ? "border-orange-900/70 bg-orange-950/20"
                        : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60")
                    }
                  >
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">
                      {item.titulo || "Sem tema"}
                    </p>
                    <span className="shrink-0 text-xs text-zinc-600">
                      {qtd} hooks
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-600">
                      {dataCurta(item.criado_em)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => apagar(item.id)}
                    aria-label={`Apagar geração "${item.titulo}"`}
                    className="shrink-0 rounded-lg p-2 text-zinc-600 transition hover:bg-rose-950/40 hover:text-rose-400"
                  >
                    <Trash size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Estado vazio de verdade: sem resultado E sem histórico. */}
      {!geracao && historico.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 px-6 py-16 text-center">
          <Lightning size={28} className="text-zinc-700" />
          <p className="mt-4 text-sm font-medium text-zinc-300">
            Nenhum hook ainda
          </p>
          <p className="mt-1 max-w-[42ch] text-sm text-zinc-500">
            Escreva o tema do vídeo ali em cima e receba {quantidade} jeitos
            diferentes de começar.
          </p>
        </div>
      )}
    </div>
  );
}
