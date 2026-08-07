"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowsInCardinal } from "@phosphor-icons/react/dist/ssr";
import type { Enquadramento } from "@/lib/editor/projeto";
import {
  arrastoEmFracao,
  centralizar,
  medidasValidas,
  moverEnquadramento,
  noPadrao,
  prender,
  rotuloDeZoom,
  zoomAncorado,
  type Dimensoes,
  type Medidas,
} from "@/lib/editor/enquadrar-calc";

/**
 * Enquadrar — mexer no quadro DO CLIPE arrastando e rolando na própria prévia.
 *
 * O enquadramento já existia no modelo e no render; o que faltava era a mão. A
 * proporção de saída é UMA só pro vídeo inteiro (`Projeto.proporcao`); o que
 * muda por clipe é este recorte — aproximar o rosto num trecho e abrir o plano
 * no outro. Fazer isso por campo numérico no Inspector é possível e é horrível:
 * ninguém enquadra um rosto digitando 0,42.
 *
 * ESTE ARQUIVO NÃO TEM CONTA NENHUMA. Toda a matemática mora em
 * `src/lib/editor/enquadrar-calc.ts`, que o `worker/testar-enquadrar.ts`
 * confere contra o filtro do ffmpeg. Aqui só há DOM: medir o retângulo na
 * tela, escutar mouse e devolver o `Enquadramento` novo. Enquanto a conta
 * estava dentro do componente ela não tinha como ser testada sem navegador —
 * e conta de enquadramento que diverge do worker é a pessoa vendo uma coisa na
 * prévia e recebendo outra no MP4.
 *
 * DIFERENTE do `SafeArea`, esta camada CAPTURA o clique: ela é uma ferramenta,
 * não um guia. Por isso o clique que fecha um arrasto é engolido (senão
 * reposicionar o quadro pausaria o vídeo) e o clique seco continua passando
 * pra prévia.
 *
 * Uso — o pai já é `position: relative` e recorta com `overflow-hidden`:
 *
 *   <div className="relative overflow-hidden" onClick={alternar}>
 *     <video … />
 *     <Enquadrar
 *       enquadramento={clipeAtual.enquadramento}
 *       fonte={medida}
 *       saida={PROPORCOES[projeto.proporcao]}
 *       ativo={enquadrando}
 *       onMudar={(e) => mudarItem({ enquadramento: e })}
 *     />
 *   </div>
 */

type Props = {
  /** Enquadramento do CLIPE que está sob o cursor de tempo. */
  enquadramento: Enquadramento;
  /** Dimensões do vídeo ORIGINAL — não as da prévia na tela. */
  fonte: Dimensoes;
  /** Dimensões do quadro de saída (`PROPORCOES[projeto.proporcao]`). */
  saida: Dimensoes;
  /** Interruptor de quem está olhando: `false` não desenha nada. */
  ativo: boolean;
  /** O valor inteiro, já preso às bordas. Quem chama guarda no projeto. */
  onMudar: (novo: Enquadramento) => void;
};

/** Uma rolada de mouse (deltaY ≈ 100) dá ~12% de zoom. */
const SENSIBILIDADE = 0.0012;

/** deltaMode 1 vem em LINHAS; 16px é a altura de linha padrão do navegador. */
const PIXELS_POR_LINHA = 16;

/** Pinça de trackpad manda deltaY pequeno com ctrlKey; sem isso ela quase não anda. */
const GANHO_DA_PINCA = 4;

/** Abaixo disto o gesto foi um clique trêmulo, não um arrasto. */
const FOLGA_DO_CLIQUE = 3;

/** Rastro da grade depois que o gesto acaba, pra ela não sumir com um piscar. */
const RASTRO_MS = 400;

type Arrasto = {
  /** Onde o gesto começou, em coordenada de janela. */
  px: number;
  py: number;
  /** O enquadramento no início do gesto — o delta é sempre TOTAL, nunca somado
   *  quadro a quadro: acumular incremento preso na borda faz o vídeo "escapar"
   *  do mouse ao voltar. */
  base: Enquadramento;
  /** Tamanho da prévia na tela quando o gesto começou. */
  quadro: Dimensoes;
  moveu: boolean;
};

