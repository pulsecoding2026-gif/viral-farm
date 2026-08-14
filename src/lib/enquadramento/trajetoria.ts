/**
 * De amostras de rosto (ruidosas, com buraco, com gente demais) para uma
 * trajetória de câmera que parece OPERADA POR ALGUÉM.
 *
 * A detecção é o problema fácil: o YuNet devolve caixas e pronto. O problema
 * difícil é o que vem depois — porque seguir o rosto literalmente, amostra a
 * amostra, produz exatamente o pior vídeo possível: um quadro que treme junto
 * com o erro do detector, salta entre duas pessoas conforme a confiança
 * oscila, e volta ao centro toda vez que alguém vira de costas. Isso não é
 * "rastreamento de rosto", é câmera de segurança.
 *
 * Um operador humano faz outra coisa: escolhe um assunto e FICA nele, ignora
 * mexidas pequenas, começa a panorâmica devagar quando a pessoa realmente
 * anda, e quando perde o assunto de vista espera um pouco antes de reagir.
 * Cada etapa aqui embaixo é uma dessas manias, escrita como conta.
 *
 * TUDO É PURO: sem I/O, sem ffmpeg, sem relógio. Entra `Amostra[]`, sai
 * `Ponto[]`. Quem consome (o construtor da expressão de crop) só precisa saber
 * interpolar linearmente entre os pontos — `centroEm()` é a referência
 * executável desse contrato.
 *
 * A ORDEM DAS ETAPAS NÃO É NEGOCIÁVEL, cada uma consome a saída da anterior:
 *
 *   1. escolher o rosto          quem é o assunto (com histerese)
 *   2. preencher os buracos      o que fazer quando não há rosto nenhum
 *   3. zona morta                mexida pequena não é ordem de mover
 *   4. suavizar (exponencial)    tira o tremor do detector
 *   5. limite de velocidade      a câmera não teleporta
 *   6. prender nas bordas        o recorte nunca sai da fonte
 *   7. simplificar               menos pontos, mesma trajetória
 *
 * Inverter 3 com 4 (suavizar antes da zona morta) é o erro clássico: a média
 * já mata o tremor, a zona morta não tem mais o que segurar, e a câmera passa
 * a deslizar sem parar — ela nunca fica REALMENTE parada, que é justamente o
 * que dá a sensação de tripé.
 */

export type Rosto = {
  x: number;
  y: number;
  w: number;
  h: number;
  conf: number;
  /**
   * 0 = perfil, 1 = olhando para a câmera. Vem dos landmarks do YuNet.
   * Opcional porque detecções gravadas antes deste campo existir continuam
   * válidas — sem ele a pontuação cai no comportamento anterior.
   */
  frontal?: number;
  /** Variância do Laplaciano na caixa. Só comparável DENTRO do mesmo frame. */
  nitidez?: number;
};
export type Amostra = { t: number; rostos: Rosto[] };
/** Centro do recorte, em PIXEL DA FONTE (não fração: quem consome é o crop). */
export type Ponto = { t: number; centroX: number };

export type Dimensoes = { largura: number; altura: number };

export type OpcoesTrajetoria = {
  /**
   * Largura do recorte em pixel da FONTE. Por padrão sai de
   * `larguraDoCrop()`, que é a mesma geometria do resto do editor.
   */
  larguraCrop: number;
  confMinima: number;
  raioContinuidadeFracao: number;
  vantagemTroca: number;
  amostrasParaTrocar: number;
  segurarSemRosto_s: number;
  derivaAoCentro_s: number;
  tau_s: number;
  zonaMortaFracao: number;
  velocidadeMaxFracao: number;
  toleranciaFracao: number;
};

/**
 * Os números, e o porquê de cada um.
 *
 * Quase todos são FRAÇÃO DA LARGURA DO RECORTE, não pixel. O recorte é a
 * unidade que o espectador enxerga: "moveu 40 px" não quer dizer nada, "moveu
 * 8% da tela" quer. Assim os mesmos valores servem para uma fonte 720p e para
 * uma 4K sem recalibrar nada.
 */
