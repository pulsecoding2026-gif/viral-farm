import type { Metadata } from "next";
import { PaginaLegal } from "../pagina-legal";

/*
 * O `title` continua curto: o sufixo "· GTA VIRAL" vem do `template` da raiz,
 * repetir a marca aqui daria "Termos de uso GTA VIRAL · GTA VIRAL".
 *
 * A descrição diz o que a página tem de INCOMUM — a regra sobre material de
 * terceiros e material vazado. "Termos de uso da plataforma" descreve dez mil
 * páginas iguais; esta descreve esta.
 *
 * `canonical` explícito porque a raiz declara `alternates.canonical: "/"`, e
 * campos de metadata são substituídos pelo segmento mais próximo — sem esta
 * linha, /termos herdaria o canonical da home e pediria ao Google para não
 * indexar a si mesma.
 */
export const metadata: Metadata = {
  title: "Termos de uso",
  description:
    "As condições de uso do GTA VIRAL, incluindo a regra sobre vídeo de " +
    "terceiros, crédito ao streamer e a proibição de material vazado ou de " +
    "build não lançada.",
  alternates: { canonical: "/termos" },
  openGraph: {
    type: "article",
    locale: "pt_BR",
    title: "Termos de uso",
    description:
      "Condições de uso do GTA VIRAL e a regra sobre conteúdo de terceiros.",
    url: "/termos",
  },
};

