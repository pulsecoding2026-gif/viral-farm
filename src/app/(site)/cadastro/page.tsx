import type { Metadata } from "next";
import Link from "next/link";
import { AcessoLayout } from "../acesso-layout";
import { FormularioAcesso } from "../formulario-acesso";
import { mandarLogadoProPainel } from "../acesso-guarda";
import { MARCA } from "@/lib/gta/marca";

export const metadata: Metadata = {
  title: "Criar conta",
  description: `Crie sua conta no ${MARCA} e transforme sua live de GTA VI em cortes prontos.`,
};

export default async function CadastroPage() {
  await mandarLogadoProPainel();

  return (
    <AcessoLayout
      titulo="Criar conta"
      subtitulo="Cole o link da sua live de GTA VI e veja os cortes saírem."
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
