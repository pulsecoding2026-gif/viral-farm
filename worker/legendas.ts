import type { Palavra } from "./transcritor";
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

/** Largura média de um caractere, como fração do corpo da fonte. */
function fatorLargura(caixa: string): number {
  // Caixa alta é mais larga: não tem letra com perna estreita tipo "i" ou "l".
  return (caixa ?? "").toUpperCase().includes("UPPER") ? 0.62 : 0.52;
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
function corpoDaFonte(f: Formato): number {
  const l = f.legenda;
  const pedido = (l.tamanhoPct / 100) * ALTURA;
  const cabe = margens(f).util / (l.maxCaracteresLinha * fatorLargura(l.caixa));
  return Math.max(28, Math.round(Math.min(pedido, cabe)));
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

/** O estilo é karaokê? Fade por frase não acende palavra por palavra. */
function temKaraoke(animacao: string): boolean {
  const a = (animacao ?? "").toLowerCase();
  if (a.includes("por frase") || a.includes("fade in por frase")) return false;
  return true;
}

/* --------------------------------------------------------------- destaque */

/**
 * Palavras que ganham a cor de destaque.
 *
 * As regras dos presets são semânticas ("amarelo em números", "vermelho em
 * dor e perda"). Número dá pra detectar aqui; o resto exigiria a IA marcar
 * palavra a palavra — por ora aplicamos o que é verificável no texto e
 * deixamos o resto pro modelo, numa etapa futura.
 */
function ehDestaque(palavra: string): boolean {
  return /\d/.test(palavra);
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
  // Secundária é a cor "antes de falar" no karaokê. Sem karaokê ela nunca
  // aparece, mas o formato ASS exige o campo preenchido.
  const secundaria = "&H00FFFFFF";

  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${LARGURA}
PlayResY: ${ALTURA}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Fala,${fontePrincipal(l.fonte)},${tamanho},${corAss(l.cor)},${secundaria},&H00000000,&H96000000,${l.peso >= 700 ? -1 : 0},0,0,0,100,100,0,0,1,${contorno},${contorno > 0 ? 2 : 3},${alinhamentoAss(l.alinhamento)},${m.esquerda},${m.direita},60,1
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
): string {
  const porChar = corpo * fatorLargura(caixa);
  // Comprimento visível ignora as tags {\k..} e {\c..}.
  const visivel = (s: string) => s.replace(/\{[^}]*\}/g, "");

  const linhas: string[] = [];
  let linha = "";
  for (const pedaco of pedacos) {
    const candidata = linha ? `${linha} ${pedaco}` : pedaco;
    if (linha && visivel(candidata).length * porChar > larguraUtil) {
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
    // \pos ancora no centro horizontal da ÁREA ÚTIL (não do quadro): com o
    // rail direito ocupado, o centro visual fica à esquerda do centro real.
    const m = margens(f);
    const corpo = corpoDaFonte(f);
    const centroX = Math.round(m.esquerda + m.util / 2);
    const centroY = Math.round((posicaoPct(l.posicao) / 100) * ALTURA);
    const corDestaque = corAss(f.destaque?.cores?.[0] ?? "#FFD400");
    const corPrimaria = corAss(l.cor);
    const karaoke = temKaraoke(l.animacao);

    for (const bloco of agruparPalavras(palavras, l.maxCaracteresLinha, l.maxLinhas)) {
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

      const texto = quebrarLinhas(pedacos, m.util, corpo, l.caixa);
      linhas.push(
        `Dialogue: 0,${tempoAss(Math.max(0, inicio))},${tempoAss(fim)},Fala,,0,0,0,,{\\pos(${centroX},${centroY})}${texto}`,
      );
    }
  }

  return cabecalho(f) + linhas.join("\n") + "\n";
}
