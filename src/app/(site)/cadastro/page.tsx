import type { Metadata } from "next";
import Link from "next/link";
import { AcessoLayout } from "../acesso-layout";
import { FormularioAcesso } from "../formulario-acesso";
import { mandarLogadoProPainel } from "../acesso-guarda";

export const metadata: Metadata = {
  title: "Criar conta",
  description:
    "Crie sua conta no Viral Farm e transforme vídeo longo em cortes prontos.",
};

export default async function CadastroPage() {
  await mandarLogadoProPainel();

  return (
    <AcessoLayout
      titulo="Criar conta"
      subtitulo="Comece analisando um vídeo que você já gravou."
      rodape={
        <>
          Já tem conta?{" "}
          <Link
            href="/entrar"
            className="font-medium text-orange-400 transition hover:text-orange-300"
          >
            Entrar
          </Link>
        </>
      }
    >
      <FormularioAcesso modo="cadastro" />
    </AcessoLayout>
  );
}
