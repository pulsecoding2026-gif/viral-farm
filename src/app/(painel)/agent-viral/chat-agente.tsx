"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChatCircleDots,
  CircleNotch,
  PaperPlaneRight,
  Plus,
  Trash,
} from "@phosphor-icons/react/dist/ssr";
import type {
  DadosConversa,
  ItemPlanejamento,
  Mensagem,
} from "@/lib/planejar/tipos";

/**
 * O chat do Agent Viral — estrategista de vídeo curto por conversa.
 *
 * A lista da lateral é a fonte de verdade das conversas persistidas; o painel
 * mostra a aberta. Enquanto uma resposta viaja (10 a 40s), a mensagem enviada
 * vive numa "pendência" separada em vez de entrar no histórico: se a IA
 * falhar, nada precisa ser desfeito — a pendência some e o texto volta pro
 * campo pra pessoa tentar de novo sem redigitar.
 */

/* ------------------------------------------------------------------ apoio */

/**
 * Mesma regra de tituloDaConversa (lib/planejar/prompts.ts), duplicada de
 * propósito: importar prompts.ts arrastaria o catálogo de formatos inteiro
 * pro bundle do cliente só pra aparar uma string.
 */
function tituloLocal(primeiraMensagem: string): string {
  const limpo = primeiraMensagem.replace(/\s+/g, " ").trim();
  return limpo.length > 60 ? `${limpo.slice(0, 57)}…` : limpo;
}

