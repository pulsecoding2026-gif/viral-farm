import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ambiente } from "./ambiente";

/**
 * A fila é a própria tabela `analises` — o Supabase é a ponte entre o site
 * (Vercel) e o worker (VPS). Nenhum dos dois fala com o outro diretamente:
 * o site grava o job, o worker o consome, e a VPS não abre porta nenhuma.
 *
 * Job na fila: status='processando' + etapa='na_fila'.
 */

export type JobAnalise = {
  id: string;
  user_id: string;
  link: string;
  nicho: string;
};

let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  cliente ??= createClient(ambiente.supabaseUrl(), ambiente.supabaseServico(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cliente;
}

/**
 * Pega o job mais antigo da fila e o marca como assumido.
 *
 * A troca de etapa com o filtro `.eq("etapa","na_fila")` é a trava: se dois
 * workers disputarem o mesmo job, só o primeiro update acha a linha ainda
 * na fila — o segundo atualiza zero linhas e volta pra espera.
 */
export async function pegarProximoJob(): Promise<JobAnalise | null> {
  const { data: candidatos, error } = await supabase()
    .from("analises")
    .select("id, user_id, link, nicho")
    .eq("status", "processando")
    .eq("etapa", "na_fila")
    .order("criado_em", { ascending: true })
    .limit(1);

  if (error) throw new Error(`Fila indisponível: ${error.message}`);
  const job = candidatos?.[0];
  if (!job) return null;

  const { data: assumido, error: erroTrava } = await supabase()
    .from("analises")
    .update({ etapa: "baixando" })
    .eq("id", job.id)
    .eq("etapa", "na_fila")
    .select("id");

  if (erroTrava) throw new Error(`Não deu pra assumir o job: ${erroTrava.message}`);
  if (!assumido || assumido.length === 0) return null; // outro worker levou

  return job as JobAnalise;
}

export async function marcarEtapa(id: string, etapa: string): Promise<void> {
  await supabase().from("analises").update({ etapa }).eq("id", id);
}

export async function concluirJob(
  id: string,
  resultado: unknown,
): Promise<void> {
  await supabase()
    .from("analises")
    .update({ status: "pronto", etapa: null, resultado })
    .eq("id", id);
}

export async function falharJob(id: string, mensagem: string): Promise<void> {
  await supabase()
    .from("analises")
    .update({ status: "erro", etapa: null, mensagem })
    .eq("id", id);
}
