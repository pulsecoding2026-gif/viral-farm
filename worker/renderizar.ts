import path from "node:path";
import fs from "node:fs/promises";
import { run, bin } from "../src/lib/proc";
import { gerarAss, type EstiloLegenda } from "./legendas";
import { limparSilencios, filtroDeJanelas } from "./silencio";
import { filtroDeEnquadramento, type Enquadramento } from "./enquadramento";
import { filtroDeRitmo, type Bloco } from "./ritmo";
import type { Palavra } from "./transcritor";

/**
 * Renderização de um corte: recorta a janela de tempo, converte pra 9:16
 * (1080x1920) no enquadramento escolhido, opcionalmente remove os silêncios
 * e queima a legenda animada mais o título de abertura.
 *
 * O enquadramento não é mais fixo: crop central perde 22% de cada lado, o
 * que é ótimo pra rosto e desastroso pra frase escrita na tela. Quem decide
 * é worker/enquadramento.ts, medindo o próprio quadro.
 *
 * O centro do crop continua fixo — a v2 troca por trajetória guiada por
 * detecção de rosto. O filtro já isola essa etapa.
 */

export type OpcoesRender = {
  /** Id do formato (src/lib/formatos.ts) ou "sem" para nenhuma legenda. */
  estilo?: EstiloLegenda;
  /** Texto da caixa de título nos primeiros 5s. */
  tituloTela?: string;
  /** Remove as pausas longas entre as falas. */
  limparSilencio?: boolean;
  /**
   * Como o quadro vira 9:16. Ausente = crop central, o comportamento
   * histórico. Quem mede e escolhe é worker/enquadramento.ts.
   */
  enquadramento?: Enquadramento;
  /**
   * Cadeia de escala + crop que SEGUE O ROSTO, vinda de rastrearRosto().
   *
   * Chega pronta em vez de o render chamar o detector: a detecção é lenta,
   * best-effort e precisa acontecer uma vez por corte — deixá-la aqui
   * dentro faria cada re-render pagar de novo, e amarraria o renderizador a
   * Python e a um modelo em disco.
   */
  filtroDeCrop?: string | null;
  /**
   * Os atos do corte, cada um com o seu enquadramento — de `planejarRitmo`.
   *
   * Os tempos são RELATIVOS ao início do corte e falam a linha do tempo FINAL:
   * se `limparSilencio` estiver ligado, é a linha já sem as pausas, porque é
   * ela que o espectador vê. Quem monta o plano tem que usar a mesma base, e
   * `duracaoFinal()` existe para isso.
   *
   * Ausente ou com um bloco só = enquadramento único, o comportamento de
   * sempre.
   */
  ritmo?: Bloco[] | null;
  /** Cancelamento: mata o ffmpeg em vez de esperar o render terminar. */
  sinal?: AbortSignal;
  /** Palavras que a IA marcou pra ganhar a cor de destaque na legenda. */
  destaques?: string[];
};

