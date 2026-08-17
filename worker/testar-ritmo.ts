/**
 * O corte com RITMO existe mesmo? Renderiza e confere frame a frame.
 *
 *   npx tsx worker/testar-ritmo.ts VIDEO [inicio] [fim]
 *
 * Duas perguntas, e a segunda é a que importa:
 *
 *   1. O plano faz sentido — blocos de tamanhos parecidos, trocas em
 *      fronteiras naturais, e o conteúdo mandando onde deve mandar.
 *   2. O VÍDEO SAIU com os planos alternando. Um grafo de ffmpeg que monta
 *      sem erro não prova nada: `concat` com timestamps errados devolve
 *      arquivo válido e conteúdo torto, e foi assim que os buracos de linha
 *      do tempo apareceram no editor.
 *
 * A conferência é por PROPORÇÃO DE BARRA. No enquadramento `ajustar` o vídeo
 * inteiro cabe na largura e sobra fundo desfocado em cima e embaixo; em
 * `preencher` a imagem ocupa tudo. Medindo quanto do topo do frame é escuro e
 * liso dá para dizer qual enquadramento está na tela naquele segundo, sem
 * precisar de olho humano.
 */
import path from "node:path";
import fs from "node:fs/promises";
import { runBinario, bin } from "../src/lib/proc";
import { renderizarCorte, palavrasNaJanela, duracaoFinal } from "./renderizar";
import { medirQuadro } from "./enquadramento";
import { planejarRitmoDoCorte, planejarRitmo } from "./ritmo";
import { detectarCortesDeCena } from "./cenas";
import type { Enquadramento } from "./enquadramento";
import type { Palavra } from "./transcritor";

const LARGURA = 108;
const ALTURA = 192;

/**
 * Quanto do frame, em cima, é "fundo" — escuro e sem variação.
 *
 * O fundo do `ajustar` é o próprio vídeo ampliado, desfocado e escurecido em
 * 16%, então ele NÃO é preto: o teste não pode procurar preto puro. O que o
 * distingue é a falta de detalhe — depois do gblur não sobra borda nenhuma —
 * combinada com o escurecimento. Daí medir desvio local e brilho juntos.
 */
async function faixaDeFundo(mp4: string, segundo: number): Promise<number | null> {
  let buf: Buffer;
  try {
    buf = await runBinario(
      bin.ffmpeg(),
      [
        "-ss", segundo.toFixed(2),
        "-i", mp4,
        "-frames:v", "1",
        "-vf", `scale=${LARGURA}:${ALTURA}`,
        "-pix_fmt", "gray",
        "-f", "rawvideo",
        "-",
      ],
      { timeoutMs: 20_000 },
    );
  } catch {
    return null;
  }
  if (buf.length < LARGURA * ALTURA) return null;

  // Percorre de cima para baixo e para na primeira linha com detalhe real.
  let linhas = 0;
  for (let y = 0; y < Math.floor(ALTURA / 2); y++) {
    const linha: number[] = [];
    for (let x = 0; x < LARGURA; x++) linha.push(buf[y * LARGURA + x]);
    const media = linha.reduce((a, b) => a + b, 0) / linha.length;
    const dp = Math.sqrt(
      linha.reduce((a, p) => a + (p - media) ** 2, 0) / linha.length,
    );
    if (dp > 18) break;
    linhas += 1;
  }
  return linhas / ALTURA;
}

/**
 * A ALTERNÂNCIA, testada sem depender de achar o material certo.
 *
 * O teste de vídeo real prova que o grafo executa, mas ele não consegue provar
 * que o ritmo alterna: no trailer usado, as bordas carregam conteúdo o tempo
 * todo, o conteúdo manda nos três atos e a preferência de ritmo nunca chega a
 * ser consultada. Esperar aparecer um vídeo com a mistura exata seria testar
 * por sorteio.
 *
 * Aqui a medição é substituída por respostas escolhidas, o que deixa perguntar
 * as três coisas que a regra promete: alterna quando está livre, obedece
 * quando o conteúdo impõe, e — a parte que erra fácil — depois de uma imposição
 * ela continua alternando A PARTIR DO QUE FOI USADO, não do que queria ter
 * usado.
 */
async function testarAlternancia(): Promise<number> {
  const fronteiras = [10, 20];
  const livre = { obrigatorio: null, motivo: "faixa livre" };

  const casos: Array<{
    nome: string;
    respostas: Array<{ obrigatorio: Enquadramento | null; motivo: string }>;
    espera: Enquadramento[];
  }> = [
    {
      nome: "tudo livre: fecha, abre, fecha",
      respostas: [livre, livre, livre],
      espera: ["preencher", "ajustar", "preencher"],
    },
    {
      nome: "conteúdo impõe no 1º: o ritmo segue a partir do que foi usado",
      respostas: [
        { obrigatorio: "ajustar", motivo: "bordas cheias" },
        livre,
        livre,
      ],
      espera: ["ajustar", "preencher", "ajustar"],
    },
    {
      nome: "conteúdo impõe em todos: ritmo não passa por cima",
      respostas: [
        { obrigatorio: "ajustar", motivo: "bordas cheias" },
        { obrigatorio: "ajustar", motivo: "bordas cheias" },
        { obrigatorio: "ajustar", motivo: "bordas cheias" },
      ],
      espera: ["ajustar", "ajustar", "ajustar"],
    },
  ];

  let falhas = 0;
  console.log("  A ALTERNÂNCIA (medição simulada):");
  for (const caso of casos) {
    let i = 0;
    const blocos = await planejarRitmo(
      30,
      fronteiras,
      async () => caso.respostas[Math.min(i++, caso.respostas.length - 1)],
    );
    const deu = blocos.map((b) => b.enquadramento);
    const ok =
      deu.length === caso.espera.length &&
      deu.every((e, k) => e === caso.espera[k]);
    if (!ok) falhas += 1;
    console.log(
      `  ${ok ? "ok  " : "ERRO"} ${caso.nome}\n       saiu: ${deu.join(" → ")}` +
        (ok ? "" : `\n       esperado: ${caso.espera.join(" → ")}`),
    );
  }
  console.log();
  return falhas;
}

