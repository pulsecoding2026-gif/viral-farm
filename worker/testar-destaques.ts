/**
 * Confere que a IA marca palavras de destaque ÚTEIS e que elas CASAM com a
 * transcrição.
 *
 * Duas perguntas independentes:
 *   1. A IA devolve destaques, e são palavras de peso — não artigo, não
 *      preposição, não verbo de ligação?
 *   2. Elas casam com os tokens da transcrição? A IA às vezes reescreve a
 *      palavra, e a legenda casa por texto: reescrita não é encontrada, e o
 *      destaque some sem ninguém perceber.
 *
 *   npx tsx worker/testar-destaques.ts
 */
import "../scripts/_env";
import { createClient } from "@supabase/supabase-js";
import { escolherCortes } from "./cortar";
import { gerarAss } from "./legendas";
import { ambiente } from "./ambiente";
import type { TranscricaoPalavras, Palavra } from "./transcritor";

const ANALISE = "1563d585-d4e3-449d-a190-c024346627d6";

/** Palavras que NÃO deveriam ganhar destaque — destaque em tudo é nenhum. */
const VAZIAS = new Set([
  "a", "o", "as", "os", "um", "uma", "de", "da", "do", "das", "dos", "em",
  "no", "na", "nos", "nas", "e", "ou", "que", "se", "por", "para", "pra",
  "com", "sem", "é", "foi", "ser", "está", "tá", "eu", "você", "ele", "ela",
  "isso", "isto", "mas", "já", "aqui", "ali",
]);

function chave(p: string): string {
  return p
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
}

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

  const palavras: Palavra[] = cru.map(([texto, inicio_s, fim_s]) => ({
    texto,
    inicio_s,
    fim_s,
  }));
  const transcricao: TranscricaoPalavras = {
    texto: palavras.map((p) => p.texto).join(" "),
    idioma: "pt",
    palavras,
  };
  const duracao = palavras[palavras.length - 1].fim_s;

  console.log(`transcrição: ${palavras.length} palavras, ${Math.round(duracao)}s`);
  console.log("pedindo cortes ao modelo...\n");

  const cortes = await escolherCortes(ambiente.llm(), transcricao, duracao, {
    qtd: 3,
    estilo: "auto",
  });

  const tokens = new Set(palavras.map((p) => chave(p.texto)));
  let falhas = 0;

  for (const c of cortes) {
    console.log(`— ${c.titulo}  [${c.formato}]`);

    if (c.destaques.length === 0) {
      console.log("  ERRO nenhum destaque devolvido");
      falhas += 1;
      continue;
    }

    // Casa por PALAVRA, igual ao gerador: a IA devolve nomes próprios
    // inteiros ("GTA VI") e a transcrição traz um token por palavra.
    const casa = (d: string) =>
      d.split(/\s+/).some((p) => chave(p).length > 1 && tokens.has(chave(p)));
    const naTranscricao = c.destaques.filter(casa);
    const perdidas = c.destaques.filter((d) => !casa(d));
    const fracas = c.destaques.filter((d) => VAZIAS.has(chave(d)));

    console.log(`  destaques: ${c.destaques.map((d) => `"${d}"`).join(", ")}`);
    console.log(
      `  casaram ${naTranscricao.length}/${c.destaques.length} com a transcrição`,
    );

    if (perdidas.length > 0) {
      console.log(`  !! não achei na fala: ${perdidas.join(", ")}`);
    }
    if (fracas.length > 0) {
      console.log(`  ERRO palavra sem peso destacada: ${fracas.join(", ")}`);
      falhas += 1;
    }
    // Metade perdida significa que o destaque praticamente não aparece.
    if (naTranscricao.length < Math.ceil(c.destaques.length / 2)) {
      console.log("  ERRO menos da metade casou — o destaque some na tela");
      falhas += 1;
    }

    // Prova final: o destaque chega ao ASS com a cor trocada?
    const doCorte = palavras.filter(
      (p) => p.inicio_s >= c.inicio_s && p.fim_s <= c.fim_s,
    );
    const ass = gerarAss(doCorte, c.inicio_s, c.formato, undefined, c.destaques);
    const cores = new Set((ass ?? "").match(/\\c&H[0-9A-F]{6}/g) ?? []);
    console.log(`  cores distintas no ASS: ${cores.size} ${cores.size >= 2 ? "(destaque aplicado)" : "(SÓ UMA — destaque não pintou)"}`);
    if (cores.size < 2) falhas += 1;
    console.log();
  }

  if (falhas > 0) {
    console.log(`${falhas} problema(s).`);
    process.exit(1);
  }
  console.log("Todos os cortes com destaque útil, casado e pintado no ASS.");
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
