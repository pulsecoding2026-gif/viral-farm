import { z } from "zod";
import { clienteSupabase } from "@/lib/supabase/servidor";
import { ERRO_CORTE_SUMIDO, lerProjeto, salvarProjeto } from "@/lib/projetos-db";
import { PROPORCOES, type Projeto, type Proporcao } from "@/lib/editor/projeto";

export const runtime = "nodejs";

/** Trilhas e itens compartilham a mesma lista de tipos (ver editor/projeto.ts). */
const TIPOS = ["video", "legenda", "texto", "audio", "overlay"] as const;

// Derivado de PROPORCOES em vez de escrito à mão: quando entrar uma quinta
// proporção, a rota não precisa ser lembrada junto.
const PROPORCOES_VALIDAS = Object.keys(PROPORCOES) as [
  Proporcao,
  ...Proporcao[],
];

/**
 * O que TODO item tem, seja vídeo, legenda, texto, áudio ou overlay.
 *
 * `looseObject` de propósito: os campos que variam por tipo (enquadramento,
 * keyframes, efeitos, url, conteúdo…) passam sem serem enumerados. Descrever
 * cada folha aqui duplicaria o contrato de src/lib/editor/projeto.ts e faria
 * toda mudança no editor exigir uma edição em dois lugares — e a validação que
 * importa no servidor é a que impede lixo estrutural, não a que confere se um
 * `zoom` veio junto.
 */
const Item = z.looseObject({
  id: z.string().min(1),
  tipo: z.enum(TIPOS),
  // Posição na LINHA DO TEMPO — nunca negativa. O tempo da fonte
  // (fonteInicio_s/fonteFim_s) é outra coisa e fica a cargo do editor.
  inicio_s: z.number().min(0),
  fim_s: z.number().min(0),
});

const Trilha = z.looseObject({
  tipo: z.enum(TIPOS),
  itens: z.array(Item),
  ativa: z.boolean(),
});

const Corpo = z.looseObject({
  versao: z.number().int().positive(),
  fonte: z.looseObject({
    corteId: z.string().min(1),
    analiseId: z.string().min(1),
    proxyUrl: z.string().nullable(),
    duracao_s: z.number().min(0),
  }),
  // Proporção inventada mandaria o worker renderizar num tamanho que rede
  // nenhuma aceita — e só se descobriria depois de queimar o render.
  proporcao: z.enum(PROPORCOES_VALIDAS),
  formato: z.string().min(1),
  trilhas: z.array(Trilha),
});

/**
 * O projeto de edição salvo deste corte.
 *
 * `projeto: null` é resposta NORMAL, não erro: corte que nunca foi aberto no
 * editor ainda não tem projeto, e a interface monta um do zero com
 * `projetoVazio()`. Corte de outra pessoa cai no mesmo null — o RLS já o
 * escondeu, e responder 403 aqui só confirmaria que o id existe.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const supabase = await clienteSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ erro: "Faça login." }, { status: 401 });

  const { id } = await ctx.params;
  const projeto = await lerProjeto(supabase, id);

  return Response.json({ projeto });
}

/**
 * Grava o projeto inteiro. O corpo É o Projeto — o editor manda o estado que
 * tem em mãos, sem envelope.
 *
 * Substitui, não mescla: o cliente é o dono do documento enquanto a edição está
 * aberta, e mesclar dois estados de linha do tempo é a receita pra item
 * fantasma reaparecer depois de ser apagado.
 */
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
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
      { erro: parsed.error.issues[0]?.message ?? "Projeto inválido." },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  // O projeto carrega de qual corte ele veio. Se isso discordar da URL, uma aba
  // aberta no corte errado gravaria a edição por cima de outro — e o RLS não
  // pegaria, porque os dois cortes são do mesmo dono.
  if (parsed.data.fonte.corteId !== id) {
    return Response.json(
      { erro: "Esse projeto é de outro corte." },
      { status: 400 },
    );
  }

  try {
    // Grava o corpo CRU, não o `parsed.data`: o zod aqui é guarda de entrada,
    // não fonte do tipo. Quem descreve a forma completa continua sendo o tipo
    // Projeto, e é ele que o worker vai ler do banco.
    await salvarProjeto(supabase, id, corpo as Projeto);
  } catch (e) {
    if (e instanceof Error && e.message === ERRO_CORTE_SUMIDO) {
      return Response.json({ erro: ERRO_CORTE_SUMIDO }, { status: 404 });
    }
    throw e;
  }

  return Response.json({ ok: true });
}
