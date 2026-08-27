import type { Metadata } from "next";
import { PaginaLegal } from "../pagina-legal";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description:
    "Como o GTA VIRAL coleta, usa e protege seus dados — em conformidade com a LGPD.",
};

export default function PoliticaPage() {
  return (
    <PaginaLegal
      titulo="Política de privacidade"
      atualizadoEm="7 de agosto de 2026"
    >
      <p>
        Esta política explica quais dados o <strong>GTA VIRAL</strong> coleta,
        por que coleta, com quem compartilha e quais são os seus direitos. Foi
        escrita para atender a Lei Geral de Proteção de Dados (Lei 13.709/2018).
      </p>

      <h2>1. Quem é o controlador</h2>
      <p>
        O GTA VIRAL é o controlador dos dados pessoais tratados na plataforma.
        Contato para assuntos de privacidade:{" "}
        <a href="mailto:privacidade@viralfarm.com.br">
          privacidade@viralfarm.com.br
        </a>
        .
      </p>

      <h2>2. Dados que coletamos</h2>

      <h3>Dados de conta</h3>
      <ul>
        <li>Nome que você escolhe ao se cadastrar</li>
        <li>E-mail</li>
        <li>Senha (armazenada de forma criptografada — nunca em texto claro)</li>
      </ul>

      <h3>Conteúdo que você envia</h3>
      <ul>
        <li>Links de vídeo que você cola na plataforma</li>
        <li>Arquivos de vídeo que você envia</li>
        <li>
          Transcrições geradas a partir do áudio, incluindo o tempo de cada
          palavra
        </li>
        <li>Os cortes gerados e suas configurações</li>
      </ul>

      <h3>Dados de uso</h3>
      <ul>
        <li>Registros de acesso (data, hora e endereço IP), exigidos pelo Marco Civil da Internet</li>
        <li>Ações realizadas na plataforma, para diagnóstico e melhoria do serviço</li>
      </ul>

      <h2>3. Por que tratamos esses dados</h2>
      <ul>
        <li>
          <strong>Execução do contrato:</strong> processar seus vídeos, gerar os
          cortes e manter sua conta funcionando.
        </li>
        <li>
          <strong>Obrigação legal:</strong> guarda de registros de acesso pelo
          prazo previsto em lei.
        </li>
        <li>
          <strong>Legítimo interesse:</strong> segurança da plataforma, prevenção
          a fraude e abuso, e melhoria do serviço.
        </li>
      </ul>

      <h2>4. Por quanto tempo guardamos</h2>
      <p>
        <strong>Vídeo original:</strong> mantido por até 24 horas após o
        processamento, para permitir que você revise e reedite os cortes. Depois
        disso é apagado automaticamente do nosso servidor de processamento.
      </p>
      <p>
        <strong>Cortes gerados e transcrições:</strong> mantidos enquanto sua
        conta existir, para que você possa acessá-los no histórico.
      </p>
      <p>
        <strong>Dados de conta:</strong> mantidos até você solicitar exclusão.
      </p>
      <p>
        <strong>Registros de acesso:</strong> mantidos por 6 meses, conforme o
        artigo 15 do Marco Civil da Internet.
      </p>

      <h2>5. Com quem compartilhamos</h2>
      <p>
        Não vendemos seus dados. Compartilhamos apenas com prestadores de
        serviço necessários para a plataforma funcionar:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — banco de dados, autenticação e
          armazenamento dos cortes
        </li>
        <li>
          <strong>Vercel</strong> — hospedagem do site
        </li>
        <li>
          <strong>Hostinger</strong> — servidor onde os vídeos são processados
        </li>
        <li>
          <strong>Groq</strong> — transcrição do áudio dos seus vídeos
        </li>
        <li>
          <strong>DeepSeek</strong> — análise da transcrição para seleção dos
          trechos
        </li>
      </ul>
      <p>
        Alguns desses serviços processam dados fora do Brasil. A transferência
        internacional ocorre com base na execução do contrato entre você e o
        GTA VIRAL, conforme o artigo 33 da LGPD.
      </p>

      <h2>6. Redes sociais conectadas</h2>
      <p>
        Se você conectar contas de redes sociais, receberemos apenas as
        permissões que você autorizar expressamente — normalmente identificação
        da conta e autorização para publicar conteúdo que você mandar publicar.
        Você pode revogar o acesso a qualquer momento, tanto na nossa plataforma
        quanto nas configurações da rede social.
      </p>

      <h2>7. Seus direitos</h2>
      <p>A LGPD garante a você o direito de:</p>
      <ul>
        <li>confirmar se tratamos seus dados e acessá-los</li>
        <li>corrigir dados incompletos ou desatualizados</li>
        <li>solicitar anonimização, bloqueio ou eliminação de dados desnecessários</li>
        <li>solicitar a portabilidade dos dados</li>
        <li>revogar consentimento e solicitar a exclusão da conta</li>
        <li>ser informado sobre com quem compartilhamos seus dados</li>
      </ul>
      <p>
        Para exercer qualquer um deles, escreva para{" "}
        <a href="mailto:privacidade@viralfarm.com.br">
          privacidade@viralfarm.com.br
        </a>
        . Respondemos em até 15 dias.
      </p>

      <h2>8. Segurança</h2>
      <p>
        Usamos conexão criptografada (HTTPS) em todo o tráfego, senhas
        armazenadas com hash, e isolamento por usuário no banco de dados — cada
        conta só acessa os próprios dados. Nenhum sistema é totalmente imune,
        mas trabalhamos para reduzir riscos e avisaremos você e a ANPD em caso de
        incidente relevante.
      </p>

      <h2>9. Cookies</h2>
      <p>
        Usamos cookies estritamente necessários para manter você autenticado. Não
        usamos cookies de publicidade nem rastreamento de terceiros para fins
        promocionais.
      </p>

      <h2>10. Menores de idade</h2>
      <p>
        O serviço não é direcionado a menores de 18 anos. Se identificarmos conta
        criada por menor sem autorização de responsável, ela será encerrada.
      </p>

      <h2>11. Alterações nesta política</h2>
      <p>
        Podemos atualizar esta política. Mudanças relevantes serão comunicadas
        por e-mail ou aviso na plataforma antes de entrarem em vigor.
      </p>

      <h2>12. Contato</h2>
      <p>
        Dúvidas, solicitações ou reclamações sobre privacidade:{" "}
        <a href="mailto:privacidade@viralfarm.com.br">
          privacidade@viralfarm.com.br
        </a>
        . Você também pode apresentar reclamação à Autoridade Nacional de
        Proteção de Dados (ANPD).
      </p>
    </PaginaLegal>
  );
}
