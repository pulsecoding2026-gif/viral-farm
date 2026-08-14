/**
 * A mesma trajetória de câmera, mas ciente de que o vídeo TEM CORTES.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * `planejarTrajetoria` foi calibrada para movimento CONTÍNUO: uma pessoa
 * sentada num podcast, um apresentador andando pelo palco. Nesse material ela
 * ganha fácil. No A/B com trailer ela perdeu feio — rosto dentro do recorte em
 * 44% das amostras contra 65% do crop central FIXO. Perder para "não fazer
 * nada" é o resultado mais informativo possível, e a causa não é bug de conta.
 *
 * O material tinha 19 cortes de cena em 30 segundos, um a cada 1,6 s. Quando a
 * cena troca, o rosto TELEPORTA — estava a 300 px, agora está a 1500 px, e não
 * porque alguém correu. A trajetória contínua não tem como saber disso: para
 * ela é movimento, então a suavização faz o que foi mandada fazer e começa uma
 * panorâmica de 1200 px. Só que a 243 px/s ela leva 5 s para chegar, e a cena
 * dura 1,6. Resultado medido: em t=16 s o rosto estava em 673 px e a câmera em
 * 286 px — lado OPOSTO do quadro. A câmera passou o vídeo inteiro viajando
 * para lugares de onde a pessoa já tinha saído, e chegando sempre em cena
 * errada. Não é "atraso", é perseguir fantasma.
 *
 * A IDEIA
 *
 * Cada cena é um SEGMENTO INDEPENDENTE. Entre segmentos a câmera SALTA, e o
 * salto é invisível porque a imagem inteira mudou no mesmo frame — é o corte
 * que esconde o movimento, exatamente como um editor faz. Dentro do segmento:
 *
 *   CENA CURTA  →  uma posição FIXA, escolhida para enquadrar o máximo de
 *                  rostos daquela cena, e a câmera não mexe mais — SALVO se
 *                  nem a melhor posição segura o rosto até o fim da cena, e aí
 *                  vai um pan reto de ponta a ponta. Ver `folgaDaBorda`.
 *   CENA LONGA  →  aí sim vale seguir, com toda a maquinaria de
 *                  `planejarTrajetoria` rodando SÓ dentro da cena.
 *   SEM ROSTO   →  centro da fonte. Sem herdar a posição da cena anterior:
 *                  a imagem mudou, não há razão nenhuma para continuar
 *                  apontando para o mesmo canto.
 *
 * O ganho não vem de seguir melhor. Vem de PARAR DE SEGUIR quando seguir não
 * faz sentido — que, num trailer, é quase sempre.
 *
 * TUDO É PURO, mesmo contrato de `trajetoria.ts`: entra `Amostra[]`, sai
 * `Ponto[]`, e quem consome só precisa interpolar linearmente (`centroEm`).
 */

import {
  planejarTrajetoria,
  centroEm,
  escolherPrincipal,
  pontuacao,
  larguraDoCrop,
  limitesDoCentro,
  PADROES,
  type Amostra,
  type Dimensoes,
  type OpcoesTrajetoria,
  type Ponto,
  type Rosto,
} from "./trajetoria";

