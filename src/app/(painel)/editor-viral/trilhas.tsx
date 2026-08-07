"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  FilmStrip,
  Images,
  MusicNotes,
  Textbox,
  TextT,
} from "@phosphor-icons/react/dist/ssr";
import {
  duracaoDoProjeto,
  type Item,
  type Projeto,
  type Trilha,
} from "@/lib/editor/projeto";

/**
 * Trilhas — a linha do tempo multi-trilha, multi-item.
 *
 * É a versão adulta de `linha-do-tempo.tsx`: lá existe UM clipe e duas alças;
 * aqui existe uma raia por tipo de trilha e N blocos em cada uma, cada um
 * arrastável e redimensionável.
 *
 * TRÊS DECISÕES QUE VALE ENTENDER ANTES DE MEXER:
 *
 * 1. TUDO EM SEGUNDOS. Pixel só aparece na hora de desenhar (`px()`) e na hora
 *    de ler o mouse (`segundoDoEvento`). Guardar pixel quebraria a cada mudança
 *    de zoom ou de largura da janela.
 *
 * 2. O ARRASTO ESCUTA NA JANELA. Mouse rápido sai da alça de 8px antes do
 *    próximo mousemove; com listener no elemento, a alça solta no meio do
 *    gesto. Na janela, o gesto só acaba quando o botão levanta.
 *
 * 3. O ESTADO DO ARRASTO É REF, NÃO ESTADO. Ele muda a cada pixel — como
 *    estado, renderizaria a linha do tempo inteira dezenas de vezes por
 *    segundo enquanto a pessoa arrasta.
 *
 * O componente não guarda o projeto nem aplica a mudança: ele avisa em
 * segundos e quem integra decide. Isso importa porque MOVER e REDIMENSIONAR
 * são operações diferentes no modelo — mover desloca o item na linha e não
 * toca na janela da fonte; redimensionar apara, e aí a janela da fonte
 * acompanha. Misturar os dois é o bug clássico de editor.
 */

/** w-20 do rótulo fixo. Régua, blocos e cursor partem todos daqui. */
const LARGURA_ROTULO = 80;

/** Folga mínima de um item. Bloco de duração zero some e não volta. */
const MINIMO_S = 0.2;

/** Ordem de empilhamento na tela, não a ordem que o projeto guardou. */
const ORDEM: Trilha["tipo"][] = [
  "video",
  "legenda",
  "texto",
  "overlay",
  "audio",
];

const RAIAS: Record<
  Trilha["tipo"],
  { nome: string; bloco: string; alca: string; texto: string }
> = {
  video: {
    nome: "Vídeo",
    bloco:
      "border-blue-500/70 bg-gradient-to-b from-blue-600/35 to-blue-700/25",
    alca: "bg-blue-400 hover:bg-blue-300",
    texto: "text-blue-100",
  },
  legenda: {
    nome: "Legenda",
    bloco: "border-orange-600/60 bg-orange-600/20",
    alca: "bg-orange-500 hover:bg-orange-400",
    texto: "text-orange-100",
  },
  texto: {
    nome: "Texto",
    bloco: "border-purple-500/60 bg-purple-600/25",
    alca: "bg-purple-400 hover:bg-purple-300",
    texto: "text-purple-100",
  },
  overlay: {
    nome: "Overlay",
    bloco: "border-teal-500/60 bg-teal-600/25",
    alca: "bg-teal-400 hover:bg-teal-300",
    texto: "text-teal-100",
  },
  audio: {
    nome: "Áudio",
    bloco: "border-emerald-500/60 bg-emerald-600/25",
    alca: "bg-emerald-400 hover:bg-emerald-300",
    texto: "text-emerald-100",
  },
};

/** O que está sendo arrastado. Vive num ref — muda a cada pixel. */
type Arrasto =
  | { modo: "cursor" }
  | {
      modo: "mover" | "inicio" | "fim";
      id: string;
      /** Segundo do ponteiro quando o gesto começou. */
      ancora_s: number;
      /** Onde o item estava quando o gesto começou. */
      inicio_s: number;
      fim_s: number;
    };

function mmss(s: number): string {
  const m = Math.floor(Math.max(0, s) / 60);
  const seg = Math.floor(Math.max(0, s) % 60);
  return `${m}:${String(seg).padStart(2, "0")}`;
}

/** Espaçamento da régua que evita marca a cada pixel em zoom baixo. */
function passoDaRegua(pxPorSeg: number): number {
  if (pxPorSeg >= 120) return 1;
  if (pxPorSeg >= 60) return 2;
  if (pxPorSeg >= 30) return 5;
  if (pxPorSeg >= 12) return 10;
  return 30;
}

function rotuloDoItem(item: Item): string {
  switch (item.tipo) {
    case "video":
      return mmss(item.fim_s - item.inicio_s);
    case "legenda":
    case "texto":
      return item.conteudo;
    case "audio":
      return item.nome;
    case "overlay":
      return "Overlay";
  }
}

