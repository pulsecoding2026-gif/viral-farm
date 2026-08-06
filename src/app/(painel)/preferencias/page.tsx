import type { Metadata } from "next";
import {
  AbasConta,
  AvisoSemAuth,
  Bloco,
  Campo,
  Alternador,
  BotaoSalvar,
} from "../configuracoes-ui";

export const metadata: Metadata = { title: "Preferências" };

export default function PreferenciasPage() {
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

      <AbasConta atual="preferencias" />
      <AvisoSemAuth />

      <Bloco titulo="Notificações" descricao="O que a gente te avisa, e por onde.">
        <Alternador
          rotulo="Análise concluída"
          descricao="Avisa quando o Analisador termina de processar um material."
          ligado
        />
        <Alternador
          rotulo="Concorrente fora da curva"
          descricao="Avisa quando um perfil monitorado emplaca um vídeo acima da média."
          ligado
        />
        <Alternador
          rotulo="Tendência no seu nicho"
          descricao="Resumo semanal do que subiu no Radar Viral."
        />
        <Alternador
          rotulo="Novidades da plataforma"
          descricao="Avisos de módulo novo e mudanças importantes."
        />
      </Bloco>

      <Bloco titulo="Análise" descricao="Como o Analisador se comporta por padrão.">
        <Campo
          id="nicho-padrao"
          rotulo="Nicho padrão"
          dica="Preenchido automaticamente em toda análise nova. Deixe vazio pra IA identificar sozinha."
        />
        <Campo
          id="modelo"
          rotulo="Modelo de IA"
          valor="claude-opus-5"
          dica="Opus dá mais precisão; Sonnet custa cerca de um terço."
        />
        <Alternador
          rotulo="Apagar o vídeo depois de analisar"
          descricao="Sempre ativo: o material baixado é apagado ao fim da análise, fica só o resultado."
          ligado
        />
      </Bloco>

      <Bloco titulo="Idioma" descricao="Do painel e das saídas da IA.">
        <Campo id="idioma" rotulo="Idioma" valor="Português (Brasil)" />
        <BotaoSalvar />
      </Bloco>
    </div>
  );
}