export type OpcoesTrajetoriaPorCena = OpcoesTrajetoria & {
  /**
   * A fronteira entre "curta" (fica parada) e "longa" (segue). 2,0 s, e o
   * número sai da própria câmera, não de gosto:
   *
   *   - O filtro exponencial usa τ = 0,4 s e cobre 95% da distância em 3·τ =
   *     1,2 s. Esse é o PISO de uma panorâmica: abaixo disso ela não terminou.
   *   - As amostras vêm a 2 Hz. A câmera só percebe que alguém andou na
   *     segunda amostra do movimento, ou seja, 0,5 s depois dele começar.
   *   - A troca de assunto exige 3 amostras seguidas de confirmação = 1,5 s.
   *
   * Somando: uma cena precisa de ~1,7 s só para a máquina de seguir TOMAR UMA
   * DECISÃO e executá-la. Numa cena de 1,6 s tudo que ela consegue produzir é
   * meia panorâmica interrompida pelo corte seguinte — que é o defeito que
   * estamos removendo, não uma versão amena dele. 2,0 s dá a margem.
   *
   * O lado prático: no material medido (corte a cada 1,6 s) TODA cena cai no
   * lado curto, que é a intenção. Num podcast de 40 s sem corte nenhum, tudo
   * cai no lado longo — e o comportamento é idêntico ao de hoje.
   */
  cenaLonga_s: number;

  /**
   * ...e quantas amostras COM ROSTO a cena precisa ter para valer a pena
   * seguir. 4 = 2 s a 2 Hz, o mesmo raciocínio pelo outro eixo: uma cena de
   * 10 s em que o detector só achou alguém em 3 amostras não tem trajetória a
   * suavizar, tem três pontos soltos. Média exponencial de 3 pontos esparsos é
   * ruído com cara de movimento.
   */
  minAmostrasParaSeguir: number;

  /**
   * O passo do degrau, em segundos. Ver "COMO SE FAZ UM SALTO" abaixo. 1 ms
   * está três ordens de grandeza abaixo de um frame a 30 fps: nenhum frame
   * renderizado cai dentro da rampa, então na prática ela não existe.
   */
  saltoEpsilon_s: number;

  /**
   * Quanto da meia-largura do recorte conta como "ainda dentro", antes da cena
   * curta desistir de ficar parada e fazer um pan.
   *
   * Isto existe porque medir o teto ensinou uma coisa desconfortável: a MELHOR
   * posição fixa por cena entrega 84% no material de teste, e o oráculo (uma
   * câmera que teleporta a cada amostra) entrega 100%. Os 16% no meio são
   * cenas em que o rosto simplesmente ANDA mais do que 270 px de recorte
   * perdoam — e ali ficar parada não é contenção, é deixar o assunto sair do
   * quadro. Nenhuma escolha de posição única resolve; só movimento resolve.
   *
   * 0,9 = o pan dispara quando o rosto chega a 90% do caminho até a borda. A
   * folga é de propósito: esperar ele encostar exatamente na borda faria a
   * decisão depender de um pixel, e um pixel é menos que o erro do detector.
   * Reserva-se assim uma faixa de 10% em que a câmera ainda escolhe ficar
   * parada, que é a preferência — mover só quando parar custa o rosto.
   */
  folgaDaBorda: number;

  /**
   * Quanto tempo a câmera leva para executar uma correção dentro da cena
   * curta, em segundos.
   *
   * A correção é AGENDADA PARA TRÁS: sabendo em que amostra o rosto vai
   * escapar, a rampa começa este tanto antes dela e termina exatamente nela.
   * A câmera chega no lugar no instante em que o lugar passa a importar, em
   * vez de sair atrás depois do fato — que é o defeito que derrubou a
   * trajetória contínua para 58%.
   *
   * 0,4 s: rápido o bastante para caber numa cena de 1,6 s sem ocupar a cena
   * inteira, lento o bastante para ler como movimento de câmera e não como
   * corte. Coincide com o τ do filtro contínuo por construção — é a mesma
   * pergunta ("em quanto tempo uma câmera se reposiciona sem chamar
   * atenção?") respondida duas vezes.
   */
  rampaDaCorrecao_s: number;

  /**
   * O teto de velocidade da correção, em LARGURAS DE RECORTE por segundo.
   *
   * Sem este teto a correção acerta 100% das amostras — e o número é uma
   * armadilha. Medindo o movimento junto com a taxa, aquele 100% custava um
   * pico de 1193 px/s num recorte de 270 px: a imagem inteira atravessa a tela
   * 4,4 vezes por segundo. Isso não é câmera, é chicote, e apareceu no teste
   * de render como o rosto ficando MAIS perto da borda no pior caso (47,5%
   * contra 42,5% do crop fixo) mesmo com a média melhorando.
   *
   * A lição vale além daqui: uma métrica de acerto sem uma métrica de custo
   * leva o otimizador direto ao pior vídeo possível, porque teleportar acerta
   * sempre. As duas andam juntas a partir de agora.
   *
   * 1,0 = a câmera leva um segundo para percorrer uma largura de recorte. É o
   * pan de acompanhamento comum; acima disso lê como corte mal feito. Quando
   * a correção não cabe nessa velocidade dentro da cena, ela é ABANDONADA: um
   * rosto encostado na borda por meio segundo incomoda menos que um solavanco.
   */
  velocidadeDaCorrecao: number;
};