export const PADROES: OpcoesTrajetoria = {
  /** Sem valor útil: é sempre derivada da fonte e da saída. */
  larguraCrop: 0,

  /**
   * Detecção abaixo disso é descartada. O YuNet entrega 0,8–0,99 em rosto de
   * verdade e 0,3–0,5 em textura que lembra rosto (padrão de camisa, quadro na
   * parede). 0,4 corta o lixo sem perder o rosto de perfil, que é fraco mas
   * real — e perder o perfil é pior do que aceitá-lo, porque é exatamente
   * quando a pessoa está virando que a câmera precisa acompanhar.
   */
  confMinima: 0.4,

  /**
   * Raio de continuidade: o quanto o alvo pode ter andado de uma amostra para
   * a outra e ainda ser "a mesma pessoa". Meia largura de recorte é generoso
   * de propósito — a 4 amostras/s, atravessar isso exigiria correr. O que cai
   * fora do raio não é movimento, é CORTE DE CÂMERA, e corte não se persegue.
   */
  raioContinuidadeFracao: 0.5,

  /**
   * Vantagem mínima do desafiante para valer a pena trocar de assunto. 1,4 =
   * "40% mais rosto". Duas pessoas lado a lado na mesma distância ficam em
   * torno de 1,0–1,15 e nunca disparam troca, que é o objetivo: é essa margem
   * que impede a câmera de pingar entre os dois participantes de uma
   * entrevista.
   */
  vantagemTroca: 1.4,

  /**
   * ...e por quantas amostras SEGUIDAS. Uma amostra é ruído; três seguidas é
   * fato. A 4 amostras/s isso custa 0,75 s de atraso para assumir quem entrou
   * — imperceptível no corte final, e o preço de nunca reagir a um pico solto
   * do detector.
   */
  amostrasParaTrocar: 3,

  /**
   * Sem rosto nenhum, quanto tempo a câmera SEGURA a última posição. 0,6 s
   * cobre com folga o caso comum (a pessoa virou a cabeça, passou a mão na
   * frente, o detector piscou) sem que nada aconteça na tela. Congelar para
   * sempre seria pior: em corte de câmera o quadro ficaria parado num lugar
   * que não existe mais.
   */
  segurarSemRosto_s: 0.6,

  /**
   * ...e depois de segurar, quanto tempo leva a deriva até o centro. 2,5 s é
   * lento o bastante para o olho não registrar como movimento de câmera — lê
   * como enquadramento neutro voltando sozinho. O centro é o destino porque é
   * a aposta menos errada quando não se sabe nada: qualquer outro lugar seria
   * apostar na composição de um quadro que ninguém mediu.
   */
  derivaAoCentro_s: 2.5,

  /**
   * Constante de tempo do filtro exponencial: em `tau` a câmera cobre 63% da
   * distância até o alvo, em 3·tau cobre 95%. 0,4 s foi escolhido pela ponta
   * ruim dos dois lados — abaixo de ~0,25 s o tremor do detector volta a
   * aparecer, acima de ~0,6 s a câmera visivelmente "corre atrás" de quem
   * anda, que é o defeito mais denunciador de todos.
   */
  tau_s: 0.4,

  /**
   * Zona morta: enquanto o rosto estiver a menos disso do alvo atual, a câmera
   * NÃO MEXE. 8% da largura do recorte ≈ 8% da tela — a faixa em que um
   * apresentador gesticula, balança o corpo e muda de apoio sem sair do lugar.
   * É o parâmetro que mais decide se o resultado parece tripé ou parece
   * alguém nervoso segurando o celular.
   */
  zonaMortaFracao: 0.08,

  /**
   * Teto de velocidade, em larguras de recorte por segundo. 0,4 = a câmera
   * leva 2,5 s para varrer uma tela inteira. Panorâmica mais rápida que isso
   * lê como falha/tranco; mais lenta perde quem anda de verdade. O filtro
   * exponencial já respeita esse teto sozinho no uso normal — o limite existe
   * para o caso extremo (troca de assunto, volta depois de um buraco longo),
   * onde sem ele o alvo saltaria 800 px de uma vez.
   */
  velocidadeMaxFracao: 0.4,

  /**
   * Tolerância da simplificação: 1% da largura do recorte (≈ 6 px numa fonte
   * 1080p, ≈ 11 px depois de ampliar para 1080 de saída). Está abaixo do que
   * o olho distingue num movimento de câmera e derruba a contagem de pontos
   * em uma ordem de grandeza — e a expressão de ffmpeg cresce LINEARMENTE com
   * o número de pontos, sendo avaliada a cada frame.
   */
  toleranciaFracao: 0.01,
};

