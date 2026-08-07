/**
 * Confere que nenhuma falha real vaza texto de ferramenta pra tela.
 *
 * Os casos vieram do histórico de verdade (o erro do yt-dlp que estava
 * aparecendo pro usuário) mais as assinaturas que o yt-dlp emite nas outras
 * recusas do YouTube.
 *
 *   npx tsx worker/testar-diagnostico.ts
 */
import { diagnosticar } from "../src/lib/analise/diagnostico";
import { ErroDeEntrada } from "../src/lib/analise/extrair";

const CASOS: { nome: string; bruto: string; esperado: string; entrada?: true }[] = [
  {
    nome: "ErroDeEntrada passa inteiro (limite de duração)",
    bruto:
      "Esse vídeo tem 120min e a análise aceita até 90min por enquanto. Corte um trecho e mande.",
    esperado: "entrada_invalida",
    entrada: true,
  },
  {
    nome: "bot detection (o que estava na tela)",
    bruto:
      `"yt-dlp" saiu com código 1.\nERROR: [youtube] 14YXeHKOBUY: Sign in to confirm you're not a bot. ` +
      `Use --cookies-from-browser or --cookies for the authentication. See ` +
      `https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp for how to manually pass cookies.`,
    esperado: "bloqueio_plataforma",
  },
  {
    nome: "restrição de idade",
    bruto: `"yt-dlp" saiu com código 1.\nERROR: [youtube] abc: Sign in to confirm your age. This video may be inappropriate for some users.`,
    esperado: "restricao_idade",
  },
  {
    nome: "vídeo privado",
    bruto: `"yt-dlp" saiu com código 1.\nERROR: [youtube] abc: Private video. Sign in if you have been granted access to this video`,
    esperado: "video_privado",
  },
  {
    nome: "vídeo removido",
    bruto: `"yt-dlp" saiu com código 1.\nERROR: [youtube] xyz: Video unavailable. This video has been removed by the uploader`,
    esperado: "video_indisponivel",
  },
  {
    nome: "só para membros",
    bruto: `"yt-dlp" saiu com código 1.\nERROR: [youtube] k: Join this channel to get access to members-only content`,
    esperado: "so_membros",
  },
  {
    nome: "bloqueio regional",
    bruto: `"yt-dlp" saiu com código 1.\nERROR: [youtube] g: The uploader has not made this video available in your country`,
    esperado: "restricao_regiao",
  },
  {
    nome: "live ainda rolando",
    bruto: `"yt-dlp" saiu com código 1.\nERROR: [youtube] q: This live event will begin in 2 hours.`,
    esperado: "ao_vivo",
  },
  {
    nome: "limite de taxa",
    bruto: `"yt-dlp" saiu com código 1.\nERROR: unable to download webpage: HTTP Error 429: Too Many Requests`,
    esperado: "muitas_tentativas",
  },
  {
    nome: "timeout nosso",
    bruto: `"yt-dlp" estourou o timeout de 60000ms`,
    esperado: "tempo_esgotado",
  },
  {
    nome: "sem fala",
    bruto: "Nenhuma fala detectada — cortes dependem de conteúdo falado.",
    esperado: "sem_fala",
  },
  {
    nome: "sem corte bom",
    bruto: "O vídeo não rendeu nenhum corte bom o bastante.",
    esperado: "sem_corte_bom",
  },
  {
    nome: "render quebrou",
    bruto: `"ffmpeg" saiu com código 1.\nInvalid data found when processing input`,
    esperado: "render_falhou",
  },
  {
    nome: "fonte expirou no Estúdio",
    bruto: "A transcrição dessa análise não está mais disponível.",
    esperado: "render_falhou",
  },
  {
    nome: "erro totalmente inesperado",
    bruto: "RangeError: Maximum call stack size exceeded at 0x8007",
    esperado: "desconhecido",
  },
];

/** O que NUNCA pode aparecer numa mensagem mostrada ao cliente. */
const VAZAMENTOS = [
  /yt-dlp/i,
  /ffmpeg/i,
  /ffprobe/i,
  /saiu com código/i,
  /\bERROR:/,
  /--[a-z-]+/,
  /https?:\/\/github\.com/i,
  /\bstderr\b/i,
  /0x[0-9a-f]{4}/i,
];

let falhas = 0;

for (const c of CASOS) {
  const d = diagnosticar(
    c.entrada ? new ErroDeEntrada(c.bruto) : new Error(c.bruto),
  );

  const classificou = d.codigo === c.esperado;
  const vazou = VAZAMENTOS.filter((v) => v.test(d.mensagem));

  if (!classificou) falhas += 1;
  if (vazou.length > 0) falhas += 1;

  console.log(
    `${classificou ? "ok " : "ERRO"} ${c.nome.padEnd(42)} → ${d.codigo.padEnd(20)} (${d.acao})`,
  );
  if (!classificou) console.log(`     esperava ${c.esperado}`);
  if (vazou.length > 0) {
    console.log(`     VAZOU: ${vazou.map(String).join(", ")}`);
    console.log(`     mensagem: ${d.mensagem}`);
  }
}

console.log();
if (falhas > 0) {
  console.log(`${falhas} problema(s).`);
  process.exit(1);
}
console.log(
  `${CASOS.length} casos: todos classificados e nenhum vazou nome de ferramenta, flag de CLI ou link de wiki.`,
);