export const PADROES_POR_CENA: OpcoesTrajetoriaPorCena = {
  ...PADROES,
  cenaLonga_s: 2.0,
  minAmostrasParaSeguir: 4,
  saltoEpsilon_s: 0.001,
  folgaDaBorda: 0.9,
  rampaDaCorrecao_s: 0.4,
  velocidadeDaCorrecao: 1.0,
};

function limitar(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(v, max));
}

/**
 * A GARANTIA: passa por cima de uma trajetória pronta e conserta onde ela
 * deixa o rosto sair do quadro.
 *
 * POR QUE ISTO EXISTE, e por que vale para os três ramos da cena
 *
 * As duas primeiras tentativas de subir a taxa falharam de maneiras que
 * ensinaram a mesma coisa. Um pan reto do primeiro ao último rosto da cena não
 * mudou nada (79% antes e depois): uma reta ligando as pontas passa POR CIMA
 * das amostras do meio sem nenhuma obrigação de acertá-las. Corrigir só a cena
 * curta subiu para 81% e parou: a listagem amostra a amostra mostrou que
 * metade dos erros restantes era "a câmera não chegou" em CENA LONGA — onde o
 * ramo curto nem roda, e onde a panorâmica suavizada (que sozinha mede 58%)
 * estava chegando atrasada, exatamente o defeito que ela deveria ter deixado
 * para trás.
 *
 * A lição é que suavizar e enquadrar são objetivos DIFERENTES, e pedir os dois
 * ao mesmo filtro entrega mal os dois. Aqui eles ficam separados: cada ramo
 * decide o movimento que quer (parada, panorâmica, centro), e depois esta
 * função garante o resultado. Ela não substitui a trajetória — ela a emenda
 * nos pontos em que a trajetória perderia o assunto.
 *
 * COMO
 *
 * Anda amostra a amostra. Enquanto o rosto está dentro da folga, não toca em
 * nada — a estética escolhida pelo ramo sobrevive intacta. Quando o rosto
 * passaria da folga, insere uma rampa que TERMINA naquela amostra e começa
 * `rampaDaCorrecao_s` antes: a câmera chega no lugar no instante em que o
 * lugar passa a importar, em vez de sair atrás depois do fato.
 *
 * Os pontos inseridos caem exatamente sobre `t` de amostra, que é o que faz a
 * interpolação linear de `centroEm` acertar em vez de passar perto.
 */
