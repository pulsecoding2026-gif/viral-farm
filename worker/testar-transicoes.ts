/**
 * Transições e efeitos: a conta fecha e o ffmpeg aceita?
 *
 *   npx tsx worker/testar-transicoes.ts
 *
 * Renderiza DE VERDADE, a partir de uma fonte sintética do lavfi, e mede o
 * arquivo com ffprobe. Conferir só o texto do grafo não provaria nada: a
 * armadilha do `xfade` é que ele SOBREPÕE os clipes, e um grafo que "parece
 * certo" pode sair com uma duração que ninguém previu. Aqui o teste pergunta
 * ao arquivo.
 *
 * Quatro perguntas:
 *   1. a conta da sobreposição fecha (unidade, sem ffmpeg)?
 *   2. dois clipes com fade de 1s produzem um arquivo ENCURTADO em 1s?
 *   3. um efeito com janela sai no arquivo — e só dentro da janela?
 *   4. os cinco tipos de transição rodam sem o ffmpeg reclamar?
 */
import path from "node:path";
import fs from "node:fs/promises";
import { run, bin } from "../src/lib/proc";
import {
  filtroDeEfeito,
  planejarTransicoes,
  planejarRender,
  argumentosDeRender,
} from "./render-projeto";
import {
  ENQUADRAMENTO_PADRAO,
  projetoVazio,
  trilhaDe,
  type Efeito,
  type ItemVideo,
  type Projeto,
  type Transicao,
} from "../src/lib/editor/projeto";

const dir = path.join(process.cwd(), "saidas", "transicoes");
let falhas = 0;

