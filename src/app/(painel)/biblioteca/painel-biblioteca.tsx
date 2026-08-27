"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookmarkSimple,
  MagnifyingGlass,
  Target,
  Plus,
  Trash,
  NotePencil,
  Check,
  X,
  Scroll,
  Broadcast,
  FilmSlate,
  FileText,
  Stack,
  Warning,
  Lightbulb,
  FolderSimple,
} from "@phosphor-icons/react/dist/ssr";
import type { ItemSalvo, Colecao } from "@/lib/salvos";
import { CartaoSalvo } from "./cartao-salvo";

// Ícones da paleta de coleção — trocados pro universo GTA (heist, RP,
// perseguição, dinheiro) em vez dos genéricos de antes (comida, natureza).
const EMOJIS = ["🎮", "🚔", "💰", "🔫", "🏝️", "🚗", "🎬", "🔥", "🕶️", "🏆"];

/**
 * Seleção da navegação lateral. Uma string só em vez de vários estados
 * independentes: os filtros são mutuamente exclusivos — estar "em Referências"
 * e "na coleção X" ao mesmo tempo não faz sentido num acervo.
 */
type Selecao =
  | "tudo"
  | "tipo:video"
  | "tipo:analise"
  | "sem-colecao"
  | `col:${string}`;

/** O que falta para a coleção virar vídeo. */
function diagnostico(refs: number, analises: number) {
  if (refs === 0 && analises === 0) {
    return { texto: "Coleção vazia. Traga referências ou uma análise sua.", tom: "vazio" as const };
  }
  if (analises === 0) {
    return {
      texto: "Só referências dos outros. Analise um material seu pra não virar cópia.",
      tom: "atencao" as const,
    };
  }
  if (refs === 0) {
    return {
      texto: "Só material seu. Traga referências do Radar pra decidir o formato.",
      tom: "atencao" as const,
    };
  }
  return {
    texto: "Tem referência e material próprio. Já dá pra escrever o roteiro.",
    tom: "pronto" as const,
  };
}

/**
 * Item da navegação lateral.
 *
 * Fora do componente pai de propósito: definido dentro do render, o React o
 * trata como um tipo novo a cada renderização e remonta a subárvore inteira —
 * a cada tecla digitada na busca, todos os itens do menu piscavam.
 */
