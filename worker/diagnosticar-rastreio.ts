/**
 * Compara as três câmeras possíveis, em vídeo real, com duas réguas.
 *
 *   npx tsx worker/diagnosticar-rastreio.ts VIDEO [inicio] [fim]
 *
 * AS TRÊS CÂMERAS
 *   fixo      crop central — o comportamento de sempre, o número a bater
 *   contínua  panorâmica suavizada sobre o clipe inteiro
 *   por cena  um enquadramento por cena, com salto seco na fronteira
 *
 * AS DUAS RÉGUAS, porque medem coisas diferentes e confundi-las já me fez
 * comparar 65% com 88% como se fossem o mesmo número:
 *   PRINCIPAL  o rosto em foco (o maior) ficou no quadro? É a régua do
 *              produto: mostrar o convidado errado é falha.
 *   ALGUM      sobrou alguém no quadro? É a régua de "não cortei todo mundo".
 *
 * BASE DE TEMPO: `rostos.py` emite `t` ABSOLUTO e `detectarCortesDeCena`
 * devolve RELATIVO. A versão anterior deste arquivo misturou as duas e mediu
 * com a câmera 10s fora de fase — os 44% que reportei não significavam nada.
 * Aqui tudo é normalizado pra relativo logo na entrada.
 */
import path from "node:path";
import { spawn } from "node:child_process";
import {
  planejarTrajetoria,
  centroEm,
  larguraDoCrop,
  type Amostra,
} from "../src/lib/enquadramento/trajetoria";
import { planejarTrajetoriaPorCena } from "../src/lib/enquadramento/trajetoria-cenas";
import { detectarCortesDeCena } from "./cenas";

const PY = process.env.PY_VISAO ?? "/opt/viral-farm/.venv-visao/bin/python";
const MODELO = process.env.MODELO_YUNET ?? "/opt/viral-farm/.venv-visao/yunet.onnx";
const SAIDA = { largura: 1080, altura: 1920 };

function detectar(video: string, inicio: number, fim: number): Promise<{
  largura: number;
  altura: number;
  amostras: Amostra[];
}> {
  return new Promise((resolve, reject) => {
    const p = spawn(PY, [
      path.join("worker", "deteccao", "rostos.py"),
      "--video", video,
      "--inicio", String(inicio),
      "--fim", String(fim),
      // Configurável pra medir se amostrar mais denso ajuda: numa cena de
      // 1,6s, 2 Hz dá só 3 amostras pra decidir o enquadramento inteiro.
      "--fps", process.env.FPS_AMOSTRA ?? "2",
      "--modelo", MODELO,
    ]);
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (c) =>
      c === 0 ? resolve(JSON.parse(out)) : reject(new Error(err.slice(-300))),
    );
  });
}

type Regua = "principal" | "algum";

function acerta(a: Amostra, x: number, meia: number, regua: Regua): boolean {
  const dentro = (r: { x: number; w: number }) =>
    Math.abs(r.x + r.w / 2 - x) <= meia;
  if (regua === "algum") return a.rostos.some(dentro);
  const r = a.rostos[0];
  return r !== undefined && dentro(r);
}

function taxa(
  amostras: Amostra[],
  posicaoEm: (t: number) => number,
  meia: number,
  regua: Regua,
): { acertos: number; total: number; pct: number } {
  const comRosto = amostras.filter((a) => a.rostos.length > 0);
  const acertos = comRosto.filter((a) =>
    acerta(a, posicaoEm(a.t), meia, regua),
  ).length;
  return {
    acertos,
    total: comRosto.length,
    pct: comRosto.length ? (acertos / comRosto.length) * 100 : 0,
  };
}

