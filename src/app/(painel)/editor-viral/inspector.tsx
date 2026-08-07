"use client";

import {
  ArrowsOutCardinal,
  Crop,
  FrameCorners,
  Info,
  MagnifyingGlassPlus,
  Sparkle,
  SpeakerHigh,
  TextT,
} from "@phosphor-icons/react/dist/ssr";
import {
  PROPORCOES,
  type Item,
  type ItemTexto,
  type ItemVideo,
  type Proporcao,
} from "@/lib/editor/projeto";

/**
 * Inspector — o painel de propriedades do item selecionado.
 *
 * A regra do modelo vale aqui inteira: NADA neste painel produz pixel. Cada
 * controle mexe num número do projeto (`src/lib/editor/projeto.ts`) e devolve
 * um patch parcial pra quem cuida do estado. Por isso todo valor é relativo —
 * posição e escala vão de 0 a 1, nunca em pixel — e por isso o painel não
 * conhece resolução nenhuma.
 *
 * O componente é BURRO de propósito: não guarda estado, não funde patch, não
 * decide o que é válido além dos limites do slider. Quem integra é dono da
 * verdade; ele só desenha o que recebe e avisa o que a pessoa mexeu.
 *
 * O que ainda não tem controle aqui está dito na tela, não escondido. Um
 * painel que finge ter propriedade que o render ignora é pior que um painel
 * vazio.
 */

/** Rótulos das animações de texto, na ordem em que o modelo as declara. */
const ANIMACOES: { valor: ItemTexto["animacao"]; rotulo: string }[] = [
  { valor: "nenhuma", rotulo: "Nenhuma" },
  { valor: "surgir", rotulo: "Surgir" },
  { valor: "subir", rotulo: "Subir" },
  { valor: "maquina", rotulo: "Máquina de escrever" },
  { valor: "pulsar", rotulo: "Pulsar" },
];

const NOME_DO_TIPO: Record<Item["tipo"], string> = {
  video: "Vídeo",
  legenda: "Legenda",
  texto: "Texto",
  audio: "Áudio",
  overlay: "Overlay",
};

function mmss(s: number): string {
  const m = Math.floor(Math.max(0, s) / 60);
  const seg = Math.floor(Math.max(0, s) % 60);
  return `${m}:${String(seg).padStart(2, "0")}`;
}

export function Inspector({
  item,
  proporcao,
  onMudarItem,
  onMudarProporcao,
}: {
  /** Item selecionado na linha do tempo. Nulo quando não há seleção. */
  item: Item | null;
  /** Proporção do PROJETO — não é do item, mas é ajustada daqui. */
  proporcao: Proporcao;
  /** Só o que mudou. Quem chama funde no item e guarda. */
  onMudarItem: (patch: Partial<Item>) => void;
  onMudarProporcao: (proporcao: Proporcao) => void;
}) {
  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-3">
      <p className="mb-2 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">
        Propriedades
      </p>

      {item === null ? (
        <Nada />
      ) : (
        <>
          <div className="mb-3 flex items-baseline justify-between gap-2 border-b border-zinc-800/70 pb-2">
            <span className="text-xs font-medium text-zinc-200">
              {NOME_DO_TIPO[item.tipo]}
            </span>
            <span className="font-mono text-[10px] tabular-nums text-zinc-600">
              {mmss(item.inicio_s)}–{mmss(item.fim_s)}
            </span>
          </div>

          {item.tipo === "video" && (
            <Video
              item={item}
              proporcao={proporcao}
              onMudarItem={onMudarItem}
              onMudarProporcao={onMudarProporcao}
            />
          )}
          {item.tipo === "texto" && (
            <Texto item={item} onMudarItem={onMudarItem} />
          )}
          {item.tipo !== "video" && item.tipo !== "texto" && (
            <SemPropriedades tipo={item.tipo} />
          )}
        </>
      )}
    </aside>
  );
}

/* ------------------------------------------------------------------ vídeo */