function ItemNav({
  ativo,
  rotulo,
  n,
  icone,
  onClick,
}: {
  ativo: boolean;
  rotulo: string;
  n: number;
  icone: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={ativo ? "true" : undefined}
      className={
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition " +
        (ativo
          ? "bg-orange-600 font-medium text-white"
          : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100")
      }
    >
      {icone}
      <span className="min-w-0 flex-1 truncate">{rotulo}</span>
      <span
        className={
          "numero-placa shrink-0 text-[11px] " +
          (ativo ? "text-white/70" : "text-zinc-400")
        }
      >
        {n}
      </span>
    </button>
  );
}

export function PainelBiblioteca({
  salvosIniciais,
  colecoesIniciais,
}: {
  salvosIniciais: ItemSalvo[];
  colecoesIniciais: Colecao[];
}) {
  const [itens, setItens] = useState(salvosIniciais);
  const [colecoes, setColecoes] = useState(colecoesIniciais);
  const [selecao, setSelecao] = useState<Selecao>("tudo");
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [nomeNovo, setNomeNovo] = useState("");
  const [emojiNovo, setEmojiNovo] = useState("💡");
  const [editandoNota, setEditandoNota] = useState<string | null>(null);
  const [rascunhoNota, setRascunhoNota] = useState("");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  const contagens = useMemo(
    () => ({
      tudo: itens.length,
      video: itens.filter((i) => i.tipo === "video").length,
      analise: itens.filter((i) => i.tipo === "analise").length,
      semColecao: itens.filter((i) => !i.colecao_id).length,
    }),
    [itens],
  );

  const naColecao = (id: string) => itens.filter((i) => i.colecao_id === id);

  const visiveis = useMemo(() => {
    let lista = itens;
    if (selecao === "tipo:video") lista = lista.filter((i) => i.tipo === "video");
    else if (selecao === "tipo:analise")
      lista = lista.filter((i) => i.tipo === "analise");
    else if (selecao === "sem-colecao") lista = lista.filter((i) => !i.colecao_id);
    else if (selecao.startsWith("col:")) {
      const id = selecao.slice(4);
      lista = lista.filter((i) => i.colecao_id === id);
    }

    const termo = busca.trim().toLowerCase();
    if (termo) {
      lista = lista.filter((i) => {
        const texto =
          i.tipo === "video"
            ? `${i.video.titulo} ${i.video.canal} ${i.video.nicho}`
            : `${i.titulo} ${i.nicho}`;
        return `${texto} ${i.nota ?? ""}`.toLowerCase().includes(termo);
      });
    }
    return lista;
  }, [itens, selecao, busca]);

  const colecaoAberta = selecao.startsWith("col:")
    ? colecoes.find((c) => c.id === selecao.slice(4))
    : undefined;

  /* ------------------------------------------------------------- mutações */

  async function removerItem(id: string) {
    const antes = itens;
    setItens((p) => p.filter((i) => i.id !== id));
    const res = await fetch(`/api/salvos?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) setItens(antes);
  }

  async function atualizarItem(
    id: string,
    campos: { nota?: string; colecao_id?: string | null },
  ) {
    const antes = itens;
    setItens((p) =>
      p.map((i) =>
        i.id === id
          ? ({
              ...i,
              ...(campos.nota !== undefined
                ? { nota: campos.nota.trim() || undefined }
                : {}),
              ...(campos.colecao_id !== undefined
                ? { colecao_id: campos.colecao_id ?? undefined }
                : {}),
            } as ItemSalvo)
          : i,
      ),
    );
    const res = await fetch("/api/salvos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...campos }),
    });
    if (!res.ok) setItens(antes);
  }

  /** Move tudo que está marcado de uma vez — item a item, ninguém organiza. */
  async function moverMarcados(colecaoId: string | null) {
    const ids = [...marcados];
    setMarcados(new Set());
    const antes = itens;
    setItens((p) =>
      p.map((i) =>
        ids.includes(i.id) ? { ...i, colecao_id: colecaoId ?? undefined } : i,
      ),
    );
    const respostas = await Promise.all(
      ids.map((id) =>
        fetch("/api/salvos", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, colecao_id: colecaoId }),
        }),
      ),
    );
    if (respostas.some((r) => !r.ok)) setItens(antes);
  }

  async function criarColecao() {
    if (!nomeNovo.trim()) return;
    const res = await fetch("/api/colecoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeNovo, emoji: emojiNovo }),
    });
    if (res.ok) {
      const nova: Colecao = await res.json();
      setColecoes((p) => [nova, ...p]);
      if (marcados.size) await moverMarcados(nova.id);
      setNomeNovo("");
      setEmojiNovo("💡");
      setCriando(false);
      setSelecao(`col:${nova.id}`);
    }
  }

  async function removerColecao(id: string) {
    const antesC = colecoes;
    const antesI = itens;
    setColecoes((p) => p.filter((c) => c.id !== id));
    setItens((p) =>
      p.map((i) => (i.colecao_id === id ? { ...i, colecao_id: undefined } : i)),
    );
    if (selecao === `col:${id}`) setSelecao("tudo");
    const res = await fetch(`/api/colecoes?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setColecoes(antesC);
      setItens(antesI);
    }
  }

  async function salvarNotaColecao(id: string) {
    const antes = colecoes;
    setColecoes((p) =>
      p.map((c) => (c.id === id ? { ...c, nota: rascunhoNota.trim() || undefined } : c)),
    );
    setEditandoNota(null);
    const res = await fetch("/api/colecoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, nota: rascunhoNota }),
    });
    if (!res.ok) setColecoes(antes);
  }

  /* ------------------------------------------------------------- acervo vazio */

  if (itens.length === 0 && colecoes.length === 0) {
    return (
      <div className="surgir flex flex-col items-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 px-6 py-16 text-center">
        <BookmarkSimple size={28} className="text-zinc-700" />
        <p className="mt-4 text-sm font-medium text-zinc-300">
          Seu acervo está vazio
        </p>
        <p className="mt-1 max-w-[48ch] text-sm leading-relaxed text-zinc-400">
          É daqui que sai o próximo corte de GTA. Guarde referências de
          formato do Radar e das Lives, junte com as análises do seu material,
          e organize em coleções quando o vídeo começar a tomar forma.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href="/radar-viral"
            // O glow era um rgb() fixo do laranja antigo (#ff3e02) — com a
            // rampa "orange" apontando pro rosa da marca (ver globals.css),
            // o botão ficou rosa com um halo laranja por baixo. `--brilho-acao`
            // já é o glow certo, pronto pros dois temas.
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--brilho-acao)] transition hover:bg-orange-500 active:scale-[0.98]"
          >
            <Target size={16} weight="fill" />
            Buscar referências
          </Link>
          <Link
            href="/lives"
            className="flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100"
          >
            <Broadcast size={16} />
            Ver lives
          </Link>
          <Link
            href="/analisador"
            className="flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100"
          >
            <MagnifyingGlass size={16} />
            Analisar meu material
          </Link>
        </div>
      </div>
    );
  }

  /** Fechado sobre o estado atual, mas sem criar componente novo por render. */
  const item = (
    id: Selecao,
    rotulo: string,
    n: number,
    icone: React.ReactNode,
  ) => (
    <ItemNav
      key={id}
      ativo={selecao === id}
      rotulo={rotulo}
      n={n}
      icone={icone}
      onClick={() => setSelecao(id)}
    />
  );

  return (
    <div className="surgir">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <MagnifyingGlass
            size={14}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-600"
          />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título, canal ou nota"
            aria-label="Buscar no acervo"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 py-2 pr-3 pl-8 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15"
          />
        </div>

        {marcados.size > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-orange-900/60 bg-orange-950/20 px-2.5 py-1.5">
            <span className="text-[11px] tabular-nums text-orange-300">
              {marcados.size} marcado{marcados.size > 1 ? "s" : ""}
            </span>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value === "__nova") setCriando(true);
                else if (e.target.value)
                  moverMarcados(e.target.value === "__nenhuma" ? null : e.target.value);
              }}
              aria-label="Mover marcados para"
              className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] text-zinc-200 outline-none focus:border-orange-600"
            >
              <option value="">Mover para…</option>
              {colecoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.nome}
                </option>
              ))}
              <option value="__nova">+ Nova coleção</option>
              <option value="__nenhuma">Tirar da coleção</option>
            </select>
            <button
              type="button"
              onClick={() => setMarcados(new Set())}
              className="rounded-lg px-1.5 py-1 text-[11px] text-zinc-400 transition hover:text-zinc-300"
            >
              limpar
            </button>
          </div>
        )}
      </div>

      {criando && (
        <div className="mb-4 rounded-2xl border border-orange-900/60 bg-orange-950/15 p-4">
          <p className="mb-3 text-sm font-medium text-zinc-100">
            Nova coleção
            {marcados.size > 0 && (
              <span className="ml-2 text-xs font-normal text-orange-400">
                {marcados.size} ativo{marcados.size > 1 ? "s" : ""} marcado
                {marcados.size > 1 ? "s" : ""} entra
                {marcados.size > 1 ? "m" : ""} nela
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmojiNovo(e)}
                aria-pressed={emojiNovo === e}
                className={
                  "rounded-lg px-2 py-1 text-base transition " +
                  (emojiNovo === e
                    ? "bg-orange-600/25 ring-1 ring-orange-600"
                    : "hover:bg-white/5")
                }
              >
                {e}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={nomeNovo}
              onChange={(e) => setNomeNovo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && criarColecao()}
              autoFocus
              placeholder="Ex: série sobre fundo do mar"
              className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15"
            />
            <button
              type="button"
              onClick={criarColecao}
              disabled={!nomeNovo.trim()}
              className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Criar
            </button>
            <button
              type="button"
              onClick={() => {
                setCriando(false);
                setNomeNovo("");
              }}
              className="rounded-xl border border-zinc-800 px-3.5 py-2.5 text-sm text-zinc-400 transition hover:text-zinc-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* ------------------------------------------------ navegação lateral */}
        <nav className="shrink-0 lg:w-52">
          <div className="space-y-0.5">
            {item("tudo", "Todos os ativos", contagens.tudo, <Stack size={15} />)}
          </div>

          <p className="placa mt-4 mb-1.5 px-2.5 text-[10px] font-semibold text-zinc-400">
            Por tipo
          </p>
          <div className="space-y-0.5">
            {item("tipo:video", "Referências", contagens.video, <FilmSlate size={15} />)}
            {item(
              "tipo:analise",
              "Minhas análises",
              contagens.analise,
              <FileText size={15} />,
            )}
          </div>

          <div className="mt-4 mb-1.5 flex items-center justify-between px-2.5">
            <p className="placa text-[10px] font-semibold text-zinc-400">
              Coleções
            </p>
            {/* min-h/min-w 11: alvo de toque de 44px, ícone continua 13px. */}
            <button
              type="button"
              onClick={() => setCriando(true)}
              aria-label="Nova coleção"
              title="Nova coleção"
              className="flex min-h-11 min-w-11 items-center justify-center rounded p-0.5 text-zinc-400 transition hover:bg-white/10 hover:text-orange-400"
            >
              <Plus size={13} weight="bold" />
            </button>
          </div>
          <div className="space-y-0.5">
            {colecoes.length === 0 ? (
              <p className="px-2.5 py-1.5 text-[11px] leading-relaxed text-zinc-400">
                Nenhuma ainda. Marque ativos e agrupe.
              </p>
            ) : (
              colecoes.map((c) => (
                item(
                  `col:${c.id}`,
                  c.nome,
                  naColecao(c.id).length,
                  <span className="text-[13px] leading-none">{c.emoji}</span>,
                )
              ))
            )}
            {contagens.semColecao > 0 && (
              item(
                "sem-colecao",
                "Sem coleção",
                contagens.semColecao,
                <FolderSimple size={15} />,
              )
            )}
          </div>
        </nav>

        {/* ----------------------------------------------------------- ativos */}
        <div className="min-w-0 flex-1">
          {colecaoAberta && (
            <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-lg">
                  {colecaoAberta.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-zinc-50">
                    {colecaoAberta.nome}
                  </h2>

                  {editandoNota === colecaoAberta.id ? (
                    <div className="mt-2 flex items-start gap-2">
                      <textarea
                        value={rascunhoNota}
                        onChange={(e) => setRascunhoNota(e.target.value)}
                        autoFocus
                        rows={2}
                        placeholder="O que você quer fazer com esse material?"
                        className="min-w-0 flex-1 resize-none rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15"
                      />
                      <button
                        type="button"
                        onClick={() => salvarNotaColecao(colecaoAberta.id)}
                        aria-label="Salvar descrição"
                        className="rounded-lg border border-emerald-800 p-1.5 text-emerald-400 transition hover:bg-emerald-950/40"
                      >
                        <Check size={14} weight="bold" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditandoNota(null)}
                        aria-label="Cancelar"
                        className="rounded-lg border border-zinc-800 p-1.5 text-zinc-400 transition hover:text-zinc-300"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : colecaoAberta.nota ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRascunhoNota(colecaoAberta.nota ?? "");
                        setEditandoNota(colecaoAberta.id);
                      }}
                      className="mt-1.5 block w-full rounded-lg border-l-2 border-orange-800 bg-orange-950/15 px-3 py-2 text-left text-xs leading-relaxed text-zinc-300 transition hover:bg-orange-950/25"
                    >
                      {colecaoAberta.nota}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setRascunhoNota("");
                        setEditandoNota(colecaoAberta.id);
                      }}
                      className="mt-1 flex items-center gap-1 text-[11px] text-zinc-400 transition hover:text-zinc-200"
                    >
                      <NotePencil size={12} />
                      Descrever a coleção
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removerColecao(colecaoAberta.id)}
                  aria-label="Apagar coleção"
                  title="Apaga a coleção. Os ativos voltam para o acervo."
                  className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-1.5 text-zinc-400 transition hover:bg-rose-950/40 hover:text-rose-400"
                >
                  <Trash size={14} />
                </button>
              </div>

              {(() => {
                const dentro = naColecao(colecaoAberta.id);
                const refs = dentro.filter((i) => i.tipo === "video").length;
                const d = diagnostico(refs, dentro.length - refs);
                return (
                  <div
                    className={
                      "mt-3 flex flex-wrap items-center gap-2 rounded-xl border px-3.5 py-2.5 " +
                      (d.tom === "pronto"
                        ? "border-emerald-900/50 bg-emerald-950/15"
                        : d.tom === "atencao"
                          ? "border-amber-900/40 bg-amber-950/10"
                          : "border-zinc-800 bg-zinc-950/30")
                    }
                  >
                    {d.tom === "pronto" ? (
                      <Check size={14} weight="bold" className="shrink-0 text-emerald-500" />
                    ) : d.tom === "atencao" ? (
                      <Warning size={14} weight="fill" className="shrink-0 text-amber-500" />
                    ) : (
                      <Lightbulb size={14} className="shrink-0 text-zinc-600" />
                    )}
                    <p className="min-w-0 flex-1 text-xs leading-relaxed text-zinc-400">
                      {d.texto}
                    </p>
                    <span
                      title="O módulo Roteiros ainda não existe"
                      className="flex shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg border border-dashed border-zinc-800 px-2.5 py-1.5 text-[11px] text-zinc-700"
                    >
                      <Scroll size={12} />
                      Virar roteiro
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="numero-placa text-xs text-zinc-400">
              {visiveis.length} {visiveis.length === 1 ? "ativo" : "ativos"}
            </p>
            {visiveis.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setMarcados(
                    marcados.size === visiveis.length
                      ? new Set()
                      : new Set(visiveis.map((i) => i.id)),
                  )
                }
                className="text-xs text-zinc-400 transition hover:text-zinc-200"
              >
                {marcados.size === visiveis.length
                  ? "Desmarcar todos"
                  : "Marcar todos"}
              </button>
            )}
          </div>

          {visiveis.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 px-6 py-14 text-center">
              <FolderSimple size={26} className="text-zinc-700" />
              <p className="mt-3.5 text-sm font-medium text-zinc-300">
                Nada aqui
              </p>
              <p className="mt-1 max-w-[44ch] text-sm leading-relaxed text-zinc-400">
                {busca.trim()
                  ? "Nenhum ativo bate com essa busca."
                  : "Marque ativos em outro filtro e mova para cá, ou salve mais coisas no Radar."}
              </p>
            </div>
          ) : (
            <div className="grid gap-2.5 2xl:grid-cols-2">
              {visiveis.map((item) => (
                <div key={item.id} className="relative">
                  <label className="absolute top-3 left-3 z-10 flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={marcados.has(item.id)}
                      onChange={() =>
                        setMarcados((p) => {
                          const novo = new Set(p);
                          if (novo.has(item.id)) novo.delete(item.id);
                          else novo.add(item.id);
                          return novo;
                        })
                      }
                      aria-label={`Marcar ${item.tipo === "video" ? item.video.titulo : item.titulo}`}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 accent-orange-600"
                    />
                  </label>
                  <div className="pl-6">
                    <CartaoSalvo
                      item={item}
                      colecoes={colecoes}
                      onRemover={removerItem}
                      onAtualizar={atualizarItem}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