function dataRelativa(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d} dia${d > 1 ? "s" : ""}`;
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function mensagensDe(item: ItemPlanejamento): Mensagem[] {
  return (item.dados as DadosConversa).mensagens ?? [];
}

/* ------------------------------------------------------- markdown caseiro */

/** Troca **trechos** por <strong>, sem tocar no resto da linha. */
function comNegrito(texto: string): React.ReactNode {
  const partes = texto.split(/\*\*([^*]+)\*\*/g);
  if (partes.length === 1) return texto;
  return partes.map((p, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-zinc-100">
        {p}
      </strong>
    ) : (
      p
    ),
  );
}

/**
 * Renderiza o subconjunto de markdown que o agente usa (negrito, listas com
 * "- " ou "1.", parágrafos) como elementos React.
 *
 * Caseiro DE PROPÓSITO: a resposta vem de um LLM, e texto de LLM não entra
 * como HTML — nada de dangerouslySetInnerHTML nem parser externo. Como cada
 * pedaço vira elemento criado pelo próprio React, o pior que um markdown
 * malformado consegue é aparecer literal na tela.
 */
function MarkdownLeve({ texto }: { texto: string }) {
  const blocos: React.ReactNode[] = [];
  let itens: string[] = [];
  let ordenada = false;

  const despejarLista = () => {
    if (itens.length === 0) return;
    const Tag = ordenada ? "ol" : "ul";
    blocos.push(
      <Tag
        key={blocos.length}
        className={`space-y-1 pl-5 ${ordenada ? "list-decimal" : "list-disc"}`}
      >
        {itens.map((item, i) => (
          <li key={i}>{comNegrito(item)}</li>
        ))}
      </Tag>,
    );
    itens = [];
  };

  for (const linha of texto.split(/\r?\n/)) {
    const aparada = linha.trim();
    const marcador = aparada.match(/^[-*]\s+(.*)/);
    const numerado = aparada.match(/^\d+[.)]\s+(.*)/);

    if (marcador || numerado) {
      const eOrdenada = Boolean(numerado);
      if (itens.length > 0 && eOrdenada !== ordenada) despejarLista();
      ordenada = eOrdenada;
      itens.push((marcador ?? numerado)![1]);
      continue;
    }

    despejarLista();
    if (aparada === "") continue;
    blocos.push(<p key={blocos.length}>{comNegrito(aparada)}</p>);
  }
  despejarLista();

  return <div className="space-y-2">{blocos}</div>;
}

/* ----------------------------------------------------------------- balões */

function Balao({ m }: { m: Mensagem }) {
  const doUsuario = m.papel === "usuario";
  return (
    <div className={doUsuario ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          "max-w-[65ch] rounded-2xl px-4 py-3 text-sm leading-relaxed " +
          (doUsuario
            ? "rounded-br-md bg-orange-600/15 text-zinc-100"
            : "rounded-bl-md bg-zinc-900 text-zinc-300")
        }
      >
        {doUsuario ? (
          <p className="whitespace-pre-wrap">{m.texto}</p>
        ) : (
          <MarkdownLeve texto={m.texto} />
        )}
      </div>
    </div>
  );
}

function BalaoPensando() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md bg-zinc-900 px-4 py-3.5">
        <span className="flex gap-1" aria-hidden>
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:300ms]" />
        </span>
        <span className="text-xs text-zinc-500">pensando…</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ sugestões */

/**
 * Chips do estado vazio. Os terminados em reticências só preenchem o campo —
 * mandar "…sobre" pro agente renderia uma pergunta de volta que a pessoa já
 * sabia que vinha; o completo vai direto porque já é uma pergunta inteira.
 */
const SUGESTOES: { rotulo: string; texto: string; envia: boolean }[] = [
  {
    rotulo: "Me dá 5 títulos pra um vídeo sobre…",
    texto: "Me dá 5 títulos pra um vídeo sobre ",
    envia: false,
  },
  {
    rotulo: "Qual CTA usar pra ganhar seguidores?",
    texto: "Qual CTA usar pra ganhar seguidores?",
    envia: true,
  },
  {
    rotulo: "Monta uma legenda com hashtags pra…",
    texto: "Monta uma legenda com hashtags pra ",
    envia: false,
  },
  {
    rotulo: "Analisa esse posicionamento:…",
    texto: "Analisa esse posicionamento: ",
    envia: false,
  },
];

/* ------------------------------------------------------------------- chat */

/** A mensagem em trânsito: de qual conversa saiu (null = nova) e o texto. */
type Pendencia = { alvo: string | null; texto: string };

export function ChatAgente({
  conversasIniciais,
  rascunhoInicial = "",
}: {
  conversasIniciais: ItemPlanejamento[];
  /** Vem do Trends: o campo chega preenchido, mas quem envia é a pessoa. */
  rascunhoInicial?: string;
}) {
  const [conversas, setConversas] = useState(conversasIniciais);
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [rascunho, setRascunho] = useState(rascunhoInicial);
  const [pendencia, setPendencia] = useState<Pendencia | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Espelho de abertaId pra decidir, DEPOIS do await de 10–40s, se a resposta
  // ainda pertence à conversa na tela — o valor capturado no closure é o de
  // antes da espera, e a pessoa pode ter trocado de conversa nesse meio tempo.
  const abertaIdRef = useRef<string | null>(null);

  const areaRef = useRef<HTMLTextAreaElement>(null);
  const rolagemRef = useRef<HTMLDivElement>(null);

  const enviando = pendencia !== null;
  const pendenteAqui = pendencia !== null && pendencia.alvo === abertaId;
  const vazia = abertaId === null && !pendenteAqui;

  // Auto-scroll pro fim a cada mensagem (inclusive a pendente e o "pensando").
  useEffect(() => {
    const el = rolagemRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensagens, pendencia]);

  function ajustarAltura() {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    // ~5 linhas de texto; além disso a própria textarea rola.
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  function selecionar(id: string | null) {
    setAbertaId(id);
    abertaIdRef.current = id;
    setErro(null);
    const item = id ? conversas.find((c) => c.id === id) : undefined;
    setMensagens(item ? mensagensDe(item) : []);
  }

  function preencher(texto: string) {
    setRascunho(texto);
    // Foco com o cursor no fim, pra pessoa só completar a frase.
    requestAnimationFrame(() => {
      const el = areaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      ajustarAltura();
    });
  }

  async function enviar(texto: string) {
    const msg = texto.trim();
    if (!msg || enviando) return;

    const alvo = abertaId;
    const historico = mensagens;
    setErro(null);
    setRascunho("");
    setPendencia({ alvo, texto: msg });
    requestAnimationFrame(ajustarAltura);

    try {
      const r = await fetch("/api/planejar/agente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alvo ? { id: alvo, mensagem: msg } : { mensagem: msg }),
      });
      const dados = await r.json().catch(() => ({}));

      if (!r.ok) {
        setErro(
          (dados as { erro?: string }).erro ??
            "Não consegui falar com o agente. Tente de novo.",
        );
        // Devolve o texto pro campo se a pessoa ainda está na mesma conversa.
        if (abertaIdRef.current === alvo) {
          setRascunho(msg);
          requestAnimationFrame(ajustarAltura);
        }
        return;
      }

      const { id, resposta } = dados as { id: string; resposta: string };
      const completo: Mensagem[] = [
        ...historico,
        { papel: "usuario", texto: msg },
        { papel: "agente", texto: resposta },
      ];
      const agora = Date.now();

      // A lista atualiza sempre — mesmo que a pessoa tenha mudado de conversa
      // enquanto esperava, a resposta chegou e o histórico tem que refletir.
      setConversas((p) => {
        const existente = p.find((c) => c.id === id);
        const item: ItemPlanejamento = existente
          ? { ...existente, dados: { mensagens: completo }, atualizado_em: agora }
          : {
              id,
              tipo: "agente",
              titulo: tituloLocal(msg),
              dados: { mensagens: completo },
              criado_em: agora,
              atualizado_em: agora,
            };
        return [item, ...p.filter((c) => c.id !== id)];
      });

      // O painel só atualiza se a conversa respondida ainda é a da tela.
      if (abertaIdRef.current === alvo) {
        setMensagens(completo);
        if (alvo === null) {
          setAbertaId(id);
          abertaIdRef.current = id;
        }
      }
    } catch {
      setErro("Falha de rede. Tente de novo.");
      if (abertaIdRef.current === alvo) {
        setRascunho(msg);
        requestAnimationFrame(ajustarAltura);
      }
    } finally {
      setPendencia(null);
    }
  }

  async function apagar(id: string) {
    // Otimista, como na Biblioteca: some já; se o servidor negar, volta.
    const antes = conversas;
    setConversas((p) => p.filter((c) => c.id !== id));
    if (abertaId === id) selecionar(null);
    const r = await fetch(`/api/planejar/${id}`, { method: "DELETE" });
    if (!r.ok) setConversas(antes);
  }

  const aberta = abertaId
    ? conversas.find((c) => c.id === abertaId)
    : undefined;

  return (
    <div className="surgir flex h-[calc(100vh-8.5rem)] min-h-[480px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      {/* --------------------------------------------------------- conversas */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/20 lg:flex">
        <div className="p-3">
          <button
            type="button"
            onClick={() => selecionar(null)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500 active:scale-[0.98]"
          >
            <Plus size={15} weight="bold" />
            Nova conversa
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
          {conversas.length === 0 ? (
            <p className="px-2 py-1.5 text-[11px] leading-relaxed text-zinc-700">
              Nenhuma conversa ainda. A primeira mensagem cria uma.
            </p>
          ) : (
            conversas.map((c) => {
              const ativa = c.id === abertaId;
              return (
                <div key={c.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => selecionar(c.id)}
                    aria-current={ativa ? "true" : undefined}
                    className={
                      "w-full rounded-lg px-2.5 py-2 pr-8 text-left transition " +
                      (ativa ? "bg-white/[0.08]" : "hover:bg-white/[0.05]")
                    }
                  >
                    <p
                      className={
                        "truncate text-[13px] " +
                        (ativa
                          ? "font-medium text-zinc-100"
                          : "text-zinc-300")
                      }
                    >
                      {c.titulo || "Conversa"}
                    </p>
                    {/* O relógio do cliente diverge do da renderização no
                        servidor; a data relativa pode mudar entre as duas. */}
                    <p
                      suppressHydrationWarning
                      className="mt-0.5 text-[11px] text-zinc-600"
                    >
                      {dataRelativa(c.atualizado_em)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => apagar(c.id)}
                    aria-label={`Apagar conversa: ${c.titulo}`}
                    className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1.5 text-zinc-600 opacity-0 transition group-hover:opacity-100 hover:bg-rose-950/40 hover:text-rose-400 focus-visible:opacity-100"
                  >
                    <Trash size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ------------------------------------------------------------ painel */}
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Barra fina: dá título à conversa aberta e, fora de telas lg (onde a
            lateral some), é o único caminho pra começar outra conversa. */}
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-2.5">
          <ChatCircleDots size={16} className="shrink-0 text-orange-500" />
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200">
            {aberta?.titulo || "Agent Viral"}
          </p>
          <button
            type="button"
            onClick={() => selecionar(null)}
            aria-label="Nova conversa"
            title="Nova conversa"
            className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200 lg:hidden"
          >
            <Plus size={16} weight="bold" />
          </button>
        </div>

        <div ref={rolagemRef} className="min-h-0 flex-1 overflow-y-auto">
          {vazia ? (
            /* ------------------------------------------------ estado vazio */
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600/15">
                <ChatCircleDots size={24} weight="fill" className="text-orange-500" />
              </span>
              <p className="mt-4 text-base font-semibold text-zinc-100">
                O que a gente resolve hoje?
              </p>
              <p className="mt-1 max-w-[42ch] text-sm leading-relaxed text-zinc-500">
                Título, gancho, CTA, legenda, posicionamento — pergunte como
                perguntaria a um estrategista.
              </p>
              <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2">
                {SUGESTOES.map((s) => (
                  <button
                    key={s.rotulo}
                    type="button"
                    disabled={enviando}
                    onClick={() =>
                      s.envia ? enviar(s.texto) : preencher(s.texto)
                    }
                    className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3.5 py-2.5 text-left text-[13px] leading-snug text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100 disabled:opacity-50"
                  >
                    {s.rotulo}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* -------------------------------------------------- mensagens */
            <div className="mx-auto max-w-3xl space-y-3 px-4 py-5">
              {mensagens.map((m, i) => (
                <Balao key={i} m={m} />
              ))}
              {pendenteAqui && (
                <>
                  <Balao m={{ papel: "usuario", texto: pendencia.texto }} />
                  <BalaoPensando />
                </>
              )}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------- envio */}
        <div className="border-t border-zinc-800 px-4 py-3">
          <div className="mx-auto max-w-3xl">
            {erro && <p className="mb-2 text-xs text-rose-400">{erro}</p>}
            <div className="flex items-end gap-2">
              <textarea
                ref={areaRef}
                value={rascunho}
                onChange={(e) => {
                  setRascunho(e.target.value);
                  ajustarAltura();
                }}
                onKeyDown={(e) => {
                  // Enter envia; Shift+Enter quebra linha, como todo chat.
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviar(rascunho);
                  }
                }}
                rows={1}
                placeholder="Pergunte sobre o seu próximo vídeo…"
                aria-label="Mensagem para o Agent Viral"
                className="max-h-[140px] min-w-0 flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5 text-sm leading-relaxed text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15"
              />
              <button
                type="button"
                onClick={() => enviar(rascunho)}
                disabled={enviando || !rascunho.trim()}
                aria-label="Enviar mensagem"
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {enviando ? (
                  <CircleNotch size={17} className="animate-spin" />
                ) : (
                  <PaperPlaneRight size={17} weight="fill" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-700">
              Enter envia · Shift+Enter quebra linha
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
