import { run, bin, Cancelado } from "../src/lib/proc";

/**
 * Detecção de corte de cena.
 *
 * POR QUE ISTO EXISTE
 *
 * O rastreamento de rosto reprovou no A/B — rosto dentro do recorte em 44%
 * das amostras contra 65% do crop central fixo — e a causa não era conta
 * errada. Era o MATERIAL: o vídeo de teste tem 19 cortes de cena em 30s, e a
 * trajetória suavizada trata toda troca de cena como MOVIMENTO. O rosto
 * teleporta de um lado ao outro do quadro, a suavização interpola a viagem, e
 * a câmera sai atrás — chega atrasada, e no lugar de onde a pessoa já saiu.
 *
 * Suavizar entre duas cenas diferentes é interpolar entre coisas que não têm
 * relação nenhuma. Este módulo diz ONDE isso acontece, pra a trajetória poder
 * REINICIAR em cada corte em vez de panoramizar por cima dele.
 *
 * COMO
 *
 * O `select` do ffmpeg já calcula, por frame, um score de quanto o quadro
 * mudou em relação ao anterior (`scene`). O `metadata=print` despeja o
 * `pts_time` dos frames que passaram do limiar. Não decodificamos nada em
 * resolução cheia: escalar pra 320px ANTES de analisar derruba o custo e não
 * tira nada da detecção — corte de cena é mudança de massa de pixel, não de
 * detalhe fino. Num 1080p de 30s a análise inteira sai em ~1,5s aqui (o custo
 * que sobra é decodificação, não a análise).
 */

/**
 * Largura da análise.
 *
 * Pequena de propósito, pelo mesmo motivo dos 160x90 de `medirQuadro`:
 * procuramos "o quadro inteiro virou outro", e isso sobrevive a qualquer
 * redução. Subir daqui só paga swscale mais caro.
 */
const LARGURA_ANALISE = 320;

/**
 * LIMIAR PADRÃO — e o que acontece ao errar pra cada lado.
 *
 * O score do `scene` vai de 0 a 1. Medido neste repo, em material sintético:
 *
 *   cor chapada parada ............ nenhum score acima de zero
 *   fade lento (6s preto→branco) .. máximo 0,010
 *   panorâmica rápida ............. máximo 0,040
 *   corte duro entre cenas ........ 0,400
 *
 * Ou seja: há uma vala funda entre "a cena mudou de aparência" e "a cena
 * mudou". 0,25 fica no meio da vala, e foi o valor que achou os 19 cortes do
 * trailer de 30s que derrubou o rastreamento.
 *
 * BAIXO DEMAIS (< ~0,10): entra mudança de iluminação, flash, panorâmica
 * rápida e corte de compressão. Cada falso positivo REINICIA a trajetória sem
 * necessidade — a câmera trava e destrava dentro de uma cena contínua, que é
 * justamente o movimento nervoso que o rastreamento existia pra evitar. O
 * material bom (podcast, câmera fixa) é o mais penalizado, porque nele todo
 * corte detectado é falso.
 *
 * ALTO DEMAIS (> ~0,45): perde corte entre cenas parecidas — plano e
 * contra-plano no mesmo cenário, mesma iluminação, mesma paleta. Aí volta o
 * problema original, só que intermitente: a maioria dos cortes reinicia e um
 * deles não, e a câmera faz a viagem fantasma naquele. Errar pra cima é mais
 * caro que errar pra baixo, porque o sintoma é raro e não reproduz.
 *
 * Configurável por LIMIAR_CENA pra dar pra medir em material próprio sem
 * recompilar (mesmo espírito do RASTREAR_ROSTO=1).
 */
export const LIMIAR_PADRAO = 0.25;

function limiarAtual(): number {
  const bruto = Number(process.env.LIMIAR_CENA);
  // Fora de (0,1) não é limiar de score, é engano de digitação: cai no padrão
  // em vez de desligar a detecção em silêncio.
  if (Number.isFinite(bruto) && bruto > 0 && bruto < 1) return bruto;
  return LIMIAR_PADRAO;
}

/**
 * Distância mínima entre dois cortes aceitos.
 *
 * Transição por dissolve não é um frame, é meio segundo de mistura — e vários
 * frames seguidos passam do limiar. Sem isto, UMA transição vira três ou
 * quatro "cortes" quase colados, e a trajetória reiniciaria em sequência.
 * Colapsamos a rajada no primeiro instante dela, que é onde a cena de fato
 * começou a trocar.
 */
const MINIMO_ENTRE_CORTES = 0.15;

/**
 * Instantes colados no início da janela são descartados.
 *
 * Um corte em t=0 não informa nada: a trajetória já nasce do zero ali. E é
 * exatamente onde um artefato apareceria, porque o primeiro frame depois do
 * seek não tem quadro anterior legítimo pra comparar.
 */
const INICIO_MORTO = 0.05;

/** Teto de tempo da análise, proporcional ao trecho e sempre limitado. */
function teto(duracao: number): number {
  return Math.min(Math.max(30_000, Math.round(duracao * 2_000)), 5 * 60_000);
}