function limitar(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(v, max));
}

function finito(v: number, padrao: number): number {
  return Number.isFinite(v) ? v : padrao;
}

/** Aceleração e frenagem suaves nas pontas — usada só na deriva ao centro. */
function suavizar(f: number): number {
  return f * f * (3 - 2 * f);
}

/**
 * Largura, em pixel da FONTE, da janela que o recorte enxerga.
 *
 * Mesma geometria de `janelaVisivel()` em `src/lib/editor/enquadrar-calc.ts`:
 * a escala que COBRE o quadro de saída, e a janela é o que sobra da fonte
 * depois dela. Numa fonte 1920×1080 indo para 1080×1920 dá 607,5 px — e não
 * 1080, que é o erro tentador: 1080 px de recorte com 1080 px de altura seria
 * um quadrado, não um 9:16.
 *
 * Isso importa porque é essa largura que define o limite das bordas. Usar
 * 1080 aqui não estouraria a fonte (seria conservador demais), mas jogaria
 * fora ~240 px de curso útil de cada lado — ou seja, a câmera bateria numa
 * parede invisível bem antes da borda real do vídeo.
 */
export function larguraDoCrop(fonte: Dimensoes, saida: Dimensoes): number {
  if (
    !(fonte.largura > 0) ||
    !(fonte.altura > 0) ||
    !(saida.largura > 0) ||
    !(saida.altura > 0)
  ) {
    return 0;
  }
  const cobrir = Math.max(
    saida.largura / fonte.largura,
    saida.altura / fonte.altura,
  );
  return Math.min(fonte.largura, saida.largura / cobrir);
}

/**
 * Faixa em que o centro do recorte pode passear sem deixar faixa vazia.
 *
 * Quando a janela é tão larga quanto a fonte (fonte já vertical, ou zoom
 * nenhum a fazer) não há curso nenhum: os dois limites colapsam no meio, e a
 * trajetória inteira vira uma constante. É o comportamento certo — melhor uma
 * câmera travada no centro do que uma que insiste em mostrar borda preta.
 */
export function limitesDoCentro(
  fonte: Dimensoes,
  larguraCrop: number,
): { min: number; max: number } {
  const meia = larguraCrop / 2;
  const min = meia;
  const max = fonte.largura - meia;
  if (!(max > min)) {
    const centro = fonte.largura / 2;
    return { min: centro, max: centro };
  }
  return { min, max };
}

/**
 * "Quanto rosto" cada detecção oferece: largura × confiança × estar de frente.
 *
 * Largura (e não área) porque só o eixo X é rastreado, e porque a altura da
 * caixa do YuNet varia com a inclinação da cabeça de um jeito que a largura
 * não varia. Confiança entra multiplicando para que um rosto grande e duvidoso
 * não ganhe automaticamente de um pequeno e certo.
 *
 * A FRONTALIDADE ENTROU DEPOIS, e por um erro visível no vídeo entregue.
 *
 * Com largura × confiança apenas, o maior rosto vencia sempre — e num plano
 * over-the-shoulder o maior rosto é o ator de costas em primeiro plano, não o
 * assunto da cena. Extraindo o frame renderizado dava para ver os dois lados do
 * erro no mesmo instante: o crop fixo enquadrava a atriz em foco, e o
 * rastreamento tinha ido atrás de uma nuca escura e desfocada, que era maior.
 * Uma métrica que aprova isso está medindo tamanho e chamando de importância.
 *
 * O peso não zera o perfil: alguém falando de lado continua sendo o assunto, e
 * um rosto três vezes maior ainda ganha de um frontal pequeno. Ele só desempata
 * quando os tamanhos são comparáveis — que é exatamente o caso do
 * over-the-shoulder.
 *
 * `nitidez` NÃO entra aqui de propósito: ela só é comparável entre rostos do
 * mesmo frame, e esta função pontua um rosto isoladamente. Quem compara rostos
 * de um frame é `escolherPrincipal`.
 */
