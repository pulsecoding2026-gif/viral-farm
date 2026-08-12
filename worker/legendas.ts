import type { Palavra } from "./transcritor";
import larguras from "../src/lib/larguras-fonte.json";
import { acharFormato, type Formato } from "../src/lib/formatos";

/**
 * Legenda animada em formato ASS, queimada no vídeo pelo FFmpeg.
 *
 * O estilo não é mais um punhado de constantes: vem do FORMATO escolhido
 * (src/lib/formatos.ts), que traz tipografia, cores de destaque, número de
 * linhas e — o mais importante — a SAFE ZONE das plataformas.
 *
 * A safe zone é o que separa legenda amadora de legenda profissional: o
 * TikTok cobre o rail direito (22% da largura) com curtir/comentar/salvar e
 * a barra inferior (14%) com @usuário e áudio. Legenda centralizada no
 * quadro inteiro fica PARCIALMENTE ESCONDIDA no app — mesmo estando linda
 * no preview.
 *
 * Cores em ASS são &HAABBGGRR (alpha + BGR invertido), não #RRGGBB.
 */

/** Quadro de referência do render. */
const LARGURA = 1080;
const ALTURA = 1920;

/** #RRGGBB → &H00BBGGRR do ASS. */
function corAss(hex: string): string {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return "&H00FFFFFF";
  const r = h.slice(0, 2);
  const g = h.slice(2, 4);
  const b = h.slice(4, 6);
  return `&H00${b}${g}${r}`.toUpperCase();
}

/** "6 px #000000" → 6. Aceita "0" e vazio. */
function espessura(stroke: string): number {
  const m = /(\d+(?:\.\d+)?)/.exec(stroke ?? "");
  return m ? Number(m[1]) : 0;
}

/**
 * A cor de ANTES de a palavra ser dita, no karaokê.
 *
 * O ASS pinta cada sílaba de secundária → primária conforme o \k avança. A
 * secundária estava fixa em branco, e como quase todo preset tem legenda
 * branca a transição virava branco → branco: INVISÍVEL. Resultado: nenhum
 * preset "word-by-word" acendia palavra por palavra — a frase inteira
 * aparecia pronta, e os 15 formatos ficavam indistinguíveis nesse ponto.
 *
 * Escurecer a própria cor (em vez de usar cinza fixo) preserva a identidade
 * do preset: o Dark Luxury acende dourado sobre dourado apagado, não sobre
 * cinza.
 */
function corApagada(hex: string, fator = 0.42): string {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return "&H00777777";
  const canal = (i: number) =>
    Math.round(parseInt(h.slice(i, i + 2), 16) * fator)
      .toString(16)
      .padStart(2, "0");
  return `&H00${canal(4)}${canal(2)}${canal(0)}`.toUpperCase();
}

/** "0 6px 0 rgba(0,0,0,.55)" → 6. "nenhuma" → 0. */
function deslocamentoSombra(sombra: string): number {
  if (!sombra || /nenhum/i.test(sombra)) return 0;
  // O segundo número do atalho CSS é o deslocamento vertical, que é o que o
  // ASS sabe representar (ele desloca na diagonal, sem raio de desfoque).
  const nums = [...(sombra.match(/-?\d+(?:\.\d+)?/g) ?? [])].map(Number);
  return nums.length >= 2 ? Math.min(6, Math.abs(nums[1])) : 0;
}

/**
 * O preset pede caixa atrás do texto?
 *
 * Três formatos declaram fundo (pill, faixa, cor sólida) e o gerador
 * ignorava os três — eles saíam com texto solto sobre o vídeo, que é
 * exatamente o oposto do que o preset promete.
 */
function fundoDoPreset(fundo: string): { tem: boolean; alpha: number } {
  if (!fundo || /nenhum/i.test(fundo)) return { tem: false, alpha: 0 };
  const pct = /(\d+)\s*%/.exec(fundo);
  const opacidade = pct ? Number(pct[1]) / 100 : 0.85;
  // ASS: 00 é opaco e FF é transparente — o inverso do CSS.
  return { tem: true, alpha: Math.round((1 - opacidade) * 255) };
}

/** Alpha do ASS (00 opaco, FF transparente) a partir da opacidade CSS. */
function alphaAss(opacidade: number): string {
  const a = Math.round((1 - Math.max(0, Math.min(1, opacidade))) * 255);
  return a.toString(16).padStart(2, "0").toUpperCase();
}

