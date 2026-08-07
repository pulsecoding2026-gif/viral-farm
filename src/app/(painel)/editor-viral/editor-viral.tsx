"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  Export,
  CircleNotch,
  FilmSlate,
  ArrowCounterClockwise,
  Info,
} from "@phosphor-icons/react/dist/ssr";
import type { CorteNaEstante } from "@/lib/analises-db";
import { acharFormato } from "@/lib/formatos";
import { SeletorFormatoCompacto } from "../seletor-formato";
import { LinhaDoTempo, type BlocoLegenda } from "./linha-do-tempo";

/**
 * Editor Viral IA — o ajuste na mão do que o Analisador entregou automático.
 *
 * A estrutura é a do CapCut porque é a que todo mundo já sabe usar: estante
 * à esquerda, prévia no meio, propriedades à direita, linha do tempo embaixo.
 *
 * QUEM RENDERIZA CONTINUA SENDO A VPS. O navegador não corta vídeo aqui: ele
 * monta a DESCRIÇÃO da edição (janela de tempo, formato) e manda pro worker,
 * que reusa o mesmo ffmpeg dos cortes automáticos. Editor de verdade no
 * browser exigiria WebCodecs e reescreveria o pipeline inteiro pra entregar
 * um resultado diferente do que sai na produção — dois motores divergindo é
 * pior que um só.
 */

function mmss(s: number): string {
  const m = Math.floor(Math.max(0, s) / 60);
  const seg = Math.floor(Math.max(0, s) % 60);
  return `${m}:${String(seg).padStart(2, "0")}`;
}

export function EditorViral({
  cortesIniciais,
}: {
  cortesIniciais: CorteNaEstante[];
}) {
  const [cortes] = useState(cortesIniciais);
  const [abertoId, setAbertoId] = useState<string | null>(
    cortesIniciais[0]?.id ?? null,
  );
  const aberto = cortes.find((c) => c.id === abertoId) ?? null;

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[560px] flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      {aberto ? (
        <Sessao
          key={aberto.id}
          corte={aberto}
          cortes={cortes}
          onAbrir={setAbertoId}
        />
      ) : (
        <Vazio />
      )}
    </div>
  );
}

function Vazio() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <FilmSlate size={30} className="text-zinc-700" />
      <p className="text-sm font-medium text-zinc-300">
        Nenhum corte pronto pra editar
      </p>
      <p className="max-w-[42ch] text-xs leading-relaxed text-zinc-500">
        O Editor abre em cima do que o Analisador entrega. Rode uma análise
        primeiro — quando os cortes ficarem prontos, eles aparecem aqui.
      </p>
      <a
        href="/analisador"
        className="mt-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
      >
        Ir para o Analisador
      </a>
    </div>
  );
}

/**
 * Uma sessão de edição. `key` no corte remonta o componente inteiro ao trocar
 * de clipe — sem isso, o estado de janela e cursor vazaria de um pro outro.
 */
