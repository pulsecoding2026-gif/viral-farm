/**
 * O NOME DA PLATAFORMA, num lugar só.
 *
 * A DECISÃO: GTA VIRAL, tomada pelo dono e reafirmada depois de ele pesquisar
 * o INPI — há diversas empresas registradas com "GTA" no nome, e ele avaliou
 * que a marca do produto não conflita com a do jogo. O agente de marketing
 * tinha sugerido um nome sem o "GTA" na frente; a sugestão está em
 * `docs/gta/posicionamento.md` e foi decidida contra, com conhecimento de
 * causa. Assunto encerrado — não reabra pelo código.
 *
 * POR QUE O NOME MORA NUMA CONSTANTE MESMO ASSIM
 *
 * Não é ressalva disfarçada: é a mesma razão pela qual a data de lançamento
 * também mora num arquivo só. Nome de produto muda por muitos motivos comuns
 * — o hype passa, a marca amadurece, um sócio entra. Espalhar o nome por 105
 * pontos do código transforma qualquer um desses em semana de trabalho.
 * Centralizar custa este arquivo e devolve a opção de graça.
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
