"use client";

import {
  EyeSlash,
  InstagramLogo,
  TiktokLogo,
  YoutubeLogo,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { SAFE_ZONE, type SafeZone } from "@/lib/formatos";
import { PROPORCOES, type Proporcao } from "@/lib/editor/projeto";

/**
 * Safe area — onde a interface do app COBRE o vídeo.
 *
 * É o que impede a pessoa de posicionar a legenda debaixo do botão de curtir
 * do TikTok. O erro só aparece depois de publicar, quando já não dá pra
 * corrigir sem repostar, então a prévia tem que mostrar antes.
 *
 * TRÊS COISAS QUE ESTE ARQUIVO NÃO FAZ, DE PROPÓSITO:
 *
 * 1. NÃO INVENTA MEDIDA. As zonas do TikTok são as de `SAFE_ZONE`
 *    (src/lib/formatos.ts), copiadas sem tocar. Reels e Shorts NÃO estão
 *    medidos em lugar nenhum do repo — eles são derivados do TikTok, com o
 *    delta e o motivo escritos ao lado de cada número. Quem medir de verdade
 *    deve promover os valores pro `formatos.ts` e apagar a derivação.
 *
 * 2. NÃO USA PIXEL. Todo retângulo sai em % do container. A prévia do editor
 *    é medida e redimensionada a cada resize (ver `escalaQuadro` em
 *    editor-viral.tsx), e a mesma sobreposição precisa servir num quadro de
 *    180px e num de 900px — é a regra 3 do modelo de projeto.
 *
 * 3. NÃO BLOQUEIA CLIQUE. `pointer-events-none` no container inteiro: a
 *    prévia é clicável (play/pause) e uma camada por cima roubaria o clique.
 *
 * Uso — o pai já é `position: relative` na prévia:
 *
 *   <div className="relative overflow-hidden">
 *     <video … />
 *     <SafeArea proporcao={projeto.proporcao} plataforma={plat} mostrar />
 *   </div>
 */

export type Plataforma = "tiktok" | "reels" | "shorts" | "nenhuma";

/* ------------------------------------------------------ zonas por plataforma */

/**
 * TikTok é o baseline MEDIDO.
 *
 * `SAFE_ZONE` descreve exatamente a interface dele: rail de curtir, comentar,
 * compartilhar, salvar, avatar e disco de áudio à direita; abas "Para
 * você/Seguindo", busca e câmera no topo; @usuário, legenda do post e faixa de
 * áudio embaixo. Nada aqui foi reescrito.
 */
const TIKTOK: SafeZone = SAFE_ZONE;

/**
 * SUPOSIÇÃO — Reels derivado do TikTok.
 *
 * Três deltas, todos conservadores no que importa (nada de leitura obrigatória
 * escapa por causa da derivação):
 *
 * · rail 22% → 20%: a coluna do Reels é de ícones, sem o rótulo de contagem
 *   largo nem o disco de áudio girando embaixo. Começa um pouco mais baixo
 *   (34% → 38%) porque o topo do Reels não empurra a coluna pra cima.
 * · rodapé 14% → 16%: o Instagram mantém a BARRA DE ABAS do app por cima do
 *   vídeo, e ela se soma ao @usuário + legenda + faixa de áudio. É mais alto
 *   que o do TikTok, não menor.
 * · topo 12% → 10%: no Reels o topo tem só o título e a câmera; não existe o
 *   par de abas do TikTok, que é o que ocupa altura lá.
 */
const REELS: SafeZone = {
  ...SAFE_ZONE,
  nome: "Zona de UI do Instagram Reels (derivada do TikTok)",
  railDireita: {
    ...SAFE_ZONE.railDireita,
    larguraPct: 20,
    deTopoPct: 38,
    ocupadoPor: "curtir, comentar, enviar, mais, capa do áudio",
  },
  barraInferior: {
    alturaPct: 16,
    ocupadoPor: "@usuário, legenda, faixa de áudio, barra de abas do app",
  },
  faixaSuperior: { alturaPct: 10, ocupadoPor: "título Reels, câmera" },
  areaUtil: {
    xPct: [6, 80],
    yPct: [10, 84],
    obs: "Derivada: margem esquerda × início do rail, topo × base da barra.",
  },
};

/**
 * SUPOSIÇÃO — Shorts derivado do TikTok.
 *
 * · rail 22% → 18%: a coluna do Shorts é a mais enxuta das três, ícones
 *   empilhados sem rótulo largo. Em compensação ela TERMINA mais cedo
 *   (88% → 84%), empurrada pela barra de progresso do player.
 * · rodapé 14% → 18%: é o mais alto dos três. Barra de progresso + linha do
 *   canal com título e botão de inscrever + navegação do app, tudo somado.
 * · topo 12% → 10%: mesmo raciocínio do Reels — só o logo e os controles,
 *   sem par de abas.
 */
const SHORTS: SafeZone = {
  ...SAFE_ZONE,
  nome: "Zona de UI do YouTube Shorts (derivada do TikTok)",
  railDireita: {
    ...SAFE_ZONE.railDireita,
    larguraPct: 18,
    deTopoPct: 40,
    ateBasePct: 84,
    ocupadoPor: "curtir, não curtir, comentar, compartilhar, remixar",
  },
  barraInferior: {
    alturaPct: 18,
    ocupadoPor: "barra de progresso, canal, título, navegação do app",
  },
  faixaSuperior: { alturaPct: 10, ocupadoPor: "logo Shorts, busca, mais" },
  areaUtil: {
    xPct: [6, 82],
    yPct: [10, 82],
    obs: "Derivada: margem esquerda × início do rail, topo × base da barra.",
  },
};

const ZONAS: Record<Exclude<Plataforma, "nenhuma">, SafeZone> = {
  tiktok: TIKTOK,
  reels: REELS,
  shorts: SHORTS,
};

/* --------------------------------------------------------------- geometria */

/**
 * Onde o quadro de SAÍDA se apoia dentro da tela 9:16 do app.
 *
 * As medidas de `SAFE_ZONE` são % da TELA do celular, que é 9:16 — não do
 * vídeo. Quando o projeto é 1:1, 4:5 ou 16:9, o app encaixa o quadro pela
 * largura e deixa tarja em cima e embaixo; a barra inferior do TikTok passa a
 * cair NA TARJA, fora do vídeo, e marcar 14% do quadro quadrado como perigoso
 * seria mentira — sobra área útil ali.
 *
 * Todas as proporções de `PROPORCOES` são mais largas que 9:16, então o
 * encaixe é sempre pela largura e a conta se resume à altura. Se algum dia
 * entrar uma proporção mais estreita que 9:16, esta função precisa passar a
 * tratar tarja lateral também.
 *
 * Devolve topo e altura do quadro em FRAÇÃO da tela.
 */
function encaixeNaTela(proporcao: Proporcao) {
  const { largura, altura } = PROPORCOES[proporcao];
  const aspectoDaTela = 9 / 16;
  const alturaNaTela = Math.min(1, aspectoDaTela / (largura / altura));
  return { topo: (1 - alturaNaTela) / 2, altura: alturaNaTela };
}

type Encaixe = ReturnType<typeof encaixeNaTela>;

/** % vertical da tela → % vertical do quadro de saída. */
function paraOQuadro(yNaTela: number, encaixe: Encaixe): number {
  return ((yNaTela / 100 - encaixe.topo) / encaixe.altura) * 100;
}

function preso(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/**
 * Retângulo da tela recortado pelo quadro. Devolve null quando a região caiu
 * inteira na tarja — nesse caso ela não cobre pixel nenhum do vídeo e desenhar
 * o aviso só assustaria à toa.
 */
function recortar(
  x: readonly [number, number],
  y: readonly [number, number],
  encaixe: Encaixe,
) {
  const topo = preso(paraOQuadro(y[0], encaixe));
  const base = preso(paraOQuadro(y[1], encaixe));
  const largura = x[1] - x[0];
  // Meio ponto percentual é menos de 2px numa prévia de 300px: já é sujeira,
  // não informação.
  if (base - topo < 0.5 || largura < 0.5) return null;
  return { esquerda: x[0], largura, topo, altura: base - topo };
}

/* ------------------------------------------------------------------ regiões */

/**
 * Duas gravidades, e a diferença importa:
 *
 * · bloqueio — a interface nativa cobre o pixel. Texto ali é texto perdido.
 * · respiro  — nada cobre, mas encostar na borda fica torto e é o primeiro
 *   lugar que some num recorte de miniatura.
 */
type Severidade = "bloqueio" | "respiro";

type Regiao = {
  chave: string;
  rotulo: string;
  severidade: Severidade;
  /** Retângulo em % da TELA 9:16 do app, não do quadro. */
  x: readonly [number, number];
  y: readonly [number, number];
  /** Onde o rótulo encosta dentro do retângulo. */
  ancora: string;
  /** Rótulo de baixo pra cima — é o único jeito de caber em 6% de largura. */
  vertical?: boolean;
};

function regioesDe(z: SafeZone): Regiao[] {
  const baseDaBarra = 100 - z.barraInferior.alturaPct;
  return [
    {
      chave: "topo",
      rotulo: "abas · busca",
      severidade: "bloqueio",
      x: [0, 100],
      y: [0, z.faixaSuperior.alturaPct],
      ancora: "items-end justify-center pb-0.5",
    },
    {
      chave: "rail",
      rotulo: "curtir · comentar",
      severidade: "bloqueio",
      x: [100 - z.railDireita.larguraPct, 100],
      y: [z.railDireita.deTopoPct, z.railDireita.ateBasePct],
      ancora: "items-start justify-center pt-1",
    },
    {
      chave: "rodape",
      rotulo: "@usuário · áudio",
      severidade: "bloqueio",
      x: [0, 100],
      y: [baseDaBarra, 100],
      ancora: "items-start justify-center pt-0.5",
    },
    {
      chave: "margem",
      rotulo: "respiro",
      severidade: "respiro",
      x: [0, z.margemEsquerda.larguraPct],
      // Só o miolo: nas pontas quem manda já é o bloqueio vermelho, e duas
      // hachuras empilhadas viram sujeira em cima do vídeo.
      y: [z.faixaSuperior.alturaPct, baseDaBarra],
      ancora: "items-center justify-center",
      vertical: true,
    },
  ];
}

/**
 * A pintura é discreta por obrigação: a prévia existe pra julgar o VÍDEO. Uma
 * sobreposição opaca faria a pessoa desligá-la, e safe area desligada não
 * protege ninguém.
 */
const PINTURA: Record<
  Severidade,
  { hachura: string; borda: string; texto: string }
> = {
  bloqueio: {
    // rose-500 a 16% — some no branco do vídeo, aparece no cinza.
    hachura:
      "repeating-linear-gradient(45deg, rgba(244,63,94,0.16) 0px, rgba(244,63,94,0.16) 2px, transparent 2px, transparent 7px)",
    borda: "rgba(244,63,94,0.42)",
    texto: "text-rose-200/80",
  },
  respiro: {
    // amber-500, ainda mais fraco: aqui não há UI cobrindo, só bom senso.
    hachura:
      "repeating-linear-gradient(45deg, rgba(245,158,11,0.13) 0px, rgba(245,158,11,0.13) 2px, transparent 2px, transparent 7px)",
    borda: "rgba(245,158,11,0.34)",
    texto: "text-amber-200/75",
  },
};

/* --------------------------------------------------------------- a camada */

export function SafeArea({
  proporcao,
  plataforma,
  mostrar,
}: {
  /** Proporção do PROJETO — muda o formato do container e o que sobra de útil. */
  proporcao: Proporcao;
  /** Onde o corte vai ser publicado. "nenhuma" limpa a prévia. */
  plataforma: Plataforma;
  /** Interruptor de quem está olhando. `false` não desenha nada. */
  mostrar: boolean;
}) {
  // Sem plataforma não existe interface pra desviar: a sobreposição inteira
  // sai de cena em vez de virar um retângulo sem significado.
  if (!mostrar || plataforma === "nenhuma") return null;

  const zona = ZONAS[plataforma];
  const encaixe = encaixeNaTela(proporcao);
  const comTarja = encaixe.altura < 1;

  const util = recortar(
    [zona.areaUtil.xPct[0], zona.areaUtil.xPct[1]],
    [zona.areaUtil.yPct[0], zona.areaUtil.yPct[1]],
    encaixe,
  );

  return (
    // aria-hidden: é guia visual e nada mais. Lida em voz alta, vira uma
    // sequência de rótulos soltos sem a posição, que é justamente a informação.
    // Quem precisa do dado tem os números no inspector e no seletor ao lado.
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 select-none"
    >
      {regioesDe(zona).map((r) => {
        const caixa = recortar(r.x, r.y, encaixe);
        if (!caixa) return null;
        const tinta = PINTURA[r.severidade];
        return (
          <div
            key={r.chave}
            style={{
              left: `${caixa.esquerda}%`,
              top: `${caixa.topo}%`,
              width: `${caixa.largura}%`,
              height: `${caixa.altura}%`,
              backgroundImage: tinta.hachura,
              border: `1px dashed ${tinta.borda}`,
            }}
            className={`absolute flex overflow-hidden rounded-[3px] ${r.ancora}`}
          >
            <span
              // A pastilha escura é o que faz o rótulo sobreviver a um vídeo
              // claro sem precisar engordar a cor da hachura.
              style={r.vertical ? { writingMode: "vertical-rl" } : undefined}
              className={
                "max-w-full rounded bg-black/45 px-1 py-px text-[9px] leading-tight font-medium tracking-wide " +
                (r.vertical ? "rotate-180 " : "text-center ") +
                tinta.texto
              }
            >
              {r.rotulo}
            </span>
          </div>
        );
      })}

      {/* O que sobra. É o retângulo que a pessoa realmente usa pra decidir. */}
      {util && (
        <div
          style={{
            left: `${util.esquerda}%`,
            top: `${util.topo}%`,
            width: `${util.largura}%`,
            height: `${util.altura}%`,
          }}
          className="absolute flex items-start justify-start rounded-[3px] border border-dashed border-emerald-400/45"
        >
          <span className="m-1 rounded bg-black/45 px-1 py-px text-[9px] leading-tight font-medium tracking-wide text-emerald-200/85">
            área útil
          </span>
        </div>
      )}

      {/* Sem esta linha, a barra inferior "sumindo" no 1:1 parece bug. */}
      {comTarja && (
        <span className="absolute bottom-1 left-1 rounded bg-black/45 px-1 py-px text-[9px] leading-tight text-zinc-400">
          {proporcao} entra com tarja na tela do app
        </span>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- seletor */

const OPCOES: { id: Plataforma; rotulo: string; icone: Icon; cor: string }[] = [
  { id: "tiktok", rotulo: "TikTok", icone: TiktokLogo, cor: "text-zinc-200" },
  { id: "reels", rotulo: "Reels", icone: InstagramLogo, cor: "text-pink-400" },
  { id: "shorts", rotulo: "Shorts", icone: YoutubeLogo, cor: "text-red-500" },
  { id: "nenhuma", rotulo: "Nenhuma", icone: EyeSlash, cor: "text-zinc-400" },
];

/**
 * Onde o corte vai ser publicado — e, por consequência, qual interface a
 * prévia precisa desviar.
 */
export function SeletorPlataforma({
  valor,
  onMudar,
}: {
  valor: Plataforma;
  onMudar: (plataforma: Plataforma) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Interface da plataforma na prévia"
      className="inline-flex items-center gap-0.5 rounded-full bg-zinc-900/60 p-0.5 ring-1 ring-zinc-800"
    >
      {OPCOES.map((o) => {
        const ativa = o.id === valor;
        const Icone = o.icone;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={ativa}
            onClick={() => onMudar(o.id)}
            className={
              "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition " +
              (ativa
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300")
            }
          >
            <Icone
              size={13}
              weight={ativa ? "fill" : "regular"}
              className={ativa ? o.cor : undefined}
            />
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}