function garantirEnquadramento(
  base: Ponto[],
  daCena: Amostra[],
  ini: number,
  meia: number,
  min: number,
  max: number,
  o: OpcoesTrajetoriaPorCena,
): Ponto[] {
  // O rosto em foco de cada amostra — `rostos.py` entrega ordenado por área,
  // então o primeiro válido é o principal.
  const foco = daCena
    .map((a) => ({
      t: a.t,
      r: escolherPrincipal(rostosValidos(a, o.confMinima)) ?? undefined,
    }))
    .filter((x): x is { t: number; r: Rosto } => x.r !== undefined)
    .sort((a, b) => a.t - b.t);
  if (foco.length === 0 || base.length === 0) return base;

  const seq = base.slice().sort((a, b) => a.t - b.t);

  /**
   * "DENTRO" É O ROSTO INTEIRO, não o centro dele.
   *
   * A primeira versão comparava só o centro do rosto com meia largura de
   * recorte, e isso deixa passar um rosto pela metade: com `meia` = 135 px, um
   * rosto de 80 px cujo centro está a 130 px da câmera é declarado dentro
   * enquanto sua borda está 35 px fora do quadro. O teste de render pegou
   * exatamente isso — três amostras seguidas em que o vídeo final não tinha
   * rosto detectável, num trecho que o diagnóstico dava como acerto. Régua que
   * discorda do vídeo entregue está errada, não o vídeo.
   *
   * Agora a margem desconta a largura do rosto. O piso existe para o caso
   * patológico do rosto maior que o próprio recorte (close extremo), em que
   * nenhuma posição cabe inteira e insistir só produziria correção perpétua.
   */
  const margemDe = (r: Rosto) =>
    Math.max(meia * 0.35, meia - Math.max(0, finito(r.w, 0)) / 2) *
    o.folgaDaBorda;

  for (let i = 0; i < foco.length; i++) {
    const { t, r } = foco[i];
    const c = centroDe(r);
    if (Math.abs(centroEm(seq, t) - c) <= margemDe(r)) continue;

    const destino = limitar(c, min, max);

    /**
     * O SALTO NA FRONTEIRA É DE GRAÇA — use antes de gastar movimento.
     *
     * Quando quem escapa é a PRIMEIRA amostra da cena, a resposta não é
     * atravessar o quadro num pan: é começar a cena já no lugar certo. Ali a
     * imagem inteira acabou de trocar, então reposicionar não custa nada ao
     * espectador, enquanto o pan custa tempo que a cena curta não tem — foi
     * assim que quatro correções morreram no teto de velocidade enquanto a
     * solução grátis estava disponível.
     *
     * Só vale para a primeira: mexer no início depois que amostras já foram
     * atendidas por ele seria tirar delas o que já tinham.
     */
    if (i === 0) {
      const depoisDoInicio = seq.filter((p) => p.t > ini);
      seq.length = 0;
      seq.push({ t: ini, centroX: destino }, ...depoisDoInicio);
      if (Math.abs(centroEm(seq, t) - c) <= margemDe(r)) continue;
    }

    // A rampa não pode recuar atrás de um ponto que já existe na trajetória —
    // reescrever o passado quebraria o que as amostras anteriores já ganharam.
    const ultimoAntes = seq.filter((p) => p.t < t).pop();
    const piso = Math.max(ultimoAntes ? ultimoAntes.t : ini, ini);

    /**
     * O TETO DE VELOCIDADE — ver `velocidadeDaCorrecao`.
     *
     * A rampa se alonga para trás até o movimento caber na velocidade
     * máxima. Como a posição de partida MUDA conforme a rampa recua (a
     * trajetória por baixo não é constante), o tempo necessário é estimado
     * uma vez, a rampa é reposicionada, e então a velocidade real do trecho
     * resultante é conferida. É essa última conferência que vale — as
     * anteriores são só a busca por um começo plausível.
     */
    const vMax = meia * 2 * o.velocidadeDaCorrecao;
    const tentativa = Math.max(piso, t - o.rampaDaCorrecao_s);
    const precisa = Math.abs(destino - centroEm(seq, tentativa)) / vMax;
    const comeco = Math.max(piso, t - Math.max(o.rampaDaCorrecao_s, precisa));

    const guardado = centroEm(seq, comeco);
    const janela = t - comeco;
    if (janela <= 0 || Math.abs(destino - guardado) / janela > vMax) continue;

    const antes = seq.filter((p) => p.t < comeco);
    const chegada = Math.max(t, comeco + 1e-3);

    /**
     * A VOLTA TAMBÉM É MOVIMENTO — e eu tinha limitado só a ida.
     *
     * Com a ida presa ao teto e a volta livre, a trajetória retomava o traçado
     * original no ponto seguinte por mais longe que ele estivesse. A medição
     * acusou pico de 440 px/s com o teto configurado em 270, e a violação
     * inteira estava aí. Um ponto que exigiria velocidade acima do teto é
     * descartado, e a câmera fica onde está até aparecer um alcançável.
     */
    const depois: Ponto[] = [];
    let ref: Ponto = { t: chegada, centroX: destino };
    for (const p of seq) {
      if (p.t <= chegada) continue;
      if (Math.abs(p.centroX - ref.centroX) / (p.t - ref.t) > vMax) continue;
      depois.push(p);
      ref = p;
    }

    seq.length = 0;
    seq.push(
      ...antes,
      { t: comeco, centroX: guardado },
      { t: chegada, centroX: destino },
      ...depois,
    );
  }

  return seq;
}

