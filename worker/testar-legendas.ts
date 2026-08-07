/**
 * Reproduz o ASS gerado a partir das palavras REAIS de uma análise, pra ver
 * o que sai antes de o ffmpeg queimar no vídeo.
 *
 *   npx tsx worker/testar-legendas.ts
 */
import "../scripts/_env";
import { createClient } from "@supabase/supabase-js";
import { gerarAss } from "./legendas";
import type { Palavra } from "./transcritor";

const ANALISE = "1563d585-d4e3-449d-a190-c024346627d6";
// A janela EXATA do corte que renderizou errado, pra reproduzir o mesmo
// agrupamento — bloco diferente quebra em linhas diferentes.
const JANELA = { inicio_s: 0.1, fim_s: 37.6 };
/** Só interessa o bloco onde o defeito apareceu. */
const FILTRO = /ESPINHA|DORSAL|GAME/i;

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

async function main() {
  const { data } = await sb
    .from("analises")
    .select("transcricao")
    .eq("id", ANALISE)
    .single();

  const cru = (data?.transcricao as { palavras?: [string, number, number][] })
    ?.palavras;
  if (!cru) throw new Error("Sem transcrição.");

  const palavras: Palavra[] = cru
    .map(([texto, inicio_s, fim_s]) => ({ texto, inicio_s, fim_s }))
    .filter((p) => p.inicio_s >= JANELA.inicio_s && p.fim_s <= JANELA.fim_s);

  console.log("PALAVRAS DE ENTRADA (entre colchetes):");
  console.log("  " + palavras.map((p) => `[${p.texto}]`).join(" "));
  console.log();

  for (const formato of ["hype-challenge"]) {
    const ass = gerarAss(palavras, JANELA.inicio_s, formato);
    console.log(`=== ${formato} ===`);
    for (const linha of (ass ?? "").split("\n")) {
      if (!linha.startsWith("Dialogue:")) continue;
      // Dialogue tem 9 campos antes do texto, e o texto pode conter vírgula.
      const texto = linha.split(",").slice(9).join(",");
      if (!FILTRO.test(texto)) continue;
      console.log("  ASS   " + texto);
      // O que o espectador vê: sem as tags de override.
      const visivel = texto.replace(/\{[^}]*\}/g, "").replace(/\\N/g, " ⏎ ");
      console.log("  TELA  " + visivel);
      // Espaço duplo é invisível no console: marca explicitamente.
      if (/ {2}/.test(visivel)) console.log("        ^^ ESPAÇO DUPLO");
      if (/\s+[.,!?]/.test(visivel)) console.log("        ^^ ESPAÇO ANTES DE PONTUAÇÃO");
      console.log();
    }
  }
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
