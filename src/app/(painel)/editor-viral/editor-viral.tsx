"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle,
  CircleNotch,
  Export,
  FilmSlate,
  Info,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  Pause,
  Play,
  Scissors,
  Trash,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { CorteNaEstante } from "@/lib/analises-db";
import { acharFormato } from "@/lib/formatos";
import {
  ENQUADRAMENTO_PADRAO,
  PROPORCOES,
  dividirVideo,
  duracaoDoProjeto,
  enquadramentoEm,
  projetoVazio,
  type Enquadramento,
  type Item,
  type ItemVideo,
  type Projeto,
  type Proporcao,
  type Trilha,
} from "@/lib/editor/projeto";
import { useHistorico } from "@/lib/editor/historico";
import { SeletorFormatoCompacto } from "../seletor-formato";
import { Inspector } from "./inspector";
import { Trilhas } from "./trilhas";
import { useAtalhos } from "./atalhos";
import { SafeArea, SeletorPlataforma, type Plataforma } from "./safe-area";

/**
 * Editor Viral IA — a edição NÃO-DESTRUTIVA de um corte pronto.
 *
 * A estrutura é a do CapCut porque é a que todo mundo já sabe usar: estante à
 * esquerda, prévia no meio, propriedades à direita, linha do tempo embaixo.
 *
 * O que mudou por dentro: o editor não guarda mais "início e fim do clipe" —
 * ele guarda um `Projeto` (src/lib/editor/projeto.ts), a EDL inteira. Toda
 * operação daqui muda número naquele documento e nada mais; pixel só é
 * produzido uma vez, quando a pessoa manda renderizar. Antes disso, cada
 * ajuste virava um render de minutos numa VPS de um núcleo.
 *
 * QUEM RENDERIZA CONTINUA SENDO A VPS. O navegador desenha uma APROXIMAÇÃO do
 * enquadramento por cima do vídeo (mesma conta do worker, ver `moldura()`), e
 * o MP4 final sai do ffmpeg de sempre. Editor de verdade no browser exigiria
 * WebCodecs e um segundo motor divergindo do de produção.
 */

/* ------------------------------------------------------------- utilitários */

function mmss(s: number): string {
  const m = Math.floor(Math.max(0, s) / 60);
  const seg = Math.floor(Math.max(0, s) % 60);
  return `${m}:${String(seg).padStart(2, "0")}`;
}

function limite(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(v, max));
}

/**
 * Itens de uma trilha, sem criar trilha nenhuma.
 *
 * De propósito NÃO usa `trilhaDe()` do modelo: aquela função insere a trilha
 * que falta, e chamá-la durante a renderização mutaria o objeto que está no
 * estado do React — mudança que a tela não vê e que some no próximo `setState`.
 */
function itensDaTrilha(p: Projeto, tipo: Trilha["tipo"]): Item[] {
  return p.trilhas.find((t) => t.tipo === tipo)?.itens ?? [];
}

/** Os clipes de vídeo em ordem de linha do tempo. */
function clipesDeVideo(p: Projeto): ItemVideo[] {
  return (itensDaTrilha(p, "video") as ItemVideo[])
    .slice()
    .sort((a, b) => a.inicio_s - b.inicio_s);
}

function clipeEm(clipes: ItemVideo[], t: number): ItemVideo | null {
  return clipes.find((c) => t >= c.inicio_s && t < c.fim_s) ?? null;
}

/** Troca UM item de lugar na trilha onde ele mora, sem tocar nas outras. */
function mapearItem(p: Projeto, id: string, f: (it: Item) => Item): Projeto {
  return {
    ...p,
    trilhas: p.trilhas.map((t) =>
      t.itens.some((i) => i.id === id)
        ? { ...t, itens: t.itens.map((i) => (i.id === id ? f(i) : i)) }
        : t,
    ),
  };
}

/**
 * O que este projeto pede e o render ainda NÃO entrega.
 *
 * DUPLICAÇÃO PROPOSITAL de `avisosDoProjeto()` (worker/render-projeto.ts). O
 * worker é código de Node — ffmpeg, sistema de arquivos, chave de serviço — e
 * importar qualquer coisa de lá arrastaria o módulo pro pacote do navegador.
 * O critério é o MESMO nos dois lados, e é assim que tem que continuar: quem
 * ensinar o render a fazer alguma destas coisas apaga o aviso nos dois lugares.
 */