function finito(v: number, padrao: number): number {
  return Number.isFinite(v) ? v : padrao;
}

/**
 * Nada aqui: a pontuação é importada de `trajetoria.ts`.
 *
 * Havia uma CÓPIA desta fórmula neste arquivo, com o comentário dizendo que
 * era "a mesma pontuação". Era, até a original passar a considerar
 * frontalidade — e aí os dois lados do mesmo algoritmo passaram a discordar
 * sobre quem é o assunto, em silêncio: a posição da cena era escolhida pelo
 * rosto maior enquanto a correção perseguia o rosto frontal. Duas definições
 * de "principal" no mesmo cálculo não dão erro, dão uma câmera indecisa.
 */

function centroDe(r: Rosto): number {
  return finito(r.x, 0) + Math.max(0, finito(r.w, 0)) / 2;
}

function rostosValidos(a: Amostra, confMinima: number): Rosto[] {
  const rostos = Array.isArray(a.rostos) ? a.rostos : [];
  return rostos.filter(
    (r) =>
      r &&
      Number.isFinite(r.x) &&
      Number.isFinite(r.w) &&
      r.w > 0 &&
      finito(r.conf, 0) >= confMinima,
  );
}

function primeiroT(amostras: Amostra[]): number {
  let t = Infinity;
  for (const a of amostras) if (a && Number.isFinite(a.t) && a.t < t) t = a.t;
  return Number.isFinite(t) ? t : 0;
}

/**
 * A POSIÇÃO FIXA DE UMA CENA CURTA.
 *
 * A pergunta não é "onde está o rosto" — numa cena de 1,6 s há 3 ou 4 rostos
 * medidos, em lugares parecidos mas não iguais. A pergunta é: com a câmera
 * TRAVADA num único lugar, qual lugar deixa o maior número deles dentro do
 * recorte?
 *
 * Isso é exatamente o problema do ponto mais coberto por intervalos. Cada
 * rosto de centro `c` só aparece no corte se a câmera estiver em [c−meia,
 * c+meia] — um intervalo. Varrendo os extremos desses intervalos em ordem e
 * contando quantos estão abertos, o máximo da contagem é a resposta ótima, em
 * O(n log n). Não é heurística: é o ótimo da métrica que o A/B mede.
 *
 * POR QUE NÃO A MÉDIA. A média é puxada por qualquer rosto solto na borda do
 * quadro (uma pessoa de fundo, um falso positivo que passou da confiança) e
 * pode acabar num lugar onde NENHUM rosto está dentro — o pior resultado
 * possível, obtido otimizando a coisa errada.
 *
 * POR QUE NÃO SÓ A MEDIANA. A mediana é robusta mas ignora o tamanho do
 * recorte: com dois rostos a 900 px de distância ela para no meio, e o
 * recorte de 607 px não pega nenhum dos dois. Ela responde "onde está o
 * meio", e a pergunta é "onde cabe mais gente".
 *
 * A MEDIANA ENTRA DEPOIS, como desempate geométrico. O ótimo da varredura não
 * é um ponto, é uma FAIXA (todo o trecho em que a mesma contagem se mantém), e
 * a varredura devolve a borda esquerda dela. Ficar na borda é ficar a um pixel
 * de perder um rosto no primeiro tremor do detector. Então: mediana dos rostos
 * cobertos, presa dentro da faixa ótima. Fica no meio da mancha de rostos, com
 * folga dos dois lados, sem nunca sair do ótimo.
 *
 * Empate na contagem é resolvido pela SOMA DAS PONTUAÇÕES (largura ×
 * confiança): entre dois lugares que pegam 3 rostos cada, ganha o que pega os
 * rostos grandes e certos, não os pequenos e duvidosos.
 */
