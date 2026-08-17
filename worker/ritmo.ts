import {
  exigenciaDeEnquadramento,
  type Enquadramento,
  type MedidaQuadro,
} from "./enquadramento";
import type { Palavra } from "./transcritor";

/**
 * O RITMO DE UM CORTE: um corte não tem um enquadramento, tem três atos.
 *
 * O que existia antes: `decidirEnquadramento` media o trecho inteiro e
 * escolhia UM enquadramento — crop fechado ou quadro inteiro com fundo
 * desfocado — para os 40 segundos. Está correto e é monótono. Um short que
 * fica no mesmo tamanho de plano do início ao fim parece uma câmera de
 * vigilância legendada, e o espectador larga.
 *
 * O que os shorts que funcionam fazem: começam FECHADO, porque o rosto grande
 * é o que segura o dedo nos dois primeiros segundos; abrem no meio, quando o
 * assunto se desenvolve e o contexto passa a importar; e fecham de novo no
 * fim, na conclusão. A troca não é decoração — ela remarca "mudou de assunto"
 * sem precisar de transição, e o corte respira.
 *
 * A REGRA QUE GOVERNA TUDO AQUI
 *
 * Medição manda, ritmo escolhe no que sobra.
 *
 * Onde as bordas do quadro carregam conteúdo (frase escrita na tela, duas
 * pessoas afastadas, gráfico), fechar MUTILA — e ali não há discussão de
 * ritmo: é `ajustar` e pronto. Onde cortar não perde nada, os dois
 * enquadramentos são igualmente honestos, e é justamente aí que a alternância
 * é de graça. Ritmo nunca passa por cima de conteúdo; ele ocupa o espaço que
 * o conteúdo deixa livre.
 *
 * ONDE SE TROCA
 *
 * Nunca no meio de uma palavra, e de preferência nem no meio de uma frase. As
 * fronteiras candidatas saem de dois sinais que o worker já produz: os cortes
 * de cena (`detectarCortesDeCena`) e os respiros da fala (as pausas entre
 * palavras da transcrição). Trocar de plano exatamente quando a imagem já
 * mudou, ou quando a pessoa respirou, é o que faz a troca passar despercebida
 * — a mesma lógica que esconde o salto da câmera no corte de cena.
 *
 * TUDO É PURO: entra duração, fronteiras e uma função de medir; sai a lista de
 * blocos. Sem ffmpeg, sem disco. Quem executa é `worker/renderizar.ts`.
 */

export type Bloco = {
  /** Segundos RELATIVOS ao início do corte. */
  de: number;
  ate: number;
  enquadramento: Enquadramento;
  /** Por que este bloco ficou com este enquadramento. Vai pro log. */
  motivo: string;
};

export type OpcoesRitmo = {
  /**
   * Duração mínima de um bloco, em segundos.
   *
   * 3,5 s. Abaixo disso a troca deixa de ler como mudança de plano e vira
   * piscada: o espectador registra que "algo aconteceu na tela" sem conseguir
   * dizer o quê, que é a pior sensação possível — chama atenção para a edição
   * em vez de para o conteúdo. É também o tempo mínimo para uma frase inteira
   * caber num plano.
   */
  minBloco_s: number;

  /**
   * Quantos blocos, no máximo. 3 = início, meio e fim.
   *
   * O teto existe porque a tentação é alternar sempre que aparece uma
   * fronteira, e num vídeo com muitos cortes de cena isso produziria uma
   * dezena de trocas — que é exatamente o vídeo nervoso que estamos evitando.
   * Três atos é a estrutura que o material curto aguenta.
   */
  maxBlocos: number;

  /**
   * Abaixo desta duração o corte não tem ritmo nenhum: é um bloco só.
   *
   * 12 s. Um short de 10 s é um gesto único; dividi-lo em três atos daria
   * blocos de 3 s, cada um mal chegando ao mínimo. Corte curto se sustenta no
   * conteúdo, não na edição.
   */
  minParaDividir_s: number;

  /**
   * A pausa na fala que conta como respiro. 0,35 s é a fronteira comum entre
   * "separou duas palavras" e "terminou uma ideia" na fala corrida.
   */
  respiro_s: number;

  /**
   * Com que enquadramento o corte ABRE, quando a medição deixa escolher.
   *
   * `preencher` — o rosto grande é o que segura o espectador nos primeiros
   * segundos, e é o plano que menos pede contexto para ser entendido.
   */
  abertura: Enquadramento;
};

