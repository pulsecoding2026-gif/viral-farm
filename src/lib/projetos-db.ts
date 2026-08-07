import type { SupabaseClient } from "@supabase/supabase-js";
import type { Projeto } from "./editor/projeto";

/**
 * O projeto de edição de um corte, indo e voltando do Supabase.
 *
 * Mora na coluna `cortes.projeto` (jsonb, migração 0009) e é sempre lido e
 * gravado INTEIRO — não existe "salvar só a trilha de legenda". O editor já
 * mantém o projeto todo em memória, então gravar pedaço exigiria mesclar dois
 * estados e abriria a porta pro clássico "salvei e sumiu metade".
 *
 * Como no resto do arquivo de análises, tudo aqui roda com o cliente DA SESSÃO:
 * o RLS de `cortes` (política "dono atualiza corte proprio", migração 0003) é
 * quem faz a autorização. Corte de outra pessoa simplesmente não aparece.
 */

/**
 * Mensagem única do caso "esse corte não existe ou não é seu".
 *
 * Exportada pra rota poder distinguir isso de uma falha de banco e devolver
 * 404 em vez de 500, sem ficar comparando texto solto.
 */
export const ERRO_CORTE_SUMIDO = "Corte não encontrado.";

export async function lerProjeto(
  sb: SupabaseClient,
  corteId: string,
): Promise<Projeto | null> {
  const { data, error } = await sb
    .from("cortes")
    .select("projeto")
    .eq("id", corteId)
    .maybeSingle();

  if (error) throw new Error(`Não li o projeto: ${error.message}`);

  // Dois "nada" caem aqui de propósito: corte inexistente e corte alheio
  // (escondido pelo RLS). Pra quem chama, os dois significam a mesma coisa —
  // não há projeto pra abrir.
  if (!data) return null;

  // Corte que nunca passou pelo editor tem a coluna nula.
  return (data.projeto as Projeto | null) ?? null;
}

export async function salvarProjeto(
  sb: SupabaseClient,
  corteId: string,
  projeto: Projeto,
): Promise<void> {
  const { data, error } = await sb
    .from("cortes")
    .update({ projeto })
    .eq("id", corteId)
    .select("id");

  if (error) throw new Error(`Não salvei o projeto: ${error.message}`);

  // Update que não achou linha nenhuma não é erro pro Postgres. Sem esta
  // checagem, salvar num corte que o RLS esconde devolveria sucesso e a pessoa
  // seguiria editando achando que o trabalho está guardado.
  if (!data || data.length === 0) throw new Error(ERRO_CORTE_SUMIDO);
}
