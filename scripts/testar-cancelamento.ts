/**
 * Testa o cancelamento contra o worker de verdade, na VPS.
 *
 * A pergunta que importa não é se o status muda — é se o worker PERCEBE e
 * MATA o processo em andamento. Cancelar durante a renderização é o caso
 * mais duro: é a fase mais longa, e sem a morte do ffmpeg o dono esperaria
 * o render inteiro depois de já ter mandado parar.
 *
 * O roteiro: cria um job em modo auto, espera ele chegar em renderizando_1,
 * marca cancelado, e confere que ele PAROU no corte que estava — não seguiu
 * pros seguintes.
 *
 *   npx tsx scripts/testar-cancelamento.ts
 */
import "./_env";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

const LINK = "https://youtu.be/14YXeHKOBUY";
const QTD = 5;

function agora(): string {
  return new Date().toISOString().slice(11, 19);
}

async function estado(id: string) {
  const { data } = await sb
    .from("analises")
    .select("status, etapa")
    .eq("id", id)
    .single();
  return data as { status: string; etapa: string | null } | null;
}

async function contarCortes(id: string) {
  const { data } = await sb.from("cortes").select("status").eq("analise_id", id);
  const por: Record<string, number> = {};
  for (const c of data ?? []) por[c.status] = (por[c.status] ?? 0) + 1;
  return por;
}

async function main() {
  // user_id de uma análise existente: a tabela exige dono e RLS não se
  // aplica à chave de serviço.
  const { data: qualquer } = await sb
    .from("analises")
    .select("user_id")
    .limit(1)
    .single();
  if (!qualquer) throw new Error("Nenhuma análise no banco pra pegar o user_id.");

  const { data: criada, error } = await sb
    .from("analises")
    .insert({
      user_id: qualquer.user_id,
      link: LINK,
      nicho: "",
      status: "processando",
      etapa: "na_fila",
      // auto: renderiza sozinho, então chega na fase longa sem intervenção.
      opcoes: { modo: "auto", qtd: QTD, estilo: "auto", titulo: true },
    })
    .select("id")
    .single();

  if (error) throw new Error(`Não criei o job: ${error.message}`);
  const id = criada.id as string;
  console.log(`${agora()} job ${id} na fila (auto, ${QTD} cortes)\n`);

  // Espera chegar na renderização — é lá que o teste tem valor.
  let etapaVista = "";
  let chegou = false;
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const e = await estado(id);
    if (!e) throw new Error("A análise sumiu do banco.");
    if (e.etapa !== etapaVista) {
      etapaVista = e.etapa ?? "(nula)";
      console.log(`${agora()} ${e.status} · ${etapaVista}`);
    }
    if (/^renderizando_\d+_de_/.test(e.etapa ?? "")) {
      chegou = true;
      break;
    }
    if (e.status !== "processando") {
      console.log(`\nTerminou antes de renderizar (${e.status}) — sem o que testar.`);
      return;
    }
  }

  if (!chegou) throw new Error("Não chegou na renderização em 4 minutos.");

  const antes = await estado(id);
  const cortesAntes = await contarCortes(id);
  console.log(
    `\n${agora()} CANCELANDO durante ${antes?.etapa} — cortes: ${JSON.stringify(cortesAntes)}`,
  );

  const t0 = Date.now();
  await sb
    .from("analises")
    .update({ status: "cancelado", etapa: null, mensagem: null, resultado: null })
    .eq("id", id);

  // A vigilância roda a cada 3s; 20s é folga suficiente pra ela perceber,
  // abortar e o ffmpeg morrer.
  console.log(`${agora()} status marcado. Observando o worker por 25s...\n`);
  await new Promise((r) => setTimeout(r, 25_000));

  const depois = await estado(id);
  const cortesDepois = await contarCortes(id);

  console.log(`${agora()} status final : ${depois?.status} · ${depois?.etapa}`);
  console.log(`${agora()} cortes antes : ${JSON.stringify(cortesAntes)}`);
  console.log(`${agora()} cortes depois: ${JSON.stringify(cortesDepois)}`);

  const prontosAntes = cortesAntes["pronto"] ?? 0;
  const prontosDepois = cortesDepois["pronto"] ?? 0;
  const novos = prontosDepois - prontosAntes;

  console.log("");
  let falhou = false;

  if (depois?.status !== "cancelado") {
    console.log(`ERRO status virou ${depois?.status} — o worker sobrescreveu o cancelamento`);
    falhou = true;
  } else {
    console.log("ok   status continua cancelado (worker não marcou erro nem pronto)");
  }

  // O corte que já estava no ffmpeg pode terminar de subir; o que não pode é
  // a fila inteira seguir renderizando.
  if (novos > 1) {
    console.log(`ERRO ${novos} cortes novos renderizados DEPOIS do cancelamento`);
    falhou = true;
  } else {
    console.log(`ok   ${novos} corte(s) novo(s) depois do cancelamento — o laço parou`);
  }

  console.log(`\ntempo até o worker parar: ~${Math.round((Date.now() - t0) / 1000)}s`);
  if (falhou) process.exit(1);
}

main().catch((e) => {
  console.error("FALHOU:", e);
  process.exit(1);
});
