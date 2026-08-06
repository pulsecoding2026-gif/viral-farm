import { z } from "zod";

/**
 * Formato de saída da análise.
 *
 * O material de entrada é vídeo CRU: sem edição, sem roteiro, sem garantia
 * de que tem estrutura ou até fala. Por isso o schema não pede pra "explicar
 * por que um vídeo pronto viralizou" — pede pra ler o material bruto,
 * identificar o nicho e o conteúdo, e sair com roteiros construídos a partir
 * do que de fato está disponível.
 *
 * Este schema serve pra duas coisas:
 *  1. Virar JSON Schema e ir no `output_config.format` do Claude, que garante
 *     JSON válido no formato exato (structured outputs).
 *  2. Validar o retorno em runtime antes de gravar no banco.
 *
 * Regras dos structured outputs da Anthropic que este schema respeita:
 *  - todo objeto tem `additionalProperties: false` (por isso `strictObject`)
 *  - todo campo é obrigatório (não há opcional)
 *  - nada de min/max numérico ou de string (não suportado)
 *
 * O script `npm run check:schema` verifica essas regras automaticamente.
 */

const MomentoUtilizavel = z.strictObject({
  inicio_s: z.number().describe("Segundo em que o momento começa"),
  fim_s: z.number().describe("Segundo em que o momento termina"),
  o_que_mostra: z
    .string()
    .describe("O que aparece na tela e/ou é dito neste trecho"),
  como_usar: z
    .string()
    .describe("Como esse trecho específico pode virar parte de um roteiro"),
});

const BlocoRoteiro = z.strictObject({
  tempo: z.string().describe("Faixa de tempo, ex: '0-3s'"),
  fala: z.string().describe("O que é dito ou o texto na tela"),
  visual: z
    .string()
    .describe(
      "O que aparece na tela neste trecho — se vier do material bruto enviado, aponte o timestamp de origem",
    ),
});

const Roteiro = z.strictObject({
  titulo: z.string(),
  angulo: z.string().describe("O ângulo/abordagem que diferencia este roteiro"),
  hook: z.string().describe("Os primeiros 3 segundos, palavra por palavra"),
  blocos: z.array(BlocoRoteiro),
  cta: z.string().describe("Chamada para ação no final"),
  duracao_estimada_s: z.number(),
});

export const AnaliseSchema = z.strictObject({
  resumo: z.string().describe("Uma frase sobre o que está gravado no material"),

  nicho_identificado: z
    .string()
    .describe(
      "O nicho/assunto que este material realmente é, pela leitura do conteúdo — não pelo que o usuário informou",
    ),

  conteudo: z.strictObject({
    o_que_acontece: z
      .string()
      .describe("Descrição do que acontece no material, em ordem"),
    cenario: z
      .string()
      .describe("Onde foi gravado e em que condições (ambiente, luz, etc.)"),
    pessoas_ou_objetos: z.string().describe("Quem ou o que aparece em quadro"),
    qualidade_do_material: z
      .string()
      .describe("Avaliação prática: nitidez, estabilidade, enquadramento, luz"),
  }),

  momentos_utilizaveis: z
    .array(MomentoUtilizavel)
    .describe("Trechos específicos do material bruto que valem a pena aproveitar"),

  audio: z.strictObject({
    tem_fala: z.boolean(),
    tem_musica_ambiente: z.boolean(),
    aproveitavel: z
      .string()
      .describe("O que do áudio original pode entrar no roteiro final, se algo"),
  }),

  avaliacao: z.strictObject({
    pontos_fortes: z
      .array(z.string())
      .describe("O que esse material bruto já tem a favor"),
    limitacoes: z
      .array(z.string())
      .describe(
        "O que falta ou atrapalha: precisa de narração, de mais luz, de outro plano, etc.",
      ),
  }),

  roteiros: z
    .array(Roteiro)
    .describe("Três roteiros originais construídos a partir deste material específico"),
});

export type Analise = z.infer<typeof AnaliseSchema>;

/**
 * JSON Schema enviado ao Claude no `output_config.format`.
 *
 * `io: "input"` gera o formato de entrada (sem defaults aplicados), que é o
 * que a API espera. `target: "draft-7"` evita construções que os structured
 * outputs não aceitam.
 */
export function jsonSchemaDaAnalise() {
  return z.toJSONSchema(AnaliseSchema, {
    target: "draft-7",
    io: "input",
  });
}
