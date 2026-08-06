/**
 * Confere se o JSON Schema gerado pelo zod respeita as regras dos
 * structured outputs da Anthropic. Rodar com: npm run check:schema
 */
import { jsonSchemaDaAnalise } from "../src/lib/analise/schema";

const PROIBIDOS = [
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "pattern",
  "minItems",
  "maxItems",
  "uniqueItems",
];

const problemas: string[] = [];

function anda(no: unknown, caminho: string) {
  if (no === null || typeof no !== "object") return;
  if (Array.isArray(no)) {
    no.forEach((n, i) => anda(n, `${caminho}[${i}]`));
    return;
  }

  const obj = no as Record<string, unknown>;

  for (const k of PROIBIDOS) {
    if (k in obj) problemas.push(`${caminho}: keyword não suportada "${k}"`);
  }

  if (obj.type === "object") {
    if (obj.additionalProperties !== false) {
      problemas.push(`${caminho}: falta additionalProperties:false`);
    }
    const props = Object.keys((obj.properties as object) ?? {});
    const req = (obj.required as string[]) ?? [];
    const faltando = props.filter((p) => !req.includes(p));
    if (faltando.length) {
      problemas.push(
        `${caminho}: campos fora de "required": ${faltando.join(", ")}`,
      );
    }
  }

  for (const [k, v] of Object.entries(obj)) anda(v, `${caminho}.${k}`);
}

const schema = jsonSchemaDaAnalise();
anda(schema, "$");

console.log(JSON.stringify(schema, null, 2));
console.log("\n--- RESULTADO ---");
if (problemas.length) {
  console.error(`${problemas.length} problema(s):`);
  for (const p of problemas) console.error("  " + p);
  process.exit(1);
}
console.log("Schema compatível com structured outputs.");