const PESO_PERFIL = 0.45;

export function pontuacao(r: Rosto): number {
  const base =
    Math.max(0, finito(r.w, 0)) * limitar(finito(r.conf, 0), 0, 1);
  if (r.frontal === undefined) return base;
  return base * (PESO_PERFIL + (1 - PESO_PERFIL) * limitar(finito(r.frontal, 1), 0, 1));
}

/**
 * Qual dos rostos deste frame é O ASSUNTO.
 *
 * Aqui a nitidez pode entrar, porque há com quem comparar: numa cena com
 * profundidade de campo o assunto está em foco e o primeiro plano borrado, e
 * essa diferença dentro do mesmo frame é grande e confiável — bem mais do que o
 * valor absoluto da variância, que muda com iluminação e textura.
 *
 * Rosto desfocado não é descartado, só descontado: em plano aberto tudo pode
 * estar meio mole, e ali o desconto se aplica por igual e não muda nada.
 */
/**
 * Menor rosto que pode ser considerado O ASSUNTO, como fração da largura da
 * fonte.
 *
 * Isto não é sobre o detector errar — o YuNet acha rosto de 10 px e costuma
 * estar certo. É sobre o que aquele rosto SIGNIFICA. Numa cena real medida
 * aqui, a primeira amostra trazia um único rosto de 23 px num quadro de
 * 854 px: uma pessoa lá no fundo da cozinha. A trajetória nasce ancorada na
 * primeira amostra, então ela começava apontada para essa figura distante e
 * gastava a cena inteira viajando de volta para o assunto de verdade, sem
 * nunca chegar por causa do teto de velocidade.
 *
 * 4% da largura: num vídeo de 854 px são 34 px, e num de 1920 são 77. Abaixo
 * disso a pessoa é cenário. Rostos pequenos continuam contando para "há
 * alguém em cena" — o que eles não podem é MANDAR na câmera.
 */
export const MENOR_ASSUNTO_FRACAO = 0.04;

export function assuntoPlausivel(r: Rosto, larguraFonte: number): boolean {
  if (!(larguraFonte > 0)) return true;
  return Math.max(0, finito(r.w, 0)) >= larguraFonte * MENOR_ASSUNTO_FRACAO;
}

export function notaNoFrame(r: Rosto, rostos: Rosto[]): number {
  const focoMax = Math.max(
    0,
    ...rostos.map((q) => Math.max(0, finito(q.nitidez ?? 0, 0))),
  );
  // Sem nitidez medida, o fator é 1 e a decisão volta a ser só a pontuação.
  const relativo =
    focoMax > 0 ? Math.max(0, finito(r.nitidez ?? 0, 0)) / focoMax : 1;
  return pontuacao(r) * (0.5 + 0.5 * relativo);
}

export function escolherPrincipal(rostos: Rosto[]): Rosto | null {
  if (rostos.length === 0) return null;
  if (rostos.length === 1) return rostos[0];
  return rostos.reduce((a, b) =>
    notaNoFrame(b, rostos) > notaNoFrame(a, rostos) ? b : a,
  );
}

function centroDe(r: Rosto): number {
  return finito(r.x, 0) + Math.max(0, finito(r.w, 0)) / 2;
}

type Alvo = { centroX: number; largura: number };
/** Candidato a roubar o assunto, e há quantas amostras seguidas ele insiste. */
type Desafiante = { centroX: number; contagem: number };

