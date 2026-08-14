/**
 * O encadeamento completo, contra vídeo de VERDADE.
 *
 *   npx tsx worker/testar-rastreio-real.ts CAMINHO_DO_VIDEO
 *
 * Os testes das peças usam dados sintéticos: rosto que anda em linha reta,
 * tremor de ±3px, duas pessoas alternando. Isso prova a matemática e não
 * prova NADA sobre gravação real, onde o detector perde o rosto quando a
 * pessoa vira, acha rosto em cartaz na parede, e a cena corta pra um plano
 * com três pessoas.
 *
 * Aqui a detecção real alimenta a trajetória real, e o que se mede é o que
 * decide se o resultado parece profissional:
 *
 *   · a câmera fica PARADA quando a cena está parada?
 *   · ela se move devagar o bastante pra não parecer tranco?
 *   · ela evita pingar entre pessoas num plano com várias?
 */
import { spawn } from "node:child_process";
import {
  planejarTrajetoria,
  larguraDoCrop,
  centroEm,
  type Amostra,
} from "../src/lib/enquadramento/trajetoria";

const PY = process.env.PY_VISAO ?? "/opt/viral-farm/.venv-visao/bin/python";
const MODELO = process.env.MODELO_YUNET ?? "/opt/viral-farm/.venv-visao/yunet.onnx";

function detectar(video: string, inicio: number, fim: number): Promise<{
  largura: number;
  altura: number;
  amostras: Amostra[];
}> {
  return new Promise((resolve, reject) => {
    const p = spawn(PY, [
      "worker/deteccao/rostos.py",
      "--video", video,
      "--inicio", String(inicio),
      "--fim", String(fim),
      "--fps", "2",
      "--modelo", MODELO,
    ]);
    let saida = "";
    let erro = "";
    p.stdout.on("data", (d) => (saida += d));
    p.stderr.on("data", (d) => (erro += d));
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error(erro.slice(-400) || `código ${code}`));
      try {
        resolve(JSON.parse(saida));
      } catch {
        reject(new Error(`JSON inválido: ${saida.slice(0, 200)}`));
      }
    });
  });
}

async function main() {
  const video = process.argv[2];
  if (!video) throw new Error("uso: npx tsx worker/testar-rastreio-real.ts VIDEO");

  const INICIO = 10;
  const FIM = 60;

  const t0 = Date.now();
  const { largura, altura, amostras } = await detectar(video, INICIO, FIM);
  const segundos = (Date.now() - t0) / 1000;

  const comRosto = amostras.filter((a) => a.rostos.length > 0).length;
  const varias = amostras.filter((a) => a.rostos.length > 1).length;
  console.log(
    `detecção: ${amostras.length} amostras de ${FIM - INICIO}s em ${segundos.toFixed(1)}s ` +
      `(${((segundos / (FIM - INICIO)) * 100).toFixed(0)}% do tempo real)`,
  );
  console.log(
    `           ${comRosto} com rosto · ${varias} com mais de um · ` +
      `${amostras.length - comRosto} sem ninguém\n`,
  );

  const fonte = { largura, altura };
  const saida = { largura: 1080, altura: 1920 };
  const pontos = planejarTrajetoria(amostras, fonte, saida);
  const largCrop = larguraDoCrop(fonte, saida);

  console.log(
    `trajetória: ${pontos.length} pontos · recorte de ${largCrop.toFixed(0)}px ` +
      `numa fonte de ${largura}px\n`,
  );

  let falhas = 0;
  const conferir = (nome: string, ok: boolean, detalhe = "") => {
    console.log(`${ok ? "ok  " : "ERRO"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
    if (!ok) falhas += 1;
  };

  // 1. Nunca sai da fonte. É o invariante que estraga o vídeo se quebrar.
  const min = largCrop / 2;
  const max = largura - largCrop / 2;
  const fora = pontos.filter((p) => p.centroX < min - 0.5 || p.centroX > max + 0.5);
  conferir(
    "o recorte nunca sai da fonte",
    fora.length === 0,
    `limites ${min.toFixed(0)}–${max.toFixed(0)}px`,
  );

  // 2. Velocidade: o que separa panorâmica de tranco.
  let piorVel = 0;
  for (let i = 1; i < pontos.length; i++) {
    const dt = pontos[i].t - pontos[i - 1].t;
    if (dt <= 0) continue;
    const v = Math.abs(pontos[i].centroX - pontos[i - 1].centroX) / dt;
    if (v > piorVel) piorVel = v;
  }
  const tetoVel = largCrop * 0.4;
  conferir(
    "a câmera não dá tranco",
    piorVel <= tetoVel * 1.05,
    `pico ${piorVel.toFixed(0)}px/s, teto ${tetoVel.toFixed(0)}px/s`,
  );

  // 3. Movimento total: câmera que varre o tempo todo cansa quem assiste.
  let percorrido = 0;
  for (let i = 1; i < pontos.length; i++) {
    percorrido += Math.abs(pontos[i].centroX - pontos[i - 1].centroX);
  }
  const porSegundo = percorrido / (FIM - INICIO);
  conferir(
    "a câmera fica mais parada que andando",
    porSegundo < largCrop * 0.25,
    `${porSegundo.toFixed(1)}px/s em média`,
  );

  // 4. Amostragem do resultado, pra olho humano conferir o que a conta diz.
  console.log("\nonde a câmera está, a cada 5s:");
  for (let t = INICIO; t <= FIM; t += 5) {
    const x = centroEm(pontos, t - INICIO);
    const pct = ((x / largura) * 100).toFixed(0);
    const barra = "·".repeat(Math.round((x / largura) * 40));
    console.log(`  ${String(t).padStart(3)}s  ${x.toFixed(0).padStart(4)}px (${pct}%)  ${barra}|`);
  }

  console.log();
  if (falhas > 0) {
    console.log(`${falhas} problema(s).`);
    process.exit(1);
  }
  console.log("Rastreio estável em material real.");
}

main().catch((e) => {
  console.error("FALHOU:", e instanceof Error ? e.message : e);
  process.exit(1);
});
