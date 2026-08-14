/**
 * Onde a trajetória ACHA que o rosto está, contra onde ele realmente está.
 *
 *   npx tsx worker/diagnosticar-rastreio.ts VIDEO
 *
 * O teste A/B reprovou o rastreamento: o rosto ficou MENOS centrado com ele
 * do que com crop fixo. Isso pode ser três coisas bem diferentes, e o
 * conserto de cada uma é outro:
 *
 *   1. a trajetória segue o rosto errado (escolha)
 *   2. a trajetória está certa mas atrasada (suavização forte demais)
 *   3. a trajetória está certa e o FILTRO aplica no tempo errado (defasagem)
 *
 * Aqui a trajetória planejada é comparada, instante a instante, com a
 * posição medida do rosto na FONTE. Se as duas baterem, o problema está no
 * filtro; se não baterem, está na trajetória.
 */
import path from "node:path";
import { spawn } from "node:child_process";
import {
  planejarTrajetoria,
  centroEm,
  larguraDoCrop,
  type Amostra,
} from "../src/lib/enquadramento/trajetoria";

const PY = process.env.PY_VISAO ?? "/opt/viral-farm/.venv-visao/bin/python";
const MODELO = process.env.MODELO_YUNET ?? "/opt/viral-farm/.venv-visao/yunet.onnx";

const JANELA = { inicio_s: 10, fim_s: 40 };
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

async function main() {
  const video = process.argv[2];
  const dados = await detectar(video, JANELA.inicio_s, JANELA.fim_s);
  const fonte = { largura: dados.largura, altura: dados.altura };
  const pontos = planejarTrajetoria(dados.amostras, fonte, SAIDA);
  const largCrop = larguraDoCrop(fonte, SAIDA);
  const meia = largCrop / 2;

  console.log(
    `fonte ${fonte.largura}x${fonte.altura} · recorte ${largCrop.toFixed(0)}px · ` +
      `${pontos.length} pontos\n`,
  );
  console.log("  t     rosto    câmera   erro   dentro do recorte?");

  let dentro = 0;
  let comRosto = 0;
  let somaErro = 0;

  for (const a of dados.amostras) {
    const t = a.t - JANELA.inicio_s;
    const r = a.rostos[0];
    const camera = centroEm(pontos, t);
    if (!r) continue;

    comRosto += 1;
    const centroRosto = r.x + r.w / 2;
    const erro = centroRosto - camera;
    // O rosto está visível no corte se o CENTRO dele cai dentro da janela.
    const visivel = Math.abs(erro) <= meia;
    if (visivel) dentro += 1;
    somaErro += Math.abs(erro);

    // Só imprime uma amostra a cada 2s, pra tabela caber na tela.
    if (Math.abs(t % 2) < 0.01) {
      console.log(
        `${t.toFixed(1).padStart(5)}s ${centroRosto.toFixed(0).padStart(7)} ` +
          `${camera.toFixed(0).padStart(9)} ${erro.toFixed(0).padStart(7)}   ` +
          `${visivel ? "sim" : "NAO"}`,
      );
    }
  }

  console.log(
    `\nrosto dentro do recorte em ${dentro}/${comRosto} amostras ` +
      `(${((dentro / comRosto) * 100).toFixed(0)}%)`,
  );
  console.log(`erro médio da câmera: ${(somaErro / comRosto).toFixed(0)}px ` +
    `· meia-janela: ${meia.toFixed(0)}px`);

  // Comparação: onde o crop FIXO deixaria o rosto.
  const centroFixo = fonte.largura / 2;
  let dentroFixo = 0;
  for (const a of dados.amostras) {
    const r = a.rostos[0];
    if (!r) continue;
    if (Math.abs(r.x + r.w / 2 - centroFixo) <= meia) dentroFixo += 1;
  }
  console.log(
    `com crop FIXO o rosto estaria dentro em ${dentroFixo}/${comRosto} ` +
      `(${((dentroFixo / comRosto) * 100).toFixed(0)}%)`,
  );
}

main().catch((e) => {
  console.error("FALHOU:", e instanceof Error ? e.message : e);
  process.exit(1);
});
