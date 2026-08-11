import { z } from "zod";
import { clienteSupabase } from "@/lib/supabase/servidor";
import { criarAnalise, listarAnalises } from "@/lib/analises-db";
import { validarUrl, ErroDeEntrada } from "@/lib/analise/extrair";
import { ehEscolhaDeFormato } from "@/lib/formatos";
import { podeCriarAnalise, type Uso } from "@/lib/planos/uso";

export const runtime = "nodejs";

/** O que o cliente precisa saber sobre o consumo, sem expor a assinatura. */
function resumoDoUso(uso: Uso) {
  return {
    plano: uso.assinatura.plano.id,
    plano_nome: uso.assinatura.plano.nome,
    usadas: uso.analisesUsadas,
    limite: uso.assinatura.plano.analisesMes,
    renova_em: uso.renovaEm.toISOString(),
  };
}

const Corpo = z.object({
  link: z.string().min(1, "Cole o link do vídeo."),
  // Opcional: é uma dica pra IA, que identifica o nicho pelo material de
  // qualquer forma.
  nicho: z.string().max(120).optional(),
  // As escolhas do Estúdio — tudo com padrão seguro.
  opcoes: z
    .object({
      modo: z.enum(["auto", "manual"]).optional(),
      qtd: z.number().int().min(1).max(15).optional(),
      duracao: z.enum(["curto", "medio", "longo"]).optional(),
      direcao: z.string().max(500).optional(),
      // Id da galeria de formatos, ou "auto" pra IA escolher corte a corte.
      estilo: z.string().refine(ehEscolhaDeFormato, "Formato desconhecido.").optional(),
      titulo: z.boolean().optional(),
      limpar_silencio: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Cria o pedido de análise — e SÓ isso. Quem processa é o worker na VPS:
 * a linha entra na fila (etapa na_fila) e a resposta volta na hora. A Vercel
 * nunca baixa nem renderiza vídeo.
 */
export async function POST(req: Request) {
  const supabase = await clienteSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ erro: "Faça login." }, { status: 401 });

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return Response.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  const parsed = Corpo.safeParse(corpo);
  if (!parsed.success) {
    return Response.json(
      { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  // Barra link inválido AQUI, antes de entrar na fila: erro na cara do
  // usuário em vez de um job que nasce pra falhar na VPS.
  try {
    validarUrl(parsed.data.link);
  } catch (err) {
    if (err instanceof ErroDeEntrada) {
      return Response.json({ erro: err.message }, { status: 400 });
    }
    throw err;
  }

  /**
   * O PORTÃO do plano, antes de a linha existir.
   *
   * Aqui é o único lugar por onde uma análise nasce, e é depois deste ponto
   * que o dinheiro começa a sair: download, transcrição no Groq, escolha de
   * cortes no DeepSeek e minutos de CPU da VPS. Checar adiante — na fila ou
   * no worker — significaria já ter gastado tudo isso pra então recusar.
   *
   * 402 e não 403: o problema não é permissão, é cobrança. O cliente usa o
   * código pra abrir a tela de planos em vez da de erro.
   */
  const veredito = await podeCriarAnalise(supabase, user.id, {
    qtdCortes: parsed.data.opcoes?.qtd ?? 5,
  });
  if (!veredito.pode) {
    return Response.json(
      { erro: veredito.motivo, codigo: veredito.codigo, uso: resumoDoUso(veredito.uso) },
      { status: 402 },
    );
  }

  const id = await criarAnalise(
    supabase,
    user.id,
    parsed.data.link.trim(),
    parsed.data.nicho ?? "",
    parsed.data.opcoes ?? {},
  );

  return Response.json({ id }, { status: 202 });
}

export async function GET() {
  const supabase = await clienteSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ erro: "Faça login." }, { status: 401 });

  // Devolve o ARRAY puro. O uso do plano mora em /api/planos/uso: enfiá-lo
  // aqui dentro trocaria o formato de uma rota que o painel já consome, e
  // quebrar contrato existente por conveniência de quem escreve o servidor
  // é o tipo de mudança que aparece como tela em branco pro usuário.
  return Response.json(await listarAnalises(supabase), {
    headers: { "Cache-Control": "no-store" },
  });
}