function conferir(nome: string, ok: boolean, detalhe = "") {
  console.log(`${ok ? "ok  " : "ERRO"} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  if (!ok) falhas += 1;
}

let contador = 0;
function clipe(over: Partial<ItemVideo> = {}): ItemVideo {
  contador += 1;
  return {
    id: `c${contador}`,
    tipo: "video",
    inicio_s: 0,
    fim_s: 3,
    fonteInicio_s: 0,
    fonteFim_s: 3,
    enquadramento: { ...ENQUADRAMENTO_PADRAO },
    keyframes: [],
    volume: 1,
    efeitos: [],
    transicao: null,
    ...over,
  };
}

function projetoCom(itens: ItemVideo[]): Projeto {
  const p = projetoVazio({
    corteId: "x",
    analiseId: "y",
    proxyUrl: null,
    duracao_s: 12,
  });
  // 1:1 em vez de 9:16 só pelo tempo do teste: metade dos pixels de saída,
  // mesma cadeia de filtros.
  p.proporcao = "1:1";
  trilhaDe(p, "video").itens.push(...itens);
  return p;
}

function efeito(over: Partial<Efeito> = {}): Efeito {
  contador += 1;
  return {
    id: `e${contador}`,
    tipo: "blur",
    de: 1,
    ate: 2,
    intensidade: 0.6,
    ...over,
  };
}

async function duracaoDe(arq: string): Promise<number> {
  const saida = await run(
    bin.ffprobe(),
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", arq],
    { timeoutMs: 30_000 },
  );
  return Number(saida.trim());
}

/** Renderiza o projeto e devolve o que o arquivo tem de duração. */
async function renderizar(p: Projeto, nome: string) {
  const plano = planejarRender(p, { largura: 1280, altura: 720 }, null);
  const saida = path.join(dir, `${nome}.mp4`);
  const t0 = Date.now();
  await run(bin.ffmpeg(), argumentosDeRender(fonte, plano, saida), {
    timeoutMs: 5 * 60_000,
    cwd: dir,
  });
  return {
    plano,
    saida,
    duracao: await duracaoDe(saida),
    segundos: (Date.now() - t0) / 1000,
  };
}

/**
 * PSNR médio entre dois renders numa janela de tempo.
 *
 * É como o teste prova que o efeito ENTROU: comparar frames com e sem efeito.
 * Dentro da janela do blur os dois vídeos têm que divergir muito (PSNR baixo);
 * fora dela têm que ser praticamente o mesmo quadro (PSNR alto). O `stats_file`
 * existe porque o psnr só imprime o resumo no stderr, que o `run()` descarta
 * quando o processo termina bem.
 */
async function psnrNaJanela(
  a: string,
  b: string,
  de: number,
  ate: number,
  nome: string,
): Promise<number> {
  const stats = `psnr-${nome}.txt`;
  await run(
    bin.ffmpeg(),
    [
      "-i", a,
      "-i", b,
      "-lavfi",
      `[0:v]trim=start=${de}:end=${ate},setpts=PTS-STARTPTS[x];` +
        `[1:v]trim=start=${de}:end=${ate},setpts=PTS-STARTPTS[y];` +
        `[x][y]psnr=stats_file=${stats}`,
      "-f", "null", "-",
    ],
    { timeoutMs: 2 * 60_000, cwd: dir },
  );
  const texto = await fs.readFile(path.join(dir, stats), "utf-8");
  const valores = [...texto.matchAll(/psnr_avg:([\d.]+|inf)/g)].map((m) =>
    m[1] === "inf" ? 100 : Number(m[1]),
  );
  if (valores.length === 0) return Number.NaN;
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}

let fonte = "";

async function main() {
  await fs.mkdir(dir, { recursive: true });

  console.log("=== 1. a conta da sobreposição (sem ffmpeg) ===\n");

  {
    // Dois clipes de 3s com fade de 1s: o xfade sobrepõe, então o arquivo
    // tem 5s. Este é O número que o plano precisa acertar.
    const t = planejarTransicoes([
      clipe(),
      clipe({ transicao: { tipo: "fade", duracao_s: 1 } }),
    ]);
    conferir("3s + 3s com fade de 1s dão 5s", Math.abs(t.duracao_s - 5) < 1e-6, `${t.duracao_s}s`);
    conferir("declara 1s de sobreposição", Math.abs(t.sobreposicao_s - 1) < 1e-6, `${t.sobreposicao_s}s`);
    conferir("traduz fade para o modo fade do xfade", t.porClipe[1]?.modo === "fade", String(t.porClipe[1]?.modo));
  }

  {
    // Transição mais longa que os clipes não é uma transição longa demais: é
    // um grafo que não roda (o xfade precisa de offset >= 0). Ela é APARADA
    // pro maior valor que cabe, e o projeto é avisado.
    const t = planejarTransicoes([
      clipe({ fonteFim_s: 0.5 }),
      clipe({ fonteFim_s: 0.5, transicao: { tipo: "fade", duracao_s: 2 } }),
    ]);
    conferir("transição maior que os clipes é aparada, não descartada", t.porClipe[1] !== null, `${t.porClipe[1]?.duracao_s}s de 2s pedidos`);
    conferir("aparada pra sobrar um frame em cada lado", Math.abs((t.porClipe[1]?.duracao_s ?? 0) - 0.467) < 0.002, `${t.porClipe[1]?.duracao_s}s`);
    conferir("e o projeto é avisado da apara", t.aparadas === 1 && t.descartadas === 0, `${t.aparadas} aparada(s), ${t.descartadas} descartada(s)`);
  }

  {
    // Clipe tão curto que nem um frame de sobreposição sobra: aí sim some.
    const t = planejarTransicoes([
      clipe({ fonteFim_s: 0.04 }),
      clipe({ fonteFim_s: 0.04, transicao: { tipo: "fade", duracao_s: 1 } }),
    ]);
    conferir("clipe curto demais: a transição some", t.porClipe[1] === null && t.descartadas === 1);
    conferir("e a duração continua a soma crua", Math.abs(t.duracao_s - 0.08) < 1e-6, `${t.duracao_s}s`);
  }

  {
    // Transição no PRIMEIRO clipe não tem de onde vir.
    const t = planejarTransicoes([clipe({ transicao: { tipo: "fade", duracao_s: 1 } })]);
    conferir("transição do primeiro clipe é descartada", t.descartadas === 1 && t.sobreposicao_s === 0);
  }

  {
    // Três clipes, transição só na terceira junção: o offset do xfade tem que
    // ser contado sobre o GRUPO já concatenado (6s), não sobre um clipe.
    const t = planejarTransicoes([
      clipe(),
      clipe(),
      clipe({ transicao: { tipo: "fade", duracao_s: 1 } }),
    ]);
    conferir("3+3+3 com uma transição de 1s dão 8s", Math.abs(t.duracao_s - 8) < 1e-6, `${t.duracao_s}s`);
  }

  {
    const p = projetoCom([
      clipe(),
      clipe({ transicao: { tipo: "deslizar", duracao_s: 1 } }),
    ]);
    const plano = planejarRender(p, { largura: 1280, altura: 720 }, null);
    conferir("o grafo usa xfade no vídeo", /xfade=transition=slideleft/.test(plano.grafo));
    conferir("e acrossfade no áudio", /acrossfade=d=1\.000/.test(plano.grafo));
    conferir("offset desconta a transição", /offset=2\.000/.test(plano.grafo), plano.grafo.split(";").slice(-2)[0]);
    conferir("a duração do plano já vem encurtada", Math.abs(plano.duracao_s - 5) < 1e-6, `${plano.duracao_s}s`);
    conferir(
      "não avisa mais que transição não entra no render",
      !plano.avisos.some((a) => /[Tt]ransi.*não entram/.test(a)),
      plano.avisos.join(" | "),
    );
    conferir(
      "avisa que o arquivo sai mais curto que a linha",
      plano.avisos.some((a) => /sobrep/.test(a)),
      plano.avisos.join(" | ") || "(nenhum aviso)",
    );
  }

  {
    const f = filtroDeEfeito(efeito({ tipo: "blur", de: 1, ate: 2, intensidade: 0.6 }));
    conferir("blur vira gblur com janela", f === "gblur=sigma=12.00:enable='between(t,1.000,2.000)'", String(f));
    conferir("intensidade 0 não gera filtro", filtroDeEfeito(efeito({ intensidade: 0 })) === null);
    conferir("janela vazia não gera filtro", filtroDeEfeito(efeito({ de: 2, ate: 2 })) === null);
    const cinza = filtroDeEfeito(efeito({ tipo: "cinza", intensidade: 1 }));
    conferir("cinza em 1 zera a saturação", cinza?.startsWith("hue=s=0.000") === true, String(cinza));
    conferir("saturacao em 0 é neutra e some", filtroDeEfeito(efeito({ tipo: "saturacao", intensidade: 0 })) === null);
  }

  {
    const p = projetoCom([clipe({ fonteFim_s: 4, efeitos: [efeito()] })]);
    const plano = planejarRender(p, { largura: 1280, altura: 720 }, null);
    conferir(
      "não avisa mais que efeito não entra no render",
      !plano.avisos.some((a) => /[Ee]feitos ainda não/.test(a)),
      plano.avisos.join(" | ") || "(nenhum aviso)",
    );
  }

  console.log("\n=== 2. o arquivo encurta de verdade? ===\n");

  fonte = path.join(dir, "_fonte.mp4");
  await run(
    bin.ffmpeg(),
    ["-f", "lavfi", "-i", "testsrc2=s=1280x720:r=30:d=14",
     "-f", "lavfi", "-i", "sine=f=440:r=48000:d=14",
     "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
     "-c:a", "aac", "-shortest", "-y", fonte],
    { timeoutMs: 120_000 },
  );

  {
    const seco = await renderizar(
      projetoCom([clipe(), clipe({ fonteInicio_s: 5, fonteFim_s: 8 })]),
      "corte-seco",
    );
    conferir("corte seco: 3s + 3s = 6s", Math.abs(seco.duracao - 6) < 0.25, `${seco.duracao.toFixed(2)}s em ${seco.segundos.toFixed(1)}s`);

    const comFade = await renderizar(
      projetoCom([
        clipe(),
        clipe({
          fonteInicio_s: 5,
          fonteFim_s: 8,
          transicao: { tipo: "fade", duracao_s: 1 },
        }),
      ]),
      "fade-1s",
    );
    conferir(
      "fade de 1s: 3s + 3s = 5s no arquivo",
      Math.abs(comFade.duracao - 5) < 0.25,
      `${comFade.duracao.toFixed(2)}s em ${comFade.segundos.toFixed(1)}s`,
    );
    conferir(
      "o plano não mente sobre o arquivo",
      Math.abs(comFade.duracao - comFade.plano.duracao_s) < 0.25,
      `plano ${comFade.plano.duracao_s.toFixed(2)}s, arquivo ${comFade.duracao.toFixed(2)}s`,
    );
    conferir(
      "o fade encurtou exatamente 1s em relação ao corte seco",
      Math.abs(seco.duracao - comFade.duracao - 1) < 0.15,
      `${seco.duracao.toFixed(2)}s → ${comFade.duracao.toFixed(2)}s`,
    );
  }

  {
    // Duas transições encadeadas: 3+3+3 com dois fades de 1s = 7s. É o caso
    // que pega offset acumulado errado — o segundo xfade recebe um lado
    // esquerdo de 5s, não de 6s.
    const r = await renderizar(
      projetoCom([
        clipe(),
        clipe({ fonteInicio_s: 4, fonteFim_s: 7, transicao: { tipo: "fade", duracao_s: 1 } }),
        clipe({ fonteInicio_s: 9, fonteFim_s: 12, transicao: { tipo: "zoom", duracao_s: 1 } }),
      ]),
      "duas-transicoes",
    );
    conferir("duas transições encadeadas: 9s - 2s = 7s", Math.abs(r.duracao - 7) < 0.25, `${r.duracao.toFixed(2)}s`);
  }

  {
    // Grupo de dois clipes colados + uma transição depois: prova que o offset
    // é contado sobre o concat inteiro (6s), não sobre o último clipe.
    const r = await renderizar(
      projetoCom([
        clipe(),
        clipe({ fonteInicio_s: 3, fonteFim_s: 6 }),
        clipe({ fonteInicio_s: 9, fonteFim_s: 12, transicao: { tipo: "fade", duracao_s: 1 } }),
      ]),
      "grupo-e-transicao",
    );
    conferir("concat de 2 + transição: 9s - 1s = 8s", Math.abs(r.duracao - 8) < 0.25, `${r.duracao.toFixed(2)}s`);
  }

  console.log("\n=== 3. o efeito entra, e só na janela? ===\n");

  {
    const semEfeito = await renderizar(projetoCom([clipe({ fonteFim_s: 4 })]), "sem-efeito");
    const comEfeito = await renderizar(
      projetoCom([clipe({ fonteFim_s: 4, efeitos: [efeito({ de: 1, ate: 2, intensidade: 0.6 })] })]),
      "com-blur",
    );
    conferir(
      "clipe com efeito sai com a duração certa",
      Math.abs(comEfeito.duracao - 4) < 0.25,
      `${comEfeito.duracao.toFixed(2)}s em ${comEfeito.segundos.toFixed(1)}s`,
    );

    const dentro = await psnrNaJanela(comEfeito.saida, semEfeito.saida, 1.2, 1.8, "dentro");
    const fora = await psnrNaJanela(comEfeito.saida, semEfeito.saida, 2.5, 3.5, "fora");
    conferir(
      "dentro da janela o quadro muda muito",
      dentro < fora - 10,
      `PSNR dentro ${dentro.toFixed(1)}dB, fora ${fora.toFixed(1)}dB`,
    );
    conferir("fora da janela o quadro é o mesmo", fora > 35, `PSNR ${fora.toFixed(1)}dB`);
  }

  {
    // Os seis tipos de efeito, todos na mesma cadeia: se algum não aceitar
    // `enable` ou o formato de pixel da cadeia, o ffmpeg quebra aqui.
    const tipos: Efeito["tipo"][] = ["blur", "nitidez", "brilho", "vinheta", "saturacao", "cinza"];
    const p = projetoCom([
      clipe({
        fonteFim_s: 4,
        efeitos: tipos.map((tipo, i) =>
          efeito({ tipo, de: i * 0.5, ate: i * 0.5 + 0.5, intensidade: 0.7 }),
        ),
      }),
    ]);
    try {
      const r = await renderizar(p, "todos-os-efeitos");
      conferir("os 6 tipos de efeito rodam juntos", Math.abs(r.duracao - 4) < 0.25, `${r.duracao.toFixed(2)}s`);
    } catch (e) {
      conferir("os 6 tipos de efeito rodam juntos", false, e instanceof Error ? e.message.split("\n").slice(-3).join(" ") : "");
    }
  }

  console.log("\n=== 4. os cinco tipos de transição rodam? ===\n");

  for (const tipo of ["fade", "zoom", "deslizar", "flash", "blur"] as Transicao["tipo"][]) {
    const p = projetoCom([
      clipe({ fonteFim_s: 2 }),
      clipe({
        fonteInicio_s: 6,
        fonteFim_s: 8,
        transicao: { tipo, duracao_s: 0.5 },
      }),
    ]);
    try {
      const r = await renderizar(p, `tipo-${tipo}`);
      conferir(
        `${tipo} renderiza e encurta 0,5s`,
        Math.abs(r.duracao - 3.5) < 0.25,
        `${r.duracao.toFixed(2)}s em ${r.segundos.toFixed(1)}s`,
      );
    } catch (e) {
      conferir(
        `${tipo} renderiza`,
        false,
        e instanceof Error ? e.message.split("\n").slice(-3).join(" ") : "",
      );
    }
  }

  console.log();
  if (falhas > 0) {
    console.log(`${falhas} falha(s).`);
    process.exit(1);
  }
  console.log("Transições encurtam o arquivo na medida certa e os efeitos entram na janela.");
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