export const PADROES_RITMO: OpcoesRitmo = {
  minBloco_s: 3.5,
  maxBlocos: 3,
  minParaDividir_s: 12,
  respiro_s: 0.35,
  abertura: "preencher",
};

/**
 * Os instantes em que trocar de plano não incomoda, em ordem.
 *
 * Cortes de cena vêm primeiro na preferência porque ali a imagem inteira já
 * trocou — a troca de enquadramento é literalmente invisível. Respiro de fala
 * é a segunda melhor: ninguém está no meio de uma palavra.
 */
export function fronteirasNaturais(
  cortesDeCena: number[],
  palavras: Palavra[],
  ancora: number,
  o: OpcoesRitmo = PADROES_RITMO,
): number[] {
  const deCena = cortesDeCena.filter((t) => Number.isFinite(t) && t > 0);

  const respiros: number[] = [];
  const ordenadas = palavras
    .filter((p) => Number.isFinite(p.inicio_s) && Number.isFinite(p.fim_s))
    .sort((a, b) => a.inicio_s - b.inicio_s);
  for (let i = 1; i < ordenadas.length; i++) {
    const pausa = ordenadas[i].inicio_s - ordenadas[i - 1].fim_s;
    if (pausa < o.respiro_s) continue;
    // O meio da pausa: o ponto mais longe de qualquer palavra dos dois lados.
    const meio = (ordenadas[i - 1].fim_s + ordenadas[i].inicio_s) / 2 - ancora;
    if (meio > 0) respiros.push(meio);
  }

  return [...new Set([...deCena, ...respiros])].sort((a, b) => a - b);
}

/**
 * Escolhe até `maxBlocos−1` fronteiras, o mais perto possível de dividir o
 * corte em partes iguais.
 *
 * Partes iguais e não "onde houver fronteira" porque a estrutura é o objetivo:
 * três atos de tamanhos parecidos é o que soa deliberado. Para cada divisão
 * ideal procuramos a fronteira natural mais próxima, e desistimos dela se
 * nenhuma estiver a distância razoável — melhor dois blocos bem colocados do
 * que três com um corte no lugar errado.
 */
function escolherFronteiras(
  duracao: number,
  candidatas: number[],
  o: OpcoesRitmo,
): number[] {
  const alvos = Math.min(
    o.maxBlocos,
    Math.max(1, Math.floor(duracao / o.minBloco_s)),
  );
  if (alvos < 2) return [];

  const escolhidas: number[] = [];
  for (let i = 1; i < alvos; i++) {
    const ideal = (duracao * i) / alvos;
    // A fronteira tem que caber: nem colada no começo, nem no fim, nem em
    // cima de uma já escolhida.
    const viaveis = candidatas.filter(
      (t) =>
        t >= o.minBloco_s &&
        t <= duracao - o.minBloco_s &&
        escolhidas.every((e) => Math.abs(e - t) >= o.minBloco_s),
    );
    if (viaveis.length === 0) continue;

    const melhor = viaveis.reduce((a, b) =>
      Math.abs(b - ideal) < Math.abs(a - ideal) ? b : a,
    );
    // Longe demais do ideal significa que não há fronteira natural onde a
    // estrutura pedia. Forçar produziria um ato de 2 s e outro de 20 s.
    if (Math.abs(melhor - ideal) > duracao / (alvos * 2)) continue;
    escolhidas.push(melhor);
  }

  return escolhidas.sort((a, b) => a - b);
}

/**
 * O plano de enquadramento do corte, bloco a bloco.
 *
 * `medir` recebe os limites de um bloco (relativos ao corte) e devolve o
 * enquadramento OBRIGATÓRIO dali, ou null quando tanto faz. Ele entra como
 * parâmetro em vez de ser chamado aqui dentro porque medir custa I/O de
 * vídeo, e esta função precisa continuar pura e testável.
 */