function avisosDoProjetoNaUI(p: Projeto): string[] {
  const avisos: string[] = [];
  const videos = itensDaTrilha(p, "video") as ItemVideo[];

  // Buraco entre clipes: o concat do ffmpeg COLA um clipe no outro — ele só
  // conhece as janelas da fonte, não a posição na linha. Um vazio deixado ao
  // aparar some no MP4 e o vídeo sai mais curto que a prévia mostrou. É a
  // divergência prévia↔render mais séria, porque só aparece depois do render.
  {
    const ordem = [...videos].sort((a, b) => a.inicio_s - b.inicio_s);
    const TOLERANCIA = 1 / 30; // um frame a 30fps; abaixo disso é ruído.
    let vazio =
      ordem.length > 0 && ordem[0].inicio_s > TOLERANCIA ? ordem[0].inicio_s : 0;
    for (let i = 1; i < ordem.length; i++) {
      const vao = ordem[i].inicio_s - ordem[i - 1].fim_s;
      if (vao > TOLERANCIA) vazio += vao;
    }
    if (vazio > 0) {
      avisos.push(
        `Há ${vazio.toFixed(1)}s de vazio entre os clipes. O render cola um ` +
          `clipe no outro, então o vídeo final sai mais curto — encoste os ` +
          `clipes se não era isso que você queria.`,
      );
    }
  }

  if (videos.some((v) => v.keyframes.length > 0)) {
    avisos.push(
      "Keyframes de enquadramento ainda não animam no render — sai o valor inicial do clipe.",
    );
  }
  // Efeitos e transições SAÍRAM desta lista quando o render aprendeu a
  // fazê-los (worker/render-projeto.ts). O comentário do cabeçalho manda
  // apagar nos dois lugares justamente pra este aviso não sobreviver ao que
  // ele descrevia — aviso obsoleto ensina a ignorar todos os outros.
  if (videos.some((v) => v.enquadramento.rotacao !== 0)) {
    avisos.push("Rotação ainda não entra no render.");
  }
  if (itensDaTrilha(p, "texto").length > 0) {
    avisos.push("Textos avulsos ainda não entram no render.");
  }
  if (itensDaTrilha(p, "overlay").length > 0) {
    avisos.push("Overlays ainda não entram no render.");
  }
  if (itensDaTrilha(p, "audio").length > 0) {
    avisos.push("Trilha de áudio ainda não entra no render.");
  }
  return avisos;
}

/**
 * O projeto de um corte que nunca foi aberto no editor.
 *
 * Um clipe só, cobrindo o corte inteiro: na linha do tempo ele começa em zero,
 * e na FONTE ele é exatamente a janela que o Analisador escolheu. É a diferença
 * que o modelo cobra na regra 2 — o arquivo renderizado começa em 0, o material
 * original não.
 */
function montarProjeto(corte: CorteNaEstante): Projeto {
  const duracao = Math.max(0.5, corte.fim_s - corte.inicio_s);
  const clipe: ItemVideo = {
    id: crypto.randomUUID(),
    tipo: "video",
    inicio_s: 0,
    fim_s: duracao,
    fonteInicio_s: corte.inicio_s,
    fonteFim_s: corte.fim_s,
    enquadramento: { ...ENQUADRAMENTO_PADRAO },
    keyframes: [],
    volume: 1,
    efeitos: [],
    transicao: null,
  };

  const vazio = projetoVazio({
    corteId: corte.id,
    analiseId: corte.analise_id,
    // Com proxy, a prévia é o material ORIGINAL e dá pra esticar o clipe pra
    // antes de onde o corte começa. Sem ele, cai no MP4 já renderizado e a
    // edição fica presa àquela janela — o editor avisa isso na tela.
    proxyUrl: corte.proxy_url,
    // A duração do vídeo ORIGINAL não vem na estante. O fim do corte é o
    // melhor piso conhecido e é tudo que a interface faz com este número —
    // quem sabe a duração de verdade é quem gera o proxy, e é lá que ela é
    // corrigida.
    duracao_s: corte.fim_s,
  });

  return {
    ...vazio,
    // O formato que a IA escolheu pro corte continua valendo; cair no padrão
    // do modelo trocaria o estilo de legenda sem ninguém pedir.
    formato: acharFormato(corte.estilo).id,
    trilhas: vazio.trilhas.map((t) =>
      t.tipo === "video" ? { ...t, itens: [clipe as Item] } : t,
    ),
  };
}

/**
 * Onde o vídeo se apoia dentro do quadro de saída, em PORCENTAGEM do quadro.
 *
 * É a mesma conta de `filtroDeEnquadramento()` no worker — escala que cobre ×
 * zoom, recorte preso às bordas — só que em porcentagem em vez de pixel. Em
 * porcentagem a prévia não precisa medir nada e sai igual numa janela de 320px
 * e num render de 1080 (regra 3 do modelo).
 */
