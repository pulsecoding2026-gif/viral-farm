/**
 * Verifica a INTELIGÊNCIA de formato: a IA casa cada trecho com o preset que
 * combina com aquele conteúdo?
 *
 * Roda transcrições sintéticas de tipos bem diferentes e conferre três coisas:
 *   1. o formato devolvido existe na galeria;
 *   2. conteúdos diferentes recebem formatos diferentes (não é sempre o padrão);
 *   3. a duração do corte respeita a faixa do formato escolhido.
 *
 *   npx tsx worker/testar-escolha-formato.ts
 */
import "../scripts/_env";
import { escolherCortes } from "./cortar";
import { ambiente } from "./ambiente";
import { acharFormato, FORMATO_PADRAO } from "../src/lib/formatos";
import type { TranscricaoPalavras } from "./transcritor";

/** Vira uma transcrição com tempos plausíveis (≈2,6 palavras por segundo). */
function transcrever(bruto: string): TranscricaoPalavras {
  const passo = 1 / 2.6;
  const lista = bruto.split(/\s+/).filter(Boolean);
  return {
    texto: lista.join(" "),
    idioma: "pt",
    palavras: lista.map((t, i) => ({
      texto: t,
      inicio_s: Number((i * passo).toFixed(2)),
      fim_s: Number((i * passo + passo - 0.03).toFixed(2)),
    })),
  };
}

const CASOS: { nome: string; esperado: string[]; texto: string }[] = [
  {
    nome: "negócios / autoridade",
    esperado: ["hormozi", "minimal-premium", "documentary", "before-after"],
    texto: `
Eu perdi trezentos mil reais no meu primeiro ano de empresa e a culpa não foi
do mercado. Foi de uma decisão que eu tomo até hoje e que quase todo dono de
negócio toma errado. Você contrata pra tapar buraco. Alguém pede demissão,
você entra em pânico e contrata a primeira pessoa que parece competente. Eu
fiz isso cinco vezes seguidas. Cinco. E as cinco pessoas saíram em menos de
oito meses. O custo real de uma contratação errada não é o salário. É o tempo
que você gasta treinando, é o cliente que ela perde, é o time que desanima de
ver gente entrando e saindo. Some tudo isso e você chega em quatro vezes o
salário anual daquela pessoa. Quatro vezes. A regra que mudou minha empresa
foi simples. Nunca contrate pra apagar incêndio. Contrate quando você já tem
o processo escrito, o resultado esperado definido e alguém pra treinar. Se
você não tem essas três coisas, você não tem uma vaga. Você tem um problema
de gestão fingindo que é um problema de gente. Escreve isso.
`,
  },
  {
    nome: "história pessoal / storytelling",
    esperado: ["reddit-stories", "true-crime", "documentary", "podcast-premium"],
    texto: `
Eram três da manhã quando meu telefone tocou. Número desconhecido. Eu quase
não atendi. Uma mulher perguntou se eu era o dono do carro placa terminada em
quarenta e sete. Eu disse que sim. Ela ficou em silêncio por uns cinco
segundos e falou: seu carro está na minha garagem, e eu moro em outro estado.
Eu levantei da cama. Olhei pela janela. Meu carro estava lá, na frente de
casa, exatamente onde eu tinha estacionado. Eu falei pra ela que devia ter
algum engano. Ela mandou uma foto. Era o meu carro. Mesma cor, mesmo amassado
na porta do motorista, mesmo adesivo desbotado no vidro traseiro. Eu desci as
escadas correndo, saí de casa descalço e cheguei perto do carro. A placa
estava lá. Quarenta e sete. Aí eu olhei pro vidro traseiro. Não tinha adesivo
nenhum. Nunca teve. E foi aí que eu entendi o que tinha acontecido.
`,
  },
  {
    nome: "lista / educação",
    esperado: ["top-countdown", "minimal-premium", "ai-explainer", "documentary"],
    texto: `
Três hábitos que destroem sua noite de sono e você faz todos eles sem
perceber. Número três: café depois das duas da tarde. A cafeína tem meia vida
de seis horas, então metade daquele cafezinho das quatro ainda está no seu
sangue às dez da noite. Número dois: treinar pesado perto da hora de dormir.
Exercício intenso sobe sua temperatura corporal e o corpo precisa esfriar pra
iniciar o sono. Você precisa de pelo menos três horas de intervalo. E o número
um, o pior de todos: dormir e acordar em horários diferentes todo dia. Seu
corpo tem um relógio interno e ele não entende fim de semana. Dormir às onze
na segunda e às duas no sábado é o equivalente a viajar dois fusos horários
toda semana. Consertar isso é de graça e muda tudo.
`,
  },
];

async function main() {
  const llm = ambiente.llm();
  console.log(`Modelo: ${llm.provedor}/${llm.modelo}\n`);

  const escolhidos = new Set<string>();
  let falhas = 0;

  for (const caso of CASOS) {
    const t = transcrever(caso.texto);
    const duracao = t.palavras.at(-1)!.fim_s;

    const cortes = await escolherCortes(llm, t, duracao, {
      qtd: 2,
      estilo: "auto",
    });

    console.log(`── ${caso.nome} (${Math.round(duracao)}s de fala)`);
    if (cortes.length === 0) {
      console.log("   nenhum corte devolvido\n");
      falhas += 1;
      continue;
    }

    for (const c of cortes) {
      const f = acharFormato(c.formato);
      const dur = Math.round(c.fim_s - c.inicio_s);
      const existe = f.id === c.formato;
      const naFaixa =
        dur >= f.duracaoIdeal.minSeg - 5 && dur <= f.duracaoIdeal.maxSeg + 5;
      const plausivel = caso.esperado.includes(f.id);

      escolhidos.add(f.id);
      if (!existe) falhas += 1;

      console.log(
        `   ${c.formato.padEnd(20)} ${String(dur).padStart(3)}s ` +
          `| id: ${existe ? "ok" : "INVENTADO"} ` +
          `| faixa ${f.duracaoIdeal.minSeg}-${f.duracaoIdeal.maxSeg}s: ${naFaixa ? "ok" : "FORA"} ` +
          `| coerente: ${plausivel ? "sim" : "discutivel"}`,
      );
      console.log(`   └ ${c.motivoFormato}`);
    }
    console.log();
  }

  console.log("── resumo");
  console.log(`formatos distintos escolhidos: ${escolhidos.size} (${[...escolhidos].join(", ")})`);
  if (escolhidos.size === 1 && escolhidos.has(FORMATO_PADRAO)) {
    console.log("PROBLEMA: caiu no padrão em todos os casos — não houve escolha.");
    process.exit(1);
  }
  if (falhas > 0) {
    console.log(`PROBLEMA: ${falhas} falha(s) de id.`);
    process.exit(1);
  }
  console.log("A escolha de formato está discriminando por conteúdo.");
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