function Video({
  item,
  proporcao,
  onMudarItem,
  onMudarProporcao,
}: {
  item: ItemVideo;
  proporcao: Proporcao;
  onMudarItem: (patch: Partial<Item>) => void;
  onMudarProporcao: (proporcao: Proporcao) => void;
}) {
  const enq = item.enquadramento;

  /** Enquadramento é um objeto só: qualquer mudança reenvia o conjunto. */
  const mudarEnq = (parte: Partial<ItemVideo["enquadramento"]>) =>
    onMudarItem({ enquadramento: { ...enq, ...parte } });

  return (
    <>
      <Secao icone={<Crop size={12} />} titulo="Proporção">
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(PROPORCOES) as Proporcao[]).map((chave) => {
            const p = PROPORCOES[chave];
            const escolhida = chave === proporcao;
            return (
              <button
                key={chave}
                type="button"
                onClick={() => onMudarProporcao(chave)}
                title={p.onde}
                className={
                  "flex flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left transition " +
                  (escolhida
                    ? "bg-orange-600/15 ring-1 ring-orange-600/70"
                    : "bg-zinc-900/60 ring-1 ring-zinc-800 hover:bg-white/[0.05]")
                }
              >
                <span
                  className={
                    "font-mono text-[11px] tabular-nums " +
                    (escolhida ? "text-orange-200" : "text-zinc-300")
                  }
                >
                  {chave}
                </span>
                <span className="text-[10px] leading-tight text-zinc-400">
                  {p.rotulo}
                </span>
                {/* Onde a proporção é usada: é o que decide a escolha, não o
                    número. Ninguém pensa "quero 4:5", pensa "quero no feed". */}
                <span className="truncate text-[9px] leading-tight text-zinc-600">
                  {p.onde}
                </span>
              </button>
            );
          })}
        </div>
      </Secao>

      <Secao icone={<FrameCorners size={12} />} titulo="Enquadramento">
        <Deslizante
          icone={<MagnifyingGlassPlus size={11} />}
          rotulo="Zoom"
          valor={enq.zoom}
          min={1}
          max={3}
          passo={0.01}
          // Abaixo de 1 sobraria faixa vazia no quadro de saída — o modelo
          // proíbe, então o slider nem oferece.
          formatar={(v) => `${v.toFixed(2)}×`}
          onMudar={(v) => mudarEnq({ zoom: v })}
        />
        <Deslizante
          icone={<ArrowsOutCardinal size={11} />}
          rotulo="Posição X"
          valor={enq.x}
          min={0}
          max={1}
          passo={0.01}
          onMudar={(v) => mudarEnq({ x: v })}
        />
        <Deslizante
          icone={<ArrowsOutCardinal size={11} />}
          rotulo="Posição Y"
          valor={enq.y}
          min={0}
          max={1}
          passo={0.01}
          onMudar={(v) => mudarEnq({ y: v })}
        />
        <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
          X e Y são o centro do recorte em fração da fonte. 0,50 / 0,50 é o
          meio do quadro.
        </p>
        {item.keyframes.length > 0 && (
          <Aviso>
            Este item tem {item.keyframes.length}{" "}
            {item.keyframes.length === 1 ? "keyframe" : "keyframes"}. Os
            controles acima mexem no valor BASE — a animação continua por cima
            dele.
          </Aviso>
        )}
      </Secao>

      <Secao icone={<SpeakerHigh size={12} />} titulo="Áudio">
        <Deslizante
          rotulo="Volume"
          valor={item.volume}
          min={0}
          max={1}
          passo={0.01}
          formatar={(v) => `${Math.round(v * 100)}%`}
          onMudar={(v) => onMudarItem({ volume: v })}
        />
        <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
          Silenciar é volume 0, não cortar — o trecho continua no lugar.
        </p>
      </Secao>
    </>
  );
}

/* ------------------------------------------------------------------ texto */

