"use client";

import { useState } from "react";
import {
  Check,
  CircleNotch,
  ClockCounterClockwise,
  CopySimple,
  Megaphone,
  MonitorPlay,
  Plus,
  Scroll,
  TextT,
  Timer,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { acharFormato, FORMATOS } from "@/lib/formatos";
import type {
  DadosRoteiro,
  EntradaRoteiro,
  ItemPlanejamento,
  Roteiro,
} from "@/lib/planejar/tipos";

const DURACOES = [15, 30, 45, 60, 90, 120];

const TONS: { valor: EntradaRoteiro["tom"]; rotulo: string }[] = [
  { valor: "educativo", rotulo: "Educativo" },
  { valor: "storytelling", rotulo: "História" },
  { valor: "polemico", rotulo: "Polêmico" },
  { valor: "vendas", rotulo: "Vendas" },
  { valor: "humor", rotulo: "Humor" },
];

function mmss(s: number): string {
  const m = Math.floor(s / 60);
  const seg = Math.round(s % 60);
  return `${String(m).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
}

/** A duração que o roteiro REALMENTE fecha — o fim do último bloco. */
function duracaoReal(r: Roteiro): number {
  return r.blocos.length > 0 ? r.blocos[r.blocos.length - 1].fim_s : 0;
}

/** Extrai o roteiro de uma linha do histórico, sem confiar cegamente. */
function roteiroDe(item: ItemPlanejamento): Roteiro | null {
  const d = item.dados as Partial<DadosRoteiro> | null;
  return d?.roteiro && Array.isArray(d.roteiro.blocos) ? d.roteiro : null;
}

function quando(ms: number): string {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.round(h / 24)}d`;
}

/** O roteiro em texto puro, legível em qualquer lugar que aceite colar. */
function textoDoRoteiro(r: Roteiro): string {
  const linhas: string[] = [
    r.titulo,
    `Formato: ${acharFormato(r.formato).nome} · ${duracaoReal(r)}s`,
    "",
    `GANCHO: ${r.gancho_falado}`,
  ];
  if (r.titulo_tela) linhas.push(`TÍTULO NA TELA: ${r.titulo_tela}`);
  linhas.push("");
  for (const b of r.blocos) {
    linhas.push(`${mmss(b.inicio_s)}–${mmss(b.fim_s)}  ${b.fala}`);
    if (b.na_tela) linhas.push(`              [na tela] ${b.na_tela}`);
  }
  if (r.cta) linhas.push("", `CTA: ${r.cta}`);
  if (r.hashtags.length > 0) {
    linhas.push("", r.hashtags.map((h) => `#${h}`).join(" "));
  }
  return linhas.join("\n");
}

export function GeradorRoteiro({
  historicoInicial,
}: {
  historicoInicial: ItemPlanejamento[];
}) {
  // ------------------------------------------------------------- formulário
  const [tema, setTema] = useState("");
  const [duracao, setDuracao] = useState(45);
  const [tom, setTom] = useState<EntradaRoteiro["tom"]>("educativo");
  const [formato, setFormato] = useState("auto");
  const [refAberta, setRefAberta] = useState(false);
  const [referencia, setReferencia] = useState("");
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // -------------------------------------------------- resultado + histórico
  const [itens, setItens] = useState(historicoInicial);
  const [atual, setAtual] = useState<{
    id: string | null;
    roteiro: Roteiro;
  } | null>(null);

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setGerando(true);

    // "Automático" não vai no corpo: a rota entende ausência como "IA escolhe".
    const corpo: EntradaRoteiro = {
      tema: tema.trim(),
      duracao_s: duracao,
      tom,
      ...(formato !== "auto" ? { formato } : {}),
      ...(referencia.trim() ? { referencia: referencia.trim() } : {}),
    };

    try {
      const res = await fetch("/api/planejar/roteiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const dados = await res.json();
      if (!res.ok) {
        setErro(dados.erro ?? "Não consegui gerar o roteiro.");
        return;
      }

      setAtual({ id: dados.id, roteiro: dados.roteiro });
      // Entra no topo do histórico sem esperar outro fetch — o servidor já
      // guardou; a lista local só espelha o que acabou de acontecer.
      const item: ItemPlanejamento = {
        id: dados.id,
        tipo: "roteiro",
        titulo: dados.roteiro.titulo,
        dados: { entrada: corpo, roteiro: dados.roteiro },
        criado_em: Date.now(),
        atualizado_em: Date.now(),
      };
      setItens((prev) => [item, ...prev.filter((i) => i.id !== dados.id)]);
    } catch {
      setErro("Falha de rede. Confira sua conexão.");
    } finally {
      setGerando(false);
    }
  }

  function abrir(item: ItemPlanejamento) {
    const roteiro = roteiroDe(item);
    if (roteiro) setAtual({ id: item.id, roteiro });
  }

  async function apagar(id: string) {
    // Some da tela na hora; o DELETE corre atrás. Se falhar, o pior caso é o
    // item reaparecer no próximo carregamento — melhor que a lista travada.
    setItens((prev) => prev.filter((i) => i.id !== id));
    if (atual?.id === id) setAtual(null);
    try {
      await fetch(`/api/planejar/${id}`, { method: "DELETE" });
    } catch {
      /* a remoção visual já aconteceu; o histórico real reconta no reload */
    }
  }

  return (
    <div className="surgir space-y-6">
      {/* ------------------------------------------------------ formulário */}
      <form onSubmit={gerar}>
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <div className="border-b border-zinc-800 bg-gradient-to-br from-orange-600/12 via-transparent to-transparent px-5 py-5 sm:px-6">
            <label
              htmlFor="tema"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Sobre o que é o vídeo
            </label>
            <textarea
              id="tema"
              required
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Ex.: por que 90% dos canais pequenos desistem no terceiro mês"
              className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15"
            />
          </div>

          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="duracao"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Duração alvo
                </label>
                <select
                  id="duracao"
                  value={duracao}
                  onChange={(e) => setDuracao(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-orange-600"
                >
                  {DURACOES.map((d) => (
                    <option key={d} value={d}>
                      {d} segundos
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="tom"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Tom
                </label>
                <select
                  id="tom"
                  value={tom}
                  onChange={(e) =>
                    setTom(e.target.value as EntradaRoteiro["tom"])
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-orange-600"
                >
                  {TONS.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.rotulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="formato"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Formato
                </label>
                <select
                  id="formato"
                  value={formato}
                  onChange={(e) => setFormato(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/40 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-orange-600"
                >
                  <option value="auto">Automático (IA escolhe)</option>
                  {FORMATOS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Referência colapsada: quem tem uma inspiração abre; quem não
                tem nem vê o campo pedindo pra ser preenchido. */}
            {refAberta ? (
              <div>
                <label
                  htmlFor="referencia"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Referência{" "}
                  <span className="font-normal text-zinc-600">— opcional</span>
                </label>
                <textarea
                  id="referencia"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  maxLength={4000}
                  rows={3}
                  placeholder="Cole um link, um roteiro que funcionou ou um trecho pra IA se inspirar"
                  className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setRefAberta(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-300"
              >
                <Plus size={13} weight="bold" />
                adicionar referência
              </button>
            )}
          </div>

          <div className="border-t border-zinc-800 px-5 py-4 sm:px-6">
            <button
              type="submit"
              disabled={gerando || tema.trim().length < 3}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_2px_16px_rgb(255_62_2/0.35)] transition hover:bg-orange-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:w-auto"
            >
              {gerando ? (
                <>
                  <CircleNotch size={17} className="animate-spin" />
                  Escrevendo roteiro…
                </>
              ) : (
                <>
                  <Scroll size={17} weight="bold" />
                  Gerar roteiro
                </>
              )}
            </button>
            {gerando && (
              <p className="mt-3 text-xs leading-relaxed text-zinc-600">
                A IA escreve o roteiro inteiro de uma vez — costuma levar de 15
                a 60 segundos.
              </p>
            )}
          </div>
        </div>

        {erro && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-300">
            <WarningCircle
              size={18}
              weight="fill"
              className="mt-0.5 shrink-0 text-rose-500"
            />
            <p>{erro}</p>
          </div>
        )}
      </form>

      {/* ------------------------------------------------------- resultado */}
      {atual && <VisualizadorRoteiro key={atual.id} roteiro={atual.roteiro} />}

      {/* ------------------------------------------------------- histórico */}
      {itens.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-400">
            <ClockCounterClockwise size={15} className="text-zinc-600" />
            Roteiros anteriores
          </h2>
          <ul className="space-y-2">
            {itens.map((item) => {
              const ativo = item.id === atual?.id;
              return (
                <li
                  key={item.id}
                  className={
                    "group flex items-center gap-1 rounded-xl border pr-2 transition " +
                    (ativo
                      ? "border-orange-900/70 bg-orange-950/20"
                      : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60")
                  }
                >
                  <button
                    type="button"
                    onClick={() => abrir(item)}
                    aria-current={ativo ? "true" : undefined}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                  >
                    <Scroll size={16} className="shrink-0 text-zinc-600" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">
                      {item.titulo || "Roteiro sem título"}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-600">
                      {quando(item.criado_em)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => apagar(item.id)}
                    aria-label="Apagar roteiro"
                    className="shrink-0 rounded-lg p-2 text-zinc-700 opacity-0 transition group-hover:opacity-100 hover:bg-white/[0.06] hover:text-rose-400 focus-visible:opacity-100"
                  >
                    <Trash size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ visualizador */

function VisualizadorRoteiro({ roteiro }: { roteiro: Roteiro }) {
  const [copiado, setCopiado] = useState(false);
  const [tagCopiada, setTagCopiada] = useState<string | null>(null);
  const formato = acharFormato(roteiro.formato);
  const dur = duracaoReal(roteiro);

  function copiarTudo() {
    navigator.clipboard.writeText(textoDoRoteiro(roteiro)).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  function copiarTag(tag: string) {
    navigator.clipboard.writeText(`#${tag}`).then(() => {
      setTagCopiada(tag);
      setTimeout(() => setTagCopiada((t) => (t === tag ? null : t)), 2000);
    });
  }

  return (
    <article className="surgir overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
      {/* ------------------------------------------------------- cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-50">
            {roteiro.titulo}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-orange-600/15 px-2 py-0.5 text-[11px] font-bold tracking-wide text-orange-400 uppercase">
              {formato.nome}
            </span>
            <span className="flex items-center gap-1 font-mono text-xs tabular-nums text-zinc-500">
              <Timer size={13} />
              {dur}s
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={copiarTudo}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-white/5"
        >
          {copiado ? (
            <>
              <Check size={14} weight="bold" className="text-emerald-500" />
              copiado!
            </>
          ) : (
            <>
              <CopySimple size={14} />
              Copiar roteiro
            </>
          )}
        </button>
      </header>

      <div className="space-y-6 px-5 py-5 sm:px-6">
        {/* --------------------------------------------------------- gancho */}
        <div className="rounded-xl border border-orange-700/60 bg-orange-950/20 p-4">
          <p className="text-[10px] font-bold tracking-widest text-orange-400 uppercase">
            Gancho — os 3 primeiros segundos
          </p>
          <p className="mt-1.5 text-base leading-relaxed font-medium text-zinc-100">
            {roteiro.gancho_falado}
          </p>
          {roteiro.titulo_tela && (
            <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-[11px] font-bold text-black">
              <TextT size={11} weight="bold" />
              {roteiro.titulo_tela}
            </p>
          )}
        </div>

        {/* --------------------------------------------- linha do tempo */}
        <ol>
          {roteiro.blocos.map((b, i) => {
            const ultimo = i === roteiro.blocos.length - 1;
            return (
              <li key={i} className="flex gap-4">
                <span className="w-[5.75rem] shrink-0 pt-0.5 text-right font-mono text-[11px] tabular-nums text-zinc-500">
                  {mmss(b.inicio_s)}–{mmss(b.fim_s)}
                </span>
                <div
                  className={
                    "relative flex-1 border-l border-zinc-800 pl-4 " +
                    (ultimo ? "pb-0" : "pb-5")
                  }
                >
                  <span className="absolute top-1.5 -left-[3.5px] h-1.5 w-1.5 rounded-full bg-orange-600" />
                  <p className="text-sm leading-relaxed text-zinc-200">
                    {b.fala}
                  </p>
                  {b.na_tela && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-zinc-500">
                      <MonitorPlay size={13} className="mt-0.5 shrink-0" />
                      {b.na_tela}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {/* ------------------------------------------------ cta + hashtags */}
        {roteiro.cta && (
          <div className="flex items-start gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <Megaphone size={16} className="mt-0.5 shrink-0 text-orange-500" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                Chamada pra ação
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-200">
                {roteiro.cta}
              </p>
            </div>
          </div>
        )}

        {roteiro.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {roteiro.hashtags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => copiarTag(tag)}
                title="Copiar hashtag"
                className="flex items-center gap-1 rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-orange-600 hover:text-orange-400 active:scale-95"
              >
                {tagCopiada === tag ? (
                  <>
                    <Check size={11} weight="bold" className="text-emerald-500" />
                    copiada!
                  </>
                ) : (
                  <>#{tag}</>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
