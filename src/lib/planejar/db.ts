import type { SupabaseClient } from "@supabase/supabase-js";
import type { ItemPlanejamento, TipoPlanejamento } from "./tipos";

/**
 * Persistência da aba Planejar.
 *
 * Todas as funções recebem o client da SESSÃO (clienteSupabase): é o RLS
 * quem decide o que cada dono enxerga, e passar user_id na mão por cima
 * disso seria repetir no código a regra que o banco já cumpre.
 */

const COLUNAS = "id, tipo, titulo, dados, criado_em, atualizado_em";

function linhaParaItem(l: Record<string, unknown>): ItemPlanejamento {
  return {
    id: l.id as string,
    tipo: l.tipo as TipoPlanejamento,
    titulo: (l.titulo as string) ?? "",
    dados: (l.dados as ItemPlanejamento["dados"]) ?? { mensagens: [] },
    criado_em: new Date(l.criado_em as string).getTime(),
    atualizado_em: new Date(l.atualizado_em as string).getTime(),
  };
}

export async function listarPlanejamentos(
  sb: SupabaseClient,
  tipo: TipoPlanejamento,
  limite = 30,
): Promise<ItemPlanejamento[]> {
  const { data, error } = await sb
    .from("planejamentos")
    .select(COLUNAS)
    .eq("tipo", tipo)
    .order("atualizado_em", { ascending: false })
    .limit(limite);
  if (error) throw new Error(`Não li o histórico: ${error.message}`);
  return (data ?? []).map(linhaParaItem);
}

export async function lerPlanejamento(
  sb: SupabaseClient,
  id: string,
): Promise<ItemPlanejamento | null> {
  const { data, error } = await sb
    .from("planejamentos")
    .select(COLUNAS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Não li o item: ${error.message}`);
  return data ? linhaParaItem(data) : null;
}

export async function criarPlanejamento(
  sb: SupabaseClient,
  userId: string,
  tipo: TipoPlanejamento,
  titulo: string,
  dados: ItemPlanejamento["dados"],
): Promise<string> {
  const { data, error } = await sb
    .from("planejamentos")
    .insert({ user_id: userId, tipo, titulo, dados })
    .select("id")
    .single();
  if (error) throw new Error(`Não guardei: ${error.message}`);
  return data.id as string;
}

export async function atualizarPlanejamento(
  sb: SupabaseClient,
  id: string,
  dados: ItemPlanejamento["dados"],
): Promise<void> {
  const { data, error } = await sb
    .from("planejamentos")
    .update({ dados, atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(`Não atualizei: ${error.message}`);
  // Zero linhas = item de outro dono escondido pelo RLS. Sem esta checagem a
  // conversa "salvaria" no vazio e a pessoa perderia o histórico achando que
  // estava guardado — a mesma lição do salvarProjeto do editor.
  if (!data || data.length === 0) throw new Error("Item não encontrado.");
}

export async function apagarPlanejamento(
  sb: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await sb.from("planejamentos").delete().eq("id", id);
  if (error) throw new Error(`Não apaguei: ${error.message}`);
}
