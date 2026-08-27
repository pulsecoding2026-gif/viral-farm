import type { Metadata } from "next";
import {
  AbasConta,
  AvisoSemAuth,
  Bloco,
  Campo,
  BotaoSalvar,
} from "../configuracoes-ui";
import { MARCA } from "@/lib/gta/marca";

export const metadata: Metadata = { title: "Perfil" };

export default function PerfilPage() {
  return (
    <div className="surgir">
      <header className="mb-6">
        <h1 className="fonte-titulo text-2xl font-semibold tracking-tight text-zinc-50">
          Configurações
        </h1>
        {/* zinc-500 media 4,02:1 sobre o fundo do painel — abaixo do mínimo
            de 4,5:1 pra texto normal. zinc-400 mede 7,58:1. */}
        <p className="mt-1.5 text-sm text-zinc-400">
          Seus dados, seu acesso e as preferências do painel.
        </p>
      </header>

      <AbasConta atual="perfil" />
      <AvisoSemAuth />

      <Bloco titulo="Foto" descricao="Aparece no canto da lateral e nos comentários.">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-xl font-semibold text-white">
            A
          </span>
          <BotaoSalvar rotulo="Enviar foto" />
        </div>
      </Bloco>

      <Bloco titulo="Dados" descricao={`Como você aparece dentro do ${MARCA}.`}>
        <Campo id="nome" rotulo="Nome" valor="Abraão" />
        <Campo
          id="usuario"
          rotulo="Nome de usuário"
          valor="abraao"
          dica="Usado no seu link público de perfil."
        />
        <Campo
          id="bio"
          rotulo="Bio"
          dica="Uma linha sobre o seu canal. Até 160 caracteres."
        />
        <Campo
          id="nicho"
          rotulo="Nicho principal"
          dica="Ajuda a IA a calibrar sugestões e o Ranking de Nichos."
        />
        <BotaoSalvar />
      </Bloco>
    </div>
  );
}
