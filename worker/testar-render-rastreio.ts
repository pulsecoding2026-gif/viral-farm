/**
 * Renderiza o MESMO trecho com e sem rastreamento, e mede a diferença.
 *
 *   npx tsx worker/testar-render-rastreio.ts CAMINHO_DO_VIDEO
 *
 * As peças já provaram a matemática. Isto responde a única pergunta que
 * sobra: o vídeo entregue realmente ficou melhor?
 *
 * A medida é o ROSTO NA SAÍDA. Extraímos frames dos dois vídeos, detectamos
 * o rosto em cada um e medimos o quanto ele está longe do centro horizontal.
 * Rastreamento que funciona mantém o rosto perto do meio; crop fixo deixa
 * ele passear e às vezes sair do quadro.
 */
import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { run, bin } from "../src/lib/proc";
import { renderizarCorte } from "./renderizar";
import { rastrearRosto } from "./rastrear-rosto";

const PY = process.env.PY_VISAO ?? "/opt/viral-farm/.venv-visao/bin/python";
const MODELO = process.env.MODELO_YUNET ?? "/opt/viral-farm/.venv-visao/yunet.onnx";

const JANELA = { inicio_s: 10, fim_s: 40 };
const SAIDA = { largura: 1080, altura: 1920 };

type Amostra = { t: number; rostos: { x: number; w: number; conf: number }[] };

function detectar(video: string): Promise<{ largura: number; amostras: Amostra[] }> {
  return new Promise((resolve, reject) => {
    const p = spawn(PY, [
      path.join("worker", "deteccao", "rostos.py"),
      "--video", video, "--fps", "2", "--modelo", MODELO,
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

/**
 * O quanto o rosto está fora do centro, em % da largura.
 *
 * 0% = perfeitamente centrado. 50% = na borda. Acima disso, saiu do quadro.
 */
async function desvioDoCentro(mp4: string): Promise<{
  medio: number;
  pior: number;
  perdidos: number;
  amostras: number;
  /** Em que instantes o detector não achou ninguém — para cruzar os dois. */
  vazios: number[];
}> {
  const { largura, amostras } = await detectar(mp4);
  const centro = largura / 2;
  const desvios: number[] = [];
  const vazios: number[] = [];

  for (const a of amostras) {
    const r = a.rostos[0];
    if (!r) {
      vazios.push(a.t);
      continue;
    }
    desvios.push(Math.abs(r.x + r.w / 2 - centro) / largura);
  }

  return {
    medio: desvios.length
      ? (desvios.reduce((s, d) => s + d, 0) / desvios.length) * 100
      : 0,
    pior: desvios.length ? Math.max(...desvios) * 100 : 0,
    perdidos: vazios.length,
    amostras: amostras.length,
    vazios,
  };
}

async function main() {
  const video = process.argv[2];
  if (!video) throw new Error("uso: npx tsx worker/testar-render-rastreio.ts VIDEO");

  const dir = path.join(process.cwd(), "saidas", "render-rastreio");
  await fs.mkdir(dir, { recursive: true });

  console.log("planejando o rastreamento…");
  const t0 = Date.now();
  const rastreio = await rastrearRosto(video, JANELA, SAIDA);
  if (!rastreio) {
    /**
     * RECUSAR NÃO É FALHAR.
     *
     * Este teste tratava a ausência de rastreio como erro, o que fazia sentido
     * quando a única causa possível era Python quebrado. Agora há uma causa
     * legítima e desejável: `rastrearRosto` mede se seguir ganha do crop
     * central NESTE vídeo e desiste quando não ganha. Num trailer de cinema é
     * exatamente o que deve acontecer — a fotografia já pôs o assunto no
     * centro. Sair com erro aqui treinaria a gente a ignorar o teste, ou pior,
     * a mexer no algoritmo até ele parar de recusar.
     */
    console.log(
      "  o rastreio se RECUSOU a agir neste material (a razão está no log " +
        "acima).\n  Isso é o comportamento correto quando o crop central já " +
        "acerta mais.\n  Para exercitar o caminho de render, rode com " +
        "FORCAR_RASTREIO=1.",
    );
    process.exit(0);
  }
  console.log(
    `  ${rastreio.pontos} pontos · rosto em ${rastreio.comRosto}/${rastreio.amostras} amostras ` +
      `· seguir ${rastreio.acertosSeguindo} × ${rastreio.acertosFixo} fixo ` +
      `· ${((Date.now() - t0) / 1000).toFixed(1)}s\n`,
  );

  for (const [nome, filtro] of [
    ["sem-rastreio", null],
    ["com-rastreio", rastreio.filtro],
  ] as const) {
    const t = Date.now();
    await renderizarCorte(video, JANELA, [], dir, nome, {
      enquadramento: "preencher",
      filtroDeCrop: filtro,
    });
    console.log(`${nome} renderizado em ${((Date.now() - t) / 1000).toFixed(1)}s`);
  }

  console.log("\nmedindo onde o rosto ficou na SAÍDA:\n");
  const sem = await desvioDoCentro(path.join(dir, "sem-rastreio.mp4"));
  const com = await desvioDoCentro(path.join(dir, "com-rastreio.mp4"));

  const linha = (rotulo: string, m: Awaited<ReturnType<typeof desvioDoCentro>>) =>
    `  ${rotulo.padEnd(14)} desvio médio ${m.medio.toFixed(1).padStart(5)}%  ` +
    `pior ${m.pior.toFixed(1).padStart(5)}%  ` +
    `sem rosto no quadro: ${m.perdidos}/${m.amostras}`;

  console.log(linha("crop fixo", sem));
  console.log(linha("seguindo", com));

  /**
   * QUEM PERDEU O ROSTO, e só quem o OUTRO manteve.
   *
   * O número agregado ("20 contra 18") não diz se são os mesmos instantes com
   * dois a mais, ou dois conjuntos diferentes que por acaso têm tamanhos
   * parecidos. A pergunta útil é a assimétrica: em que instantes o crop fixo
   * mostrou alguém e o rastreamento não? Só esses são regressão; o resto é o
   * detector falhando igual nos dois, ou trecho que não tinha ninguém desde a
   * origem — e o trecho medido tem 17 amostras assim.
   */
  const soNoFixo = com.vazios.filter((t) => !sem.vazios.includes(t));
  const soNoSeguindo = sem.vazios.filter((t) => !com.vazios.includes(t));
  console.log(
    `\n  perdeu SÓ com rastreamento: ${soNoFixo.length ? soNoFixo.map((t) => t.toFixed(1)).join(", ") + "s" : "nenhum"}`,
  );
  console.log(
    `  perdeu SÓ com crop fixo:    ${soNoSeguindo.length ? soNoSeguindo.map((t) => t.toFixed(1)).join(", ") + "s" : "nenhum"}`,
  );

  console.log();
  let falhas = 0;
  const conferir = (nome: string, ok: boolean, detalhe = "") => {
    console.log(`${ok ? "ok  " : "ERRO"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
    if (!ok) falhas += 1;
  };

  conferir(
    "o rosto fica mais centrado com rastreamento",
    com.medio < sem.medio,
    `${com.medio.toFixed(1)}% contra ${sem.medio.toFixed(1)}%`,
  );
  conferir(
    "o rosto some do quadro menos vezes",
    com.perdidos <= sem.perdidos,
    `${com.perdidos} contra ${sem.perdidos} amostras sem rosto`,
  );

  console.log(`\nvídeos em ${dir}`);
  if (falhas > 0) process.exit(1);
}

main().catch((e) => {
  console.error("FALHOU:", e instanceof Error ? e.message : e);
  process.exit(1);
});
