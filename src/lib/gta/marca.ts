/**
 * O NOME DA PLATAFORMA, num lugar só.
 *
 * POR QUE ISTO EXISTE, e vale ler antes de mexer
 *
 * O dono decidiu chamar a plataforma de GTA VIRAL, e é isso que está no ar.
 * A decisão é dele e este arquivo a implementa.
 *
 * Só que o agente de marketing levantou uma objeção que ficou registrada em
 * `docs/gta/posicionamento.md` e que merece este comentário: usar uma marca de
 * terceiro como PRIMEIRA PALAVRA de um produto PAGO é a configuração de maior
 * risco possível. Políticas de conteúdo de fã costumam cobrir uso não
 * comercial, e esta plataforma cobra assinatura — ou seja, não está debaixo
 * desse guarda-chuva. Some-se a isso que a Take-Two obteve intimações
 * judiciais esta semana no caso dos vazamentos: é um titular ativo, não
 * distraído.
 *
 * A recomendação dele era batizar o produto de VI·RAL e deixar o "GTA" viver
 * no descritor ("cortes para criadores de GTA VI, não oficial"). Não é uma
 * decisão que um agente toma sozinho — é do dono, e ele já se manifestou.
 *
 * O QUE ESTE ARQUIVO FAZ COM ISSO: torna a troca barata. Todo texto de tela
 * importa `MARCA` daqui. Se um dia a decisão mudar — por conselho jurídico, por
 * notificação recebida, ou porque o hype passou e o nome ficou datado — é uma
 * linha, não uma caçada por 105 ocorrências espalhadas. O custo de manter a
 * opção aberta é este arquivo; o custo de não a manter aparece no pior dia
 * possível.
 *
 * NÃO USE ISTO PARA IDENTIFICADOR. Caminho de servidor, nome de bucket, chave
 * de env e nome de tabela continuam sendo `viral-farm` e devem continuar —
 * ver `docs/gta/mapa-da-marca.md`. Marca é o que a pessoa lê; identificador é
 * o endereço combinado entre duas máquinas.
 */

/** O nome, como aparece na tela. */
export const MARCA = "GTA VIRAL";

/**
 * O que a plataforma é, em uma linha, para metadados e subtítulos.
 *
 * Contém "não oficial" de propósito e isso não é modéstia: é a diferença entre
 * um site de fã e um site que se passa por oficial. A frase viaja junto com o
 * nome em toda página pública.
 */
export const DESCRITOR = "Cortes e conteúdo de GTA VI para criadores · não oficial";

/**
 * O aviso de não-afiliação. Obrigatório no rodapé de TODA página pública.
 *
 * Custa uma linha de texto e é a peça mais barata de proteção que existe.
 * Ver `docs/gta/politica-de-conteudo.md`.
 */
export const NAO_AFILIADO =
  `${MARCA} é um projeto independente feito por fãs e não tem qualquer ` +
  `afiliação, patrocínio ou endosso da Rockstar Games ou da Take-Two ` +
  `Interactive. Grand Theft Auto e GTA são marcas de seus respectivos ` +
  `titulares. Todo o material oficial citado pertence à Rockstar Games.`;

/** Título das abas do navegador: "Página · GTA VIRAL". */
export const TEMPLATE_TITULO = `%s · ${MARCA}`;
