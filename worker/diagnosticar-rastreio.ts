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
      "--fps", "2",
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