function posicaoFixaDaCena(
  amostras: Amostra[],
  confMinima: number,
  meia: number,
  min: number,
  max: number,
): number | null {
  /**
   * UM rosto por amostra — o assunto — e não todos os rostos do quadro.
   *
   * Contar todo mundo faz a varredura otimizar a coisa errada: numa cena com
   * quatro figurantes de um lado e o protagonista do outro, a posição que
   * "cobre mais rostos" aponta para os figurantes. E como `garantirEnquadramento`
   * persegue o assunto escolhido por `escolherPrincipal`, as duas metades do
   * algoritmo brigavam — uma escolhia o lugar pela multidão, a outra corrigia
   * em direção ao protagonista, e a câmera ficava indo e voltando.
   *
   * Uma amostra, um voto, do mesmo eleitor que o resto do código consulta.
   */
  const faces: Array<{ c: number; s: number }> = [];
  for (const a of amostras) {
    const r = escolherPrincipal(rostosValidos(a, confMinima));
    if (r) faces.push({ c: centroDe(r), s: pontuacao(r) });
  }
  if (faces.length === 0) return null;

  // Cada rosto vira o intervalo de câmeras que o enxergam, já preso ao curso
  // real do recorte — posição que a câmera não pode ocupar não é candidata.
  type Evento = { pos: number; conta: number; peso: number };
  const eventos: Evento[] = [];
  for (const f of faces) {
    const esq = limitar(f.c - meia, min, max);
    const dir = limitar(f.c + meia, min, max);
    if (dir < esq) continue;
    eventos.push({ pos: esq, conta: +1, peso: +f.s });
    eventos.push({ pos: dir, conta: -1, peso: -f.s });
  }
  if (eventos.length === 0) return null;

  // Entradas antes de saídas na mesma posição: os intervalos são FECHADOS, um
  // rosto que entra exatamente onde outro sai conta com ele.
  eventos.sort((a, b) => (a.pos === b.pos ? b.conta - a.conta : a.pos - b.pos));

  let conta = 0;
  let peso = 0;
  let melhorConta = -1;
  let melhorPeso = -Infinity;
  let melhorPos = limitar((min + max) / 2, min, max);

  let i = 0;
  while (i < eventos.length) {
    const pos = eventos[i].pos;
    // Todos os eventos desta posição antes de avaliar, senão a contagem lida
    // seria a de um instante que não existe.
    while (i < eventos.length && eventos[i].pos === pos) {
      conta += eventos[i].conta;
      peso += eventos[i].peso;
      i += 1;
    }
    if (conta > melhorConta || (conta === melhorConta && peso > melhorPeso)) {
      melhorConta = conta;
      melhorPeso = peso;
      melhorPos = pos;
    }
  }

  const cobertos = faces.filter((f) => Math.abs(f.c - melhorPos) <= meia + 1e-9);
  if (cobertos.length === 0) return melhorPos;

  const centros = cobertos.map((f) => f.c).sort((a, b) => a - b);
  const meio = centros.length >> 1;
  const mediana =
    centros.length % 2 === 1
      ? centros[meio]
      : (centros[meio - 1] + centros[meio]) / 2;

  // A faixa em que a contagem ótima se mantém, intersectada com o curso da
  // câmera. Contém `melhorPos` por construção, então nunca é vazia.
  let faixaEsq = min;
  let faixaDir = max;
  for (const f of cobertos) {
    faixaEsq = Math.max(faixaEsq, f.c - meia);
    faixaDir = Math.min(faixaDir, f.c + meia);
  }
  return limitar(mediana, faixaEsq, Math.max(faixaEsq, faixaDir));
}

