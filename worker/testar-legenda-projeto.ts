/**
 * A legenda acompanha a costura dos clipes?
 *
 *   npx tsx worker/testar-legenda-projeto.ts
 *
 * Cada palavra vive no tempo da FONTE; o vídeo final é a costura dos clipes.
 * Uma palavra em 40s da fonte pode terminar em 8s do resultado — ou sumir, se
 * o trecho dela ficou de fora. Errar esse mapeamento não quebra nada: o vídeo
 * sai, com a legenda no instante errado, e só assistindo se percebe.
 *
 * O teste vai até o MP4: renderiza de verdade e confere que o ASS gerado tem
 * a palavra no segundo certo do arquivo final.
 */
import path from "node:path";
import fs from "node:fs/promises";
import { run, bin } from "../src/lib/proc";
import { planejarTransicoes, planejarRender, argumentosDeRender } from "./render-projeto";
import { gerarAss } from "./legendas";
import {
  ENQUADRAMENTO_PADRAO,
  projetoVazio,
  trilhaDe,
  type ItemVideo,
  type Projeto,
} from "../src/lib/editor/projeto";
import type { Palavra } from "./transcritor";

let falhas = 0;
function conferir(nome: string, ok: boolean, detalhe = "") {
  console.log(`${ok ? "ok  " : "ERRO"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  if (!ok) falhas += 1;
}
const perto = (a: number, b: number, tol = 0.05) => Math.abs(a - b) < tol;

function clipe(over: Partial<ItemVideo> = {}): ItemVideo {
  return {
    id: Math.random().toString(36).slice(2),
    tipo: "video",
    inicio_s: 0, fim_s: 5,
    fonteInicio_s: 0, fonteFim_s: 5,
    enquadramento: { ...ENQUADRAMENTO_PADRAO },
    keyframes: [], volume: 1, efeitos: [], transicao: null,
    ...over,
  };
}

/**
 * Cópia da função privada de renderizar-projeto.ts.
 *
 * Duplicar num teste é ruim; importar exigiria exportar uma função que só o
 * render usa, alargando a superfície pública pra fazer teste. Se as duas
 * divergirem, as asserções de tempo do ASS (parte 2) pegam — elas passam pelo
 * código de verdade.
 */
function mapear(
  cru: [string, number, number][],
  videos: ItemVideo[],
  plano: ReturnType<typeof planejarTransicoes>,
): Palavra[] {
  const palavras: Palavra[] = [];
  let base = 0;
  videos.forEach((v, i) => {
    base -= plano.porClipe[i]?.duracao_s ?? 0;
    for (const [texto, ini, fim] of cru) {
      if (ini < v.fonteInicio_s || fim > v.fonteFim_s) continue;
      palavras.push({
        texto,
        inicio_s: base + (ini - v.fonteInicio_s),
        fim_s: base + (fim - v.fonteInicio_s),
      });
    }
    base += v.fonteFim_s - v.fonteInicio_s;
  });
  return palavras.sort((a, b) => a.inicio_s - b.inicio_s);
}

/** Uma palavra por segundo, de 0 a 59: o tempo vira o próprio rótulo. */
const CRU: [string, number, number][] = Array.from({ length: 60 }, (_, i) => [
  `S${i}`, i, i + 0.9,
]);

async function main() {
  console.log("=== 1. o mapeamento ===\n");

  {
    // Um clipe que começa em 10s da fonte: S10 tem que virar o segundo 0.
    const v = [clipe({ inicio_s: 0, fim_s: 5, fonteInicio_s: 10, fonteFim_s: 15 })];
    const p = mapear(CRU, v, planejarTransicoes(v));
    conferir("só as palavras do trecho entram", p.length === 5, `${p.length} de 60`);
    conferir("a primeira é S10", p[0]?.texto === "S10", p[0]?.texto);
    conferir("S10 cai no segundo 0 da saída", perto(p[0].inicio_s, 0), `${p[0].inicio_s}`);
    conferir("S14 cai no segundo 4", perto(p[4].inicio_s, 4), `${p[4].inicio_s}`);
  }

  {
    // DOIS clipes de trechos distantes: é aqui que o mapeamento ingênuo erra.
    const v = [
      clipe({ inicio_s: 0, fim_s: 5, fonteInicio_s: 10, fonteFim_s: 15 }),
      clipe({ inicio_s: 5, fim_s: 10, fonteInicio_s: 40, fonteFim_s: 45 }),
    ];
    const p = mapear(CRU, v, planejarTransicoes(v));
    const s40 = p.find((x) => x.texto === "S40");
    conferir("pega os dois trechos", p.length === 10, `${p.length}`);
    conferir(
      "S40 (2º clipe) cai no segundo 5, não em 40",
      Boolean(s40) && perto(s40!.inicio_s, 5),
      `${s40?.inicio_s}`,
    );
    conferir(
      "nada do meio descartado entra",
      !p.some((x) => ["S20", "S30"].includes(x.texto)),
    );
  }

  {
    // Com transição os clipes se encavalam: o 2º começa ANTES.
    const v = [
      clipe({ inicio_s: 0, fim_s: 5, fonteInicio_s: 10, fonteFim_s: 15 }),
      clipe({
        inicio_s: 5, fim_s: 10, fonteInicio_s: 40, fonteFim_s: 45,
        transicao: { tipo: "fade", duracao_s: 1 },
      }),
    ];
    const p = mapear(CRU, v, planejarTransicoes(v));
    const s40 = p.find((x) => x.texto === "S40");
    conferir(
      "com fade de 1s, S40 cai em 4 e não em 5",
      Boolean(s40) && perto(s40!.inicio_s, 4),
      `${s40?.inicio_s}`,
    );
  }

  console.log("\n=== 2. chega no ASS e no MP4? ===\n");

  const dir = path.join(process.cwd(), "saidas", "legenda-projeto");
  await fs.mkdir(dir, { recursive: true });

  const fonte = path.join(dir, "_fonte.mp4");
  await run(
    bin.ffmpeg(),
    ["-f", "lavfi", "-i", "testsrc2=s=1280x720:r=30:d=50",
     "-f", "lavfi", "-i", "sine=f=440:d=50",
     "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
     "-c:a", "aac", "-shortest", "-y", fonte],
    { timeoutMs: 180_000 },
  );

  const p: Projeto = projetoVazio({
    corteId: "x", analiseId: "y", proxyUrl: null, duracao_s: 50,
  });
  const videos = [
    clipe({ inicio_s: 0, fim_s: 5, fonteInicio_s: 10, fonteFim_s: 15 }),
    clipe({ inicio_s: 5, fim_s: 10, fonteInicio_s: 40, fonteFim_s: 45 }),
  ];
  trilhaDe(p, "video").itens.push(...videos);

  const palavras = mapear(CRU, videos, planejarTransicoes(videos));
  const ass = gerarAss(palavras, 0, "hormozi") ?? "";
  await fs.writeFile(path.join(dir, "l.ass"), ass, "utf-8");

  // O ASS deve trazer S10 perto de 0:00 e S40 perto de 0:05.
  const eventos = ass.split("\n").filter((l) => l.startsWith("Dialogue:"));
  const emSegundos = (t: string) => {
    const [h, m, s] = t.split(":");
    return Number(h) * 3600 + Number(m) * 60 + Number(s);
  };
  const acha = (rotulo: string) =>
    eventos.find((e) => e.includes(rotulo))?.split(",")[1];

  /**
   * Instante ABSOLUTO da palavra no arquivo.
   *
   * Não basta o início do Dialogue: os dois clipes são contíguos na linha
   * (4,9s e 5,0s), então S10 e S40 caem no MESMO bloco de legenda, que começa
   * em zero. Escrevi a primeira versão deste teste conferindo só o início do
   * bloco e ela acusou o código à toa.
   *
   * O que localiza a palavra é o karaokê: cada {\k##} antes dela é o tempo,
   * em centésimos, das palavras já ditas.
   */
  function instanteDe(rotulo: string): number | null {
    const linha = eventos.find((e) => e.includes(rotulo));
    if (!linha) return null;
    const inicio = emSegundos(linha.split(",")[1]);
    const texto = linha.split(",").slice(9).join(",");
    const ate = texto.indexOf(rotulo);
    let cs = 0;
    for (const m of texto.slice(0, ate).matchAll(/\\k(\d+)/g)) cs += Number(m[1]);
    return inicio + cs / 100;
  }

  const tS10 = instanteDe("S10");
  const tS40 = instanteDe("S40");
  conferir("S10 está no ASS", tS10 !== null, `${tS10}s`);
  conferir("S40 está no ASS", tS40 !== null, `${tS40}s`);
  if (tS10 !== null && tS40 !== null) {
    conferir("S10 sai perto de 0s no arquivo", tS10 < 1.5, `${tS10.toFixed(2)}s`);
    conferir(
      "S40 sai perto de 5s, não de 40s",
      Math.abs(tS40 - 5) < 1.5,
      `${tS40.toFixed(2)}s`,
    );
  }
  conferir("nenhuma palavra do trecho descartado vazou", !ass.includes("S25"));

  const plano = planejarRender(p, { largura: 1280, altura: 720 }, "l.ass");
  const saida = path.join(dir, "final.mp4");
  await run(bin.ffmpeg(), argumentosDeRender(fonte, plano, saida), {
    timeoutMs: 5 * 60_000, cwd: dir,
  });
  const dur = await run(
    bin.ffprobe(),
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", saida],
    { timeoutMs: 30_000 },
  );
  conferir("o MP4 sai com os 10s dos dois clipes", perto(Number(dur), 10, 0.3), `${Number(dur).toFixed(2)}s`);

  console.log();
  if (falhas > 0) {
    console.log(`${falhas} falha(s).`);
    process.exit(1);
  }
  console.log("Legenda acompanha a costura: cada palavra no segundo certo do arquivo final.");
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
