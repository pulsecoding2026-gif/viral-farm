import type { Metadata } from "next";
import Link from "next/link";
import { AcessoLayout } from "../acesso-layout";
import { FormularioAcesso } from "../formulario-acesso";
import { mandarLogadoProPainel } from "../acesso-guarda";
import { MARCA } from "@/lib/gta/marca";

export const metadata: Metadata = {
  title: "Criar conta",
  // Nem "sua live" nem "GTA VI" — o público não tem live própria (cliba a
  // live de RP de OUTRA pessoa) e ninguém joga GTA VI ainda. Mesmo erro que
  // a vitrine ao lado tinha, ver docs/gta/plano-mestre.md §1.
  description: `Crie sua conta no ${MARCA} e comece pelo RP de GTA V — cole o link, receba os cortes, sem aparecer.`,
};

export default async function CadastroPage() {
  await mandarLogadoProPainel();

  return (
    <AcessoLayout
      titulo="Criar conta"
      // Último passo antes da conta: o texto aqui reduz atrito, não
      // reapresenta o produto — quem chegou até aqui já leu a promessa na
      // home ou na vitrine ao lado.
      subtitulo="Leva menos de um minuto. Sem cartão de crédito."
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