/**
 * A trajetória, cena a cena.
 *
 * `cortes` são os instantes (em segundos, na MESMA base de tempo das amostras
 * — relativos ao clipe) em que a cena troca. Uma amostra em `t` pertence à
 * cena nova quando `t >= corte`: o frame amostrado exatamente no corte já é
 * imagem nova.
 *
 * SEM CORTE ÚTIL A FUNÇÃO DELEGA. Lista vazia, cortes fora do intervalo das
 * amostras, cortes repetidos — em todos esses casos o retorno é bit a bit o de
 * `planejarTrajetoria`. Não é preguiça, é o contrato: sem estrutura de cena
 * não há nada a explorar, e travar a câmera num clipe curto e SEM corte jogaria
 * fora justamente o material em que seguir rosto vale ouro. A regra da cena
 * curta existe por causa do CONTRASTE com a cena vizinha; sem vizinha, não se
 * aplica.
 *
 * COMO SE FAZ UM SALTO COM UMA LISTA DE PONTOS
 *
 * O contrato de leitura (`centroEm`, e a expressão de ffmpeg que o espelha) é
 * INTERPOLAÇÃO LINEAR. Emitir um ponto só na fronteira não produz salto:
 * produz uma rampa que começa no ponto anterior — ou seja, a câmera começaria
 * a andar ANTES do corte, o defeito de novo, agora de graça.
 *
 * A solução é emitir DOIS pontos coladinhos na fronteira:
 *
 *     { t: c − 0,001, centroX: valorDaCenaAntiga }
 *     { t: c,         centroX: valorDaCenaNova   }
 *
 * A interpolação entre eles é uma rampa de 1 ms, que a 30 fps nenhum frame
 * consegue amostrar — na prática, um degrau. Antes de `c−0,001` o valor é
 * constante e igual ao antigo; a partir de `c`, constante e igual ao novo.
 *
 * E É POR ISSO QUE A SAÍDA NÃO PASSA POR `simplificar()` NO FIM. O
 * Douglas–Peucker olha o desvio vertical contra a corda: num salto pequeno o
 * ponto de `c−0,001` desvia menos que a tolerância (≈ 6 px) e seria REMOVIDO —
 * transformando o degrau numa rampa espalhada por toda a cena vizinha, que é
 * exatamente o bug original ressuscitado por uma otimização. Cada cena longa
 * já sai simplificada de dentro de `planejarTrajetoria`; cena curta é um ponto
 * só. Não há o que economizar aqui, e há tudo a perder.
 */
