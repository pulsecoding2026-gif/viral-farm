/**
 * Converte o "Copy as cURL" do DevTools em cookies.txt no formato Netscape.
 *
 *   node scripts/cookies-de-curl.mjs curl.txt cookies.txt
 *
 * POR QUE ISTO EXISTE
 *
 * A extensão de exportar cookies não roda em janela anônima sem liberação
 * manual, e o console (document.cookie) NÃO serve: os cookies de sessão do
 * YouTube — __Secure-1PSID, __Secure-1PSIDTS, HSID, SSID, SAPISID — são
 * HttpOnly, ou seja, invisíveis pro JavaScript da página por definição. Um
 * arquivo gerado pelo console sairia sem justamente o que autentica.
 *
 * O DevTools, sim, enxerga: o cabeçalho `cookie:` de qualquer requisição
 * pra youtube.com carrega o conjunto completo. "Copy as cURL" leva esse
 * cabeçalho junto, e é dele que este script monta o arquivo.
 *
 * O cabeçalho só traz nome=valor, sem domínio/expiração. Preenchemos com
 * .youtube.com, path / e Secure — que é o que esses cookies realmente são.
 * A expiração local é irrelevante: quem decide se a sessão vale é o servidor
 * do Google, não a data no arquivo.
 */
import fs from "node:fs";

const [entrada, saida = "cookies.txt"] = process.argv.slice(2);

if (!entrada) {
  console.error("uso: node scripts/cookies-de-curl.mjs <arquivo-curl> [cookies.txt]");
  console.error("");
  console.error("Cole o resultado de DevTools → Network → botão direito na");
  console.error("requisição → Copy → Copy as cURL num arquivo e passe aqui.");
  process.exit(1);
}

const bruto = fs.readFileSync(entrada, "utf-8");

/**
 * Acha o cabeçalho cookie. Cobre as três formas que o DevTools emite:
 *   -H 'cookie: ...'      (bash, Linux/Mac)
 *   -H "cookie: ..."      (cmd)
 *   -H ^"cookie: ...^"    (Copy as cURL (cmd) no Windows, com escape ^)
 */
function extrairCookie(texto) {
  const semEscapeCmd = texto.replace(/\^/g, "");
  const m = semEscapeCmd.match(/-H\s+['"]cookie:\s*([^'"]+)['"]/i);
  if (m) return m[1];
  // Sem cURL: talvez a pessoa tenha colado só o valor do cabeçalho.
  if (/(^|;\s*)__Secure-1PSID=/.test(texto)) return texto.trim();
  return null;
}

const cabecalho = extrairCookie(bruto);

if (!cabecalho) {
  console.error("Não achei o cabeçalho 'cookie:' nesse arquivo.");
  console.error("Confira se copiou de uma requisição PARA youtube.com e se");
  console.error("usou 'Copy as cURL' (não 'Copy as fetch').");
  process.exit(1);
}

const pares = cabecalho
  .split(";")
  .map((p) => p.trim())
  .filter(Boolean)
  .map((p) => {
    const i = p.indexOf("=");
    return i === -1 ? null : [p.slice(0, i).trim(), p.slice(i + 1).trim()];
  })
  .filter(Boolean);

// Sem estes, o yt-dlp se comporta como anônimo e leva o bloqueio de robô —
// falha idêntica à de não ter cookie nenhum, o que torna o diagnóstico
// confuso. Melhor recusar aqui, com o motivo na tela.
const OBRIGATORIOS = ["__Secure-1PSID", "HSID", "SSID", "SAPISID"];
const nomes = new Set(pares.map(([n]) => n));
const faltando = OBRIGATORIOS.filter((n) => !nomes.has(n));

if (faltando.length > 0) {
  console.error(`Faltam cookies de sessão: ${faltando.join(", ")}`);
  console.error("");
  console.error("Isso quer dizer que a janela não estava logada no YouTube,");
  console.error("ou que a requisição copiada não era para youtube.com.");
  process.exit(1);
}

// Dois anos à frente. É só o que o arquivo declara; a validade real da
// sessão é decidida pelo Google a cada requisição.
const validade = Math.floor(Date.now() / 1000) + 2 * 365 * 24 * 3600;

const linhas = [
  "# Netscape HTTP Cookie File",
  "# Gerado por scripts/cookies-de-curl.mjs a partir do DevTools.",
  "# Este arquivo é CREDENCIAL: quem tiver ele entra na conta. Não versione.",
  ...pares.map(([nome, valor]) =>
    // domínio \t incluiSubdominios \t path \t secure \t expira \t nome \t valor
    [".youtube.com", "TRUE", "/", "TRUE", String(validade), nome, valor].join("\t"),
  ),
];

// LF, não CRLF: o arquivo vai rodar no Linux da VPS.
fs.writeFileSync(saida, linhas.join("\n") + "\n", "utf-8");

console.log(`${pares.length} cookies gravados em ${saida}`);
console.log(`sessão: ${OBRIGATORIOS.join(", ")} presentes`);
console.log("");
console.log("Agora mande pra VPS (o arquivo é credencial — não versione):");
console.log(`  scp ${saida} root@145.223.27.112:/tmp/cookies.txt`);
console.log("  ssh root@145.223.27.112 \"bash /opt/viral-farm/worker/vps/instalar-cookies.sh /tmp/cookies.txt && rm /tmp/cookies.txt\"");
