/**
 * Roda uma análise completa pela linha de comando, sem banco e sem UI.
 *
 *   npm run analisar -- "<link>" "<nicho>"
 *
 * Ex.: npm run analisar -- "https://www.youtube.com/shorts/xxxx" "culinária"
 *
 * Existe pra validar o pipeline isoladamente: se aqui funciona, qualquer
 * problema na web é da camada web, não da análise.
 */
import "./_env";
import { writeFileSync, mkdirSync } from "node:fs";
import { analisarLink, type Etapa } from "../src/lib/analise/pipeline";

const ROTULO: Record<Etapa, string> = {
  validando: "Validando link",
  "lendo-metadados": "Lendo dados do vídeo",
  baixando: "Baixando vídeo",
  "extraindo-frames": "Extraindo frames",
  transcrevendo: "Transcrevendo áudio",
  analisando: "Analisando com a IA (leva ~30-60s)",
  limpando: "Limpando arquivos temporários",
  pronto: "Pronto",
};

async function main() {
  const [link, nicho] = process.argv.slice(2);

  if (!link) {
    console.error('Uso: npm run analisar -- "<link>" "<nicho>"');
    process.exit(1);
  }

  const t0 = Date.now();
  const resultado = await analisarLink(link, { nicho }, (etapa) => {
    const s = ((Date.now() - t0) / 1000).toFixed(1).padStart(5);
    console.log(`[${s}s] ${ROTULO[etapa]}`);
  });

  const { analise, uso, metadados } = resultado;

  console.log("\n" + "=".repeat(70));
  console.log(`${metadados.titulo}`);
  console.log(`por ${metadados.autor} · ${metadados.duracao_s}s`);
  console.log("=".repeat(70));

  console.log(`\nRESUMO\n${analise.resumo}`);
  console.log(`\nNICHO IDENTIFICADO: ${analise.nicho_identificado}`);

  console.log(`\nCONTEÚDO`);
  console.log(`  O que acontece: ${analise.conteudo.o_que_acontece}`);
  console.log(`  Cenário:        ${analise.conteudo.cenario}`);
  console.log(`  Quem/o que:     ${analise.conteudo.pessoas_ou_objetos}`);
  console.log(`  Qualidade:      ${analise.conteudo.qualidade_do_material}`);

  console.log(`\nMOMENTOS APROVEITÁVEIS`);
  for (const m of analise.momentos_utilizaveis) {
    console.log(`  ${m.inicio_s}-${m.fim_s}s ${m.o_que_mostra}`);
    console.log(`    → ${m.como_usar}`);
  }

  console.log(`\nÁUDIO ORIGINAL`);
  console.log(
    `  ${analise.audio.tem_fala ? "Tem fala" : "Sem fala"} · ${
      analise.audio.tem_musica_ambiente ? "tem música/som ambiente" : "sem música/som ambiente"
    }`,
  );
  console.log(`  ${analise.audio.aproveitavel}`);

  console.log(`\nAVALIAÇÃO`);
  console.log(`  A favor:    ${analise.avaliacao.pontos_fortes.join("; ")}`);
  console.log(`  Limitações: ${analise.avaliacao.limitacoes.join("; ")}`);

  console.log(`\nROTEIROS`);
  for (const [i, r] of analise.roteiros.entries()) {
    console.log(`\n  ${i + 1}. ${r.titulo}  (~${r.duracao_estimada_s}s)`);
    console.log(`     Ângulo: ${r.angulo}`);
    console.log(`     Hook:   "${r.hook}"`);
    for (const b of r.blocos) {
      console.log(`     ${b.tempo.padEnd(9)} ${b.fala}`);
      console.log(`     ${" ".repeat(9)} [visual] ${b.visual}`);
    }
    console.log(`     CTA:    ${r.cta}`);
  }

  console.log("\n" + "-".repeat(70));
  console.log(
    `Tokens: ${uso.tokens_entrada} entrada · ${uso.tokens_saida} saída · ` +
      `${uso.tokens_cache_escrita} cache-escrita · ${uso.tokens_cache_leitura} cache-leitura`,
  );
  console.log(`Custo estimado: US$ ${uso.custo_usd_estimado.toFixed(4)}`);
  console.log(`Tempo total: ${(resultado.duracao_total_ms / 1000).toFixed(1)}s`);

  mkdirSync("saidas", { recursive: true });
  const arquivo = `saidas/analise-${Date.now()}.json`;
  writeFileSync(arquivo, JSON.stringify(resultado, null, 2), "utf8");
  console.log(`JSON completo em ${arquivo}`);
}

main().catch((err) => {
  console.error(`\nFalhou: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
