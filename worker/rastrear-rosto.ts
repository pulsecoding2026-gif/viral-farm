import path from "node:path";
import { spawn } from "node:child_process";
import { Cancelado } from "../src/lib/proc";
import {
  planejarTrajetoria,
  type Amostra,
} from "../src/lib/enquadramento/trajetoria";
import { filtroDeCropAnimado, type Ponto } from "./crop-animado";

/**
 * Rastreamento de rosto no reenquadramento — a ponte entre as três peças.
 *
 * O caminho: Python detecta rostos amostrados → `planejarTrajetoria` vira
 * isso numa panorâmica suave → `filtroDeCropAnimado` vira a expressão que o
 * ffmpeg executa por frame.
 *
 * POR QUE ISTO É BEST-EFFORT
 *
 * Rastreamento é MELHORIA, não requisito. Se o Python não está instalado, se
 * o modelo sumiu, se o vídeo não decodifica — o corte ainda tem que sair, com
 * o enquadramento medido de antes. Derrubar um render por causa de um
 * refinamento seria trocar o principal pelo acessório, a mesma lição do
 * proxy.
 *
 * Toda falha vira `null`, e quem chama cai no comportamento anterior.
 */

const PY = process.env.PY_VISAO ?? "/opt/viral-farm/.venv-visao/bin/python";
const MODELO = process.env.MODELO_YUNET ?? "/opt/viral-farm/.venv-visao/yunet.onnx";

/**
 * Amostras por segundo.
 *
 * 2 Hz é o ponto de equilíbrio medido: a 640px custa ~7% do tempo real na VPS
 * de um núcleo, e meio segundo é mais rápido que qualquer movimento de cabeça
 * que valha perseguir. Mais amostras encarecem sem melhorar; menos deixam a
 * trajetória perder a virada.
 */
const FPS_AMOSTRA = 2;

/**
 * Teto do rastreamento, em segundos de trecho.
 *
 * Corte de short raramente passa disso, e o teto impede que um trecho
 * absurdo (erro de janela, vídeo inteiro por engano) gaste minutos de CPU
 * numa etapa que é só refinamento.
 */
const MAXIMO_S = 180;

type SaidaDeteccao = {
  largura: number;
  altura: number;
  amostras: Amostra[];
};

function detectar(
  video: string,
  inicio: number,
  fim: number,
  sinal?: AbortSignal,
): Promise<SaidaDeteccao> {
  return new Promise((resolve, reject) => {
    const p = spawn(
      PY,
      [
        path.join("worker", "deteccao", "rostos.py"),
        "--video", video,
        "--inicio", inicio.toFixed(3),
        "--fim", fim.toFixed(3),
        "--fps", String(FPS_AMOSTRA),
        "--modelo", MODELO,
      ],
      { cwd: process.cwd() },
    );

    let saida = "";
    let erro = "";
    p.stdout.on("data", (d) => (saida += d));
    p.stderr.on("data", (d) => (erro += d));

    const abortar = () => p.kill("SIGKILL");
    sinal?.addEventListener("abort", abortar, { once: true });

    p.on("error", reject);
    p.on("close", (codigo) => {
      sinal?.removeEventListener("abort", abortar);
      if (sinal?.aborted) return reject(new Cancelado());
      if (codigo !== 0) {
        return reject(new Error(erro.trim().slice(-300) || `saiu com ${codigo}`));
      }
      try {
        resolve(JSON.parse(saida) as SaidaDeteccao);
      } catch {
        reject(new Error("o detector devolveu JSON inválido"));
      }
    });
  });
}

export type Rastreio = {
  /** A cadeia de filtro pronta pro -vf, já com escala e recorte. */
  filtro: string;
  /** Quantos pontos a trajetória tem. Serve pro log dizer o que aconteceu. */
  pontos: number;
  /** Amostras em que havia alguém — a medida de "valeu a pena rastrear". */
  comRosto: number;
  amostras: number;
};

/**
 * Tenta montar o crop que segue o rosto. `null` = siga sem ele.
 *
 * A decisão de NÃO rastrear é tão importante quanto a de rastrear: num
 * trecho sem gente (plano de produto, tela de jogo, paisagem) a panorâmica
 * seguiria ruído, e ficaria pior que o crop central honesto. Por isso o
 * corte de 35% — abaixo disso o vídeo não é sobre uma pessoa.
 */
export async function rastrearRosto(
  video: string,
  janela: { inicio_s: number; fim_s: number },
  saida: { largura: number; altura: number },
  sinal?: AbortSignal,
): Promise<Rastreio | null> {
  const duracao = janela.fim_s - janela.inicio_s;
  if (duracao <= 0 || duracao > MAXIMO_S) return null;

  let dados: SaidaDeteccao;
  try {
    dados = await detectar(video, janela.inicio_s, janela.fim_s, sinal);
  } catch (e) {
    if (e instanceof Cancelado) throw e;
    console.log(`[worker] rastreio indisponível (${(e as Error).message})`);
    return null;
  }

  const comRosto = dados.amostras.filter((a) => a.rostos.length > 0).length;
  if (dados.amostras.length === 0) return null;

  const proporcaoComRosto = comRosto / dados.amostras.length;
  if (proporcaoComRosto < 0.35) {
    console.log(
      `[worker] sem rastreio: rosto em só ${Math.round(proporcaoComRosto * 100)}% do trecho`,
    );
    return null;
  }

  const fonte = { largura: dados.largura, altura: dados.altura };
  const pontos = planejarTrajetoria(dados.amostras, fonte, saida) as Ponto[];
  if (pontos.length === 0) return null;

  return {
    filtro: filtroDeCropAnimado(pontos, fonte, saida),
    pontos: pontos.length,
    comRosto,
    amostras: dados.amostras.length,
  };
}