async function main() {
  const video = process.argv[2];
  const inicio = Number(process.argv[3] ?? 10);
  const fim = Number(process.argv[4] ?? 40);
  if (!video) throw new Error("uso: npx tsx worker/diagnosticar-rastreio.ts VIDEO [inicio] [fim]");

  const dados = await detectar(video, inicio, fim);
  // Normaliza pra relativo AQUI, uma vez. É a fronteira das bases de tempo.
  const amostras = dados.amostras.map((a) => ({ ...a, t: a.t - inicio }));
  const fonte = { largura: dados.largura, altura: dados.altura };
  const meia = larguraDoCrop(fonte, SAIDA) / 2;
  const cortes = await detectarCortesDeCena(video, inicio, fim);

  const continua = planejarTrajetoria(amostras, fonte, SAIDA);
  const porCena = planejarTrajetoriaPorCena(amostras, cortes, fonte, SAIDA);

  const camaras: [string, (t: number) => number][] = [
    ["fixo", () => fonte.largura / 2],
    ["contínua", (t) => centroEm(continua, t)],
    ["por cena", (t) => centroEm(porCena, t)],
  ];

  const comRosto = amostras.filter((a) => a.rostos.length > 0).length;
  console.log(
    `${path.basename(video)} · ${inicio}–${fim}s · fonte ${fonte.largura}px · ` +
      `recorte ${(meia * 2).toFixed(0)}px`,
  );
  console.log(
    `${amostras.length} amostras (${comRosto} com rosto) · ` +
      `${cortes.length} cortes de cena · ${porCena.length} pontos\n`,
  );

  console.log("  câmera      PRINCIPAL      ALGUM");
  for (const [nome, posicao] of camaras) {
    const p = taxa(amostras, posicao, meia, "principal");
    const g = taxa(amostras, posicao, meia, "algum");
    console.log(
      `  ${nome.padEnd(10)} ${p.pct.toFixed(0).padStart(3)}% (${p.acertos}/${p.total})` +
        `    ${g.pct.toFixed(0).padStart(3)}% (${g.acertos}/${g.total})`,
    );
  }

  /**
   * QUEM SOBROU, uma por uma.
   *
   * Chegou a hora em que a taxa agregada parou de ensinar: 81% é "8 amostras
   * erradas", e 8 casos concretos dizem o que 19% não diz. As colunas são as
   * três perguntas que separam as causas possíveis:
   *
   *   dist > meia+algo, com 1 rosto  →  a câmera não chegou (problema de
   *                                     trajetória, dá para consertar)
   *   preso na borda                 →  o rosto está a menos de meia largura
   *                                     da margem do vídeo; NENHUMA posição
   *                                     alcança (não é consertável aqui)
   *   2+ rostos                      →  o "principal" pode ter trocado de
   *                                     pessoa entre amostras, e a câmera
   *                                     está certa sobre o alvo anterior
   */
  if (process.env.DETALHE === "1") {
    const posicao = (t: number) => centroEm(porCena, t);
    console.log("\n  amostras que a câmera POR CENA errou (régua principal):");
    console.log("     t     câmera    rosto    dist   rostos  nota");
    for (const a of amostras) {
      if (a.rostos.length === 0) continue;
      if (acerta(a, posicao(a.t), meia, "principal")) continue;
      const r = a.rostos[0];
      const c = r.x + r.w / 2;
      const x = posicao(a.t);
      const alcancavel = c >= meia && c <= fonte.largura - meia;
      const outroDentro = a.rostos.some(
        (q) => Math.abs(q.x + q.w / 2 - x) <= meia,
      );
      const nota = !alcancavel
        ? "fora de alcance (colado na borda do vídeo)"
        : outroDentro
          ? "outro rosto está no quadro — trocou o principal?"
          : "a câmera não chegou";
      console.log(
        `  ${a.t.toFixed(1).padStart(5)}  ${x.toFixed(0).padStart(6)}  ` +
          `${c.toFixed(0).padStart(6)}  ${Math.abs(c - x).toFixed(0).padStart(5)}  ` +
          `${String(a.rostos.length).padStart(5)}   ${nota}`,
      );
    }
    console.log();
  }

  const fixo = taxa(amostras, () => fonte.largura / 2, meia, "principal");
  const cena = taxa(amostras, (t) => centroEm(porCena, t), meia, "principal");
  console.log();
  if (cena.pct > fixo.pct) {
    console.log(
      `Por cena GANHA do crop fixo: ${cena.pct.toFixed(0)}% contra ${fixo.pct.toFixed(0)}% ` +
        `(régua principal).`,
    );
  } else {
    console.log(
      `Por cena NÃO ganha do crop fixo (${cena.pct.toFixed(0)}% contra ` +
        `${fixo.pct.toFixed(0)}%) — não vale ligar neste material.`,
    );
  }
}

main().catch((e) => {
  console.error("FALHOU:", e instanceof Error ? e.message : e);
  process.exit(1);
});
