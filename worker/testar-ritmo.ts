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
import { runBinario, run, bin } from "../src/lib/proc";
import { renderizarCorte, palavrasNaJanela, duracaoFinal } from "./renderizar";
import { medirQuadro } from "./enquadramento";
import { planejarRitmoDoCorte, planejarRitmo } from "./ritmo";
import { detectarCortesDeCena } from "./cenas";
import type { Enquadramento } from "./enquadramento";
import type { Palavra } from "./transcritor";

/** Resolução da leitura. Alta o bastante para a borda cair numa linha nítida. */
const LARGURA = 270;
const ALTURA = 480;

/**
 * O frame está em `ajustar`? Procura a EMENDA, não a barra.
 *
 * A primeira versão disto contava linhas lisas a partir do topo, supondo que
 * fundo desfocado = ausência de detalhe. Deu falso alarme na primeira tentativa
 * e por um motivo óbvio depois de ver o frame: um close com fundo escuro atrás
 * da cabeça também tem o topo liso. O teste acusou o ato 3 de estar errado
 * quando o vídeo estava perfeito — e teste que grita à toa é pior que teste
 * nenhum, porque ensina a ignorar o resultado.
 *
 * O sinal certo é geométrico e não depende do conteúdo da cena. No `ajustar`,
 * a frente é o vídeo inteiro escalado para 1080 de largura e colado no meio:
 * a altura dela sai da proporção da FONTE, e nas duas pontas dessa faixa há
 * uma emenda entre imagem nítida e fundo borrado. Essa descontinuidade é
 * abrupta — muito maior que a diferença entre duas linhas vizinhas quaisquer.
 * Em `preencher` a imagem é contínua e não existe emenda alguma.
 *
 * Comparar o salto NA borda esperada com o salto TÍPICO do resto do frame
 * torna a medida independente de a cena ser clara, escura, lisa ou detalhada.
 */
async function pareceAjustar(
  mp4: string,
  segundo: number,
  proporcaoDaFonte: number,
): Promise<{ ajustar: boolean; salto: number } | null> {
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

  /** Diferença média, pixel a pixel, entre duas linhas. */
  const entreLinhas = (y: number): number => {
    if (y < 1 || y >= ALTURA) return 0;
    let soma = 0;
    for (let x = 0; x < LARGURA; x++) {
      soma += Math.abs(buf[y * LARGURA + x] - buf[(y - 1) * LARGURA + x]);
    }
    return soma / LARGURA;
  };

  // Onde a frente começa: altura dela é a largura cheia vezes a proporção da
  // fonte, e ela fica centrada.
  const alturaFrente = LARGURA * proporcaoDaFonte;
  const bordaCima = Math.round((ALTURA - alturaFrente) / 2);
  const bordaBaixo = Math.round((ALTURA + alturaFrente) / 2);

  // ±2 linhas de tolerância: o arredondamento da escala move a emenda.
  const naBorda = Math.max(
    ...[-2, -1, 0, 1, 2].flatMap((d) => [
      entreLinhas(bordaCima + d),
      entreLinhas(bordaBaixo + d),
    ]),
  );

  // O salto típico do frame, longe das bordas candidatas.
  const tipicos: number[] = [];
  for (let y = 2; y < ALTURA - 2; y++) {
    if (Math.abs(y - bordaCima) <= 4 || Math.abs(y - bordaBaixo) <= 4) continue;
    tipicos.push(entreLinhas(y));
  }
  tipicos.sort((a, b) => a - b);
  const mediano = tipicos[Math.floor(tipicos.length / 2)] || 1;

  const salto = naBorda / Math.max(mediano, 0.5);
  // 3x acima do salto mediano: uma emenda de verdade passa disso com folga,
  // e nenhuma textura de cena produz um degrau assim numa linha exata.
  return { ajustar: salto > 3, salto };
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

/** altura/largura da fonte — é ela que define onde a emenda do `ajustar` cai. */
async function proporcaoDoVideo(video: string): Promise<number> {
  const saida = await run(
    bin.ffprobe(),
    [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=p=0",
      video,
    ],
    { timeoutMs: 20_000 },
  );
  const [l, a] = saida.trim().split(",").map(Number);
  return l && a ? a / l : 9 / 16;
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

  /**
   * FORCAR_ALTERNANCIA=1 ignora a medição e alterna à força.
   *
   * Serve para VER o efeito, e só. Num material em que as bordas carregam
   * conteúdo o tempo todo — trailer widescreen, por exemplo — o conteúdo manda
   * nos três atos e a alternância nunca aparece na tela, por mais correta que
   * esteja. Sem uma forma de forçar, a única maneira de olhar o resultado
   * seria caçar um vídeo com a mistura certa.
   *
   * NÃO é um modo de produção: forçar aqui significa aceitar cortar conteúdo
   * que a medição disse para não cortar.
   */
  const forcar = process.env.FORCAR_ALTERNANCIA === "1";
  const blocos = await planejarRitmoDoCorte(
    dur,
    cortes,
    palavras,
    inicio,
    (de, ate) => medirQuadro(video, de, ate),
    (t) => inicio + t,
  );
  if (forcar) {
    for (const [i, b] of blocos.entries()) {
      b.enquadramento = i % 2 === 0 ? "preencher" : "ajustar";
      b.motivo = "FORÇADO para inspeção visual — a medição foi ignorada";
    }
  }

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

  const proporcao = await proporcaoDoVideo(video);
  console.log(
    `\n  O QUE SAIU (salto na emenda; fonte ${(1 / proporcao).toFixed(2)}:1):`,
  );
  let falhas = 0;
  for (const b of blocos) {
    // O meio do bloco: longe das emendas de tempo, onde o frame é inequívoco.
    const t = (b.de + b.ate) / 2;
    const m = await pareceAjustar(path.join(dir, "com-ritmo.mp4"), t, proporcao);
    if (m === null) {
      console.log(`  ${t.toFixed(1)}s  não consegui ler o frame`);
      falhas += 1;
      continue;
    }
    const esperado = b.enquadramento === "ajustar";
    const ok = m.ajustar === esperado;
    if (!ok) falhas += 1;
    console.log(
      `  ${t.toFixed(1).padStart(5)}s  salto ${m.salto.toFixed(1).padStart(5)}x  ` +
        `vi ${(m.ajustar ? "ajustar" : "preencher").padEnd(9)}  ` +
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