/**
 * A trajetória completa.
 *
 * Devolve pelo menos um ponto SEMPRE (mesmo sem amostra nenhuma), para que
 * quem consome nunca precise tratar lista vazia — um único ponto significa
 * "câmera parada aqui o vídeo inteiro".
 */
export function planejarTrajetoria(
  amostras: Amostra[],
  fonte: Dimensoes,
  saida: Dimensoes,
  opcoes: Partial<OpcoesTrajetoria> = {},
): Ponto[] {
  const o = { ...PADROES, ...opcoes };

  const larguraCrop =
    o.larguraCrop && o.larguraCrop > 0
      ? o.larguraCrop
      : larguraDoCrop(fonte, saida);

  const { min, max } = limitesDoCentro(fonte, larguraCrop);
  const centroFonte = limitar(fonte.largura / 2, min, max);

  // Sem curso não há trajetória a planejar: qualquer conta daria no mesmo.
  if (larguraCrop <= 0 || min === max) {
    return [{ t: primeiroT(amostras), centroX: centroFonte }];
  }

  const zonaMorta = o.zonaMortaFracao * larguraCrop;
  const velocidadeMax = o.velocidadeMaxFracao * larguraCrop;
  const raioContinuidade = o.raioContinuidadeFracao * larguraCrop;
  const tolerancia = o.toleranciaFracao * larguraCrop;

  const limpas = amostras
    .filter((a) => a && Number.isFinite(a.t))
    .slice()
    .sort((a, b) => a.t - b.t);

  if (limpas.length === 0) return [{ t: 0, centroX: centroFonte }];

  // ---- estado do rastreio -------------------------------------------------
  let alvo: Alvo | null = null;
  let desafiante: Desafiante | null = null;
  let ultimoVistoT: number | null = null;
  let ultimoVistoX = centroFonte;

  // ---- estado da câmera ---------------------------------------------------
  /** Alvo já filtrado pela zona morta: é ele que a suavização persegue. */
  let alvoCamera = 0;
  let camera = 0;
  let tAnterior = 0;
  let iniciada = false;

  const brutos: Ponto[] = [];

  for (const amostra of limpas) {
    const t = amostra.t;
    if (iniciada && t <= tAnterior) continue; // amostra repetida/fora de ordem

    const validos = (Array.isArray(amostra.rostos) ? amostra.rostos : []).filter(
      (r) =>
        r &&
        Number.isFinite(r.x) &&
        Number.isFinite(r.w) &&
        r.w > 0 &&
        finito(r.conf, 0) >= o.confMinima,
    );

    // Gente do tamanho de cenário não manda na câmera — ver MENOR_ASSUNTO_FRACAO.
    // Se TODO MUNDO no quadro é pequeno, então é um plano aberto e o maiorzinho
    // deles é o assunto que há; descartar todos deixaria a câmera cega.
    const grandes = validos.filter((r) => assuntoPlausivel(r, fonte.largura));
    const rostos = grandes.length > 0 ? grandes : validos;

    // === 1. ESCOLHER O ROSTO ==============================================
    //
    // A regra em uma frase: CONTINUIDADE VENCE, e só perde depois de ser
    // desmentida várias vezes seguidas.
    //
    //   a) "continuador" = o rosto mais próximo do alvo anterior, dentro do
    //      raio de continuidade. Se existe, é ele o alvo — mesmo que outro
    //      esteja maior nesta amostra.
    //   b) o melhor pontuado que NÃO é o continuador vira "desafiante", e só
    //      conta se estiver `vantagemTroca` acima dele.
    //   c) o desafiante precisa ser O MESMO (perto de si mesmo entre amostras)
    //      e insistir por `amostrasParaTrocar` seguidas. Qualquer amostra em
    //      que ele suma, encolha ou mude de lugar zera a contagem.
    //
    // Sem (c), um pico de confiança de uma amostra bastaria para jogar a
    // câmera na outra pessoa e trazer de volta na amostra seguinte — o famoso
    // ping-pong, que é pior do que enquadrar a pessoa errada o tempo todo.
    let observado: number | null = null;

    if (rostos.length > 0) {
      /**
       * `escolherPrincipal`, e não o máximo de `pontuacao`.
       *
       * A diferença é a nitidez, que só existe comparando rostos do MESMO
       * frame e por isso não cabe dentro de `pontuacao`. Ela decide
       * exatamente o caso que estava errado no vídeo entregue: no frame de
       * 24 s, o ator em primeiro plano mede 179 px de largura com nitidez
       * 3,4, e a atriz em foco mede 100 px com nitidez 32,9 — dez vezes mais
       * nítida. Por `pontuacao` sozinha o primeiro plano ganhava e a câmera
       * ia para a nuca dele; comparando o foco dentro do frame, ganha ela.
       */
      const melhor = escolherPrincipal(rostos) as Rosto;

      if (alvo === null) {
        // Sem histórico não há continuidade a preservar: pega o mais evidente.
        alvo = { centroX: centroDe(melhor), largura: melhor.w };
        desafiante = null;
        observado = alvo.centroX;
      } else {
        const alvoAtual = alvo;
        const raio = Math.max(raioContinuidade, 2 * alvoAtual.largura);
        let continuador: Rosto | null = null;
        let menorDist = Infinity;
        for (const r of rostos) {
          const d = Math.abs(centroDe(r) - alvoAtual.centroX);
          if (d <= raio && d < menorDist) {
            menorDist = d;
            continuador = r;
          }
        }

        const desafiaComVantagem =
          melhor !== continuador &&
          // Mesma nota que elegeu `melhor`: comparar por uma régua e trocar
          // por outra deixaria a troca acontecer contra a própria escolha.
          (continuador === null ||
            notaNoFrame(melhor, rostos) >=
              o.vantagemTroca * notaNoFrame(continuador, rostos));

        if (desafiaComVantagem) {
          const cx = centroDe(melhor);
          // Mesmo desafiante de antes? Se pulou de lugar, é outra pessoa (ou
          // ruído) e a contagem recomeça do zero.
          let contagem = 1;
          if (
            desafiante !== null &&
            Math.abs(cx - desafiante.centroX) <= raioContinuidade
          ) {
            contagem = desafiante.contagem + 1;
          }
          desafiante = { centroX: cx, contagem };
        } else {
          desafiante = null;
        }

        if (desafiante !== null && desafiante.contagem >= o.amostrasParaTrocar) {
          alvo = { centroX: centroDe(melhor), largura: melhor.w };
          desafiante = null;
          observado = alvo.centroX;
        } else if (continuador !== null) {
          alvo = { centroX: centroDe(continuador), largura: continuador.w };
          observado = alvo.centroX;
        } else {
          // Há rostos, mas nenhum é o nosso e nenhum convenceu ainda: trata
          // como amostra vazia (segura a posição) em vez de saltar.
          observado = null;
        }
      }
    }

    // === 2. AMOSTRA VAZIA =================================================
    //
    // Três regimes, nesta ordem:
    //
    //   SEGURA (até `segurarSemRosto_s`) — o buraco curto é quase sempre
    //   falha do detector, não do mundo. Voltar ao centro aqui produziria o
    //   pior artefato do sistema: a câmera indo e voltando a cada piscada.
    //
    //   DERIVA (nos `derivaAoCentro_s` seguintes) — a ausência já é longa
    //   demais para ser ruído. Como não há informação nenhuma, o centro é o
    //   enquadramento menos errado; a lentidão é o que impede que isso pareça
    //   um movimento intencional para lugar nenhum.
    //
    //   ESQUECE — passado o tempo de segurar, o alvo antigo deixa de existir.
    //   Quem aparecer depois é assumido na hora, sem as 3 amostras de
    //   confirmação: depois de um segundo sem ninguém, não há continuidade a
    //   proteger, e exigir confirmação só atrasaria o reenquadramento.
    if (observado === null) {
      if (ultimoVistoT === null) {
        observado = centroFonte;
      } else {
        const decorrido = t - ultimoVistoT;
        if (decorrido <= o.segurarSemRosto_s) {
          observado = ultimoVistoX;
        } else {
          if (alvo !== null) {
            alvo = null;
            desafiante = null;
          }
          const f = suavizar(
            limitar((decorrido - o.segurarSemRosto_s) / o.derivaAoCentro_s, 0, 1),
          );
          observado = ultimoVistoX + (centroFonte - ultimoVistoX) * f;
        }
      }
    } else {
      ultimoVistoT = t;
      ultimoVistoX = observado;
    }

    // Primeira amostra: a câmera JÁ NASCE enquadrada. Começar do centro e
    // deslizar até o rosto colocaria um movimento de câmera no primeiro
    // segundo de todo vídeo — o lugar onde ele mais chama atenção.
    if (!iniciada) {
      alvoCamera = observado;
      camera = limitar(observado, min, max);
      tAnterior = t;
      iniciada = true;
      brutos.push({ t, centroX: camera });
      continue;
    }

    const dt = t - tAnterior;

    // === 3. ZONA MORTA ====================================================
    //
    // O alvo só anda pelo EXCESSO além da zona, nunca pelo deslocamento
    // inteiro. Essa diferença é o detalhe que faz a técnica funcionar: ao sair
    // da zona a câmera parte do repouso, com velocidade zero. Se o alvo
    // saltasse para o rosto de uma vez, cada saída da zona daria um tranco de
    // ~50 px — exatamente o defeito que a zona morta existe para evitar.
    const desvio = observado - alvoCamera;
    if (Math.abs(desvio) > zonaMorta) {
      alvoCamera += desvio - Math.sign(desvio) * zonaMorta;
    }

    // === 4. SUAVIZAR ======================================================
    //
    // Filtro exponencial (EMA), não média móvel. Três motivos:
    //
    //   - As amostras NÃO são uniformes. O detector pula frames em cena
    //     escura, e a análise pode ser mais densa na fala do que no silêncio.
    //     Média móvel de N amostras teria janela temporal variável — mais
    //     suave quando as amostras estão juntas, mais nervosa quando estão
    //     esparsas. Aqui α = 1 − e^(−Δt/τ) faz o comportamento depender do
    //     TEMPO, não da contagem.
    //   - A média móvel atrasa metade da janela por igual; a exponencial
    //     responde forte no começo do movimento e vai frenando. Isso é
    //     literalmente o perfil de uma panorâmica humana.
    //   - Estado O(1), sem buffer, sem borda a tratar no começo e no fim.
    //
    // Bônus de robustez: depois de um buraco longo (Δt grande) α → 1 e o
    // filtro deixa de suavizar. Quem segura o tranco nesse caso é a etapa 5.
    const alfa = dt > 0 ? 1 - Math.exp(-dt / o.tau_s) : 1;
    let proxima = camera + (alvoCamera - camera) * alfa;

    // === 5. LIMITE DE VELOCIDADE ==========================================
    const passoMax = velocidadeMax * Math.max(dt, 0);
    const passo = proxima - camera;
    if (Math.abs(passo) > passoMax) {
      proxima = camera + Math.sign(passo) * passoMax;
    }

    // === 6. PRENDER NAS BORDAS ============================================
    //
    // O corte é feito no valor FINAL e o estado do filtro guarda o valor já
    // preso (e não o desejado). Sem isso o filtro "enrola" contra a parede:
    // com o alvo fora da borda por 3 s, a câmera demoraria outros 3 s para
    // desgrudar quando o alvo voltasse, parecendo travada.
    camera = limitar(proxima, min, max);
    tAnterior = t;
    brutos.push({ t, centroX: camera });
  }

  // === 7. SIMPLIFICAR =====================================================
  return simplificar(brutos, tolerancia);
}

