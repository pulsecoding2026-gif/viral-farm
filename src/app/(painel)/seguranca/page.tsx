import type { Metadata } from "next";
import {
  AbasConta,
  AvisoSemAuth,
  Bloco,
  Campo,
  BotaoSalvar,
} from "../configuracoes-ui";

export const metadata: Metadata = { title: "Segurança" };

export default function SegurancaPage() {
  return (
    <div className="surgir">
      <header className="mb-6">
        <h1 className="fonte-titulo text-2xl font-semibold tracking-tight text-zinc-50">
          Configurações
        </h1>
        {/* zinc-500 media 4,02:1 — abaixo do mínimo de 4,5:1. zinc-400 mede 7,58:1. */}
        <p className="mt-1.5 text-sm text-zinc-400">
          Seus dados, seu acesso e as preferências do painel.
        </p>
      </header>

      <AbasConta atual="seguranca" />
      <AvisoSemAuth />

      <Bloco titulo="E-mail" descricao="É por ele que você entra na plataforma.">
        <Campo
          id="email"
          rotulo="E-mail de acesso"
          tipo="email"
          valor="pulsecoding0@gmail.com"
          dica="Trocar o e-mail exige confirmar pelo endereço novo."
        />
        <BotaoSalvar rotulo="Alterar e-mail" />
      </Bloco>

      <Bloco titulo="Senha" descricao="Use uma senha que você não usa em outro lugar.">
        <Campo id="senha-atual" rotulo="Senha atual" tipo="password" />
        <Campo
          id="senha-nova"
          rotulo="Nova senha"
          tipo="password"
          dica="Pelo menos 8 caracteres."
        />
        <Campo id="senha-conf" rotulo="Confirmar nova senha" tipo="password" />
        <BotaoSalvar rotulo="Alterar senha" />
      </Bloco>

      <Bloco
        titulo="Verificação em duas etapas"
        descricao="Uma segunda barreira caso alguém descubra a sua senha."
      >
        <p className="text-sm text-zinc-400">
          Ainda não configurada.
        </p>
        <BotaoSalvar rotulo="Ativar 2FA" />
      </Bloco>

      <Bloco
        titulo="Encerrar conta"
        descricao="Apaga o seu acesso e o histórico de análises. Não dá pra desfazer."
      >
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-xl border border-rose-900/70 px-4 py-2.5 text-sm font-medium text-rose-400 opacity-40"
        >
          Excluir minha conta
        </button>
      </Bloco>
    </div>
  );
}