/**
 * Os instantes de corte de cena dentro da janela, em segundos RELATIVOS a
 * `inicio_s`, em ordem.
 *
 * Vazio significa "nenhum corte", e isso é resposta BOA, não erro: câmera
 * fixa, podcast, entrevista — o material em que o rastreamento funciona bem
 * é justamente o que não tem corte nenhum.
 *
 * NUNCA LANÇA por falha do ffmpeg. Detecção de cena é refinamento de um
 * refinamento; derrubar o render por causa dela seria trocar o principal pelo
 * acessório, como em `prepararProxy`. A única exceção é o cancelamento — esse
 * sobe, porque não é falha nossa: é o dono mandando parar, e engolir viraria
 * o worker seguindo trabalho que ninguém mais quer (mesma regra de
 * `rastrearRosto`).
 */
export async function detectarCortesDeCena(
  video: string,
  inicio_s: number,
  fim_s: number,
  sinal?: AbortSignal,
): Promise<number[]> {
  const inicio = Math.max(0, inicio_s);
  const duracao = fim_s - inicio;
  if (!Number.isFinite(duracao) || duracao <= 0) return [];

  const limiar = limiarAtual();

  let saida: string;
  try {
    saida = await run(
      bin.ffmpeg(),
      [
        "-v", "error",
        // -ss ANTES do -i: busca no contêiner em vez de decodificar desde o
        // começo do vídeo. Também é o que faz o pts_time sair relativo (veja
        // a nota sobre offset mais abaixo).
        "-ss", inicio.toFixed(3),
        "-t", duracao.toFixed(3),
        "-i", video,
        // Áudio e legenda não têm cena. Decodificá-los é custo puro.
        "-an", "-sn",
        // Stream explícito: em contêiner com capa embutida ("attached pic"),
        // a escolha automática pode cair na imagem estática em vez do vídeo.
        "-map", "0:v:0",
        "-vf",
        `scale=${LARGURA_ANALISE}:-2,` +
          // As aspas simples são do parser de filtro do ffmpeg, não do shell
          // (spawn não usa shell): protegem a vírgula de gt(scene,X), que
          // senão seria lida como separador de filtro.
          `select='gt(scene,${limiar})',` +
          // file=- manda pro STDOUT. Sem isso o metadata escreve no log, que
          // sai em stderr misturado com aviso de decodificação e só aparece
          // em -v info — parse frágil por escolha nossa.
          `metadata=print:file=-`,
        // Nada é codificado: só queremos o efeito colateral do filtro.
        "-f", "null",
        "-",
      ],
      { timeoutMs: teto(duracao), sinal },
    );
  } catch (e) {
    if (e instanceof Cancelado) throw e;
    const motivo = e instanceof Error ? e.message.split("\n")[0] : String(e);
    console.log(
      `[worker] detecção de cena indisponível (${motivo}) — sigo sem cortes`,
    );
    return [];
  }

  return parsearCortes(saida, inicio, duracao);
}

/**
 * Extrai os instantes da saída do metadata=print.
 *
 * O formato é um par de linhas por frame selecionado:
 *
 *   frame:0    pts:25600   pts_time:2
 *   lavfi.scene_score=0.400000
 *
 * Só a primeira interessa — o score já cumpriu o papel dele no `select`.
 *
 * Separado da chamada de propósito: é a parte que quebra quando o ffmpeg muda
 * de formato, e assim dá pra exercitar sem gastar um processo.
 */
export function parsearCortes(
  saida: string,
  inicio: number,
  duracao: number,
): number[] {
  const brutos: number[] = [];
  for (const m of saida.matchAll(/^frame:\d+\s+pts:\S+\s+pts_time:(\S+)/gm)) {
    const t = Number(m[1]);
    // pts_time pode vir "N/A" em fluxo sem timestamp confiável.
    if (Number.isFinite(t)) brutos.push(t);
  }

  const cortes: number[] = [];
  for (const t of brutos.sort((a, b) => a - b)) {
    /**
     * OFFSET DO pts_time — medido, não suposto.
     *
     * Com -ss antes do -i, o ffmpeg desloca os timestamps e o pts_time chega
     * aqui RELATIVO ao início da janela. Confirmado na versão deste repo: um
     * vídeo com cortes em 2s e 4s, analisado com -ss 1.0, reportou 1 e 3.
     *
     * A rede abaixo existe porque um offset silencioso aqui deslocaria a
     * trajetória INTEIRA, e o sintoma seria "o rastreamento piorou de novo" —
     * indistinguível do bug que estamos consertando. Se alguma versão passar
     * a entregar absoluto, o instante cai fora da janela; em vez de descartar
     * (que é o que aconteceria de qualquer jeito), tentamos lê-lo como
     * absoluto antes de desistir.
     */
    let rel = t;
    if (rel > duracao && t - inicio >= 0 && t - inicio <= duracao) {
      rel = t - inicio;
    }

    if (rel <= INICIO_MORTO || rel > duracao) continue;
    // Rajada de dissolve: fica o primeiro instante, que é onde a troca
    // começou.
    if (cortes.length > 0 && rel - cortes[cortes.length - 1] < MINIMO_ENTRE_CORTES) {
      continue;
    }
    cortes.push(Number(rel.toFixed(3)));
  }

  return cortes;
}
