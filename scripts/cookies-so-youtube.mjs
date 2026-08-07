/**
 * Reduz um cookies.txt exportado ao MÍNIMO que o yt-dlp precisa.
 *
 *   node scripts/cookies-so-youtube.mjs "entrada.txt" saida.txt
 *
 * POR QUE ISTO EXISTE
 *
 * As extensões de exportar cookies levam TUDO que o perfil tem — numa
 * exportação real aqui vieram 170 cookies de 14 domínios, incluindo
 * mail.google.com, contacts.google.com e accounts.google.com. Ou seja: o
 * arquivo dava acesso ao Gmail e à Conta Google inteira, não só ao YouTube.
 *
 * Esse arquivo vai morar numa VPS. O que não é necessário lá não deve estar
 * lá: só os cookies de youtube.com sobrevivem a este filtro.
 *
 * Também deduplica. A mesma exportação trouxe cada cookie duas vezes, e
 * entrada repetida em cookies.txt é pedido de confusão — vence a última,
 * que é a mais recente.
 */
import fs from "node:fs";

const [entrada, saida] = process.argv.slice(2);

if (!entrada || !saida) {
  console.error('uso: node scripts/cookies-so-youtube.mjs "entrada.txt" saida.txt');
  process.exit(1);
}

const linhas = fs.readFileSync(entrada, "utf-8").split(/\r?\n/);

/**
 * Sessão do YouTube. SID/HSID/SSID/APISID/SAPISID autenticam; os __Secure-*PSID
 * cobrem o contexto 1P/3P; os *PSIDTS são os que ROTACIONAM — sem eles a
 * sessão não se renova e morre em horas.
 */
const ESSENCIAIS = [
  "SID", "HSID", "SSID", "APISID", "SAPISID",
  "__Secure-1PSID", "__Secure-3PSID",
  "__Secure-1PAPISID", "__Secure-3PAPISID",
  "__Secure-1PSIDTS", "__Secure-3PSIDTS",
  "__Secure-1PSIDCC", "__Secure-3PSIDCC",
  "LOGIN_INFO", "PREF", "VISITOR_INFO1_LIVE", "SIDCC",
];

// Map dedupa por (domínio, path, nome) e a última ocorrência vence.
const mantidos = new Map();
let lidos = 0;
const descartados = new Set();

for (const linha of linhas) {
  if (!linha.trim() || linha.startsWith("#")) continue;
  const campos = linha.split("\t");
  if (campos.length < 7) continue;
  lidos += 1;

  const [dominio, , caminho, , , nome] = campos;

  if (!/(^|\.)youtube\.com$/.test(dominio)) {
    descartados.add(dominio);
    continue;
  }
  if (!ESSENCIAIS.includes(nome)) continue;

  mantidos.set(`${dominio}|${caminho}|${nome}`, linha);
}

const nomes = new Set([...mantidos.keys()].map((k) => k.split("|")[2]));

// Sem estes o yt-dlp age como anônimo e leva bloqueio de robô — falha
// idêntica à de não ter cookie, o que torna o diagnóstico confuso depois.
const MINIMO = ["SID", "HSID", "SSID", "APISID", "SAPISID", "__Secure-1PSID"];
const faltando = MINIMO.filter((n) => !nomes.has(n));

console.log(`lidos       : ${lidos} cookies`);
console.log(`descartados : ${descartados.size} domínios fora do YouTube`);
console.log(`              ${[...descartados].sort().join(", ")}`);
console.log(`mantidos    : ${mantidos.size} cookies de youtube.com`);
console.log(`nomes       : ${[...nomes].sort().join(", ")}`);

if (faltando.length > 0) {
  console.error("");
  console.error(`FALTA sessão em .youtube.com: ${faltando.join(", ")}`);
  console.error("A exportação pegou a sessão do google.com mas não a do");
  console.error("youtube.com. Refaça: precisa estar logado NO YOUTUBE e");
  console.error("exportar com uma aba de youtube.com aberta.");
  process.exit(1);
}

const temRotacao = nomes.has("__Secure-1PSIDTS") || nomes.has("__Secure-3PSIDTS");
if (!temRotacao) {
  console.warn("");
  console.warn("AVISO: sem __Secure-*PSIDTS. São os tokens que rotacionam;");
  console.warn("sem eles a sessão não se renova e vence em poucas horas.");
}

// LF sempre: o arquivo roda no Linux da VPS.
fs.writeFileSync(
  saida,
  [
    "# Netscape HTTP Cookie File",
    "# Filtrado por scripts/cookies-so-youtube.mjs — só youtube.com.",
    "# CREDENCIAL: quem tiver este arquivo entra na conta. Não versione.",
    ...mantidos.values(),
  ].join("\n") + "\n",
  "utf-8",
);

console.log("");
console.log(`gravado em ${saida}`);