function Sessao({
  corte,
  cortes,
  onAbrir,
}: {
  corte: CorteNaEstante;
  cortes: CorteNaEstante[];
  onAbrir: (id: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);

  /** Duração do MP4 renderizado, descoberta quando os metadados carregam. */
  const [duracaoArquivo, setDuracaoArquivo] = useState(corte.fim_s - corte.inicio_s);
  const [tocando, setTocando] = useState(false);
  const [agora, setAgora] = useState(0);
  const [pxPorSeg, setPxPorSeg] = useState(28);

  // Janela EM TEMPO DO ARQUIVO renderizado (começa em 0), não em tempo do
  // vídeo original. É o que o <video> entende e o que a prévia consegue
  // mostrar sem re-renderizar.
  const [inicio, setInicio] = useState(0);
  const [fim, setFim] = useState(corte.fim_s - corte.inicio_s);
  const [formato, setFormato] = useState(acharFormato(corte.estilo).id);

  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  /**
   * A pessoa já encostou na janela?
   *
   * Sem esta marca, o editor confundia "não mexeram" com "a janela do banco
   * não bate com o arquivo". Ela nunca bate exatamente: o banco guarda a
   * janela PEDIDA e o ffmpeg entrega o keyframe mais próximo, então sobram
   * frações de segundo. O resultado era Renderizar e Desfazer habilitados
   * num corte intocado — e um render inútil se alguém clicasse.
   */
  const [janelaTocada, setJanelaTocada] = useState(false);

  const mexido = janelaTocada || formato !== acharFormato(corte.estilo).id;

  // O <video> é a fonte da verdade do tempo; o cursor apenas o reflete.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const aoTempo = () => {
      setAgora(v.currentTime);
      // Parar no fim da janela é o que faz a aparagem ser SENTIDA na prévia
      // em vez de só desenhada na linha do tempo.
      if (v.currentTime >= fim) {
        v.pause();
        v.currentTime = inicio;
        setTocando(false);
      }
    };
    const aoMeta = () => {
      const real = v.duration;
      if (!Number.isFinite(real) || real <= 0) return;
      setDuracaoArquivo(real);
      // Enquanto ninguém encostou, a janela É o arquivo inteiro. Só a
      // duração real vale: a do banco é a janela pedida, e o ffmpeg entrega
      // o keyframe mais próximo.
      setFim((f) => (janelaTocada ? f : real));
    };
    v.addEventListener("timeupdate", aoTempo);
    v.addEventListener("loadedmetadata", aoMeta);
    return () => {
      v.removeEventListener("timeupdate", aoTempo);
      v.removeEventListener("loadedmetadata", aoMeta);
    };
  }, [inicio, fim, janelaTocada]);

  function alternar() {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      if (v.currentTime < inicio || v.currentTime >= fim) v.currentTime = inicio;
      void v.play();
      setTocando(true);
    } else {
      v.pause();
      setTocando(false);
    }
  }

  function irPara(s: number) {
    const v = video.current;
    const alvo = Math.max(0, Math.min(s, duracaoArquivo));
    if (v) v.currentTime = alvo;
    setAgora(alvo);
  }

  /**
   * A janela do editor é relativa ao arquivo; o worker corta o vídeo ORIGINAL.
   * A conversão é somar o início do corte original — sem isso, aparar 2s aqui
   * pediria os 2 primeiros segundos do vídeo de 20 minutos.
   */
  async function exportar() {
    setAviso(null);
    setEnviando(true);
    try {
      const r = await fetch(`/api/cortes/${corte.id}/reeditar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inicio_s: corte.inicio_s + inicio,
          fim_s: corte.inicio_s + fim,
          estilo: formato,
        }),
      });
      const dados = await r.json().catch(() => ({}));
      if (!r.ok) {
        setAviso(dados.erro ?? "Não consegui mandar pra renderização.");
        return;
      }
      setAviso(
        "Mandado pra renderização. O corte aparece atualizado no Analisador quando ficar pronto.",
      );
    } catch {
      setAviso("Falha de rede. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  // Sem transcrição por corte ainda: a trilha existe e fica honestamente
  // vazia em vez de desenhar blocos inventados.
  const legendas = useMemo<BlocoLegenda[]>(() => [], []);

  return (
    <>
      {/* ------------------------------------------------------------ topo */}
      <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800 px-4 py-2.5">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-zinc-100">
            {corte.titulo}
          </span>
          {corte.origem && (
            <span className="block truncate text-[11px] text-zinc-600">
              de “{corte.origem}”
            </span>
          )}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {mexido && (
            <button
              type="button"
              onClick={() => {
                setInicio(0);
                setFim(duracaoArquivo);
                setFormato(acharFormato(corte.estilo).id);
                setJanelaTocada(false);
                irPara(0);
              }}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-100"
            >
              <ArrowCounterClockwise size={13} />
              Desfazer tudo
            </button>
          )}
          <button
            type="button"
            onClick={exportar}
            disabled={enviando || !mexido}
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enviando ? (
              <CircleNotch size={15} className="animate-spin" />
            ) : (
              <Export size={15} weight="bold" />
            )}
            {enviando ? "Enviando…" : "Renderizar"}
          </button>
        </div>
      </div>

      {aviso && (
        <p className="shrink-0 border-b border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs text-zinc-300">
          {aviso}
        </p>
      )}

      {/* -------------------------------------------- estante | prévia | ... */}
      <div className="flex min-h-0 flex-1">
        {/* estante */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-800 lg:flex">
          <p className="border-b border-zinc-800/70 px-3 py-2 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
            Seus cortes
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {cortes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onAbrir(c.id)}
                className={
                  "mb-1 flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition " +
                  (c.id === corte.id
                    ? "bg-orange-600/15 ring-1 ring-orange-700/60"
                    : "hover:bg-white/[0.05]")
                }
              >
                <span className="truncate text-[12px] font-medium text-zinc-100">
                  {c.titulo}
                </span>
                <span className="font-mono text-[10px] tabular-nums text-zinc-600">
                  {mmss(c.fim_s - c.inicio_s)} · {acharFormato(c.estilo).nome}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* prévia */}
        <div className="flex min-w-0 flex-1 flex-col bg-black/40">
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <video
              ref={video}
              src={corte.url}
              playsInline
              onClick={alternar}
              className="max-h-full max-w-full cursor-pointer rounded-lg bg-black shadow-2xl shadow-black/60"
              style={{ aspectRatio: "9 / 16" }}
            />
          </div>
          <div className="flex shrink-0 items-center justify-center gap-3 border-t border-zinc-800/70 py-2">
            <button
              type="button"
              onClick={alternar}
              aria-label={tocando ? "Pausar" : "Reproduzir"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-100 transition hover:bg-zinc-700"
            >
              {tocando ? (
                <Pause size={15} weight="fill" />
              ) : (
                <Play size={15} weight="fill" />
              )}
            </button>
          </div>
        </div>

        {/* propriedades */}
        <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-l border-zinc-800 p-3 xl:flex">
          <p className="mb-2 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
            Propriedades
          </p>

          <Campo rotulo="Duração">
            <span className="font-mono tabular-nums">{mmss(fim - inicio)}</span>
            {mexido && (
              <span className="ml-1.5 text-zinc-600 line-through">
                {mmss(duracaoArquivo)}
              </span>
            )}
          </Campo>
          <Campo rotulo="No vídeo original">
            <span className="font-mono text-[11px] tabular-nums">
              {mmss(corte.inicio_s + inicio)}–{mmss(corte.inicio_s + fim)}
            </span>
          </Campo>

          <div className="mt-3 border-t border-zinc-800/70 pt-3">
            <p className="mb-1 text-[11px] font-medium text-zinc-400">Formato</p>
            <SeletorFormatoCompacto
              valor={formato}
              motivo={
                formato !== acharFormato(corte.estilo).id ? "trocado por você" : null
              }
              onEscolher={setFormato}
            />
          </div>

          <p className="mt-4 flex items-start gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5 text-[10px] leading-relaxed text-zinc-500">
            <Info size={12} className="mt-px shrink-0 text-zinc-600" />
            A prévia mostra o corte como ele está hoje. Aparar encurta aqui na
            hora; trocar o formato só aparece depois de renderizar.
          </p>
        </aside>
      </div>

      {/* ------------------------------------------------- linha do tempo */}
      <LinhaDoTempo
        duracao={duracaoArquivo}
        inicio={inicio}
        fim={fim}
        agora={agora}
        legendas={legendas}
        pxPorSeg={pxPorSeg}
        onZoom={setPxPorSeg}
        onMover={irPara}
        onMudarJanela={(i, f) => {
          setInicio(i);
          setFim(f);
          setJanelaTocada(true);
        }}
      />
    </>
  );
}

function Campo({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1 text-xs">
      <span className="text-zinc-500">{rotulo}</span>
      <span className="text-zinc-200">{children}</span>
    </div>
  );
}