export function Enquadrar(props: Props) {
  // Fora antes de qualquer hook, de propósito: `Ajuste` monta e desmonta
  // inteiro com o interruptor, e não sobra listener de mouse pendurado na
  // window quando a pessoa desliga a ferramenta pra ver a prévia limpa.
  if (!props.ativo) return null;
  // Sem o metadado do vídeo (largura/altura ainda em zero) não há o que
  // enquadrar — e a conta dividiria por zero.
  if (!medidasValidas({ fonte: props.fonte, saida: props.saida })) return null;
  return <Ajuste {...props} />;
}

function Ajuste({ enquadramento, fonte, saida, onMudar }: Props) {
  const caixa = useRef<HTMLDivElement | null>(null);
  const arrasto = useRef<Arrasto | null>(null);
  const engolirClique = useRef(false);
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [arrastando, setArrastando] = useState(false);
  const [rastro, setRastro] = useState(false);

  /**
   * Espelho vivo das props.
   *
   * Os listeners são registrados UMA vez e leem daqui; se lessem da closure,
   * cada gesto usaria o valor de quando o listener foi criado. O campo
   * `enquadramento` também é escrito OTIMISTA em `emitir()`: duas roladas de
   * mouse no mesmo frame acontecem antes de o pai re-renderizar, e sem isso a
   * segunda partiria do zoom antigo e a rolagem "engasgaria".
   */
  const vivo = useRef({ enquadramento, fonte, saida, onMudar });
  useEffect(() => {
    vivo.current = { enquadramento, fonte, saida, onMudar };
  });

  const medidas = useCallback(
    (): Medidas => ({ fonte: vivo.current.fonte, saida: vivo.current.saida }),
    [],
  );

  const emitir = useCallback((novo: Enquadramento) => {
    const antes = vivo.current.enquadramento;
    // Mouse parado ou gesto preso na borda repetiria o mesmo valor e faria o
    // pai re-renderizar o editor inteiro a cada mousemove.
    if (novo.x === antes.x && novo.y === antes.y && novo.zoom === antes.zoom) {
      return;
    }
    vivo.current = { ...vivo.current, enquadramento: novo };
    vivo.current.onMudar(novo);
  }, []);

  const acenderGrade = useCallback((ms: number) => {
    setRastro(true);
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = setTimeout(() => setRastro(false), ms);
  }, []);

  useEffect(() => {
    return () => {
      if (relogio.current) clearTimeout(relogio.current);
    };
  }, []);

  /* ------------------------------------------------------------- arrasto */

  useEffect(() => {
    /**
     * NA WINDOW, não no elemento.
     *
     * Mouse rápido sai da prévia no meio do gesto — e um `mousemove` preso ao
     * elemento simplesmente pararia de chegar, largando o vídeo no meio do
     * caminho. `mouseup` na window também é o que garante o fim do arrasto
     * quando a pessoa solta o botão fora da prévia.
     */
    function mover(ev: MouseEvent) {
      const a = arrasto.current;
      if (!a) return;
      const dxPx = ev.clientX - a.px;
      const dyPx = ev.clientY - a.py;
      if (!a.moveu && Math.abs(dxPx) + Math.abs(dyPx) > FOLGA_DO_CLIQUE) {
        a.moveu = true;
      }
      const m = medidas();
      const d = arrastoEmFracao(dxPx, dyPx, a.quadro, a.base.zoom, m);
      emitir(moverEnquadramento(a.base, d.dx, d.dy, m));
    }

    function soltar() {
      const a = arrasto.current;
      if (!a) return;
      // Só o clique que FECHA um arrasto é engolido; um clique seco continua
      // descendo pra prévia, que é quem dá play/pause.
      engolirClique.current = a.moveu;
      arrasto.current = null;
      setArrastando(false);
      acenderGrade(RASTRO_MS);
    }

    window.addEventListener("mousemove", mover);
    window.addEventListener("mouseup", soltar);
    return () => {
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("mouseup", soltar);
    };
  }, [acenderGrade, emitir, medidas]);

  function comecar(ev: React.MouseEvent<HTMLDivElement>) {
    if (ev.button !== 0) return;
    const el = caixa.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    // Sem isto o navegador entra no arrasto NATIVO do vídeo (fantasma da
    // imagem colado no cursor) e a seleção de texto pinta a página.
    ev.preventDefault();

    arrasto.current = {
      px: ev.clientX,
      py: ev.clientY,
      base: prender(vivo.current.enquadramento, medidas()),
      quadro: { largura: r.width, altura: r.height },
      moveu: false,
    };
    setArrastando(true);
    if (relogio.current) clearTimeout(relogio.current);
    setRastro(false);
  }

  /* ---------------------------------------------------------------- zoom */

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;

    /**
     * `addEventListener` com `{ passive: false }` em vez do `onWheel` do React:
     * o React registra wheel como PASSIVO, onde `preventDefault()` é ignorado —
     * a pessoa daria zoom no clipe e a página rolaria junto.
     */
    function rolar(ev: WheelEvent) {
      ev.preventDefault();
      const alvo = caixa.current;
      if (!alvo) return;
      const r = alvo.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;

      // deltaMode normalizado: 0 = pixel, 1 = linha, 2 = página.
      const bruto =
        ev.deltaMode === 1
          ? ev.deltaY * PIXELS_POR_LINHA
          : ev.deltaMode === 2
            ? ev.deltaY * r.height
            : ev.deltaY;
      const passo = bruto * (ev.ctrlKey ? GANHO_DA_PINCA : 1);
      // Exponencial: cada rolada multiplica, então a sensação é a mesma perto
      // de 1 e perto de 3. Somar passo fixo é rápido demais em baixo e lento
      // demais em cima.
      const fator = Math.exp(-passo * SENSIBILIDADE);

      const m = medidas();
      const novo = zoomAncorado(
        vivo.current.enquadramento,
        fator,
        (ev.clientX - r.left) / r.width,
        (ev.clientY - r.top) / r.height,
        m,
      );

      // Rolar NO MEIO de um arrasto muda a escala do gesto: a base envelheceu,
      // então o arrasto recomeça daqui, do cursor onde ele está.
      if (arrasto.current) {
        arrasto.current = {
          ...arrasto.current,
          px: ev.clientX,
          py: ev.clientY,
          base: novo,
          quadro: { largura: r.width, altura: r.height },
        };
      }

      emitir(novo);
      acenderGrade(RASTRO_MS + 300);
    }

    el.addEventListener("wheel", rolar, { passive: false });
    return () => el.removeEventListener("wheel", rolar);
  }, [acenderGrade, emitir, medidas]);

  /* ---------------------------------------------------------------- tela */

  function aoClicar(ev: React.MouseEvent<HTMLDivElement>) {
    if (!engolirClique.current) return;
    engolirClique.current = false;
    ev.stopPropagation();
  }

  const grade = arrastando || rastro;
  const jaCentral = noPadrao(enquadramento);

  return (
    <div
      ref={caixa}
      onMouseDown={comecar}
      onClick={aoClicar}
      title="Arraste pra mover o quadro, role pra dar zoom"
      className={
        "group absolute inset-0 z-10 select-none " +
        (arrastando ? "cursor-grabbing" : "cursor-grab")
      }
    >
      {/* Moldura discreta: é o que diz que a prévia está EDITÁVEL agora. */}
      <div className="pointer-events-none absolute inset-0 border border-orange-500/25" />

      {/* Grade de terços — guia de composição, só durante o gesto. Deixá-la
          sempre acesa vira sujeira em cima do vídeo. */}
      {grade && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-1/3 w-px bg-white/25" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-white/25" />
          <div className="absolute inset-x-0 top-1/3 h-px bg-white/25" />
          <div className="absolute inset-x-0 top-2/3 h-px bg-white/25" />
        </div>
      )}

      <div
        className={
          "absolute inset-x-1.5 bottom-1.5 flex items-center justify-between gap-2 transition-opacity " +
          (arrastando ? "opacity-100" : "opacity-70 group-hover:opacity-100")
        }
      >
        <span className="pointer-events-none rounded-md bg-black/65 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-zinc-100 backdrop-blur">
          {rotuloDeZoom(enquadramento.zoom)}
        </span>

        <button
          type="button"
          // O mousedown PRECISA parar aqui: sem isso o botão inicia um arrasto
          // e o clique nunca chega. O clique é parado pra não pausar o vídeo.
          onMouseDown={(ev) => ev.stopPropagation()}
          onClick={(ev) => {
            ev.stopPropagation();
            onMudar(centralizar(enquadramento));
          }}
          disabled={jaCentral}
          className="flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-zinc-200 backdrop-blur transition hover:bg-black/85 hover:text-white disabled:pointer-events-none disabled:opacity-0"
        >
          <ArrowsInCardinal size={11} />
          Centralizar
        </button>
      </div>
    </div>
  );
}
