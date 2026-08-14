/**
 * Qual é a MELHOR taxa possível neste material?
 *
 *   npx tsx worker/teto-do-rastreio.ts VIDEO
 *
 * A meta é 85% de amostras com o rosto dentro do recorte. Antes de perseguir
 * esse número, é preciso saber se ele existe: um recorte 9:16 numa fonte
 * 16:9 é estreito, e quando há duas pessoas em pontas opostas do quadro
 * NENHUMA posição de câmera coloca as duas dentro.
 *
 * Aqui medimos três referências:
 *
 *   FIXO      o crop central de hoje — o que temos que bater
 *   ORÁCULO   uma câmera que teleporta pro rosto a cada amostra, sem
 *             suavização e sem física. É o TETO: nenhuma trajetória real
 *             pode superar, porque ela acerta cada amostra isoladamente.
 *   VIÁVEL    o oráculo restrito a uma posição por CENA (a melhor posição
 *             fixa daquela cena). É o teto realista da abordagem por cena.
 *
 * Se o VIÁVEL já estiver abaixo de 85%, a meta não é de trajetória — é de
 * recorte (zoom out) ou de enquadramento "ajustar", e insistir na
 * suavização seria otimizar a coisa errada.
 */
import path from "node:path";
import { spawn } from "node:child_process";
import { larguraDoCrop, type Amostra } from "../src/lib/enquadramento/trajetoria";
import { detectarCortesDeCena } from "./cenas";

const PY = process.env.PY_VISAO ?? "/opt/viral-farm/.venv-visao/bin/python";
const MODELO = process.env.MODELO_YUNET ?? "/opt/viral-farm/.venv-visao/yunet.onnx";

const JANELA = { inicio_s: 10, fim_s: 40 };
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
      "--inicio", String(JANELA.inicio_s),
      "--fim", String(JANELA.fim_s),
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

/** A amostra tem algum rosto cujo centro cabe na janela centrada em `x`? */
function acerta(a: Amostra, x: number, meia: number): boolean {
  return a.rostos.some((r) => Math.abs(r.x + r.w / 2 - x) <= meia);
}

async function main() {
  const video = process.argv[2];
  const dados = await detectar(video);
  const fonte = { largura: dados.largura, altura: dados.altura };
  const meia = larguraDoCrop(fonte, SAIDA) / 2;

  const comRosto = dados.amostras.filter((a) => a.rostos.length > 0);
  const total = comRosto.length;

  // FIXO: crop central.
  const centro = fonte.largura / 2;
  const fixo = comRosto.filter((a) => acerta(a, centro, meia)).length;

  // ORÁCULO: a cada amostra, a melhor posição possível.
  const oraculo = comRosto.filter((a) =>
    a.rostos.some((r) => {
      const x = Math.min(
        Math.max(r.x + r.w / 2, meia),
        fonte.largura - meia,
      );
      return acerta(a, x, meia);
    }),
  ).length;

  // VIÁVEL: uma posição por cena, escolhida pra acertar o máximo daquela cena.
  const cortes = await detectarCortesDeCena(video, JANELA.inicio_s, JANELA.fim_s);
  const fronteiras = [0, ...cortes, JANELA.fim_s - JANELA.inicio_s];
  let viavel = 0;
  for (let i = 0; i < fronteiras.length - 1; i++) {
    const de = fronteiras[i];
    const ate = fronteiras[i + 1];
    const daCena = comRosto.filter((a) => {
      const t = a.t - JANELA.inicio_s;
      return t >= de && t < ate;
    });
    if (daCena.length === 0) continue;

    // Testa cada centro de rosto da cena como candidato e fica com o melhor.
    const candidatos = daCena.flatMap((a) =>
      a.rostos.map((r) =>
        Math.min(Math.max(r.x + r.w / 2, meia), fonte.largura - meia),
      ),
    );
    let melhor = 0;
    for (const x of candidatos) {
      const n = daCena.filter((a) => acerta(a, x, meia)).length;
      if (n > melhor) melhor = n;
    }
    viavel += melhor;
  }

  const pct = (n: number) => `${((n / total) * 100).toFixed(0)}%`;
  console.log(
    `fonte ${fonte.largura}px · recorte ${(meia * 2).toFixed(0)}px · ` +
      `${total} amostras com rosto · ${cortes.length} cortes de cena\n`,
  );
  console.log(`  FIXO     ${String(fixo).padStart(3)}/${total}  ${pct(fixo)}   (o que temos hoje)`);
  console.log(`  VIÁVEL   ${String(viavel).padStart(3)}/${total}  ${pct(viavel)}   (melhor posição por cena)`);
  console.log(`  ORÁCULO  ${String(oraculo).padStart(3)}/${total}  ${pct(oraculo)}   (teto absoluto)`);

  console.log();
  const meta = 0.85;
  if (viavel / total < meta) {
    console.log(
      `A meta de 85% NÃO cabe na abordagem por cena neste material ` +
        `(teto viável ${pct(viavel)}). Chegar lá exigiria recorte mais largo ` +
        `ou enquadramento "ajustar".`,
    );
  } else {
    console.log(
      `A meta de 85% é alcançável: o teto viável por cena é ${pct(viavel)}.`,
    );
  }
}

main().catch((e) => {
  console.error("FALHOU:", e instanceof Error ? e.message : e);
  process.exit(1);
});
