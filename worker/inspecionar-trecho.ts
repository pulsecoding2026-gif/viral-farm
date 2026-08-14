/**
 * O QUE A CÂMERA FEZ NUM TRECHO ESPECÍFICO, amostra a amostra.
 *
 *   npx tsx worker/inspecionar-trecho.ts VIDEO DE ATE
 *
 * Existe porque um número agregado parou de responder. O teste de render
 * apontou três amostras seguidas sem rosto no vídeo final justamente onde o
 * diagnóstico marcava acerto, e nenhuma taxa explica uma contradição dessas —
 * só olhar o trecho explica. Aqui saem, lado a lado: onde a câmera estava,
 * onde o rosto estava, quanto sobrou de margem e se o rosto coube inteiro.
 *
 * Os tempos da linha de comando são do VÍDEO ORIGINAL. O vídeo renderizado
 * começa em zero, então um instante `x` do render corresponde a `x + início da
 * janela` aqui — foi essa diferença de base que já produziu uma medição
 * inteira sem sentido neste trabalho, e por isso está escrita.
 */
import path from "node:path";
import { spawn } from "node:child_process";
import {
  centroEm,
  larguraDoCrop,
  type Amostra,
} from "../src/lib/enquadramento/trajetoria";
import { planejarTrajetoriaPorCena } from "../src/lib/enquadramento/trajetoria-cenas";
import { detectarCortesDeCena } from "./cenas";

const PY = process.env.PY_VISAO ?? "/opt/viral-farm/.venv-visao/bin/python";
const MODELO = process.env.MODELO_YUNET ?? "/opt/viral-farm/.venv-visao/yunet.onnx";
const JANELA = { inicio: 10, fim: 40 };
const SAIDA = { largura: 1080, altura: 1920 };

function detectar(video: string): Promise<{
  largura: number;
  altura: number;
  amostras: Amostra[];
}> {
  return new Promise((resolve, reject) => {
    const p = spawn(PY, [
      path.join("worker", "deteccao", "rostos.py"),
      "--video", video,
      "--inicio", String(JANELA.inicio),
      "--fim", String(JANELA.fim),
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

async function main() {
  const video = process.argv[2];
  const de = Number(process.argv[3] ?? 23);
  const ate = Number(process.argv[4] ?? 25);

  const dados = await detectar(video);
  const amostras = dados.amostras.map((a) => ({ ...a, t: a.t - JANELA.inicio }));
  const fonte = { largura: dados.largura, altura: dados.altura };
  const meia = larguraDoCrop(fonte, SAIDA) / 2;
  const cortes = await detectarCortesDeCena(video, JANELA.inicio, JANELA.fim);
  const pontos = planejarTrajetoriaPorCena(amostras, cortes, fonte, SAIDA);

  console.log(
    `fonte ${fonte.largura}px · recorte ${(meia * 2).toFixed(0)}px · ` +
      `cortes de cena em ${cortes.map((c) => (c + JANELA.inicio).toFixed(1)).join(", ")}\n`,
  );
  console.log(
    "  t(orig)  câmera  janela do corte   rosto (x..x+w)   sobra esq/dir  inteiro?",
  );

  for (const a of amostras) {
    const tOrig = a.t + JANELA.inicio;
    if (tOrig < de || tOrig > ate) continue;
    const x = centroEm(pontos, a.t);
    const esq = x - meia;
    const dir = x + meia;
    const r = a.rostos[0];
    if (!r) {
      console.log(
        `  ${tOrig.toFixed(1).padStart(6)}  ${x.toFixed(0).padStart(6)}  ` +
          `${esq.toFixed(0)}..${dir.toFixed(0)}`.padStart(17) +
          "   (nenhum rosto detectado no ORIGINAL)",
      );
      continue;
    }
    const cabe = r.x >= esq && r.x + r.w <= dir;
    console.log(
      `  ${tOrig.toFixed(1).padStart(6)}  ${x.toFixed(0).padStart(6)}  ` +
        `${esq.toFixed(0)}..${dir.toFixed(0)}`.padStart(17) +
        `   ${r.x.toFixed(0)}..${(r.x + r.w).toFixed(0)}`.padStart(17) +
        `   ${(r.x - esq).toFixed(0).padStart(5)}/${(dir - r.x - r.w).toFixed(0).padStart(5)}` +
        `      ${cabe ? "sim" : "NÃO"}`,
    );
  }
}

main().catch((e) => {
  console.error("FALHOU:", e instanceof Error ? e.message : e);
  process.exit(1);
});