export async function renderizarCorte(
  videoFonte: string,
  corte: { inicio_s: number; fim_s: number },
  palavrasDoCorte: Palavra[],
  dir: string,
  nome: string,
  opcoes: OpcoesRender = {},
): Promise<string> {
  const {
    estilo = "hormozi",
    tituloTela,
    limparSilencio = false,
    enquadramento = "preencher",
    filtroDeCrop = null,
    ritmo = null,
    sinal,
    destaques = [],
  } = opcoes;
  const nomeAss = `${nome}.ass`;
  const saida = path.join(dir, `${nome}.mp4`);

  // Com limpeza, o vídeo vira uma colagem de janelas de fala e os tempos das
  // palavras mudam — a legenda tem que seguir os tempos NOVOS.
  const limpeza = limparSilencio
    ? limparSilencios(palavrasDoCorte, corte.inicio_s, corte.fim_s)
    : null;

  const palavrasLegenda = limpeza
    ? limpeza.palavras
    : palavrasDoCorte.map((p) => ({
        ...p,
        inicio_s: p.inicio_s - corte.inicio_s,
        fim_s: p.fim_s - corte.inicio_s,
      }));

  // gerarAss espera tempos absolutos e uma âncora; aqui já normalizamos pra
  // zero, então a âncora é zero.
  const ass = gerarAss(palavrasLegenda, 0, estilo, tituloTela, destaques);
  if (ass !== null) {
    await fs.writeFile(path.join(dir, nomeAss), ass, "utf-8");
  }

  // Nome relativo + cwd no run(): caminho absoluto do Windows tem "C:", o
  // parser de filtro divide no ":" e nenhum escape é portátil.
  const sufixoLegenda = ass !== null ? `,ass=${nomeAss}` : "";

  /**
   * O enquadramento vem como GRAFO, não como lista de filtros: "ajustar" usa
   * split e pads nomeados ([bg]/[fg]/[bgb]/[fgs]) separados por ';', então
   * não dá pra juntar com vírgula como era o crop. O grafo tem entrada e
   * saída implícitas, o que permite prefixar um rótulo de entrada e colar a
   * legenda com vírgula no fim — que é o que os dois caminhos abaixo fazem.
   */
  /**
   * O rastreamento de rosto SUBSTITUI o crop central quando existe.
   *
   * Só entra no lugar de "preencher": em "ajustar" o quadro inteiro cabe na
   * largura e não há o que seguir — não existe recorte lateral pra
   * movimentar. Rastrear ali seria trabalho jogado fora.
   *
   * Quando não há rastreio (sem rosto no trecho, detector indisponível,
   * trecho longo demais), `filtroDeCrop` é nulo e a cadeia é exatamente a
   * de antes.
   */
  /**
   * O ENQUADRAMENTO DE CADA BLOCO, quando o corte tem ritmo.
   *
   * `ritmo` é a lista de atos vinda de `planejarRitmo`; sem ela, o corte
   * inteiro usa um enquadramento só, que é o comportamento de sempre.
   *
   * O rastreamento de rosto entra apenas nos blocos `preencher`: em `ajustar`
   * o quadro inteiro cabe na largura e não existe recorte lateral para
   * movimentar, então seguir rosto ali é trabalho jogado fora. Como o filtro
   * de crop animado é escrito em função de `t`, e `trim`+`setpts` reinicia o
   * relógio de cada bloco em zero, ele só pode ser usado no bloco que começa
   * em zero — nos demais a trajetória estaria fora de fase, que é o defeito
   * que já custou uma medição inteira neste trabalho. Os outros blocos
   * `preencher` usam o crop central, que é honesto e não mente sobre o tempo.
   */
  const paraBloco = (e: Enquadramento, comecaEmZero: boolean): string =>
    filtroDeCrop && e === "preencher" && comecaEmZero
      ? filtroDeCrop
      : filtroDeEnquadramento(e);

  /** A cadeia de sempre, para o caminho -vf (sem ritmo, sem limpeza). */
  const grafoSimples =
    (filtroDeCrop && enquadramento === "preencher"
      ? filtroDeCrop
      : filtroDeEnquadramento(enquadramento)) + sufixoLegenda;

  const comRitmo = ritmo !== null && ritmo.length > 1;

  /**
   * Com ritmo, o vídeo passa por um grafo de blocos; sem ritmo, pela cadeia
   * única de sempre. `entrada` é o pulo do gato: quando houve limpeza de
   * silêncio o vídeo já foi remontado em `[vcat]`, e é sobre ESSA linha do
   * tempo que os blocos do ritmo foram planejados.
   */
  const cadeiaDeVideo = (entrada: string): string =>
    comRitmo
      ? `${filtroDeRitmo(ritmo, (e, i) => paraBloco(e, i === 0), entrada)};` +
        `[rvout]${sufixoLegenda.replace(/^,/, "") || "null"}[vout]`
      : `[${entrada}]${
          (filtroDeCrop && enquadramento === "preencher"
            ? filtroDeCrop
            : filtroDeEnquadramento(enquadramento)) + sufixoLegenda
        }[vout]`;

  const args: string[] = [];

  if (limpeza && limpeza.janelas.length > 1) {
    // Colagem: as janelas viram trims concatenados e o resultado passa pelo
    // enquadramento + legenda. Sem -ss/-t aqui — quem recorta é o filtro.
    const cadeia = [filtroDeJanelas(limpeza.janelas), cadeiaDeVideo("vcat")].join(";");

    args.push(
      "-i", videoFonte,
      "-filter_complex", cadeia,
      "-map", "[vout]",
      "-map", "[acat]",
    );
  } else {
    const duracao = corte.fim_s - corte.inicio_s;
    args.push(
      // -ss antes do -i: seek por keyframe (rápido); o re-encode garante o
      // primeiro frame exato mesmo assim.
      "-ss", corte.inicio_s.toFixed(2),
      "-t", duracao.toFixed(2),
      "-i", videoFonte,
    );
    if (comRitmo) {
      // O grafo de blocos tem rótulos nomeados, então precisa de
      // -filter_complex; o áudio segue reto, sem passar por filtro nenhum.
      args.push(
        "-filter_complex", cadeiaDeVideo("0:v"),
        "-map", "[vout]",
        "-map", "0:a?",
      );
    } else {
      args.push("-vf", grafoSimples);
    }
  }

  args.push(
    "-r", "30",
    "-c:v", "libx264",
    // veryfast + crf 20, não fast + crf 21. Medido em worker/medir-render.ts:
    // o par novo entrega o MESMO bitrate (6706 KB contra 6611 no clipe de
    // teste) em 5,6s no lugar de 21,8. O preset mais rápido perde eficiência
    // de compressão e o crf mais baixo devolve — sobra a velocidade.
    //
    // Importa porque a VPS tem pouca CPU: com o par antigo um corte levava
    // de 3 a 6 minutos e a máquina ficava sem fôlego até pra aceitar SSH.
    "-preset", "veryfast",
    "-crf", "20",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    "-y", saida,
  );

  await run(bin.ffmpeg(), args, { timeoutMs: 10 * 60_000, cwd: dir, sinal });

  return saida;
}

/**
 * Quanto o corte VAI DURAR depois de renderizado.
 *
 * Com limpeza de silêncio ligada isso não é `fim − início`: as pausas somem e
 * o vídeo encurta. O plano de ritmo precisa desta duração, e não da janela
 * original, porque os blocos são posições na linha do tempo que o espectador
 * vê — usar a janela crua colocaria as trocas de plano cada vez mais adiantadas
 * conforme o corte avança, e a última cairia fora do vídeo.
 */
export function duracaoFinal(
  corte: { inicio_s: number; fim_s: number },
  palavras: Palavra[],
  limparSilencio: boolean,
): number {
  const bruta = Math.max(0, corte.fim_s - corte.inicio_s);
  if (!limparSilencio) return bruta;
  const limpeza = limparSilencios(palavras, corte.inicio_s, corte.fim_s);
  const soma = limpeza.janelas.reduce((s, j) => s + (j.ate - j.de), 0);
  return soma > 0 ? soma : bruta;
}

/** Palavras da transcrição que caem dentro da janela do corte. */
export function palavrasNaJanela(
  palavras: Palavra[],
  corte: { inicio_s: number; fim_s: number },
): Palavra[] {
  return palavras.filter(
    (p) => p.inicio_s >= corte.inicio_s - 0.2 && p.fim_s <= corte.fim_s + 0.2,
  );
}