export default function TermosPage() {
  return (
    <PaginaLegal titulo="Termos de uso" atualizadoEm="27 de agosto de 2026">
      <p>
        Estes termos regem o uso do <strong>GTA VIRAL</strong>, plataforma que
        analisa vídeos e gera cortes verticais com legendas. Ao criar uma conta
        ou usar o serviço, você concorda com o que está escrito aqui.
      </p>

      {/*
        Esta seção é curta de propósito e não tenta ser um contrato completo.
        A plataforma passou a se dirigir a quem monta canal de cortes com
        material de terceiros, e isso muda a natureza do que se combina com o
        usuário — é assunto para um advogado de propriedade intelectual, não
        para texto escrito junto com o resto do site. O que está aqui é o
        mínimo honesto: dizer a regra que a plataforma de fato aplica.
      */}
      <h2>Conteúdo de terceiros e material não oficial</h2>
      <p>
        Você é responsável por ter o direito de usar o vídeo que enviar. Se o
        material for de outra pessoa — a live de um streamer, por exemplo —
        cabe a você obter a permissão de quem gravou e creditar a origem no
        conteúdo publicado.
      </p>
      <p>
        É <strong>proibido</strong> enviar material vazado ou obtido sem
        autorização, incluindo gameplay de versões não lançadas, capturas,
        áudio ou arte que não tenham sido divulgados oficialmente. Conteúdo
        assim é removido e a conta pode ser encerrada.
      </p>
      <p>
        O GTA VIRAL é um projeto independente feito por fãs, sem qualquer
        afiliação, patrocínio ou endosso da Rockstar Games ou da Take-Two
        Interactive. Grand Theft Auto e GTA são marcas de seus respectivos
        titulares.
      </p>
      <p>
        Para reportar uso indevido de conteúdo de sua titularidade, escreva
        para o contato indicado ao final desta página.
      </p>

      <h2>1. O que o serviço faz</h2>
      <p>
        Você fornece um vídeo (por link ou envio de arquivo). O GTA VIRAL baixa
        ou recebe esse vídeo, transcreve o áudio, usa inteligência artificial
        para identificar trechos com potencial para formato curto e gera vídeos
        no formato 9:16 com legendas.
      </p>
      <p>
        A pontuação atribuída a cada corte é uma <strong>estimativa de
        adequação ao formato curto</strong>, calculada por modelos de
        linguagem. Não é previsão de desempenho, alcance ou receita.
      </p>

      <h2>2. Você é responsável pelo conteúdo</h2>
      <p>
        Ao enviar um vídeo, você declara que:
      </p>
      <ul>
        <li>
          é o titular dos direitos sobre o conteúdo, ou possui autorização
          expressa de quem os detém;
        </li>
        <li>
          o uso do material não viola direitos autorais, de imagem, de voz ou
          quaisquer direitos de terceiros;
        </li>
        <li>
          o conteúdo não é ilegal, não incita violência ou ódio, não é
          sexualmente explícito envolvendo menores e não viola a legislação
          brasileira.
        </li>
      </ul>
      <p>
        <strong>A responsabilidade pelo conteúdo enviado é integralmente
        sua.</strong> Podemos suspender ou encerrar contas que violem estas
        condições, sem reembolso.
      </p>

      <h2>3. Conta</h2>
      <p>
        Você é responsável por manter a confidencialidade das suas credenciais e
        por toda atividade realizada na sua conta. Avise-nos imediatamente se
        suspeitar de acesso não autorizado.
      </p>
      <p>
        É necessário ter 18 anos ou mais, ou possuir autorização de responsável
        legal, para usar o serviço.
      </p>

      <h2>4. Planos, cobrança e limites</h2>
      <p>
        O serviço pode ser oferecido em planos gratuitos e pagos, com limites de
        uso descritos no momento da contratação. Processamento consumido não é
        reembolsável, mesmo que o resultado não agrade — o custo computacional
        já foi incorrido.
      </p>
      <p>
        Você pode cancelar a assinatura a qualquer momento. O acesso permanece
        até o fim do período já pago.
      </p>

      <h2>5. Disponibilidade</h2>
      <p>
        O serviço é fornecido <strong>&ldquo;no estado em que se
        encontra&rdquo;</strong>. Não garantimos disponibilidade ininterrupta,
        ausência de erros ou que a plataforma de origem do vídeo permitirá o
        download — provedores externos (como YouTube, TikTok e Instagram) podem
        alterar suas regras a qualquer momento e impedir a ingestão.
      </p>

      <h2>6. Propriedade intelectual</h2>
      <p>
        O conteúdo que você envia continua sendo seu. Os cortes gerados a partir
        dele também são seus, para uso comercial ou pessoal.
      </p>
      <p>
        O software, a marca, a interface e os modelos de análise do GTA VIRAL
        permanecem de propriedade do GTA VIRAL. Você não pode copiar, revender
        ou fazer engenharia reversa da plataforma.
      </p>

      <h2>7. Limitação de responsabilidade</h2>
      <p>
        Na máxima extensão permitida pela legislação aplicável, o GTA VIRAL não
        responde por lucros cessantes, perda de dados, danos indiretos ou
        consequenciais decorrentes do uso ou da impossibilidade de uso do
        serviço.
      </p>
      <p>
        Nossa responsabilidade total, em qualquer hipótese, fica limitada ao
        valor pago por você nos 12 meses anteriores ao evento que originou a
        reclamação.
      </p>

      <h2>8. Integrações com terceiros</h2>
      <p>
        Ao conectar contas de redes sociais, você autoriza o GTA VIRAL a
        realizar as ações que você solicitar por meio dessas integrações, dentro
        das permissões concedidas. O uso dessas plataformas também está sujeito
        aos termos delas.
      </p>

      <h2>9. Alterações</h2>
      <p>
        Podemos atualizar estes termos. Mudanças relevantes serão comunicadas
        por e-mail ou aviso na plataforma com antecedência razoável. O uso
        continuado após a alteração significa concordância.
      </p>

      <h2>10. Lei aplicável e foro</h2>
      <p>
        Estes termos são regidos pelas leis da República Federativa do Brasil.
        Fica eleito o foro do domicílio do consumidor para dirimir controvérsias,
        conforme o Código de Defesa do Consumidor.
      </p>

      <h2>11. Contato</h2>
      <p>
        Dúvidas sobre estes termos:{" "}
        <a href="mailto:contato@viralfarm.com.br">contato@viralfarm.com.br</a>.
      </p>
    </PaginaLegal>
  );
}
