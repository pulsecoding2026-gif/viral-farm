/**
 * A FONTE ÚNICA de tudo que depende do calendário do GTA VI.
 *
 * POR QUE ISTO É UM ARQUIVO E NÃO UMA CONSTANTE ESPALHADA
 *
 * O GTA VI já foi adiado DUAS vezes, ambas oficialmente: a janela original era
 * "2025", virou 26 de maio de 2026, e virou 19 de novembro de 2026. A confiança
 * na data atual é alta — a Take-Two ancorou publicamente a projeção de receita
 * do exercício nela, a pré-venda está aberta e o preload tem data — mas nada
 * disso é garantia, e este jogo já ensinou que não é.
 *
 * Uma plataforma inteira construída em cima de uma data que pode mudar precisa
 * que mudá-la seja a edição de UMA linha. Se a data estiver escrita no contador
 * regressivo, no texto da home, no título da aba e em três componentes, o dia
 * do adiamento vira uma caça ao tesouro com o site no ar dizendo coisa errada
 * na frente de todo mundo — no exato momento em que o tráfego é máximo.
 *
 * REGRA: nenhum componente escreve uma data do GTA VI. Todos importam daqui.
 *
 * TUDO É PURO e sem relógio embutido: as funções que dependem de "agora"
 * recebem o instante como parâmetro. Isso mantém o módulo testável e evita a
 * armadilha clássica do contador regressivo, que é o servidor renderizar um
 * número e o cliente renderizar outro.
 */

/**
 * Fuso de referência para as datas de evento.
 *
 * A Rockstar anuncia em horário do leste dos EUA e o público daqui lê em
 * horário de Brasília. Guardar tudo em UTC e converter na hora de exibir é o
 * que impede o erro de "o trailer saiu e o site diz que falta 1 hora".
 */
export type MarcoOficial = {
  id: string;
  /** Como aparece na tela. */
  rotulo: string;
  /** O instante, em UTC. */
  quando: string;
  /**
   * O que sustenta esta data. Marco sem fonte não entra — este projeto vive
   * num fandom que caça erro factual, e publicar rumor como fato queima a
   * credibilidade que é o único ativo real de um agregador.
   */
  fonte: string;
  /**
   * `false` quando a data é esperada mas não anunciada. A interface tem que
   * mostrar essa diferença, nunca esconder.
   */
  confirmado: boolean;
};

/**
 * O LANÇAMENTO — 19 de novembro de 2026.
 *
 * CONFIRMADO pela Rockstar. Guardado como meia-noite UTC porque a Rockstar não
 * anunciou hora de liberação; qualquer hora específica aqui seria invenção.
 */
export const LANCAMENTO: MarcoOficial = {
  id: "lancamento",
  rotulo: "Lançamento de GTA VI",
  quando: "2026-11-19T00:00:00Z",
  fonte:
    "https://www.rockstargames.com/newswire/article/ak3ak31a49a221/grand-theft-auto-vi-is-now-set-to-launch-november-19-2026",
  confirmado: true,
};

/**
 * Os marcos do caminho até lá, em ordem.
 *
 * O Extended Look tem DUAS estreias, e isso não é detalhe: a Netflix tem
 * exclusividade de seis horas antes de o vídeo chegar ao YouTube. Para quem faz
 * conteúdo, são dois picos separados — o de quem assistiu primeiro e reagiu, e
 * o da massa que só vê quando abre no YouTube. Tratar como um evento só perde
 * metade da janela.
 */
export const MARCOS: MarcoOficial[] = [
  /*
   * O Extended Look estreou em 27/08/2026 e por isso saiu desta lista.
   *
   * Marco que já aconteceu não é marco, é histórico: mantê-lo aqui só fazia
   * `proximoMarco()` gastar duas comparações para descartá-lo, e deixava um
   * item na tela do futuro anunciando uma coisa do passado. As datas ficam
   * registradas neste comentário porque são referência de calendário — o
   * aniversário de um trailer é pico de tráfego previsível:
   *
   *   27/08/2026 19:00Z — estreia na Netflix (15h ET)
   *   28/08/2026 01:00Z — aberto no YouTube (21h ET)
   */
  {
    id: "preload",
    rotulo: "Preload digital libera",
    quando: "2026-11-12T00:00:00Z",
    fonte: "https://www.rockstargames.com/VI",
    confirmado: true,
  },
  LANCAMENTO,
];

export type Contagem = {
  dias: number;
  horas: number;
  minutos: number;
  segundos: number;
  /** Já passou. O contador vira outra coisa — não some, e nunca fica negativo. */
  chegou: boolean;
};

/**
 * Quanto falta, a partir de um instante que VOCÊ passa.
 *
 * `agora` é parâmetro e não `Date.now()` de propósito. Um contador que lê o
 * relógio por dentro renderiza um valor no servidor e outro no cliente, e o
 * React reclama de hidratação divergente — além de ser impossível de testar
 * sem mexer no relógio da máquina.
 */
export function contagemAte(alvo: string, agora: Date): Contagem {
  const restante = new Date(alvo).getTime() - agora.getTime();
  if (!Number.isFinite(restante) || restante <= 0) {
    return { dias: 0, horas: 0, minutos: 0, segundos: 0, chegou: true };
  }
  const s = Math.floor(restante / 1000);
  return {
    dias: Math.floor(s / 86400),
    horas: Math.floor((s % 86400) / 3600),
    minutos: Math.floor((s % 3600) / 60),
    segundos: s % 60,
    chegou: false,
  };
}

/** O próximo marco que ainda não aconteceu — `null` quando todos já passaram. */
export function proximoMarco(agora: Date): MarcoOficial | null {
  const futuros = MARCOS.filter(
    (m) => new Date(m.quando).getTime() > agora.getTime(),
  ).sort(
    (a, b) => new Date(a.quando).getTime() - new Date(b.quando).getTime(),
  );
  return futuros[0] ?? null;
}