function primeiroT(amostras: Amostra[]): number {
  let t = Infinity;
  for (const a of amostras) if (a && Number.isFinite(a.t) && a.t < t) t = a.t;
  return Number.isFinite(t) ? t : 0;
}

/**
 * Douglas–Peucker com distância VERTICAL.
 *
 * A versão de livro usa distância perpendicular, e aqui isso estaria errado:
 * os eixos têm unidades diferentes (segundo e pixel), então "perpendicular"
 * dependeria da escala arbitrária com que se desenha o gráfico. O erro que
 * importa é o único que o espectador pode ver — quantos pixels a câmera
 * simplificada está longe de onde deveria estar NAQUELE instante.
 *
 * Isso dá uma garantia forte e fácil de testar: para todo t, o desvio entre a
 * trajetória simplificada e a original é ≤ tolerância. E como só removemos
 * pontos, cada segmento resultante é uma média ponderada dos trechos que
 * substituiu — o que preserva de graça as duas propriedades da etapa anterior:
 * monotonicidade e teto de velocidade.
 *
 * Iterativo (pilha explícita) porque a versão recursiva degenera para
 * profundidade O(n) numa trajetória monotônica, que é o caso comum aqui.
 */
export function simplificar(pontos: Ponto[], tolerancia: number): Ponto[] {
  if (pontos.length <= 2) {
    // Dois pontos com o mesmo valor são um valor só. Devolver a constante
    // deixa a expressão de ffmpeg virar um número em vez de uma interpolação.
    if (
      pontos.length === 2 &&
      Math.abs(pontos[1].centroX - pontos[0].centroX) <= tolerancia
    ) {
      return [pontos[0]];
    }
    return pontos.slice();
  }

  const manter = new Array<boolean>(pontos.length).fill(false);
  manter[0] = true;
  manter[pontos.length - 1] = true;

  const pilha: Array<[number, number]> = [[0, pontos.length - 1]];
  while (pilha.length > 0) {
    const par = pilha.pop();
    if (!par) break;
    const [ini, fim] = par;
    if (fim - ini < 2) continue;

    const a = pontos[ini];
    const b = pontos[fim];
    const dt = b.t - a.t;
    let pior = -1;
    let maior = 0;

    for (let i = ini + 1; i < fim; i++) {
      const p = pontos[i];
      const naReta =
        dt === 0
          ? a.centroX
          : a.centroX + (b.centroX - a.centroX) * ((p.t - a.t) / dt);
      const d = Math.abs(p.centroX - naReta);
      if (d > maior) {
        maior = d;
        pior = i;
      }
    }

    if (pior >= 0 && maior > tolerancia) {
      manter[pior] = true;
      pilha.push([ini, pior], [pior, fim]);
    }
  }

  const saida = pontos.filter((_, i) => manter[i]);
  if (
    saida.length === 2 &&
    Math.abs(saida[1].centroX - saida[0].centroX) <= tolerancia
  ) {
    return [saida[0]];
  }
  return saida;
}

/**
 * O contrato de leitura: interpolação linear, segurando as pontas.
 *
 * Quem for montar a expressão de ffmpeg tem que reproduzir EXATAMENTE isto,
 * senão a simplificação passa a mentir. Deixar a referência aqui, em código
 * executável, é mais barato do que descobrir a divergência olhando um MP4.
 */
export function centroEm(pontos: Ponto[], t: number): number {
  if (pontos.length === 0) return 0;
  if (pontos.length === 1 || t <= pontos[0].t) return pontos[0].centroX;
  const ultimo = pontos[pontos.length - 1];
  if (t >= ultimo.t) return ultimo.centroX;

  // Busca binária: a expressão pode ser avaliada milhares de vezes num teste.
  let lo = 0;
  let hi = pontos.length - 1;
  while (hi - lo > 1) {
    const meio = (lo + hi) >> 1;
    if (pontos[meio].t <= t) lo = meio;
    else hi = meio;
  }
  const a = pontos[lo];
  const b = pontos[hi];
  const dt = b.t - a.t;
  if (dt <= 0) return a.centroX;
  return a.centroX + (b.centroX - a.centroX) * ((t - a.t) / dt);
}
