import { NextResponse } from "next/server";
import { listarSalvos, salvar, remover, atualizarSalvo } from "@/lib/salvos";

export async function GET() {
  return NextResponse.json(listarSalvos());
}

export async function POST(req: Request) {
  const corpo = await req.json();

  if (!corpo?.id || !corpo?.tipo) {
    return NextResponse.json(
      { erro: "Faltou id ou tipo no corpo da requisição." },
      { status: 400 },
    );
  }

  if (corpo.tipo !== "video" && corpo.tipo !== "analise") {
    return NextResponse.json(
      { erro: `Tipo desconhecido: ${corpo.tipo}` },
      { status: 400 },
    );
  }

  return NextResponse.json(salvar(corpo), { status: 201 });
}

export async function PATCH(req: Request) {
  const { id, nota, colecao_id } = await req.json();
  // `colecao_id: null` desvincula; ausente não mexe no vínculo atual.
  const item = atualizarSalvo(id, { nota, colecao_id });
  if (!item) {
    return NextResponse.json({ erro: "Item não encontrado." }, { status: 404 });
  }
  return NextResponse.json(item);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ erro: "Faltou o id." }, { status: 400 });
  }
  if (!remover(id)) {
    return NextResponse.json({ erro: "Item não encontrado." }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
