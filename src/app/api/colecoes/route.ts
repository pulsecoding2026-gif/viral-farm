import { NextResponse } from "next/server";
import {
  listarColecoes,
  criarColecao,
  atualizarColecao,
  removerColecao,
} from "@/lib/salvos";

export async function GET() {
  return NextResponse.json(listarColecoes());
}

export async function POST(req: Request) {
  const { nome, emoji, nota } = await req.json();

  if (!nome?.trim()) {
    return NextResponse.json(
      { erro: "A coleção precisa de um nome." },
      { status: 400 },
    );
  }

  return NextResponse.json(criarColecao(nome, emoji, nota), { status: 201 });
}

export async function PATCH(req: Request) {
  const { id, ...campos } = await req.json();
  const colecao = atualizarColecao(id, campos);

  if (!colecao) {
    return NextResponse.json(
      { erro: "Coleção não encontrada." },
      { status: 404 },
    );
  }
  return NextResponse.json(colecao);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ erro: "Faltou o id." }, { status: 400 });
  }
  if (!removerColecao(id)) {
    return NextResponse.json(
      { erro: "Coleção não encontrada." },
      { status: 404 },
    );
  }
  // Os ativos que estavam nela voltam para o acervo — ver removerColecao.
  return new NextResponse(null, { status: 204 });
}
