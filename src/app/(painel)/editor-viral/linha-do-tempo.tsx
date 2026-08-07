"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  FilmStrip,
  TextT,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
} from "@phosphor-icons/react/dist/ssr";

/**
 * A linha do tempo — a peça que faz o editor parecer editor.
 *
 * Três coisas acontecem aqui e é bom separá-las:
 *
 *   1. A RÉGUA marca o tempo em segundos, com densidade que acompanha o zoom.
 *   2. As TRILHAS desenham o que existe (vídeo e legenda), e o bloco de vídeo
 *      tem alças nas pontas pra aparar início e fim.
 *   3. O CURSOR mostra onde a reprodução está e pode ser arrastado.
 *
 * Tudo é medido em SEGUNDOS e convertido pra pixel na hora de desenhar. O
 * caminho contrário (guardar pixel e converter pra tempo) quebra a cada
 * mudança de zoom ou de largura da janela.
 */

export type BlocoLegenda = { inicio_s: number; fim_s: number; texto: string };

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

export function LinhaDoTempo({
  duracao,
  inicio,
  fim,
  agora,
  legendas,
  pxPorSeg,
  onMudarJanela,
  onMover,
  onZoom,
}: {
  /** Duração do arquivo inteiro, não do trecho aparado. */
  duracao: number;
  inicio: number;
  fim: number;
  agora: number;
  legendas: BlocoLegenda[];
  pxPorSeg: number;
  onMudarJanela: (inicio: number, fim: number) => void;
  onMover: (segundo: number) => void;
  onZoom: (pxPorSeg: number) => void;
}) {
  const pistaRef = useRef<HTMLDivElement>(null);
  /** O que está sendo arrastado agora. Ref, não estado: muda a cada pixel. */
  const arrasto = useRef<"cursor" | "inicio" | "fim" | null>(null);

  const largura = Math.max(duracao * pxPorSeg, 1);
  const px = (s: number) => s * pxPorSeg;

  const segundoDoEvento = useCallback(
    (clienteX: number): number => {
      const caixa = pistaRef.current?.getBoundingClientRect();
      if (!caixa) return 0;
      const x = clienteX - caixa.left + (pistaRef.current?.scrollLeft ?? 0);
      return Math.max(0, Math.min(x / pxPorSeg, duracao));
    },
    [pxPorSeg, duracao],
  );

  /**
   * O arrasto escuta na JANELA, não no elemento.
   *
   * Mouse rápido sai do bloco de 8px da alça antes do próximo mousemove; com
   * o listener no elemento, a alça "solta" no meio do gesto. Na janela, o
   * arrasto só termina quando o botão levanta.
   */
  useEffect(() => {
    function mover(e: MouseEvent) {
      if (!arrasto.current) return;
      const s = segundoDoEvento(e.clientX);
      if (arrasto.current === "cursor") onMover(s);
      // 0.4s de folga mínima: janela invertida (ou de zero) faria o ffmpeg
      // produzir arquivo vazio lá na frente.
      else if (arrasto.current === "inicio") onMudarJanela(Math.min(s, fim - 0.4), fim);
      else onMudarJanela(inicio, Math.max(s, inicio + 0.4));
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
  }, [segundoDoEvento, onMover, onMudarJanela, inicio, fim]);

  function pegar(alvo: "cursor" | "inicio" | "fim") {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      arrasto.current = alvo;
      document.body.style.cursor = alvo === "cursor" ? "grabbing" : "ew-resize";
    };
  }

  const marcas: number[] = [];
  const passo = passoDaRegua(pxPorSeg);
  for (let s = 0; s <= duracao; s += passo) marcas.push(s);

  return (
    <div className="flex flex-col border-t border-zinc-800 bg-zinc-950">
      {/* ------------------------------------------------------ ferramentas */}
      <div className="flex items-center gap-3 border-b border-zinc-800/70 px-4 py-2">
        <span className="font-mono text-xs tabular-nums text-zinc-300">
          {mmss(agora)}
          <span className="text-zinc-600"> / {mmss(fim - inicio)}</span>
        </span>
        <span className="text-[11px] text-zinc-600">
          corte {mmss(inicio)}–{mmss(fim)}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => onZoom(Math.max(6, pxPorSeg / 1.5))}
            aria-label="Afastar"
            className="rounded-md p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <MagnifyingGlassMinus size={14} />
          </button>
          <button
            type="button"
            onClick={() => onZoom(Math.min(240, pxPorSeg * 1.5))}
            aria-label="Aproximar"
            className="rounded-md p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <MagnifyingGlassPlus size={14} />
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------- pista */}
      <div ref={pistaRef} className="relative overflow-x-auto overflow-y-hidden">
        <div style={{ width: largura }} className="relative select-none">
          {/* Régua. Clicar nela move o cursor — é o gesto que todo editor tem. */}
          <div
            onMouseDown={(e) => {
              onMover(segundoDoEvento(e.clientX));
              pegar("cursor")(e);
            }}
            className="relative h-6 cursor-pointer border-b border-zinc-800/70"
          >
            {marcas.map((s) => (
              <span
                key={s}
                style={{ left: px(s) }}
                className="absolute top-0 flex h-full flex-col justify-center border-l border-zinc-800 pl-1 font-mono text-[9px] tabular-nums text-zinc-600"
              >
                {mmss(s)}
              </span>
            ))}
          </div>

          {/* ------------------------------------------------ trilha vídeo */}
          <Trilha icone={<FilmStrip size={11} />} nome="Vídeo">
            {/* O que ficou FORA do corte segue visível e apagado: sem isso não
                dá pra saber que existe material pra recuperar esticando. */}
            <div className="absolute inset-y-1 left-0 right-0 rounded bg-zinc-900/60" />
            <div
              style={{ left: px(inicio), width: px(fim - inicio) }}
              className="absolute inset-y-1 rounded border border-blue-500/70 bg-gradient-to-b from-blue-600/35 to-blue-700/25"
            >
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center truncate px-6 text-[10px] font-medium text-blue-100">
                {mmss(fim - inicio)}
              </span>
              <button
                type="button"
                aria-label="Aparar o início"
                onMouseDown={pegar("inicio")}
                className="absolute inset-y-0 left-0 w-2.5 cursor-ew-resize rounded-l bg-blue-400 transition hover:bg-blue-300"
              />
              <button
                type="button"
                aria-label="Aparar o fim"
                onMouseDown={pegar("fim")}
                className="absolute inset-y-0 right-0 w-2.5 cursor-ew-resize rounded-r bg-blue-400 transition hover:bg-blue-300"
              />
            </div>
          </Trilha>

          {/* ----------------------------------------------- trilha legenda */}
          <Trilha icone={<TextT size={11} />} nome="Legenda">
            {legendas.map((b, i) => (
              <div
                key={`${b.inicio_s}-${i}`}
                style={{
                  left: px(b.inicio_s),
                  width: Math.max(px(b.fim_s - b.inicio_s), 3),
                }}
                title={b.texto}
                className="absolute inset-y-1.5 overflow-hidden rounded-sm border border-orange-600/50 bg-orange-600/20 px-1"
              >
                <span className="block truncate text-[9px] leading-4 text-orange-200/90">
                  {b.texto}
                </span>
              </div>
            ))}
            {legendas.length === 0 && (
              <span className="absolute inset-y-0 left-2 flex items-center text-[10px] text-zinc-700">
                sem transcrição para este corte
              </span>
            )}
          </Trilha>

          {/* Cursor por cima de tudo, sem capturar clique — quem recebe o
              arrasto é a régua, que é área muito maior e mais fácil de pegar. */}
          <div
            style={{ left: px(agora) }}
            className="pointer-events-none absolute inset-y-0 z-10 w-px bg-rose-500"
          >
            <span className="absolute -top-0 -left-1.5 h-2.5 w-3.5 rounded-b-sm bg-rose-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Trilha({
  icone,
  nome,
  children,
}: {
  icone: React.ReactNode;
  nome: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-11 border-b border-zinc-800/50">
      {/* sticky: o rótulo acompanha a rolagem horizontal, senão some assim
          que a pessoa navega pra frente na linha do tempo. */}
      <span className="sticky left-0 z-20 flex h-full w-20 shrink-0 items-center gap-1.5 border-r border-zinc-800/70 bg-zinc-950 px-2 text-[10px] font-medium text-zinc-500">
        {icone}
        {nome}
      </span>
      <div className="absolute inset-y-0 left-20 right-0">{children}</div>
    </div>
  );
}
