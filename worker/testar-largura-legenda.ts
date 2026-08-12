/**
 * Nenhum formato pode deixar a legenda sair da área útil.
 *
 *   npx tsx worker/testar-largura-legenda.ts
 *
 * Este é o teste que faltava a sessão inteira. O texto estourando o quadro
 * apareceu três vezes com causas diferentes (tabela de largura chutada,
 * média em vez de soma, âncora sem folga), e as três só foram descobertas
 * olhando frame renderizado. Aqui a conta é conferida direto: pros 15
 * formatos, com frases escolhidas pra serem o pior caso.
 */
import { gerarAss } from "./legendas";
import { FORMATOS, SAFE_ZONE } from "../src/lib/formatos";
import type { Palavra } from "./transcritor";

const LARGURA = 1080;

/**
 * Frases que quebram a média.
 *
 * "mm..." e "porque não" são só letra larga — o caso que a média subestima.
 * "iii" é o oposto, e serve pra pegar folga exagerada. As demais são fala
 * real, com acento e pontuação.
 */
const FRASES = [
  "porque não entendi as 3 regras do jogo",
  "MMMM MMMM MMMM",
  "wwww wwww wwww wwww",
  "iiii iiii iiii iiii iiii",
  "a gente combinou tudo e mesmo assim não deu certo",
  "OLHA O QUE ACONTECEU COM ELE DEPOIS DISSO",
  "5 milhões de reais em 3 meses",
];

let falhas = 0;

function palavras(frase: string): Palavra[] {
  const p = frase.split(" ");
  const passo = 4 / p.length;
  return p.map((texto, i) => ({
    texto,
    inicio_s: i * passo,
    fim_s: (i + 1) * passo - 0.02,
  }));
}

/**
 * A borda direita que o texto não pode cruzar.
 *
 * É o começo do rail da plataforma — o mesmo limite que `ancoraX` usa pra
 * decidir o desvio.
 */
function limiteDireito(margemLateralPct: number, safeDireitaPct: number): number {
  return LARGURA - Math.round(((margemLateralPct + safeDireitaPct) / 100) * LARGURA);
}

function main() {
  console.log(
    `área útil por formato · rail em ${SAFE_ZONE.railDireita.larguraPct}% da largura\n`,
  );

  for (const f of FORMATOS) {
    const l = f.legenda;
    const esquerda = Math.round((l.margemLateralPct / 100) * LARGURA);
    const direita = limiteDireito(l.margemLateralPct, l.safeAreaDireitaPct ?? 0);

    let piorSobra = Infinity;
    let piorFrase = "";

    for (const frase of FRASES) {
      const ass = gerarAss(palavras(frase), 0, f.id) ?? "";

      for (const linha of ass.split("\n")) {
        if (!linha.startsWith("Dialogue:")) continue;
        const pos = /\\pos\((\d+),/.exec(linha);
        if (!pos) continue;
        const ancora = Number(pos[1]);

        // O texto é centrado na âncora, então a metade da linha mais larga
        // é o que decide se cruza a borda.
        const texto = linha.split(",").slice(9).join(",");
        const visivel = texto.replace(/\{[^}]*\}/g, "");
        const corpo = corpoDaLinha(linha, f);
        for (const parte of visivel.split("\\N")) {
          // Reconstrói a largura pela mesma fonte de verdade do gerador:
          // se as duas discordarem, é o gerador que está errado.
          const meia = larguraAproximada(parte, f, corpo) / 2;
          const sobraEsq = ancora - meia - esquerda;
          const sobraDir = direita - (ancora + meia);
          const sobra = Math.min(sobraEsq, sobraDir);
          if (sobra < piorSobra) {
            piorSobra = sobra;
            piorFrase = parte.trim().slice(0, 34);
          }
        }
      }
    }

    const ok = piorSobra >= -1; // 1px de tolerância pro arredondamento do ASS.
    console.log(
      `${ok ? "ok  " : "ERRO"} ${f.id.padEnd(20)} sobra mínima ${String(Math.round(piorSobra)).padStart(5)}px  "${piorFrase}"`,
    );
    if (!ok) falhas += 1;
  }

  console.log();
  if (falhas > 0) {
    console.log(`${falhas} formato(s) com texto fora da área útil.`);
    process.exit(1);
  }
  console.log("Nenhum formato cruza a borda: a legenda cabe nos 15.");
}

/**
 * Largura medida pela MESMA tabela que o gerador usa.
 *
 * Importa a tabela em vez de recalcular por conta própria: um teste com
 * fórmula paralela testaria a fórmula do teste, não a do produto.
 */
import larguras from "../src/lib/larguras-fonte.json";
import type { Formato } from "../src/lib/formatos";

function larguraAproximada(texto: string, f: Formato, corpo: number): number {
  const familia = f.legenda.fonte.split("/")[0].trim().toLowerCase();
  const mapa = (larguras as Record<string, Record<string, number>>)[familia];
  if (!mapa) return texto.length * 0.45 * corpo;

  const vs = Object.values(mapa);
  const media = vs.reduce((a, b) => a + b, 0) / vs.length;
  const alta = f.legenda.caixa.toUpperCase().includes("UPPER");
  const aplicado = alta ? texto.toUpperCase() : texto;

  let total = 0;
  for (const c of aplicado) total += mapa[c] ?? media;
  return total * corpo;
}

/** O corpo que o gerador escolheu — lido do próprio ASS, sem duplicar regra. */
function corpoDoFormato(f: Formato): number {
  const ass = gerarAss(palavras("teste"), 0, f.id) ?? "";
  const m = /^Style: Fala,[^,]*,(\d+)/m.exec(ass);
  return m ? Number(m[1]) : 62;
}

/**
 * O corpo EFETIVO da linha: o do estilo, ou o `\fs` que o bloco carrega.
 *
 * Ignorar o `\fs` faria o teste medir com o corpo cheio e acusar estouro
 * onde o gerador já reduziu — reprovando um comportamento correto.
 */
function corpoDaLinha(linhaDoAss: string, f: Formato): number {
  const fs = /\\fs(\d+)/.exec(linhaDoAss);
  return fs ? Number(fs[1]) : corpoDoFormato(f);
}

main();
