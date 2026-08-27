import type { Metadata } from "next";
import Link from "next/link";
import { AcessoLayout } from "../acesso-layout";
import { FormularioAcesso } from "../formulario-acesso";
import { mandarLogadoProPainel } from "../acesso-guarda";
import { MARCA } from "@/lib/gta/marca";

export const metadata: Metadata = {
  title: "Entrar",
  // MARCA é texto de tela (nome que o usuário lê) — nunca um identificador
  // de servidor. Ver docs/gta/mapa-da-marca.md.
  description: `Acesse sua conta do ${MARCA}.`,
};

export default async function EntrarPage() {
  await mandarLogadoProPainel();

  return (
    <AcessoLayout
      titulo="Entrar"
      subtitulo="Bem-vindo de volta. Continue de onde parou."
      rodape={
        <>
          Ainda não tem conta?{" "}
          <Link
            href="/cadastro"
            className="font-medium text-orange-400 transition hover:text-orange-300"
          >
            Criar uma agora
          </Link>
        </>
      }
    >
      <FormularioAcesso modo="entrar" />
    </AcessoLayout>
  );
}
