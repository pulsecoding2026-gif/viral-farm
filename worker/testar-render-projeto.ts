/**
 * Renderiza um projeto de verdade e confere o resultado no arquivo.
 *
 *   npx tsx worker/testar-render-projeto.ts
 *
 * Duas perguntas separadas:
 *   1. A conta de enquadramento fecha? (unidade, sem ffmpeg)
 *   2. O grafo RODA e sai na proporção pedida, com os clipes na ordem certa?
 */
import path from "node:path";
import fs from "node:fs/promises";
import { run, bin } from "../src/lib/proc";
import {
  filtroDeEnquadramento,
  planejarRender,
  argumentosDeRender,
} from "./render-projeto";
import {
  ENQUADRAMENTO_PADRAO,
  PROPORCOES,
  projetoVazio,
  trilhaDe,
  type ItemVideo,
  type Projeto,
} from "../src/lib/editor/projeto";

const dir = path.join(process.cwd(), "saidas", "render-projeto");
let falhas = 0;

function conferir(nome: string, ok: boolean, detalhe = "") {
  console.log(`${ok ? "ok  " : "ERRO"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  if (!ok) falhas += 1;
}

function clipe(over: Partial<ItemVideo> = {}): ItemVideo {
  return {
    id: Math.random().toString(36).slice(2),
    tipo: "video",
    inicio_s: 0,
    fim_s: 4,
    fonteInicio_s: 0,
    fonteFim_s: 4,
    enquadramento: { ...ENQUADRAMENTO_PADRAO },
    keyframes: [],
    volume: 1,
    efeitos: [],
    transicao: null,
    ...over,
  };
}

async function dimensoes(arq: string): Promise<{ l: number; a: number; d: number }> {
  const saida = await run(
    bin.ffprobe(),
    ["-v", "error", "-select_streams", "v:0", "-show_entries",
     "stream=width,height:format=duration", "-of", "csv=p=0", arq],
    { timeoutMs: 30_000 },
  );
  const nums = saida.trim().split(/[\n,]/).map(Number).filter((n) => !Number.isNaN(n));
  return { l: nums[0], a: nums[1], d: nums[2] };
}

async function main() {
  await fs.mkdir(dir, { recursive: true });

  console.log("=== 1. a conta do enquadramento ===\n");

  {
    // 16:9 virando 9:16 sem zoom: a fonte precisa ser ampliada até a LARGURA
    // caber, e o corte tira o excesso de altura.
    const f = filtroDeEnquadramento(
      { largura: 1920, altura: 1080 },
      { largura: 1080, altura: 1920 },
      { ...ENQUADRAMENTO_PADRAO },
    );
    const escala = /scale=(\d+):(\d+)/.exec(f);
    const corte = /crop=(\d+):(\d+):(\d+):(\d+)/.exec(f);
    conferir("gera scale e crop", Boolean(escala && corte), f);
    if (escala && corte) {
      const [, l, a] = escala.map(Number);
      conferir("escala cobre o quadro", l >= 1080 && a >= 1920, `${l}x${a}`);
      conferir("recorta no tamanho de saída", corte[1] === "1080" && corte[2] === "1920");
      // 16:9 -> 9:16 amplia até a ALTURA bater (1080*1.778 = 1920), então a
      // sobra é horizontal: (3414-1080)/2 = 1167. Escrevi 818 aqui na
      // primeira versão supondo sobra vertical — o teste pegou a minha conta
      // errada, não a do código.
      conferir("centraliza na sobra horizontal", Math.abs(Number(corte[3]) - 1167) < 3, `x=${corte[3]}`);
      conferir("sem sobra vertical, y fica em zero", corte[4] === "0", `y=${corte[4]}`);
    }
  }

  {
    // Puxar pra esquerda além da borda não pode gerar deslocamento negativo:
    // seria faixa preta, que é justamente o que o recorte evita.
    const f = filtroDeEnquadramento(
      { largura: 1920, altura: 1080 },
      { largura: 1080, altura: 1920 },
      { x: 0, y: 0, zoom: 1, rotacao: 0 },
    );
    const c = /crop=\d+:\d+:(\d+):(\d+)/.exec(f);
    conferir("prende na borda, sem valor negativo", c?.[1] === "0" && c?.[2] === "0", f);
  }

  {
    const semZoom = filtroDeEnquadramento(
      { largura: 1920, altura: 1080 }, PROPORCOES["9:16"], { ...ENQUADRAMENTO_PADRAO },
    );
    const comZoom = filtroDeEnquadramento(
      { largura: 1920, altura: 1080 }, PROPORCOES["9:16"], { ...ENQUADRAMENTO_PADRAO, zoom: 2 },
    );
    const l1 = Number(/scale=(\d+)/.exec(semZoom)![1]);
    const l2 = Number(/scale=(\d+)/.exec(comZoom)![1]);
    conferir("zoom 2 dobra a escala", Math.abs(l2 - l1 * 2) <= 2, `${l1} -> ${l2}`);
  }

  console.log("\n=== 2. o grafo roda? ===\n");

  const fonte = path.join(dir, "_fonte.mp4");
  await run(
    bin.ffmpeg(),
    ["-f", "lavfi", "-i", "testsrc2=s=1280x720:r=30:d=12",
     "-f", "lavfi", "-i", "sine=f=440:d=12",
     "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
     "-c:a", "aac", "-shortest", "-y", fonte],
    { timeoutMs: 120_000 },
  );
  const dimFonte = await dimensoes(fonte);

  for (const prop of ["9:16", "1:1", "4:5", "16:9"] as const) {
    const p: Projeto = projetoVazio({
      corteId: "x", analiseId: "y", proxyUrl: null, duracao_s: 12,
    });
    p.proporcao = prop;
    // Dois clipes de trechos DIFERENTES da fonte: é o que prova que o
    // concat e a janela por item funcionam.
    trilhaDe(p, "video").itens.push(
      clipe({ inicio_s: 0, fim_s: 3, fonteInicio_s: 1, fonteFim_s: 4 }),
      clipe({ inicio_s: 3, fim_s: 6, fonteInicio_s: 8, fonteFim_s: 11,
              enquadramento: { x: 0.3, y: 0.5, zoom: 1.6, rotacao: 0 } }),
    );

    const plano = planejarRender(p, { largura: dimFonte.l, altura: dimFonte.a }, null);
    const saida = path.join(dir, `${prop.replace(":", "x")}.mp4`);
    const t0 = Date.now();
    try {
      await run(bin.ffmpeg(), argumentosDeRender(fonte, plano, saida), {
        timeoutMs: 5 * 60_000, cwd: dir,
      });
    } catch (e) {
      conferir(`${prop} renderiza`, false, e instanceof Error ? e.message.split("\n")[1] ?? e.message : "");
      continue;
    }
    const d = await dimensoes(saida);
    const esperado = PROPORCOES[prop];
    conferir(
      `${prop} renderiza em ${esperado.largura}x${esperado.altura}`,
      d.l === esperado.largura && d.a === esperado.altura,
      `${d.l}x${d.a} em ${((Date.now() - t0) / 1000).toFixed(1)}s`,
    );
    // 3 + 3 dos dois clipes.
    conferir(`${prop} concatena os dois clipes`, Math.abs(d.d - 6) < 0.4, `${d.d?.toFixed(2)}s`);
  }

  console.log("\n=== 3. avisa o que ainda não faz? ===\n");
  {
    const p: Projeto = projetoVazio({ corteId: "x", analiseId: "y", proxyUrl: null, duracao_s: 12 });
    trilhaDe(p, "video").itens.push(
      clipe({ keyframes: [{ t: 0, valor: { zoom: 1 }, curva: "suave" }] }),
    );
    const plano = planejarRender(p, { largura: 1280, altura: 720 }, null);
    conferir(
      "avisa que keyframe não anima no render",
      plano.avisos.some((a) => /[Kk]eyframe/.test(a)),
      plano.avisos.join(" | "),
    );
  }

  console.log();
  if (falhas > 0) {
    console.log(`${falhas} falha(s).`);
    process.exit(1);
  }
  console.log("Enquadramento fecha a conta e o grafo roda nas 4 proporções.");
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