function Texto({
  item,
  onMudarItem,
}: {
  item: ItemTexto;
  onMudarItem: (patch: Partial<Item>) => void;
}) {
  return (
    <>
      <Secao icone={<TextT size={12} />} titulo="Conteúdo">
        <textarea
          value={item.conteudo}
          onChange={(e) => onMudarItem({ conteudo: e.target.value })}
          rows={3}
          placeholder="Escreva o texto…"
          className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-xs leading-relaxed text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-600/70"
        />
      </Secao>

      <Secao icone={<ArrowsOutCardinal size={12} />} titulo="Posição">
        <Deslizante
          rotulo="Posição X"
          valor={item.x}
          min={0}
          max={1}
          passo={0.01}
          onMudar={(v) => onMudarItem({ x: v })}
        />
        <Deslizante
          rotulo="Posição Y"
          valor={item.y}
          min={0}
          max={1}
          passo={0.01}
          onMudar={(v) => onMudarItem({ y: v })}
        />
        <Deslizante
          rotulo="Escala"
          valor={item.escala}
          min={0.5}
          max={3}
          passo={0.05}
          formatar={(v) => `${v.toFixed(2)}×`}
          onMudar={(v) => onMudarItem({ escala: v })}
        />
        <p className="mt-1 text-[10px] leading-relaxed text-zinc-600">
          Centro do texto em fração do quadro de saída. A escala multiplica o
          corpo que o formato já define.
        </p>
      </Secao>

      <Secao icone={<Sparkle size={12} />} titulo="Animação">
        <select
          value={item.animacao}
          onChange={(e) =>
            onMudarItem({ animacao: e.target.value as ItemTexto["animacao"] })
          }
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-xs text-zinc-100 outline-none transition focus:border-orange-600/70"
        >
          {ANIMACOES.map((a) => (
            <option key={a.valor} value={a.valor}>
              {a.rotulo}
            </option>
          ))}
        </select>
      </Secao>
    </>
  );
}

/* ------------------------------------------------------- estados honestos */

function Nada() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 text-center">
      <Crop size={22} className="text-zinc-700" />
      <p className="text-xs font-medium text-zinc-400">Nada selecionado</p>
      <p className="text-[10px] leading-relaxed text-zinc-600">
        Clique num item da linha do tempo pra ver as propriedades dele aqui.
      </p>
    </div>
  );
}

/**
 * Tipo sem controle ainda.
 *
 * Dizer isso em voz alta é melhor que mostrar um painel vazio: vazio parece
 * bug, e a pessoa fica procurando o que não existe.
 */
function SemPropriedades({ tipo }: { tipo: Item["tipo"] }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <p className="text-xs font-medium text-zinc-300">
        {NOME_DO_TIPO[tipo]} ainda não tem propriedades aqui
      </p>
      <p className="mt-1.5 text-[10px] leading-relaxed text-zinc-500">
        O item existe no projeto e vai pro render do jeito que está. Dá pra
        movê-lo e redimensioná-lo na linha do tempo — só os ajustes finos que
        ainda não foram feitos.
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- pedaços */

function Secao({
  icone,
  titulo,
  children,
}: {
  icone: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-3 border-b border-zinc-800/70 pb-3 last:border-b-0">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
        <span className="text-zinc-600">{icone}</span>
        {titulo}
      </p>
      {children}
    </section>
  );
}

/**
 * Slider com o número do lado.
 *
 * O número não é enfeite: sem ele não dá pra repetir um ajuste nem comparar
 * dois itens, e a pessoa fica caçando o mesmo pixel de novo no arrasto.
 */
function Deslizante({
  icone,
  rotulo,
  valor,
  min,
  max,
  passo,
  formatar,
  onMudar,
}: {
  icone?: React.ReactNode;
  rotulo: string;
  valor: number;
  min: number;
  max: number;
  passo: number;
  formatar?: (v: number) => string;
  onMudar: (v: number) => void;
}) {
  const mostrar = formatar ?? ((v: number) => v.toFixed(2).replace(".", ","));
  return (
    <label className="mb-2 block last:mb-0">
      <span className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] text-zinc-500">
          {icone && <span className="text-zinc-600">{icone}</span>}
          {rotulo}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-zinc-200">
          {mostrar(valor)}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={passo}
        value={valor}
        onChange={(e) => onMudar(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-orange-600"
      />
    </label>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 p-2 text-[10px] leading-relaxed text-zinc-500">
      <Info size={12} className="mt-px shrink-0 text-zinc-600" />
      <span>{children}</span>
    </p>
  );
}