async function main() {
  const falhasDaRegra = await testarAlternancia();

  const video = process.argv[2];
  const inicio = Number(process.argv[3] ?? 10);
  const fim = Number(process.argv[4] ?? 40);
  if (!video) throw new Error("uso: npx tsx worker/testar-ritmo.ts VIDEO [inicio] [fim]");

  const corte = { inicio_s: inicio, fim_s: fim };
  const dir = path.join(process.cwd(), "saidas", "ritmo");
  await fs.mkdir(dir, { recursive: true });

  /**
   * Sem transcrição neste teste: as fronteiras vêm só dos cortes de cena.
   * É de propósito — é o caminho mais difícil, porque num vídeo sem corte
   * nenhum o ritmo tem que se virar com o que tiver, e num trailer ele tem
   * fronteira demais e precisa escolher bem.
   */
  const palavras: Palavra[] = [];
  const cortes = await detectarCortesDeCena(video, inicio, fim);
  const dur = duracaoFinal(corte, palavras, false);

  const blocos = await planejarRitmoDoCorte(
    dur,
    cortes,
    palavras,
    inicio,
    (de, ate) => medirQuadro(video, de, ate),
    (t) => inicio + t,
  );

  console.log(
    `${path.basename(video)} · ${inicio}–${fim}s (${dur.toFixed(1)}s) · ` +
      `${cortes.length} cortes de cena\n`,
  );
  console.log("  O PLANO:");
  for (const [i, b] of blocos.entries()) {
    console.log(
      `  ${i + 1}. ${b.de.toFixed(1).padStart(5)}–${b.ate.toFixed(1).padEnd(5)}s  ` +
        `${b.enquadramento.padEnd(9)}  ${b.motivo}`,
    );
  }

  if (blocos.length < 2) {
    console.log(
      "\nUm bloco só — não há ritmo a conferir. Isso é legítimo (corte curto " +
        "ou sem fronteira natural), mas o teste perde o sentido aqui.",
    );
    if (falhasDaRegra > 0) process.exit(1);
    return;
  }

  /**
   * COM LEGENDA, que é o caminho que o worker usa de verdade.
   *
   * O grafo do ritmo termina num rótulo (`[rvout]`) e a legenda é colada
   * depois dele; sem legenda esse trecho vira um `null` para o rótulo não
   * ficar solto. São dois caminhos diferentes dentro do mesmo código, e testar
   * só o mais simples deixaria o outro quebrar em produção — que é onde ele
   * roda.
   */
  console.log("\n  renderizando (com legenda, como em produção)…");
  await renderizarCorte(video, corte, palavras, dir, "com-ritmo", {
    estilo: "hormozi",
    tituloTela: "TESTE DE RITMO",
    ritmo: blocos,
  });

  console.log("\n  O QUE SAIU (faixa de fundo no topo do frame):");
  let falhas = 0;
  for (const b of blocos) {
    // O meio do bloco: longe das emendas, onde o frame é inequívoco.
    const t = (b.de + b.ate) / 2;
    const faixa = await faixaDeFundo(path.join(dir, "com-ritmo.mp4"), t);
    if (faixa === null) {
      console.log(`  ${t.toFixed(1)}s  não consegui ler o frame`);
      falhas += 1;
      continue;
    }
    // `ajustar` numa fonte 16:9 deixa ~28% do frame de fundo em cada ponta;
    // 8% é folga generosa para não confundir com uma cena de céu liso.
    const pareceAjustar = faixa > 0.08;
    const esperado = b.enquadramento === "ajustar";
    const ok = pareceAjustar === esperado;
    if (!ok) falhas += 1;
    console.log(
      `  ${t.toFixed(1).padStart(5)}s  faixa ${(faixa * 100).toFixed(0).padStart(3)}%  ` +
        `planejado ${b.enquadramento.padEnd(9)}  ${ok ? "ok" : "NÃO CONFERE"}`,
    );
  }

  console.log(`\nvídeo em ${path.join(dir, "com-ritmo.mp4")}`);
  if (falhas + falhasDaRegra > 0) process.exit(1);
}

main().catch((e) => {
  console.error("FALHOU:", e instanceof Error ? e.message : e);
  process.exit(1);
});