function moldura(
  fonte: { largura: number; altura: number },
  saida: { largura: number; altura: number },
  e: Enquadramento,
) {
  if (fonte.largura <= 0 || fonte.altura <= 0) {
    return { largura: "100%", altura: "100%", esquerda: "0%", topo: "0%" };
  }
  const cobrir = Math.max(
    saida.largura / fonte.largura,
    saida.altura / fonte.altura,
  );
  const escala = cobrir * Math.max(1, e.zoom);
  const largura = fonte.largura * escala;
  const altura = fonte.altura * escala;
  const x = limite(
    e.x * largura - saida.largura / 2,
    0,
    Math.max(0, largura - saida.largura),
  );
  const y = limite(
    e.y * altura - saida.altura / 2,
    0,
    Math.max(0, altura - saida.altura),
  );

  return {
    largura: `${(largura / saida.largura) * 100}%`,
    altura: `${(altura / saida.altura) * 100}%`,
    esquerda: `${(-x / saida.largura) * 100}%`,
    topo: `${(-y / saida.altura) * 100}%`,
  };
}

/* ------------------------------------------------------------------ tela */

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

/** Onde o documento está em relação ao banco. */
type Salvamento = "limpo" | "pendente" | "salvando" | "salvo" | "erro";

/** Folga da divisão — o mesmo piso que `dividirVideo()` cobra no modelo. */
const MINIMO_DIVISAO = 0.3;