export function Trilhas({
  projeto,
  agora,
  pxPorSeg,
  selecionadoId,
  onSelecionar,
  onMoverItem,
  onRedimensionar,
  onMover,
}: {
  projeto: Projeto;
  /** Onde a reprodução está, em segundos da linha do tempo. */
  agora: number;
  pxPorSeg: number;
  selecionadoId: string | null;
  onSelecionar: (id: string) => void;
  /** Desloca o item inteiro: a duração é preservada, só o início muda. */
  onMoverItem: (id: string, inicio_s: number) => void;
  /** Apara uma ponta. Vêm as duas bordas; só uma delas mudou. */
  onRedimensionar: (id: string, inicio_s: number, fim_s: number) => void;
  /** Move o cursor de reprodução. */
  onMover: (segundo: number) => void;
}) {
  const pistaRef = useRef<HTMLDivElement>(null);
  const arrasto = useRef<Arrasto | null>(null);

  /** Um pouco de folga no fim: sem ela não dá pra arrastar item pra frente. */
  const duracao = Math.max(duracaoDoProjeto(projeto), 10);
  const px = (s: number) => s * pxPorSeg;
  const largura = LARGURA_ROTULO + px(duracao) + 240;

  /**
   * As raias na ordem da tela.
   *
   * O projeto pode não ter todas — salvo por versão anterior, por exemplo.
   * A raia aparece vazia em vez de sumir: trilha que some da tela some da
   * cabeça de quem edita.
   */
  const raias = useMemo(
    () =>
      ORDEM.map(
        (tipo): Trilha =>
          projeto.trilhas.find((t) => t.tipo === tipo) ?? {
            tipo,
            itens: [],
            ativa: true,
          },
      ),
    [projeto.trilhas],
  );

  const segundoDoEvento = useCallback(
    (clienteX: number): number => {
      const pista = pistaRef.current;
      const caixa = pista?.getBoundingClientRect();
      if (!pista || !caixa) return 0;
      const x =
        clienteX - caixa.left + pista.scrollLeft - LARGURA_ROTULO;
      return Math.max(0, x / pxPorSeg);
    },
    [pxPorSeg],
  );

  /**
   * O gesto inteiro, na janela.
   *
   * Toda conta parte do SNAPSHOT que `pegar` guardou, não do valor atual do
   * item. Acumular delta em cima do valor que acabou de mudar faz o bloco
   * derivar: cada frame soma o arredondamento do anterior, e no fim do arrasto
   * o item está alguns quadros fora de onde o ponteiro aponta.
   */
  useEffect(() => {
    function mover(e: MouseEvent) {
      const a = arrasto.current;
      if (!a) return;
      const s = segundoDoEvento(e.clientX);

      if (a.modo === "cursor") {
        onMover(s);
        return;
      }

      const delta = s - a.ancora_s;

      if (a.modo === "mover") {
        onMoverItem(a.id, Math.max(0, a.inicio_s + delta));
        return;
      }
      if (a.modo === "inicio") {
        const novo = Math.max(
          0,
          Math.min(a.inicio_s + delta, a.fim_s - MINIMO_S),
        );
        onRedimensionar(a.id, novo, a.fim_s);
        return;
      }
      const novo = Math.max(a.inicio_s + MINIMO_S, a.fim_s + delta);
      onRedimensionar(a.id, a.inicio_s, novo);
    }

    function soltar() {
      arrasto.current = null;
      document.body.style.cursor = "";
    }

    window.addEventListener("mousemove", mover);
    window.addEventListener("mouseup", soltar);
    return () => {
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("mouseup", soltar);
    };
  }, [segundoDoEvento, onMover, onMoverItem, onRedimensionar]);

  function pegarItem(item: Item, modo: "mover" | "inicio" | "fim") {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSelecionar(item.id);
      arrasto.current = {
        modo,
        id: item.id,
        ancora_s: segundoDoEvento(e.clientX),
        inicio_s: item.inicio_s,
        fim_s: item.fim_s,
      };
      document.body.style.cursor = modo === "mover" ? "grabbing" : "ew-resize";
    };
  }

  const marcas: number[] = [];
  const passo = passoDaRegua(pxPorSeg);
  for (let s = 0; s <= duracao; s += passo) marcas.push(s);

  return (
    <div className="flex flex-col border-t border-zinc-800 bg-zinc-950">
      <div ref={pistaRef} className="relative overflow-x-auto overflow-y-hidden">
        <div style={{ width: largura }} className="relative select-none">
          {/* ------------------------------------------------------- régua */}
          <div
            onMouseDown={(e) => {
              onMover(segundoDoEvento(e.clientX));
              arrasto.current = { modo: "cursor" };
              document.body.style.cursor = "grabbing";
            }}
            className="relative h-6 cursor-pointer border-b border-zinc-800/70"
          >
            {marcas.map((s) => (
              <span
                key={s}
                style={{ left: LARGURA_ROTULO + px(s) }}
                className="absolute top-0 flex h-full flex-col justify-center border-l border-zinc-800 pl-1 font-mono text-[9px] tabular-nums text-zinc-600"
              >
                {mmss(s)}
              </span>
            ))}
            {/* Tampa opaca na canaleta dos rótulos: as marcas passam por baixo
                dela ao rolar, e clicar aqui não joga o cursor pro zero. */}
            <span
              onMouseDown={(e) => e.stopPropagation()}
              className="sticky left-0 z-20 block h-full w-20 cursor-default border-r border-zinc-800/70 bg-zinc-950"
            />
          </div>

          {/* ------------------------------------------------------ raias */}
          {raias.map((raia) => {
            const estilo = RAIAS[raia.tipo];
            return (
              <div
                key={raia.tipo}
                className="relative h-11 border-b border-zinc-800/50"
              >
                {/* sticky: o rótulo acompanha a rolagem horizontal, senão some
                    assim que a pessoa navega pra frente na linha do tempo. */}
                <span
                  className={
                    "sticky left-0 z-20 flex h-full w-20 shrink-0 items-center gap-1.5 border-r border-zinc-800/70 bg-zinc-950 px-2 text-[10px] font-medium " +
                    (raia.ativa ? "text-zinc-500" : "text-zinc-700 line-through")
                  }
                  title={raia.ativa ? undefined : "Trilha muda: não entra no render"}
                >
                  <Icone tipo={raia.tipo} />
                  {estilo.nome}
                </span>

                <div
                  className={
                    "absolute inset-y-0 right-0 left-20 " +
                    (raia.ativa ? "" : "opacity-40")
                  }
                >
                  {raia.itens.length === 0 && (
                    <span className="absolute inset-y-0 left-2 flex items-center text-[10px] text-zinc-700">
                      vazia
                    </span>
                  )}

                  {raia.itens.map((item) => {
                    const selecionado = item.id === selecionadoId;
                    const rotulo = rotuloDoItem(item);
                    return (
                      <div
                        key={item.id}
                        onMouseDown={pegarItem(item, "mover")}
                        title={rotulo}
                        style={{
                          left: px(item.inicio_s),
                          // 6px de piso: item curtíssimo continua clicável em
                          // vez de virar uma linha invisível.
                          width: Math.max(px(item.fim_s - item.inicio_s), 6),
                        }}
                        className={
                          "group absolute inset-y-1.5 cursor-grab rounded border transition-shadow " +
                          estilo.bloco +
                          (selecionado
                            ? " z-10 ring-2 ring-orange-500"
                            : " hover:brightness-125")
                        }
                      >
                        <span className="pointer-events-none absolute inset-0 flex items-center px-2.5">
                          <span
                            className={
                              "truncate text-[10px] leading-none font-medium " +
                              estilo.texto
                            }
                          >
                            {rotulo}
                          </span>
                        </span>

                        {/* As alças aparecem no hover (e ficam no item
                            selecionado): sempre visíveis, elas comem o bloco
                            inteiro quando o zoom está baixo. */}
                        <button
                          type="button"
                          aria-label={`Aparar o início de ${rotulo}`}
                          onMouseDown={pegarItem(item, "inicio")}
                          className={
                            "absolute inset-y-0 left-0 w-2 cursor-ew-resize rounded-l transition group-hover:opacity-100 " +
                            estilo.alca +
                            (selecionado ? " opacity-100" : " opacity-0")
                          }
                        />
                        <button
                          type="button"
                          aria-label={`Aparar o fim de ${rotulo}`}
                          onMouseDown={pegarItem(item, "fim")}
                          className={
                            "absolute inset-y-0 right-0 w-2 cursor-ew-resize rounded-r transition group-hover:opacity-100 " +
                            estilo.alca +
                            (selecionado ? " opacity-100" : " opacity-0")
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Cursor por cima de tudo, sem capturar clique — quem recebe o
              arrasto é a régua, área muito maior e mais fácil de pegar. Fica
              abaixo dos rótulos (z-20) pra não vazar na canaleta da esquerda. */}
          <div
            style={{ left: LARGURA_ROTULO + px(agora) }}
            className="pointer-events-none absolute inset-y-0 z-10 w-px bg-rose-500"
          >
            <span className="absolute -top-0 -left-1.5 h-2.5 w-3.5 rounded-b-sm bg-rose-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Icone({ tipo }: { tipo: Trilha["tipo"] }) {
  if (tipo === "video") return <FilmStrip size={11} />;
  if (tipo === "legenda") return <TextT size={11} />;
  if (tipo === "texto") return <Textbox size={11} />;
  if (tipo === "overlay") return <Images size={11} />;
  return <MusicNotes size={11} />;
}