export async function planejarRitmo(
  duracao: number,
  candidatas: number[],
  medir: (de: number, ate: number) => Promise<{
    obrigatorio: Enquadramento | null;
    motivo: string;
  }>,
  o: OpcoesRitmo = PADROES_RITMO,
): Promise<Bloco[]> {
  if (!(duracao > 0)) return [];

  const fronteiras =
    duracao < o.minParaDividir_s
      ? []
      : escolherFronteiras(duracao, candidatas, o);

  const limites = [0, ...fronteiras, duracao];
  const blocos: Bloco[] = [];

  /**
   * A alternância é uma PREFERÊNCIA, e ela só vale quando a medição libera.
   *
   * `desejado` guarda de que lado o ritmo quer ir no próximo bloco; ele vira
   * a cada bloco emitido. Quando a medição impõe um enquadramento, o desejo
   * é sobrescrito — e o próximo desejo passa a ser o oposto DO QUE FOI
   * REALMENTE USADO, não do que se queria. Sem isso, dois blocos obrigatórios
   * seguidos deixariam o ritmo fora de fase com a tela.
   */
  let desejado: Enquadramento = o.abertura;

  for (let i = 0; i < limites.length - 1; i++) {
    const de = limites[i];
    const ate = limites[i + 1];
    const { obrigatorio, motivo } = await medir(de, ate);

    const enquadramento = obrigatorio ?? desejado;
    blocos.push({
      de,
      ate,
      enquadramento,
      motivo: obrigatorio
        ? motivo
        : `ritmo: ${enquadramento === "preencher" ? "fecha" : "abre"} neste ato (${motivo})`,
    });

    desejado = enquadramento === "preencher" ? "ajustar" : "preencher";
  }

  return blocos;
}

/**
 * O plano de ritmo de um corte, medindo o vídeo de verdade.
 *
 * É a junção das peças: fronteiras naturais dos dois sinais que o worker já
 * tem, blocos de tamanho parecido entre elas, e a medição de cada bloco
 * decidindo onde o conteúdo manda.
 *
 * A DUAS BASES DE TEMPO, escritas porque já custaram caro neste projeto:
 * os blocos falam a linha do tempo FINAL (relativa ao corte, e sem as pausas
 * se houve limpeza), mas `medirQuadro` lê o VÍDEO ORIGINAL e precisa de
 * segundos absolutos dele. `paraOriginal` é a única ponte entre as duas, e
 * fica visível aqui em vez de escondida dentro de uma conta.
 */
export async function planejarRitmoDoCorte(
  duracaoFinal: number,
  cortesDeCena: number[],
  palavras: Palavra[],
  ancora: number,
  medirQuadro: (de: number, ate: number) => Promise<MedidaQuadro>,
  paraOriginal: (t: number) => number,
  o: OpcoesRitmo = PADROES_RITMO,
): Promise<Bloco[]> {
  const candidatas = fronteirasNaturais(cortesDeCena, palavras, ancora, o);
  return planejarRitmo(
    duracaoFinal,
    candidatas,
    async (de, ate) =>
      exigenciaDeEnquadramento(
        await medirQuadro(paraOriginal(de), paraOriginal(ate)),
      ),
    o,
  );
}

/**
 * O grafo de filtro que executa o plano: um trim por bloco, cada um com o seu
 * enquadramento, concatenados.
 *
 * Por que num grafo só, e não um render por bloco seguido de concat de
 * arquivos: uma passada de encode em vez de N+1. O total de frames
 * processados é o mesmo, mas cada arquivo intermediário custaria um encode
 * completo e uma releitura — e a VPS tem um núcleo.
 *
 * `setpts=PTS-STARTPTS` em cada bloco é obrigatório: sem ele o concat recebe
 * trechos com timestamps do meio do vídeo e monta uma linha do tempo com
 * buracos. É a mesma armadilha do `filtroDeJanelas` do silêncio.
 *
 * O ÁUDIO NÃO É TOCADO. Ele passa inteiro por fora deste grafo: o ritmo é
 * visual, e picotar o áudio em blocos só criaria oportunidade de estalo na
 * emenda.
 */
export function filtroDeRitmo(
  blocos: Bloco[],
  filtroDe: (e: Enquadramento, indice: number) => string,
  entrada = "0:v",
): string {
  if (blocos.length === 0) return "";
  if (blocos.length === 1) return filtroDe(blocos[0].enquadramento, 0);

  const partes: string[] = [];
  for (const [i, b] of blocos.entries()) {
    partes.push(
      `[${entrada}]trim=start=${b.de.toFixed(3)}:end=${b.ate.toFixed(3)},` +
        `setpts=PTS-STARTPTS,${filtroDe(b.enquadramento, i)}[rb${i}]`,
    );
  }
  partes.push(
    `${blocos.map((_, i) => `[rb${i}]`).join("")}` +
      `concat=n=${blocos.length}:v=1:a=0[rvout]`,
  );
  return partes.join(";");
}