/** Aplica opacidade a uma cor &H00BBGGRR já convertida. */
function comOpacidade(corAssHex: string, opacidade: number): string {
  return opacidade >= 1
    ? corAssHex
    : `&H${alphaAss(opacidade)}${corAssHex.replace("&H00", "")}`;
}

/** O preset anima por FRASE (fade) em vez de palavra por palavra? */
function fadeDaFrase(animacao: string): number {
  const a = (animacao ?? "").toLowerCase();
  if (!a.includes("fade")) return 0;
  // "Fade por frase, 200 ms" traz a duração; sem número, 180ms é o padrão
  // que os presets que declaram fade sem tempo esperam.
  const ms = /(\d+)\s*ms/.exec(a);
  return ms ? Math.min(600, Number(ms[1])) : 180;
}

function tempoAss(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = Math.floor(s % 60);
  const cs = Math.round((s - Math.floor(s)) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(seg).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/** Escapa o que quebraria a linha de Dialogue. */
function limpar(texto: string): string {
  return texto.replace(/[{}]/g, "").replace(/\n/g, " ");
}

/** "Centro vertical (52% da altura)" → 52. Sem número, cai no padrão. */
function posicaoPct(posicao: string, padrao = 52): number {
  const m = /(\d+(?:\.\d+)?)\s*%/.exec(posicao ?? "");
  return m ? Number(m[1]) : padrao;
}

/**
 * Margens em pixels que mantêm a legenda dentro da área útil.
 *
 * A margem direita soma o rail das plataformas: sem isso o texto passa por
 * baixo dos botões de interação. É a diferença entre o preset "funcionar no
 * preview" e "funcionar no feed".
 */
function margens(f: Formato) {
  const l = f.legenda;
  const esquerda = Math.round((l.margemLateralPct / 100) * LARGURA);
  const direita = Math.round(
    ((l.margemLateralPct + (l.safeAreaDireitaPct ?? 0)) / 100) * LARGURA,
  );
  return { esquerda, direita, util: LARGURA - esquerda - direita };
}

/**
 * Largura média de um caractere, como fração do corpo da fonte.
 *
 * Por FAMÍLIA, não só por caixa: Anton é condensada e ocupa cerca de dois
 * terços da largura de uma Poppins no mesmo corpo. Estimar as duas igual faz
 * o corpo encolher demais pra caber — e o Hype Challenge, que deveria gritar,
 * saía menor que o Hormozi.
 *
 * Valores medidos nas fontes que instalamos (worker/vps/instalar-fontes.sh).
 * Família fora da lista cai no genérico por caixa, que é conservador.
 */
/**
 * MEDIDO, não estimado — worker/calibrar-fontes.ts renderiza uma frase de
 * português em cada família e lê a caixa de pixels do resultado.
 *
 * A tabela anterior era palpite meu e errava MUITO pra cima: Montserrat em
 * caixa alta dizia 0,65 contra 0,427 reais, 52% a mais. E esse número entra
 * em três decisões, todas estragadas pelo mesmo excesso:
 *
 *   corpoDaFonte()        acha que não cabe e encolhe a fonte
 *   caracteresPorLinha()  quebra a linha antes da hora
 *   ancoraX()             desvia do centro achando que vai bater no rail
 *
 * O piso de legibilidade que precisei criar era, em boa parte, remendo deste
 * erro — a fonte só ficava pequena porque a conta dizia que não cabia.
 *
 * Regenerar depois de trocar de fonte: `npx tsx worker/calibrar-fontes.ts`
 * na VPS (é lá que as tipografias existem).
 */
/**
 * Largura de CADA caractere, por família, em fração do corpo.
 *
 * Gerado por worker/calibrar-fontes.ts, que renderiza "HcH" pra cada letra
 * e mede o avanço real que o libass usa.
 *
 * A tabela anterior guardava uma MÉDIA por família — e média é a resposta
 * certa pra pergunta errada. A pergunta é "quanto ESTA frase ocupa", e em
 * legenda de short a frase é curta demais pra as letras se compensarem: em
 * Space Grotesk o "m" é 3,3x o "i", e "porque não" (só letra larga) mede 6%
 * mais que a média previa. Em corpo 187 isso deu 40px de texto pra fora do
 * quadro no Kinetic Typography.
 */
const LARGURAS: Record<string, Record<string, number>> = larguras;

/** Média da família, pra caractere fora do alfabeto calibrado (emoji, símbolo). */
const MEDIA_POR_FAMILIA: Record<string, number> = Object.fromEntries(
  Object.entries(LARGURAS).map(([familia, mapa]) => {
    const vs = Object.values(mapa);
    return [familia, vs.reduce((a, b) => a + b, 0) / vs.length];
  }),
);

/**
 * Quanto o texto ocupa, em MÚLTIPLOS do corpo da fonte.
 *
 * Somar caractere a caractere é exato: sem erro acumulado e sem folga
 * inventada. Multiplique pelo corpo em pixels e você tem a largura que o
 * libass vai desenhar.
 */
function larguraRelativa(texto: string, fonte: string, caixa: string): number {
  const familia = (fonte ?? "").split("/")[0].trim().toLowerCase();
  const mapa = LARGURAS[familia];
  // Família não calibrada: 0,45 por caractere é generoso de propósito —
  // errar pra mais custa uma quebra de linha extra, errar pra menos corta
  // o texto na borda, que é irreversível pra quem assiste.
  if (!mapa) return texto.length * 0.45;

  const media = MEDIA_POR_FAMILIA[familia] ?? 0.42;
  const aplicado = (caixa ?? "").toUpperCase().includes("UPPER")
    ? texto.toUpperCase()
    : texto;

  let total = 0;
  for (const c of aplicado) total += mapa[c] ?? media;
  return total;
}

/** A largura em PIXELS, que é o que as decisões de layout comparam. */
function larguraEmPx(
  texto: string,
  corpo: number,
  fonte: string,
  caixa: string,
): number {
  return larguraRelativa(texto, fonte, caixa) * corpo;
}

/**
 * Fator MÉDIO da família — ainda usado pra escolher o corpo da fonte.
 *
 * Escolher o corpo é uma decisão por FORMATO, não por bloco: acontece antes
 * de existir texto. A média serve aqui, e o estouro que ela poderia causar
 * é contido pela quebra de linha, que mede o texto de verdade.
 */
function fatorLargura(caixa: string, fonte?: string): number {
  const familia = (fonte ?? "").split("/")[0].trim().toLowerCase();
  const media = MEDIA_POR_FAMILIA[familia];
  const alta = (caixa ?? "").toUpperCase().includes("UPPER");
  if (media === undefined) return alta ? 0.45 : 0.4;
  // Caixa alta some com as pernas estreitas e engorda a média em ~12%.
  return alta ? media * 1.12 : media;
}

/**
 * Corpo da fonte em pixels — ajustado pra caber na área útil.
 *
 * Os presets trazem `tamanhoPct` e `maxCaracteresLinha` definidos de forma
 * independente, e nos 15 a combinação pede cerca do DOBRO da largura que
 * existe em 1080px (o Hormozi pede 1580px para 670 disponíveis). Renderizar
 * o tamanho pedido corta o texto nas bordas.
 *
 * Aqui o `maxCaracteresLinha` é tratado como a INTENÇÃO de ritmo de leitura
 * — quantas letras por linha o formato quer — e o corpo encolhe até que essa
 * quantidade caiba. O preset continua mandando na proporção entre formatos:
 * o Hormozi segue maior que o Dark Luxury, só que ambos dentro do quadro.
 */
/**
 * Piso de legibilidade, em pixels de um quadro 1080x1920.
 *
 * Legenda de short é lida em celular, em movimento, muitas vezes sem som.
 * Abaixo disto ela existe mas não cumpre a função — e o preset que pedia
 * "elegante e discreto" entregava 35px, que ninguém lê.
 */
const CORPO_MINIMO = 62;

function corpoDaFonte(f: Formato): number {
  const l = f.legenda;
  const pedido = (l.tamanhoPct / 100) * ALTURA;
  const cabe =
    margens(f).util /
    (l.maxCaracteresLinha * fatorLargura(l.caixa, fontePrincipal(l.fonte)));

  /**
   * O piso levanta o `cabe`, mas NUNCA passa do que o preset pediu.
   *
   * Os presets foram escritos supondo os 1080px do quadro; a safe zone
   * deixa 670px úteis. Com isso um maxCaracteresLinha de 26–30 esmagava a
   * fonte pra 35–46px — o Dark Luxury pedia 96px e recebia 40.
   *
   * `max(cabe, MINIMO)` conserta os esmagados; o `min(pedido, …)` por fora
   * impede que o piso INFLE um preset que legitimamente quer ser pequeno,
   * e preserva a hierarquia entre eles (Hormozi 77 segue maior que Dark
   * Luxury 62, e Kinetic 129 segue maior que os dois).
   */
  return Math.round(Math.min(pedido, Math.max(cabe, CORPO_MINIMO)));
}

/**
 * Quantos caracteres REALMENTE cabem numa linha, no corpo já decidido.
 *
 * Não dá pra usar o `maxCaracteresLinha` do preset direto: quando o piso de
 * legibilidade sobe a fonte, o número do preset passa a mentir, e agrupar
 * por ele produziria blocos largos demais que estouram a área útil.
 */
function caracteresPorLinha(f: Formato): number {
  const corpo = corpoDaFonte(f);
  const porChar = corpo * fatorLargura(f.legenda.caixa, fontePrincipal(f.legenda.fonte));
  return Math.max(8, Math.floor(margens(f).util / porChar));
}

/**
 * Alinhamento numérico do ASS (numpad): 1-3 base, 4-6 meio, 7-9 topo.
 *
 * Ancorar sempre no MEIO (4/5/6) e posicionar com \pos dá controle exato da
 * altura — com âncora na base, o bloco cresce pra cima e a posição real muda
 * conforme o número de linhas.
 */
function alinhamentoAss(alinhamento: string): number {
  const a = (alinhamento ?? "").toLowerCase();
  if (a.includes("esquerda")) return 4;
  if (a.includes("direita")) return 6;
  return 5;
}

function caixaDoTexto(texto: string, caixa: string): string {
  return (caixa ?? "").toUpperCase().includes("UPPER")
    ? texto.toUpperCase()
    : texto;
}

/** Fonte primária da lista "Montserrat / Space Grotesk". */
function fontePrincipal(fonte: string): string {
  return (fonte ?? "Arial").split("/")[0].trim() || "Arial";
}

/**
 * Onde ancorar o bloco horizontalmente.
 *
 * Centrar na ÁREA ÚTIL (como era) garantia que nada encostasse no rail do
 * TikTok — mas jogava TODA legenda 119px à esquerda do centro do quadro, e
 * isso salta aos olhos em qualquer lugar que não seja o feed do TikTok: no
 * Estúdio, no player do navegador, no arquivo baixado.
 *
 * Centrar no quadro e limitar a largura resolveria o visual e custaria um
 * terço da linha (713px viram 476), o que empurra texto pra mais linhas ou
 * fonte menor em TODO bloco — inclusive nos curtos, que são a maioria.
 *
 * Então: centro do QUADRO por padrão, e desvio só quando a linha realmente
 * alcançar o rail. Bloco curto — o caso comum — sai perfeitamente centrado;
 * bloco largo escorrega o mínimo necessário pra não ficar atrás dos botões.
 */
function ancoraX(larguraDoTexto: number, m: ReturnType<typeof margens>): number {
  const centroQuadro = LARGURA / 2;
  const meia = larguraDoTexto / 2;
  const limiteDireito = LARGURA - m.direita;

  let x = centroQuadro;
  if (x + meia > limiteDireito) x = limiteDireito - meia;
  if (x - meia < m.esquerda) x = m.esquerda + meia;
  return Math.round(x);
}

/** O estilo é karaokê? Fade por frase não acende palavra por palavra. */
function temKaraoke(animacao: string): boolean {
  const a = (animacao ?? "").toLowerCase();
  if (a.includes("por frase") || a.includes("fade in por frase")) return false;
  return true;
}

/* --------------------------------------------------------------- destaque */

/**
 * Normaliza pra comparar: sem pontuação, sem acento, minúscula.
 *
 * A IA devolve a palavra como ela aparece na frase; a transcrição traz a
 * pontuação colada ("game."). Comparar cru erraria justamente as palavras
 * de fim de frase, que costumam ser as de mais impacto.
 */
function chave(palavra: string): string {
  return palavra
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
}

/**
 * Monta o conjunto de chaves a partir do que a IA devolveu.
 *
 * Quebra em PALAVRAS: a IA devolve naturalmente nomes próprios inteiros
 * ("GTA VI", "Rockstar Games"), mas a transcrição traz um token por palavra.
 * Comparar a frase toda nunca casava — e eram justamente os nomes próprios,
 * o destaque mais óbvio de todos, que sumiam em silêncio.
 *
 * Token de uma letra fica de fora: "a", "e", "o" apareceriam na frase toda
 * e pintariam a legenda inteira.
 */
function chavesDeDestaque(destaques: string[]): Set<string> {
  const chaves = new Set<string>();
  for (const bruto of destaques) {
    for (const parte of bruto.split(/\s+/)) {
      const k = chave(parte);
      if (k.length > 1) chaves.add(k);
    }
  }
  return chaves;
}

/**
 * Palavras que ganham a cor de destaque.
 *
 * As regras dos presets são semânticas ("amarelo no número que prova",
 * "vermelho em dor e perda") — regex não resolve isso. Quem lê a
 * transcrição inteira é a IA, então é ela que marca (worker/cortar.ts) e
 * aqui a gente só casa.
 *
 * Número continua entrando sozinho: é destaque em todo preset e não custa
 * nada confirmar sem depender do modelo.
 */
function fazDestaque(destaques: Set<string>) {
  return (palavra: string): boolean =>
    /\d/.test(palavra) || destaques.has(chave(palavra));
}

/* ----------------------------------------------------------------- público */

export type EstiloLegenda = string;

const CABECALHO_TITULO =
  "Style: Titulo,Arial,58,&H00000000,&H00000000,&H00FFFFFF,&H00FFFFFF,-1,0,0,0,100,100,0,0,3,14,0,8,90,90,150,1";

function cabecalho(f: Formato): string {
  const l = f.legenda;
  const tamanho = corpoDaFonte(f);
  const m = margens(f);
  const contorno = espessura(l.stroke);
  const fundo = fundoDoPreset(l.fundo);
  const opacidade = typeof l.opacidade === "number" ? l.opacidade : 1;

  // Secundária = a cor de ANTES de a palavra ser dita. Escurecer a própria
  // cor é o que faz o karaokê aparecer; branco fixo (como estava) some em
  // legenda branca, que é a maioria dos presets.
  const secundaria = corApagada(l.cor);

  /**
   * BorderStyle 3 desenha uma CAIXA opaca atrás do texto, com a cor do campo
   * de contorno. É como o ASS representa o "fundo" que três presets pedem
   * (pill, faixa, cor sólida) e que antes era simplesmente ignorado.
   *
   * Com caixa, o contorno some (não faz sentido contornar letra dentro de
   * bloco sólido) e o preenchimento vira a margem interna da caixa.
   */
  const borda = fundo.tem ? 3 : 1;
  const corContorno = fundo.tem
    ? `&H${fundo.alpha.toString(16).padStart(2, "0").toUpperCase()}0A0A0A`
    : "&H00000000";
  const larguraBorda = fundo.tem ? Math.max(6, contorno) : contorno;

  // Sombra do preset em vez de número fixo: os presets pedem de 0 a 6px, e
  // "0 6px 0 #000" (Hormozi) é visualmente muito diferente de "nenhuma"
  // (Minimal Premium). Tratar todos igual apagava metade da identidade.
  const sombra = fundo.tem ? 0 : deslocamentoSombra(l.sombra);

  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${LARGURA}
PlayResY: ${ALTURA}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Fala,${fontePrincipal(l.fonte)},${tamanho},${comOpacidade(corAss(l.cor), opacidade)},${secundaria},${corContorno},&H96000000,${l.peso >= 700 ? -1 : 0},0,0,0,100,100,0,0,${borda},${larguraBorda},${sombra},${alinhamentoAss(l.alinhamento)},${m.esquerda},${m.direita},60,1
${CABECALHO_TITULO}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
}

/**
 * Agrupa palavras em blocos de exibição, respeitando o limite de caracteres
 * e de linhas do formato.
 *
 * Bloco curto porque legenda de short é lida em relance — linha longa obriga
 * o olho a varrer e perde o ritmo. Uma pausa longa também fecha o bloco: o
 * silêncio é a pontuação natural da fala.
 */
export function agruparPalavras(
  palavras: Palavra[],
  maxCaracteres = 14,
  maxLinhas = 2,
): Palavra[][] {
  const limite = Math.max(8, maxCaracteres * Math.max(1, maxLinhas));
  const blocos: Palavra[][] = [];
  let atual: Palavra[] = [];
  let tamanho = 0;

  for (const p of palavras) {
    const anterior = atual[atual.length - 1];
    const pausa = anterior ? p.inicio_s - anterior.fim_s : 0;
    const caberia = tamanho + p.texto.length + 1;

    if (atual.length > 0 && (caberia > limite || pausa > 0.6)) {
      blocos.push(atual);
      atual = [];
      tamanho = 0;
    }
    atual.push(p);
    tamanho += p.texto.length + 1;
  }
  if (atual.length > 0) blocos.push(atual);
  return blocos;
}

/**
 * Quebra o bloco em linhas que CABEM na largura útil, com o \N do ASS.
 *
 * Mede em pixels estimados, não em contagem de caracteres: "MMM" e "iii"
 * têm o mesmo comprimento e larguras muito diferentes. É essa medida que
 * impede o texto de sangrar pelas bordas.
 */
function quebrarLinhas(
  pedacos: string[],
  larguraUtil: number,
  corpo: number,
  caixa: string,
  fonte: string,
  maxLinhas = 2,
): string {
  const porChar = corpo * fatorLargura(caixa, fonte);
  // Comprimento visível ignora as tags {\k..} e {\c..}.
  const visivel = (s: string) => s.replace(/\{[^}]*\}/g, "");

  const linhas: string[] = [];
  let linha = "";
  for (const pedaco of pedacos) {
    const candidata = linha ? `${linha} ${pedaco}` : pedaco;
    /**
     * A quebra decide pela LARGURA REAL do texto, não por contagem.
     *
     * Contar caracteres e multiplicar pela média é o que deixava "porque
     * não" (dez letras largas) estourar o quadro enquanto a conta dizia que
     * cabia. Agora cada letra vale o que ela mede.
     *
     * E a largura GANHA do limite de linhas. Eu tinha feito o contrário —
     * a última linha permitida não quebrava — e o resultado foi texto
     * saindo pela borda em 4 dos 15 formatos. Estourar `maxLinhas` custa
     * uma linha a mais, que é feio; cortar a frase na borda custa a
     * informação, que é irrecuperável pra quem assiste.
     *
     * O `maxLinhas` do preset continua valendo onde ele decide de verdade:
     * no tamanho do bloco (agruparPalavras) e no corpo da fonte, que
     * encolhe justamente pra tentar caber nas linhas pedidas.
     */
    const cabe = larguraEmPx(visivel(candidata), corpo, fonte, caixa) <= larguraUtil;
    if (linha && !cabe) {
      linhas.push(linha);
      linha = pedaco;
    } else {
      linha = candidata;
    }
  }
  if (linha) linhas.push(linha);
  return linhas.join("\\N");
}

/**
 * Gera o .ass de um corte. Recebe as palavras JÁ dentro da janela do corte,
 * com os tempos ancorados em `inicioCorte`.
 */
export function gerarAss(
  palavras: Palavra[],
  inicioCorte: number,
  formatoId: EstiloLegenda = "hormozi",
  tituloTela?: string,
  destaques: string[] = [],
): string | null {
  // "sem" continua sendo um valor válido: alguns cortes não levam legenda.
  const semLegenda = formatoId === "sem";
  if (semLegenda && !tituloTela) return null;

  const f = acharFormato(semLegenda ? null : formatoId);
  const l = f.legenda;
  const linhas: string[] = [];

  // Caixa de título nos primeiros 5s — o gancho que se LÊ antes de ouvir.
  if (tituloTela?.trim()) {
    const t = limpar(tituloTela.trim());
    const meio = t.length > 26 ? t.lastIndexOf(" ", Math.ceil(t.length / 2)) : -1;
    const texto = meio > 0 ? `${t.slice(0, meio)}\\N${t.slice(meio + 1)}` : t;
    linhas.push(
      `Dialogue: 1,${tempoAss(0)},${tempoAss(5)},Titulo,,0,0,0,,${texto}`,
    );
  }

  if (!semLegenda) {
    const m = margens(f);
    const corpo = corpoDaFonte(f);
    const centroY = Math.round((posicaoPct(l.posicao) / 100) * ALTURA);
    const corDestaque = corAss(f.destaque?.cores?.[0] ?? "#FFD400");
    const corPrimaria = corAss(l.cor);
    const karaoke = temKaraoke(l.animacao);
    const ehDestaque = fazDestaque(chavesDeDestaque(destaques));

    // caracteresPorLinha, não l.maxCaracteresLinha: com o piso de
    // legibilidade a fonte pode ter subido, e agrupar pelo número do preset
    // montaria blocos largos demais pro que agora cabe.
    for (const bloco of agruparPalavras(palavras, caracteresPorLinha(f), l.maxLinhas)) {
      const inicio = bloco[0].inicio_s - inicioCorte;
      const fim = bloco[bloco.length - 1].fim_s - inicioCorte;
      if (fim <= 0) continue;

      const pedacos = bloco.map((p, i) => {
        const texto = limpar(caixaDoTexto(p.texto, l.caixa));
        // A cor precisa ser declarada em TODA palavra, não só na destacada:
        // no ASS o \c vale até o próximo override, então marcar só o número
        // pintava todo o resto da frase junto.
        const cor = ehDestaque(p.texto)
          ? `{\\c${corDestaque}}`
          : `{\\c${corPrimaria}}`;
        if (!karaoke) return `${cor}${texto}`;
        // \k mede em centissegundos quanto a palavra demora no karaokê.
        const de = i === 0 ? inicio : bloco[i - 1].fim_s - inicioCorte;
        const duracaoCs = Math.max(
          1,
          Math.round((p.fim_s - inicioCorte - de) * 100),
        );
        return `{\\k${duracaoCs}}${cor}${texto}`;
      });

      const texto = quebrarLinhas(
        pedacos, m.util, corpo, l.caixa, fontePrincipal(l.fonte), l.maxLinhas,
      );
      // \fad é por FRASE e vem antes do \pos: os presets que pedem "fade por
      // frase" antes renderizavam com corte seco, iguais aos de karaokê.
      const fade = fadeDaFrase(l.animacao);
      const entrada = fade > 0 ? `{\\fad(${fade},0)}` : "";
      // A âncora é POR BLOCO: depende da largura da linha mais longa dele.
      // Uma âncora fixa pro formato inteiro teria que supor o pior caso e
      // desalinharia os blocos curtos, que são a maioria.
      /**
       * O corpo ENCOLHE quando o bloco não cabe — por bloco, não por formato.
       *
       * O limite de linhas do preset é rígido (estourar empurra a legenda
       * pra fora da safe zone vertical), então a última linha permitida não
       * pode quebrar. Sem esta redução, um bloco comprido simplesmente saía
       * pela borda: o teste flagrou 4 dos 15 formatos assim, com "ACONTECEU
       * COM ELE DEPOIS DISSO" vazando 278px no Dark Luxury.
       *
       * Encolher só o bloco problemático preserva a identidade do formato —
       * a legenda inteira não fica menor por causa de uma frase longa. O
       * piso de 78% evita o outro extremo: texto que encolhe tanto que
       * ninguém lê, quando o certo seria a IA ter cortado a frase.
       */
      const linhasDoTexto = texto.split("\\N").map((li) => li.replace(/\{[^}]*\}/g, ""));
      const maisLargaRel = Math.max(
        ...linhasDoTexto.map((li) =>
          larguraRelativa(li, fontePrincipal(l.fonte), l.caixa),
        ),
      );
      const corpoQueCabe = maisLargaRel > 0 ? m.util / maisLargaRel : corpo;
      const corpoDoBloco = Math.max(
        Math.round(corpo * 0.78),
        Math.min(corpo, Math.floor(corpoQueCabe)),
      );
      const ajusteDeCorpo = corpoDoBloco < corpo ? `\\fs${corpoDoBloco}` : "";

      const larguraDoTexto = maisLargaRel * corpoDoBloco;
      linhas.push(
        `Dialogue: 0,${tempoAss(Math.max(0, inicio))},${tempoAss(fim)},Fala,,0,0,0,,${entrada}{\\pos(${ancoraX(larguraDoTexto, m)},${centroY})${ajusteDeCorpo}}${texto}`,
      );
    }
  }

  return cabecalho(f) + linhas.join("\n") + "\n";
}