export function planejarTrajetoriaPorCena(
  amostras: Amostra[],
  cortes: number[],
  fonte: Dimensoes,
  saida: Dimensoes,
  opcoes: Partial<OpcoesTrajetoriaPorCena> = {},
): Ponto[] {
  const o = { ...PADROES_POR_CENA, ...opcoes };

  const larguraCrop =
    o.larguraCrop && o.larguraCrop > 0
      ? o.larguraCrop
      : larguraDoCrop(fonte, saida);

  const { min, max } = limitesDoCentro(fonte, larguraCrop);
  const centroFonte = limitar(fonte.largura / 2, min, max);

  const entrada = Array.isArray(amostras) ? amostras : [];

  // Sem curso não há trajetória a planejar — mesma porta de saída da versão
  // contínua, e na mesma ordem, para as duas concordarem nos casos degenerados.
  if (larguraCrop <= 0 || min === max) {
    return [{ t: primeiroT(entrada), centroX: centroFonte }];
  }

  const limpas = entrada
    .filter((a) => a && Number.isFinite(a.t))
    .slice()
    .sort((a, b) => a.t - b.t);

  if (limpas.length === 0) return [{ t: 0, centroX: centroFonte }];

  // O que é repassado ao planejador contínuo dentro de cada cena longa. A
  // largura do recorte vai explícita para que a geometria seja a MESMA nos
  // dois caminhos, mesmo que o chamador tenha passado uma largura própria.
  const opcoesContinuo: Partial<OpcoesTrajetoria> = {
    larguraCrop,
    confMinima: o.confMinima,
    raioContinuidadeFracao: o.raioContinuidadeFracao,
    vantagemTroca: o.vantagemTroca,
    amostrasParaTrocar: o.amostrasParaTrocar,
    segurarSemRosto_s: o.segurarSemRosto_s,
    derivaAoCentro_s: o.derivaAoCentro_s,
    tau_s: o.tau_s,
    zonaMortaFracao: o.zonaMortaFracao,
    velocidadeMaxFracao: o.velocidadeMaxFracao,
    toleranciaFracao: o.toleranciaFracao,
  };

  const tPrimeiro = limpas[0].t;
  const tUltimo = limpas[limpas.length - 1].t;

  // Corte antes da primeira amostra abriria uma cena sem nenhuma evidência;
  // corte depois da última fecharia uma. Os dois são descartados: o que sobra
  // é o conjunto de cortes que de fato PARTE as amostras em dois pedaços.
  const cortesUteis = Array.from(
    new Set(
      (Array.isArray(cortes) ? cortes : []).filter(
        (c) => Number.isFinite(c) && c > tPrimeiro && c <= tUltimo,
      ),
    ),
  ).sort((a, b) => a - b);

  if (cortesUteis.length === 0) {
    return planejarTrajetoria(limpas, fonte, saida, opcoesContinuo);
  }

  const meia = larguraCrop / 2;
  const inicios = [tPrimeiro, ...cortesUteis];
  const pontos: Ponto[] = [];
  let ultimoX: number | null = null;

  for (let k = 0; k < inicios.length; k++) {
    const ini = inicios[k];
    const fim = k + 1 < inicios.length ? inicios[k + 1] : Infinity;
    const daCena = limpas.filter((a) => a.t >= ini && a.t < fim);
    const duracao = (k + 1 < inicios.length ? inicios[k + 1] : tUltimo) - ini;
    const comRosto = daCena.filter(
      (a) => rostosValidos(a, o.confMinima).length > 0,
    ).length;

    let daCenaPontos: Ponto[];

    if (comRosto === 0) {
      // CENA SEM ROSTO — inclui a cena que nem amostra tem (dois cortes mais
      // juntos que o período de amostragem). Centro da fonte, e NÃO a posição
      // herdada: o que estava na tela deixou de existir, insistir nele é
      // apostar na composição de um quadro que ninguém mediu.
      daCenaPontos = [{ t: ini, centroX: centroFonte }];
    } else if (duracao >= o.cenaLonga_s && comRosto >= o.minAmostrasParaSeguir) {
      // CENA LONGA — a maquinaria inteira, mas enxergando SÓ esta cena. Como
      // `planejarTrajetoria` nasce já enquadrada na primeira amostra, o começo
      // do segmento é o salto; daí em diante é a panorâmica de sempre.
      const p = planejarTrajetoria(daCena, fonte, saida, opcoesContinuo);
      daCenaPontos =
        p.length === 1
          ? [{ t: ini, centroX: p[0].centroX }]
          : p[0].t > ini
            ? [{ t: ini, centroX: p[0].centroX }, ...p]
            : p.slice();
    } else {
      // CENA CURTA — uma posição, escolhida pelo ótimo de cobertura, e fim.
      // Câmera parada numa cena de 1,5 s é o que um editor faria; qualquer
      // movimento aqui é a máquina se exibindo às custas do espectador. Se
      // parada custar o rosto, `garantirEnquadramento` conserta abaixo — e
      // só nesse caso.
      const fixa = posicaoFixaDaCena(daCena, o.confMinima, meia, min, max);
      daCenaPontos =
        fixa === null
          ? [{ t: ini, centroX: centroFonte }]
          : [{ t: ini, centroX: fixa }];
    }

    // A GARANTIA, aplicada aos três ramos acima.
    daCenaPontos = garantirEnquadramento(
      daCenaPontos,
      daCena,
      ini,
      meia,
      min,
      max,
      o,
    );

    // --- a costura: degrau, não rampa (ver o cabeçalho da função) ----------
    const primeiro = daCenaPontos[0];
    const anterior = pontos.length > 0 ? pontos[pontos.length - 1] : null;
    if (
      anterior !== null &&
      ultimoX !== null &&
      Math.abs(primeiro.centroX - ultimoX) > 1e-9
    ) {
      // O epsilon encolhe se a cena anterior terminou colada na fronteira —
      // o tempo tem que continuar estritamente crescente, sempre.
      const eps = Math.min(o.saltoEpsilon_s, (ini - anterior.t) / 2);
      if (eps > 0) pontos.push({ t: ini - eps, centroX: ultimoX });
    }

    for (const q of daCenaPontos) {
      const ultimo = pontos.length > 0 ? pontos[pontos.length - 1] : null;
      if (ultimo !== null && q.t <= ultimo.t) continue;
      pontos.push({ t: q.t, centroX: limitar(q.centroX, min, max) });
    }

    ultimoX = pontos[pontos.length - 1].centroX;
  }

  return pontos.length > 0 ? pontos : [{ t: tPrimeiro, centroX: centroFonte }];
}