/**
 * Uma sessão de edição. `key` no corte remonta o componente inteiro ao trocar
 * de clipe — sem isso, projeto, cursor e seleção vazariam de um pro outro.
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
  const area = useRef<HTMLDivElement>(null);

  /**
   * O documento vive num HISTÓRICO, não num useState solto.
   *
   * `aplicar` empilha um passo desfazível; `reiniciar` troca o documento SEM
   * criar passo — que é o certo pra carregar da API e pra corrigir a duração
   * na abertura. Abrir um corte não é editá-lo, e um Ctrl+Z logo depois de
   * abrir não pode desfazer o próprio carregamento.
   */
  const historico = useHistorico<Projeto | null>(null);
  const projeto = historico.estado;
  const { aplicar, reiniciar } = historico;

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [plataforma, setPlataforma] = useState<Plataforma>("tiktok");

  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [agora, setAgora] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [pxPorSeg, setPxPorSeg] = useState(28);

  /** Tamanho REAL do arquivo da prévia, descoberto nos metadados. */
  const [medida, setMedida] = useState({ largura: 0, altura: 0 });
  const [duracaoArquivo, setDuracaoArquivo] = useState(0);
  /** Espaço livre pra prévia. Medido, porque o quadro tem que caber inteiro. */
  const [espaco, setEspaco] = useState({ largura: 0, altura: 0 });

  const [salvamento, setSalvamento] = useState<Salvamento>("limpo");
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [recado, setRecado] = useState<string | null>(null);

  /** Qual clipe o <video> está tocando agora. Ref: muda no meio do quadro. */
  const tocandoId = useRef<string | null>(null);
  /**
   * Projeto montado do zero, ainda sem passar pelo arquivo.
   *
   * A janela que o banco guarda é a PEDIDA; o ffmpeg entrega o keyframe mais
   * próximo, então o MP4 quase nunca tem a duração exata do corte. Enquanto
   * ninguém encostou, quem manda é o arquivo.
   */
  const ajustarPelaDuracao = useRef(false);

  /* ----------------------------------------------------------- abertura */

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch(`/api/cortes/${corte.id}/projeto`);
        const dados = (await r.json().catch(() => ({}))) as {
          projeto?: Projeto | null;
          erro?: string;
        };
        if (!vivo) return;
        if (!r.ok) {
          setErro(dados.erro ?? "Não consegui abrir o projeto deste corte.");
          return;
        }
        // `projeto: null` é resposta normal: corte que nunca foi editado.
        if (dados.projeto) {
          /**
           * O proxy é REconferido a cada abertura, nunca confiado ao que foi
           * salvo.
           *
           * Ele nasce depois da análise (é a última coisa que o worker faz),
           * então um projeto criado antes dele guardou `null` — e sem esta
           * linha guardaria pra sempre, deixando o editor preso ao corte
           * renderizado mesmo com o material inteiro já disponível. O
           * caminho contrário também vale: proxy apagado volta a ser null em
           * vez de virar uma URL quebrada na prévia.
           */
          reiniciar({
            ...dados.projeto,
            fonte: { ...dados.projeto.fonte, proxyUrl: corte.proxy_url },
          });
        } else {
          ajustarPelaDuracao.current = true;
          reiniciar(montarProjeto(corte));
        }
      } catch {
        if (vivo) setErro("Falha de rede ao abrir o projeto.");
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [corte]);

  /* -------------------------------------------------------- o que deriva */

  const clipes = useMemo(
    () => (projeto ? clipesDeVideo(projeto) : []),
    [projeto],
  );

  const selecionado = useMemo<Item | null>(() => {
    if (!projeto || !selecionadoId) return null;
    for (const t of projeto.trilhas) {
      const achado = t.itens.find((i) => i.id === selecionadoId);
      if (achado) return achado;
    }
    return null;
  }, [projeto, selecionadoId]);

  const avisos = useMemo(
    () => (projeto ? avisosDoProjetoNaUI(projeto) : []),
    [projeto],
  );

  const proxyUrl = projeto?.fonte.proxyUrl ?? null;
  const fonteUrl = proxyUrl ?? corte.url;
  /**
   * Distância entre o tempo da FONTE e o tempo do elemento <video>.
   *
   * O proxy é do material original inteiro — nele os dois tempos coincidem. O
   * MP4 renderizado começa no início do corte, então o segundo 0 do elemento é
   * o segundo `corte.inicio_s` do original.
   */
  const deslocamento = proxyUrl ? 0 : corte.inicio_s;

  /** Primeira seleção automática: o painel da direita já abre com conteúdo. */
  useEffect(() => {
    if (!projeto || selecionadoId) return;
    const primeiro = clipesDeVideo(projeto)[0];
    if (primeiro) setSelecionadoId(primeiro.id);
  }, [projeto, selecionadoId]);

  /* --------------------------------------------------------- tempo e som */

  /** Tempo da linha → tempo do elemento, passando pela janela da fonte. */
  const tempoNoElemento = useCallback(
    (item: ItemVideo, t: number): number => {
      const dur = item.fim_s - item.inicio_s;
      const razao = dur > 0 ? (item.fonteFim_s - item.fonteInicio_s) / dur : 1;
      return Math.max(
        0,
        item.fonteInicio_s + (t - item.inicio_s) * razao - deslocamento,
      );
    },
    [deslocamento],
  );

  /** A volta: tempo do elemento → tempo da linha, DENTRO de um clipe. */
  const tempoNaLinha = useCallback(
    (item: ItemVideo, elemento: number): number => {
      const janela = item.fonteFim_s - item.fonteInicio_s;
      if (janela <= 0) return item.inicio_s;
      const dur = item.fim_s - item.inicio_s;
      return (
        item.inicio_s +
        (elemento + deslocamento - item.fonteInicio_s) * (dur / janela)
      );
    },
    [deslocamento],
  );

  const irPara = useCallback(
    (t: number) => {
      const alvo = Math.max(0, t);
      setAgora(alvo);
      const v = video.current;
      const item = clipeEm(clipes, alvo);
      if (!v || !item) return;
      tocandoId.current = item.id;
      v.currentTime = tempoNoElemento(item, alvo);
    },
    [clipes, tempoNoElemento],
  );

  /**
   * Selecionar leva o cursor junto quando o item está fora dele.
   *
   * A prévia mostra o que está DEBAIXO DO CURSOR e o inspector edita o que
   * está SELECIONADO. Enquanto os dois discordam, mexer no zoom não muda nada
   * na tela e o controle parece quebrado — a pessoa arrasta o slider inteiro
   * procurando um efeito que está acontecendo noutro ponto da linha.
   */
  const selecionar = useCallback(
    (id: string) => {
      setSelecionadoId(id);
      if (!projeto) return;
      for (const t of projeto.trilhas) {
        const item = t.itens.find((i) => i.id === id);
        if (!item) continue;
        if (agora < item.inicio_s || agora >= item.fim_s) irPara(item.inicio_s);
        return;
      }
    },
    [projeto, agora, irPara],
  );

  function alternar() {
    const v = video.current;
    if (!v) return;
    if (!v.paused) {
      v.pause();
      setTocando(false);
      return;
    }
    const item = clipeEm(clipes, agora) ?? clipes[0];
    if (!item) return;
    const t = agora >= item.inicio_s && agora < item.fim_s ? agora : item.inicio_s;
    tocandoId.current = item.id;
    v.currentTime = tempoNoElemento(item, t);
    setAgora(t);
    void v.play();
    setTocando(true);
  }

  /**
   * O cursor durante a reprodução.
   *
   * Anda por `requestAnimationFrame` e não pelo evento `timeupdate` do vídeo:
   * o `timeupdate` dispara umas quatro vezes por segundo, o que faz o cursor
   * andar aos saltos e, pior, faz a emenda entre clipes atrasar até 250ms —
   * tempo em que a prévia mostra material que já não pertence à linha.
   */
  useEffect(() => {
    if (!tocando) return;
    let quadro = 0;

    const passo = () => {
      quadro = requestAnimationFrame(passo);
      const v = video.current;
      if (!v) return;

      const item = clipes.find((c) => c.id === tocandoId.current);
      if (!item || v.ended) {
        v.pause();
        setTocando(false);
        return;
      }

      const t = tempoNaLinha(item, v.currentTime);
      if (t < item.fim_s) {
        setAgora(Math.max(item.inicio_s, t));
        return;
      }

      // Fim do clipe. O próximo quase sempre mostra OUTRO trecho da fonte, e
      // por isso a emenda é um salto explícito no <video> — deixar o arquivo
      // correr sozinho mostraria o que a edição tirou.
      const proximo = clipes.find(
        (c) => c.id !== item.id && c.inicio_s >= item.fim_s - 0.001,
      );
      if (!proximo) {
        v.pause();
        setTocando(false);
        setAgora(item.fim_s);
        return;
      }
      tocandoId.current = proximo.id;
      v.currentTime = tempoNoElemento(proximo, proximo.inicio_s);
      setAgora(proximo.inicio_s);
    };

    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [tocando, clipes, tempoNaLinha, tempoNoElemento]);

  function aoCarregarMeta() {
    const v = video.current;
    if (!v) return;
    setMedida({ largura: v.videoWidth, altura: v.videoHeight });
    const real = v.duration;
    if (!Number.isFinite(real) || real <= 0) return;
    setDuracaoArquivo(real);

    if (!ajustarPelaDuracao.current) return;
    ajustarPelaDuracao.current = false;

    /**
     * A correção só vale quando a prévia É o corte renderizado.
     *
     * Com proxy, `v.duration` é o vídeo ORIGINAL inteiro — 137s onde o corte
     * tem 18s. Aplicar aqui esticava o clipe recém-montado pro material
     * completo, e a pessoa abria o editor com um corte que ela nunca pediu.
     *
     * O motivo da correção existir (a janela do banco é a PEDIDA, e o ffmpeg
     * entrega o keyframe mais próximo) só se aplica ao arquivo do corte.
     */
    if (proxyUrl) return;
    // Só o projeto recém-montado é corrigido, e sem marcar mudança: abrir um
    // corte não é editá-lo, e gravar aqui encheria o banco de projetos que
    // ninguém pediu.
    // reiniciar, não aplicar: isto corrige o documento recém-montado, não é
    // edição de ninguém. Empilhar aqui faria o primeiro Ctrl+Z desfazer a
    // própria abertura do corte.
    if (!projeto) return;
    const clipe = clipesDeVideo(projeto)[0];
    if (!clipe) return;
    reiniciar(
      mapearItem(projeto, clipe.id, (it) =>
        it.tipo === "video"
          ? { ...it, fim_s: real, fonteFim_s: it.fonteInicio_s + real }
          : it,
      ),
    );
  }

  /** O quadro da prévia é medido: com aspecto só, ele estoura a coluna. */
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const observador = new ResizeObserver(([entrada]) => {
      const r = entrada.contentRect;
      setEspaco({ largura: r.width, altura: r.height });
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  /* ------------------------------------------------------------- mudanças */

  /**
   * Toda mudança passa por aqui: empilha no histórico e agenda o salvamento.
   *
   * `agrupar` colapsa chamadas seguidas num passo só. Arrastar um clipe
   * dispara dezenas de mudanças por segundo — sem agrupar, um Ctrl+Z desfaria
   * um pixel de arrasto, e a pessoa apertaria trinta vezes pra voltar. O
   * rótulo carrega o id do alvo, senão arrastar dois clipes seguidos viraria
   * um passo só.
   */
  const mudar = useCallback(
    (f: (p: Projeto) => Projeto, agrupar?: string) => {
      aplicar((p) => (p ? f(p) : p), agrupar ? { agrupar } : undefined);
      setSalvamento("pendente");
    },
    [aplicar],
  );

  const gravar = useCallback(
    async (p: Projeto) => {
      const r = await fetch(`/api/cortes/${corte.id}/projeto`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // O corpo É o Projeto, sem envelope: é o que a rota espera.
        body: JSON.stringify(p),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { erro?: string };
        throw new Error(d.erro ?? "Não consegui salvar o projeto.");
      }
    },
    [corte.id],
  );

  /**
   * Salvamento com atraso.
   *
   * 1,2s depois da última mudança — arrastar um bloco dispara dezenas de
   * alterações por segundo, e salvar cada uma seria uma escrita por pixel de
   * mouse. O `clearTimeout` da limpeza é o que reinicia a contagem a cada
   * mudança nova.
   */
  useEffect(() => {
    if (!projeto || salvamento !== "pendente") return;
    const relogio = setTimeout(async () => {
      setSalvamento("salvando");
      try {
        await gravar(projeto);
        // Se a pessoa mexeu de novo enquanto isto ia e voltava, o estado já é
        // "pendente" outra vez — carimbar "salvo" por cima seria mentira.
        setSalvamento((e) => (e === "salvando" ? "salvo" : e));
      } catch (e) {
        setSalvamento((antes) => (antes === "salvando" ? "erro" : antes));
        setRecado(e instanceof Error ? e.message : "Não consegui salvar.");
      }
    }, 1200);
    return () => clearTimeout(relogio);
  }, [projeto, salvamento, gravar]);

  const moverItem = useCallback(
    (id: string, inicio_s: number) => {
      mudar((p) =>
        mapearItem(p, id, (it) => {
          // MOVER preserva a duração e NÃO toca na janela da fonte: o clipe
          // mostra o mesmo trecho, só que mais pra frente na linha.
          const dur = it.fim_s - it.inicio_s;
          return { ...it, inicio_s, fim_s: inicio_s + dur } as Item;
        }),
      );
    },
    [mudar],
  );

  const redimensionar = useCallback(
    (id: string, inicio_s: number, fim_s: number) => {
      mudar((p) =>
        mapearItem(p, id, (it) => {
          if (it.tipo !== "video") return { ...it, inicio_s, fim_s } as Item;
          const dur = it.fim_s - it.inicio_s;
          if (dur <= 0) return { ...it, inicio_s, fim_s };
          // APARAR anda com as DUAS janelas juntas: cada borda da linha empurra
          // a borda correspondente da fonte na mesma proporção. Sem isso o
          // clipe continuaria com a janela velha — encolher 2s na linha passaria
          // a mostrar o mesmo trecho acelerado, que é o bug clássico de editor.
          const razao = (it.fonteFim_s - it.fonteInicio_s) / dur;
          return {
            ...it,
            inicio_s,
            fim_s,
            // Fonte não tem tempo negativo: antes do zero não existe material.
            fonteInicio_s: Math.max(
              0,
              it.fonteInicio_s + (inicio_s - it.inicio_s) * razao,
            ),
            fonteFim_s: it.fonteFim_s + (fim_s - it.fim_s) * razao,
          };
        }),
      );
    },
    [mudar],
  );

  const mudarItem = useCallback(
    (patch: Partial<Item>) => {
      if (!selecionadoId) return;
      mudar((p) =>
        mapearItem(p, selecionadoId, (it) => ({ ...it, ...patch }) as Item),
      );
    },
    [mudar, selecionadoId],
  );

  const mudarProporcao = useCallback(
    (proporcao: Proporcao) => mudar((p) => ({ ...p, proporcao })),
    [mudar],
  );

  const clipeSelecionado =
    selecionado && selecionado.tipo === "video" ? selecionado : null;

  const podeDividir =
    clipeSelecionado !== null &&
    agora > clipeSelecionado.inicio_s + MINIMO_DIVISAO &&
    agora < clipeSelecionado.fim_s - MINIMO_DIVISAO;

  // Remover o último clipe deixaria um projeto que o render recusa ("o projeto
  // não tem nenhum clipe de vídeo"). Melhor o botão dizer não agora do que a
  // fila dizer não depois.
  const ultimoClipe = clipeSelecionado !== null && clipes.length <= 1;
  const podeRemover = selecionado !== null && !ultimoClipe;

  function dividir() {
    const item = clipeSelecionado;
    if (!item) return;
    const par = dividirVideo(item, agora, crypto.randomUUID());
    if (!par) return;
    mudar((p) => ({
      ...p,
      trilhas: p.trilhas.map((t) =>
        t.itens.some((i) => i.id === item.id)
          ? {
              ...t,
              itens: t.itens.flatMap((i) => (i.id === item.id ? par : [i])),
            }
          : t,
      ),
    }));
    // A metade da direita é a que está debaixo do cursor: ela segue selecionada.
    setSelecionadoId(par[1].id);
  }

  /**
   * Atalhos de editor. Registrados aqui e não em cada botão porque o teclado
   * é o que separa "interface bonita" de ferramenta de trabalho — quem edita
   * de verdade não vai no botão de dividir trinta vezes.
   *
   * O hook ignora quando o foco está num campo de texto, senão digitar "s"
   * no conteúdo de uma legenda dividiria o clipe.
   */
  useAtalhos({
    s: () => podeDividir && dividir(),
    delete: () => podeRemover && remover(),
    backspace: () => podeRemover && remover(),
    space: () => alternar(),
    "ctrl+z": () => historico.desfazer(),
    "ctrl+shift+z": () => historico.refazer(),
    "+": () => setPxPorSeg((v) => Math.min(240, v * 1.5)),
    "-": () => setPxPorSeg((v) => Math.max(6, v / 1.5)),
  });

  function remover() {
    if (!selecionado || !podeRemover) return;
    const id = selecionado.id;
    mudar((p) => ({
      ...p,
      trilhas: p.trilhas.map((t) =>
        t.itens.some((i) => i.id === id)
          ? { ...t, itens: t.itens.filter((i) => i.id !== id) }
          : t,
      ),
    }));
    setSelecionadoId(null);
  }

  /* ------------------------------------------------------------- render */

  function pedirRender() {
    // Os avisos aparecem ANTES de queimar o render: descobrir depois que o
    // overlay não entrou custa minutos de VPS e a confiança na prévia.
    if (avisos.length > 0 && !confirmando) {
      setConfirmando(true);
      return;
    }
    void renderizar();
  }

  async function renderizar() {
    if (!projeto) return;
    setConfirmando(false);
    setRecado(null);
    setEnviando(true);
    try {
      // Grava ANTES de pedir a fila, e não é otimização: a rota de render não
      // aceita o projeto no corpo — ela lê o que está no banco. Sem este PUT,
      // um salvamento ainda pendurado no atraso mandaria renderizar a versão
      // anterior (ou, no primeiro render de um corte, versão nenhuma).
      await gravar(projeto);
      setSalvamento("salvo");

      const r = await fetch(`/api/cortes/${corte.id}/renderizar-projeto`, {
        method: "POST",
      });
      const dados = (await r.json().catch(() => ({}))) as { erro?: string };
      if (!r.ok) {
        setRecado(
          dados.erro ?? `Não consegui mandar pra renderização (${r.status}).`,
        );
        return;
      }
      setRecado(
        "Mandado pra renderização. O corte aparece atualizado no Analisador quando ficar pronto.",
      );
    } catch (e) {
      setRecado(e instanceof Error ? e.message : "Falha de rede. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  /* --------------------------------------------------------------- tela */

  const saida = projeto ? PROPORCOES[projeto.proporcao] : PROPORCOES["9:16"];
  const clipeAtual = clipeEm(clipes, agora);
  // Keyframes são relativos ao ITEM; a prévia interpola com a mesma função do
  // modelo pra não divergir do que o render vai ler.
  const enquadramento = clipeAtual
    ? enquadramentoEm(clipeAtual, agora - clipeAtual.inicio_s)
    : ENQUADRAMENTO_PADRAO;
  const dentro = moldura(medida, saida, enquadramento);

  // O quadro é calculado, não deduzido pelo CSS: `aspect-ratio` sozinho estoura
  // a coluna quando a proporção é horizontal e a janela é estreita.
  const escalaQuadro = Math.min(
    espaco.largura / saida.largura,
    espaco.altura / saida.altura,
  );
  const quadro = Number.isFinite(escalaQuadro) && escalaQuadro > 0
    ? { largura: saida.largura * escalaQuadro, altura: saida.altura * escalaQuadro }
    : { largura: 0, altura: 0 };

  const duracaoLinha = projeto ? duracaoDoProjeto(projeto) : 0;

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

        <div className="ml-auto flex items-center gap-3">
          <Indicador estado={salvamento} />
          <button
            type="button"
            onClick={pedirRender}
            disabled={enviando || !projeto || clipes.length === 0}
            title={
              clipes.length === 0
                ? "O projeto precisa de pelo menos um clipe de vídeo."
                : undefined
            }
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

      {/* Os avisos do render, na cara, antes de enviar. */}
      {confirmando && (
        <div className="shrink-0 border-b border-zinc-800 bg-amber-950/20 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-amber-200">
            <Warning size={13} weight="fill" />O render ainda não faz tudo que
            este projeto pede
          </p>
          <ul className="mt-1.5 ml-5 list-disc space-y-0.5 text-[11px] leading-relaxed text-zinc-400">
            {avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void renderizar()}
              className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-500"
            >
              Renderizar mesmo assim
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {recado && (
        <p className="flex shrink-0 items-start gap-1.5 border-b border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs text-zinc-300">
          <Info size={13} className="mt-0.5 shrink-0 text-zinc-500" />
          {recado}
        </p>
      )}

      {/* ------------------------------ estante | prévia | propriedades */}
      <div className="flex min-h-0 flex-1">
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
          {projeto && (
            <div className="flex shrink-0 flex-wrap items-baseline gap-x-2 border-b border-zinc-800/70 px-4 pb-1.5">
              <span className="text-[11px] text-zinc-500">
                Legenda das falas
              </span>
              <SeletorFormatoCompacto
                valor={projeto.formato}
                motivo={null}
                onEscolher={(id) => mudar((p) => ({ ...p, formato: id }))}
              />
            </div>
          )}

          <div
            ref={area}
            className="flex min-h-0 flex-1 items-center justify-center p-4"
          >
            {carregando ? (
              <CircleNotch size={20} className="animate-spin text-zinc-600" />
            ) : erro ? (
              <p className="flex max-w-[36ch] items-start gap-1.5 text-center text-xs leading-relaxed text-zinc-500">
                <WarningCircle size={14} className="mt-px shrink-0" />
                {erro}
              </p>
            ) : (
              <div
                onClick={alternar}
                style={{ width: quadro.largura, height: quadro.altura }}
                className="relative cursor-pointer overflow-hidden rounded-lg bg-black shadow-2xl shadow-black/60"
              >
                <video
                  ref={video}
                  src={fonteUrl}
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={aoCarregarMeta}
                  style={{
                    width: dentro.largura,
                    height: dentro.altura,
                    left: dentro.esquerda,
                    top: dentro.topo,
                    // O preflight do Tailwind prende vídeo em 100% de largura,
                    // e aí zoom acima de 1 não teria como aparecer.
                    maxWidth: "none",
                  }}
                  className="absolute"
                />
                {/* Depois do <video> e com pointer-events-none: a camada de
                    guias informa onde a interface da rede cobre o quadro, sem
                    roubar o clique que dá play. */}
                <SafeArea
                  proporcao={projeto?.proporcao ?? "9:16"}
                  plataforma={plataforma}
                  mostrar={plataforma !== "nenhuma"}
                />
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-center gap-2 border-t border-zinc-800/70 px-3 py-1.5">
            <span className="text-[10px] text-zinc-600">Guias de</span>
            <SeletorPlataforma valor={plataforma} onMudar={setPlataforma} />
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1.5 border-t border-zinc-800/70 py-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={alternar}
                disabled={clipes.length === 0}
                aria-label={tocando ? "Pausar" : "Reproduzir"}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-40"
              >
                {tocando ? (
                  <Pause size={15} weight="fill" />
                ) : (
                  <Play size={15} weight="fill" />
                )}
              </button>
            </div>
            {!proxyUrl && !carregando && !erro && (
              <p className="flex max-w-[52ch] items-start gap-1.5 px-4 text-center text-[10px] leading-relaxed text-zinc-600">
                <Info size={11} className="mt-px shrink-0" />
                Prévia sem proxy: ela é o MP4 já renderizado, então só dá pra
                editar dentro do corte. O enquadramento é desenhado por cima
                dele — o render final parte do vídeo original.
              </p>
            )}
          </div>
        </div>

        {/* propriedades */}
        {projeto && (
          <div className="hidden xl:flex">
            <Inspector
              item={selecionado}
              proporcao={projeto.proporcao}
              onMudarItem={mudarItem}
              onMudarProporcao={mudarProporcao}
            />
          </div>
        )}
      </div>

      {/* ---------------------------------- ferramentas + linha do tempo */}
      {projeto && (
        <>
          <div className="flex shrink-0 items-center gap-2 border-t border-zinc-800 bg-zinc-950 px-4 py-2">
            <span className="font-mono text-xs tabular-nums text-zinc-300">
              {mmss(agora)}
              <span className="text-zinc-600"> / {mmss(duracaoLinha)}</span>
            </span>
            <span className="mx-1 h-4 w-px bg-zinc-800" />

            <Ferramenta
              icone={<Scissors size={13} />}
              rotulo="Dividir"
              onClick={dividir}
              desabilitado={!podeDividir}
              dica={
                clipeSelecionado === null
                  ? "Selecione um clipe de vídeo na linha do tempo."
                  : podeDividir
                    ? "Divide o clipe no cursor"
                    : "O cursor precisa cair dentro do clipe, longe das pontas."
              }
            />
            <Ferramenta
              icone={<Trash size={13} />}
              rotulo="Remover"
              onClick={remover}
              desabilitado={!podeRemover}
              dica={
                selecionado === null
                  ? "Selecione um item na linha do tempo."
                  : ultimoClipe
                    ? "É o único clipe de vídeo — sem ele não há o que renderizar."
                    : "Tira o item da trilha"
              }
            />

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPxPorSeg((z) => Math.max(6, z / 1.5))}
                aria-label="Afastar"
                className="rounded-md p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <MagnifyingGlassMinus size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPxPorSeg((z) => Math.min(240, z * 1.5))}
                aria-label="Aproximar"
                className="rounded-md p-1.5 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <MagnifyingGlassPlus size={14} />
              </button>
            </div>
          </div>

          <Trilhas
            projeto={projeto}
            agora={agora}
            pxPorSeg={pxPorSeg}
            selecionadoId={selecionadoId}
            onSelecionar={selecionar}
            onMoverItem={moverItem}
            onRedimensionar={redimensionar}
            onMover={irPara}
          />
        </>
      )}
    </>
  );
}

/* --------------------------------------------------------------- pedaços */

function Ferramenta({
  icone,
  rotulo,
  dica,
  desabilitado,
  onClick,
}: {
  icone: React.ReactNode;
  rotulo: string;
  dica: string;
  desabilitado: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      // A dica diz POR QUE está desabilitado. Botão apagado sem explicação faz
      // a pessoa clicar de novo achando que a tela travou.
      title={dica}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 transition hover:bg-white/[0.06] hover:text-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-700 disabled:hover:bg-transparent"
    >
      {icone}
      {rotulo}
    </button>
  );
}

/**
 * O estado do salvamento, discreto.
 *
 * Editor que salva sozinho precisa dizer que salvou — sem isso a pessoa fecha
 * a aba sem saber se o trabalho ficou guardado, e é o tipo de dúvida que faz
 * gente refazer edição inteira por precaução.
 */
function Indicador({ estado }: { estado: Salvamento }) {
  if (estado === "limpo") return null;
  if (estado === "salvando" || estado === "pendente") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        <CircleNotch size={11} className="animate-spin" />
        salvando…
      </span>
    );
  }
  if (estado === "salvo") {
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-zinc-600">
        <CheckCircle size={11} weight="fill" />
        salvo
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-amber-400">
      <WarningCircle size={11} weight="fill" />
      não salvei
    </span>
  );
}
