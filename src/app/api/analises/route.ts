import { after } from "next/server";
import { z } from "zod";
import { analisarLink } from "@/lib/analise/pipeline";
import { ErroDeEntrada } from "@/lib/analise/extrair";
import { criarJob, marcarEtapa, concluir, falhar, listarJobs } from "@/lib/jobs";

// O pipeline usa child_process e o sistema de arquivos — precisa de Node.
export const runtime = "nodejs";
// Download + frames + transcrição + IA. Na Vercel exige plano Pro.
export const maxDuration = 300;

const Corpo = z.object({
  link: z.string().min(1, "Cole o link do vídeo."),
  // Opcional: é uma dica pra IA, que identifica o nicho pelo material de
  // qualquer forma. Ver src/lib/analise/prompt.ts.
  nicho: z.string().max(120).optional(),
});

export async function POST(req: Request) {
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

  const { link, nicho } = parsed.data;
  const id = criarJob(link, nicho ?? "");

  // `after` roda depois da resposta ir embora, então o cliente recebe o id
  // na hora e acompanha por polling em vez de segurar um request de 60s.
  after(async () => {
    try {
      const resultado = await analisarLink(link, { nicho }, (etapa) =>
        marcarEtapa(id, etapa),
      );
      concluir(id, resultado);
    } catch (err) {
      // ErroDeEntrada é culpa do input (link inválido, vídeo longo demais) e
      // pode ir direto pro usuário. O resto vira mensagem genérica, com o
      // detalhe só no log do servidor.
      if (err instanceof ErroDeEntrada) {
        falhar(id, err.message);
      } else {
        console.error(`[analise ${id}]`, err);
        falhar(
          id,
          err instanceof Error
            ? err.message
            : "Algo quebrou durante a análise. Tente de novo.",
        );
      }
    }
  });

  return Response.json({ id }, { status: 202 });
}

export async function GET() {
  return Response.json(listarJobs(), {
    headers: { "Cache-Control": "no-store" },
  });
}
