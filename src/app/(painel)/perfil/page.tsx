import type { Metadata } from "next";
import {
  AbasConta,
  AvisoSemAuth,
  Bloco,
  Campo,
  BotaoSalvar,
} from "../configuracoes-ui";

export const metadata: Metadata = { title: "Perfil" };

export default function PerfilPage() {
  return (
    <div className="surgir">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Configurações
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">
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

      <Bloco titulo="Dados" descricao="Como você aparece dentro do Viral Farm.">
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
