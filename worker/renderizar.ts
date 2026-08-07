import path from "node:path";
import fs from "node:fs/promises";
import { run, bin } from "../src/lib/proc";
import { gerarAss, type EstiloLegenda } from "./legendas";
import { limparSilencios, filtroDeJanelas } from "./silencio";
import { filtroDeEnquadramento, type Enquadramento } from "./enquadramento";
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
  const grafoVideo = filtroDeEnquadramento(enquadramento) + sufixoLegenda;

  const args: string[] = [];

  if (limpeza && limpeza.janelas.length > 1) {
    // Colagem: as janelas viram trims concatenados e o resultado passa pelo
    // enquadramento + legenda. Sem -ss/-t aqui — quem recorta é o filtro.
    const cadeia = [
      filtroDeJanelas(limpeza.janelas),
      `[vcat]${grafoVideo}[vout]`,
    ].join(";");

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
      "-vf", grafoVideo,
    );
  }

  args.push(
    "-r", "30",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "21",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    "-y", saida,
  );

  await run(bin.ffmpeg(), args, { timeoutMs: 10 * 60_000, cwd: dir, sinal });

  return saida;
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
