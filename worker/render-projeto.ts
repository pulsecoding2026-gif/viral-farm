import {
  PROPORCOES,
  trilhaDe,
  type Efeito,
  type Enquadramento,
  type ItemVideo,
  type Projeto,
  type Transicao,
} from "../src/lib/editor/projeto";

/**
 * Traduz um projeto de edição no grafo de filtros do ffmpeg.
 *
 * É a outra ponta do contrato: a interface produz o Projeto, isto o executa.
 * Um render só, no fim — que é o ponto inteiro da edição não-destrutiva.
 *
 * O QUE ESTA VERSÃO FAZ
 *   · vários clipes do mesmo material, concatenados
 *   · qualquer uma das 4 proporções de saída
 *   · enquadramento por clipe: zoom, posição X/Y, com recorte de verdade
 *   · volume por clipe
 *   · TRANSIÇÕES entre clipes (xfade no vídeo, acrossfade no áudio)
 *   · EFEITOS por clipe, com janela de tempo própria
 *   · legendas queimadas, reusando o gerador de ASS dos cortes automáticos
 *
 * O QUE AINDA NÃO FAZ, e por quê
 *   · KEYFRAMES animados. O `crop` do ffmpeg avalia largura e altura só na
 *     inicialização — só x e y mudam por frame. Zoom animado exige o filtro
 *     `zoompan`, que trabalha por número de frame e não por segundo, e num
 *     núcleo só é caro. O enquadramento renderiza ESTÁTICO (o valor base do
 *     clipe); o modelo e a prévia já animam.
 *   · texto avulso, overlay e música. O modelo os carrega; aqui eles ainda
 *     não viram filtro.
 *
 * Renderizar em silêncio o que não sabe fazer seria pior que não fazer: a
 * pessoa exportaria e receberia um vídeo diferente do que viu na prévia. Por
 * isso `avisosDoProjeto()` devolve, em texto, tudo que foi ignorado.
 */

export type Dimensoes = { largura: number; altura: number };

/**
 * Cadência da saída.
 *
 * Constante e não literal solto porque agora ela aparece em DOIS lugares que
 * têm que concordar: o `-r` do encoder e o `fps=` de cada clipe. O `xfade`
 * recusa juntar dois lados de cadências diferentes, então normalizar dentro
 * do grafo deixou de ser detalhe estético.
 */
export const FPS_SAIDA = 30;

/** yuv420p exige lado par; ímpar faz o ffmpeg recusar o filtro. */
function par(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2);
}

function limite(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(v, max));
}

/**
 * Cadeia de escala + recorte que encaixa a fonte no quadro de saída.
 *
 * `zoom` 1 é "cobrir sem sobra" — o equivalente ao object-fit: cover do CSS.
 * A conta parte da escala que cobre o quadro e multiplica pelo zoom; assim o
 * mesmo valor de zoom significa a mesma coisa em 9:16 e em 16:9, que é o que
 * permite trocar de proporção sem refazer o enquadramento.
 *
 * `x`/`y` são o CENTRO desejado em fração da fonte. O deslocamento é preso
 * às bordas: sem isso, arrastar demais deixaria faixa preta, que é o defeito
 * que o recorte existe pra evitar.
 */
export function filtroDeEnquadramento(
  fonte: Dimensoes,
  saida: Dimensoes,
  e: Enquadramento,
): string {
  const cobrir = Math.max(
    saida.largura / fonte.largura,
    saida.altura / fonte.altura,
  );
  const escala = cobrir * Math.max(1, e.zoom);

  const largura = par(fonte.largura * escala);
  const altura = par(fonte.altura * escala);

  const x = Math.round(
    limite(e.x * largura - saida.largura / 2, 0, Math.max(0, largura - saida.largura)),
  );
  const y = Math.round(
    limite(e.y * altura - saida.altura / 2, 0, Math.max(0, altura - saida.altura)),
  );

  return `scale=${largura}:${altura},crop=${saida.largura}:${saida.altura}:${x}:${y}`;
}

/* --------------------------------------------------------------- efeitos */

/**
 * Um efeito do modelo vira UM filtro do ffmpeg com janela de tempo.
 *
 * A janela sai de graça: cada clipe é aparado com `setpts=PTS-STARTPTS`, então
 * o relógio `t` dentro da cadeia dele já começa em zero — que é exatamente a
 * referência de `de`/`ate` no modelo. Nenhuma conversão, nenhum deslocamento
 * pra errar quando o clipe for arrastado na linha.
 *
 * ESCALA DA INTENSIDADE (0 a 1). O modelo delega a decisão pra cá, e a regra
 * é a mesma pros seis: 0 é NEUTRO (o filtro não muda nada) e 1 é o limite do
 * que ainda parece intencional em vídeo vertical, não o limite do filtro.
 *
 *   blur       gblur sigma  0 → 20     20 num quadro de 1080 apaga o desenho
 *                                      inteiro; acima disso só custa CPU.
 *   nitidez    unsharp amount 0 → 2    1 é o padrão do filtro, então 0,5 de
 *                                      intensidade é a nitidez "de fábrica".
 *   brilho     eq brightness 0 → 0,5   0,5 já lava a imagem; o eq aceita até
 *                                      1, que é branco chapado.
 *   vinheta    vignette angle 0 → π/2  π/2 é o máximo do filtro; o padrão
 *                                      dele (π/5) cai em intensidade 0,4.
 *   saturacao  eq saturation 1 → 2     dobrar já estoura pele em tom quente.
 *   cinza      hue s 1 → 0             intensidade é QUANTO de cinza: 1 zera
 *                                      a saturação, 0,5 dessatura metade.
 *
 * Devolve null quando o efeito não faria nada — intensidade zero ou janela
 * vazia. Filtro que não muda pixel ainda custa uma passada por frame.
 */
export function filtroDeEfeito(e: Efeito): string | null {
  const i = limite(e.intensidade, 0, 1);
  if (i <= 0) return null;

  const de = Math.max(0, e.de);
  const ate = e.ate;
  if (!(ate > de)) return null;

  // Aspas simples são do parser de FILTRO do ffmpeg, não do shell (o spawn
  // não passa por shell nenhum). Sem elas a vírgula de between() partiria a
  // cadeia em dois filtros e o grafo nem montaria.
  const janela = `enable='between(t,${de.toFixed(3)},${ate.toFixed(3)})'`;

  switch (e.tipo) {
    case "blur":
      return `gblur=sigma=${(i * 20).toFixed(2)}:${janela}`;
    case "nitidez":
      return (
        `unsharp=luma_msize_x=5:luma_msize_y=5:` +
        `luma_amount=${(i * 2).toFixed(2)}:${janela}`
      );
    case "brilho":
      return `eq=brightness=${(i * 0.5).toFixed(3)}:${janela}`;
    case "vinheta":
      return `vignette=angle=${(i * (Math.PI / 2)).toFixed(4)}:${janela}`;
    case "saturacao":
      return `eq=saturation=${(1 + i).toFixed(3)}:${janela}`;
    case "cinza":
      return `hue=s=${(1 - i).toFixed(3)}:${janela}`;
    default: {
      // Tipo novo no modelo sem tradução aqui vira erro de compilação, não
      // um efeito que some em silêncio no render.
      const naoTratado: never = e.tipo;
      return naoTratado;
    }
  }
}

/* ------------------------------------------------------------ transições */

/**
 * Cada tipo do modelo vira o modo do `xfade` mais próximo.
 *
 * O modelo tem cinco nomes que descrevem a SENSAÇÃO; o xfade tem 58 modos que
 * descrevem a geometria. O mapa é a tradução, e ele é de mão única de
 * propósito: quem editar o modelo não precisa saber o vocabulário do ffmpeg.
 *
 *   fade      → fade        a dissolução clássica.
 *   zoom      → zoomin      o único modo do xfade que muda escala.
 *   deslizar  → slideleft   o novo empurra o antigo pra esquerda, que é o
 *                           sentido natural de leitura.
 *   flash     → fadewhite   estoura pro branco e volta. `fadeblack` seria o
 *                           corte de cena; flash é o do clipe musical.
 *   blur      → hblur       o único modo borrado que existe. É só horizontal,
 *                           mas em 0,3s de transição ninguém nota o eixo.
 */
const XFADE_POR_TIPO: Record<Transicao["tipo"], string> = {
  fade: "fade",
  zoom: "zoomin",
  deslizar: "slideleft",
  flash: "fadewhite",
  blur: "hblur",
};

/** Quanto de material este clipe traz da fonte. */
function janelaDoClipe(v: ItemVideo): number {
  return Math.max(0, v.fonteFim_s - v.fonteInicio_s);
}

export type TransicaoEfetiva = {
  /** Modo do xfade já traduzido. */
  modo: string;
  /** Duração REAL, depois de aparada pelo tamanho dos dois lados. */
  duracao_s: number;
};

export type PlanoDeTransicoes = {
  /** Índice do clipe → transição que ENTRA nele. null = corte seco. */
  porClipe: (TransicaoEfetiva | null)[];
  /** Pedidas no projeto que não couberam de jeito nenhum e sumiram. */
  descartadas: number;
  /** Pedidas que aconteceram, mas mais curtas do que se pediu. */
  aparadas: number;
  /** Soma das durações efetivas: o quanto o arquivo final ENCURTA. */
  sobreposicao_s: number;
  /** Duração do arquivo que sai: soma das janelas menos a sobreposição. */
  duracao_s: number;
};

/**
 * Decide, junção por junção, qual transição de fato acontece.
 *
 * EXISTE SEPARADO DO GRAFO porque a resposta é usada em dois lugares que não
 * podem divergir: o grafo (que precisa do `offset` de cada xfade) e o número
 * de duração do plano. O `xfade` SOBREPÕE os clipes pela duração da transição
 * — dois clipes de 3s com fade de 1s dão 5s de arquivo, não 6s. Se a duração
 * declarada não descontasse isso, ela mentiria sobre o MP4, que é o mesmo
 * defeito que o aviso de buraco na linha existe pra evitar.
 *
 * O QUE ACONTECE COM UMA TRANSIÇÃO QUE NÃO CABE. O xfade exige `offset >= 0`
 * no lado esquerdo e material sobrando no direito: pedir 1s de fade entre
 * clipes de meio segundo não é uma transição longa demais, é um grafo que não
 * roda. A saída é APARAR pro maior valor que cabe, não desistir — quem pediu
 * transição quer transição, e 0,4s de fade é mais próximo do pedido do que um
 * corte seco. Só quando nem um frame sobra é que ela é descartada.
 *
 * A do PRIMEIRO clipe é sempre descartada: o modelo define transição como "a
 * que entra neste item, vinda do anterior", e sem anterior não há o que
 * sobrepor.
 */
export function planejarTransicoes(videos: ItemVideo[]): PlanoDeTransicoes {
  // Um frame de sobra em cada lado. Sem essa folga, offset zero faria a
  // transição começar antes de o primeiro frame existir.
  const MINIMO = 1 / FPS_SAIDA;

  const porClipe: (TransicaoEfetiva | null)[] = videos.map(() => null);
  let descartadas = 0;
  let aparadas = 0;
  let sobreposicao = 0;

  if (videos.length === 0) {
    return {
      porClipe,
      descartadas,
      aparadas,
      sobreposicao_s: 0,
      duracao_s: 0,
    };
  }
  if (videos[0].transicao) descartadas += 1;

  let acumulado = janelaDoClipe(videos[0]);

  for (let i = 1; i < videos.length; i++) {
    const janela = janelaDoClipe(videos[i]);
    const pedida = videos[i].transicao;

    if (!pedida || pedida.duracao_s <= 0) {
      acumulado += janela;
      continue;
    }

    // `acumulado` já vem descontado das transições anteriores — é o tamanho
    // do lado esquerdo COMO ELE VAI EXISTIR, não a soma das janelas.
    const cabe = Math.min(pedida.duracao_s, acumulado - MINIMO, janela - MINIMO);
    if (cabe < MINIMO) {
      descartadas += 1;
      acumulado += janela;
      continue;
    }

    // Arredondado aqui, e não só na hora de imprimir o filtro: o número que
    // sai no plano tem que ser o mesmo que o ffmpeg recebe.
    const duracao_s = Number(cabe.toFixed(3));
    if (duracao_s < pedida.duracao_s) aparadas += 1;
    porClipe[i] = { modo: XFADE_POR_TIPO[pedida.tipo] ?? "fade", duracao_s };
    sobreposicao += duracao_s;
    acumulado += janela - duracao_s;
  }

  return {
    porClipe,
    descartadas,
    aparadas,
    sobreposicao_s: sobreposicao,
    duracao_s: acumulado,
  };
}

/**
 * Buracos entre clipes na linha do tempo.
 *
 * O `concat` do ffmpeg COLA um clipe no outro: ele só conhece as janelas da
 * fonte, não a posição na linha. Então um vazio deixado ao aparar some no
 * MP4, e o vídeo final sai mais curto que a prévia mostrou — sem que nada
 * avise. É a divergência prévia↔render mais séria que existe aqui, porque a
 * pessoa só descobre depois de esperar o render inteiro.
 *
 * Devolve o total de segundos que serão engolidos.
 */
export function buracosNaLinha(videos: ItemVideo[]): number {
  const ordem = [...videos].sort((a, b) => a.inicio_s - b.inicio_s);
  // Tolerância de um frame a 30fps: fronteira calculada em ponto flutuante
  // quase nunca fecha exata, e avisar por 0,01s seria ruído.
  const TOLERANCIA = 1 / 30;
  let total = ordem.length > 0 && ordem[0].inicio_s > TOLERANCIA ? ordem[0].inicio_s : 0;
  for (let i = 1; i < ordem.length; i++) {
    const vao = ordem[i].inicio_s - ordem[i - 1].fim_s;
    if (vao > TOLERANCIA) total += vao;
  }
  return total;
}

/** O que o projeto pede e este render ainda não entrega. */
export function avisosDoProjeto(p: Projeto): string[] {
  const avisos: string[] = [];
  // Ordenado igual ao render: a conta das transições depende da vizinhança,
  // e avisar sobre outra ordem que não a renderizada seria pior que calar.
  const videos = (trilhaDe(p, "video").itens as ItemVideo[])
    .slice()
    .sort((a, b) => a.inicio_s - b.inicio_s);

  const buraco = buracosNaLinha(videos);
  if (buraco > 0) {
    avisos.push(
      `Há ${buraco.toFixed(1)}s de vazio entre os clipes na linha do tempo. ` +
        `O render cola um clipe no outro, então o vídeo final sai mais curto — ` +
        `encoste os clipes se não era isso que você queria.`,
    );
  }

  if (videos.some((v) => v.keyframes.length > 0)) {
    avisos.push(
      "Keyframes de enquadramento ainda não animam no render — sai o valor inicial do clipe.",
    );
  }

  // Transições ENTRAM no render agora. O que sobrou pra avisar é o que elas
  // fazem com a duração e o que não coube.
  const transicoes = planejarTransicoes(videos);
  if (transicoes.sobreposicao_s > 0) {
    avisos.push(
      `As transições sobrepõem ${transicoes.sobreposicao_s.toFixed(1)}s de ` +
        `vídeo — é assim que elas funcionam. O arquivo final sai esses ` +
        `${transicoes.sobreposicao_s.toFixed(1)}s mais curto que a linha do tempo.`,
    );
  }
  if (transicoes.aparadas > 0) {
    avisos.push(
      `${transicoes.aparadas} transição(ões) saíram mais curtas do que você ` +
        `pediu: uma transição não cabe além do tamanho dos clipes que ela junta.`,
    );
  }
  if (transicoes.descartadas > 0) {
    avisos.push(
      `${transicoes.descartadas} transição(ões) viraram corte seco: a do ` +
        `primeiro clipe não tem clipe anterior de onde vir, e clipe curto ` +
        `demais não deixa nem um frame de sobreposição.`,
    );
  }

  if (videos.some((v) => v.enquadramento.rotacao !== 0)) {
    avisos.push("Rotação ainda não entra no render.");
  }
  if (trilhaDe(p, "texto").itens.length > 0) {
    avisos.push("Textos avulsos ainda não entram no render.");
  }
  if (trilhaDe(p, "overlay").itens.length > 0) {
    avisos.push("Overlays ainda não entram no render.");
  }
  if (trilhaDe(p, "audio").itens.length > 0) {
    avisos.push("Trilha de áudio ainda não entra no render.");
  }
  return avisos;
}

export type PlanoDeRender = {
  /** Grafo completo, pronto pro -filter_complex. */
  grafo: string;
  /** Rótulos finais pro -map. */
  saidaVideo: string;
  saidaAudio: string;
  duracao_s: number;
  avisos: string[];
};

/**
 * Monta o grafo do projeto inteiro.
 *
 * A JUNÇÃO ENTRE CLIPES tem dois modos, e a escolha é por junção:
 *
 *   · sem transição → `concat`. Cola um no outro, custo quase zero.
 *   · com transição → `xfade` no vídeo e `acrossfade` no áudio.
 *
 * Como o `concat` aceita N entradas de uma vez e o `xfade` só duas, os clipes
 * são agrupados: cada corrida de clipes colados vira UM concat, e as
 * transições são as fronteiras entre grupos. Um projeto sem transição nenhuma
 * cai num único concat, exatamente como antes.
 *
 * `nomeAss` entra como filtro no fim da cadeia de vídeo, depois da junção:
 * a legenda é do vídeo FINAL, com os tempos da linha do tempo, então aplicá-la
 * por clipe erraria o tempo de todo clipe que não fosse o primeiro.
 */
export function planejarRender(
  projeto: Projeto,
  fonte: Dimensoes,
  nomeAss: string | null,
): PlanoDeRender {
  const saida = PROPORCOES[projeto.proporcao];
  const videos = (trilhaDe(projeto, "video").itens as ItemVideo[])
    .slice()
    .sort((a, b) => a.inicio_s - b.inicio_s);

  if (videos.length === 0) {
    throw new Error("O projeto não tem nenhum clipe de vídeo.");
  }

  const transicoes = planejarTransicoes(videos);
  const partes: string[] = [];

  videos.forEach((v, i) => {
    const enq = filtroDeEnquadramento(fonte, saida, v.enquadramento);
    const efeitos = v.efeitos
      .map(filtroDeEfeito)
      .filter((f): f is string => f !== null);

    // setpts zerando o relógio a cada clipe faz duas coisas: permite o concat
    // (sem isso o segundo clipe entraria com o tempo do material original e o
    // player pularia o intervalo inteiro) e dá aos efeitos o `t` relativo ao
    // item que o modelo promete.
    //
    // fps + format + setsar + settb no FIM, depois dos efeitos: o xfade RECUSA
    // juntar dois lados que não sejam idênticos em tamanho, formato de pixel,
    // cadência e BASE DE TEMPO, e um efeito no meio da cadeia pode ter trocado
    // o formato.
    //
    // O settb é o que custou o primeiro teste vermelho. O `fps` deixa o link
    // em 1/30; o `concat` entrega 1/1000000. Junte um grupo concatenado com um
    // clipe solto e o ffmpeg recusa com "input link timebases do not match" —
    // erro que só aparece na segunda transição de um projeto misto, nunca na
    // primeira. AVTB é 1/1000000, o mesmo que o concat produz, então este
    // settb alinha os dois casos num valor só.
    partes.push(
      `[0:v]trim=start=${v.fonteInicio_s.toFixed(3)}:end=${v.fonteFim_s.toFixed(3)},` +
        `setpts=PTS-STARTPTS,${enq}` +
        (efeitos.length > 0 ? `,${efeitos.join(",")}` : "") +
        `,fps=${FPS_SAIDA},format=yuv420p,setsar=1,settb=AVTB[v${i}]`,
    );
    // aformat pelo mesmo motivo: o acrossfade exige as duas pontas na mesma
    // taxa e no mesmo layout de canais.
    partes.push(
      `[0:a]atrim=start=${v.fonteInicio_s.toFixed(3)}:end=${v.fonteFim_s.toFixed(3)},` +
        `asetpts=PTS-STARTPTS,volume=${v.volume.toFixed(2)},` +
        `aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a${i}]`,
    );
  });

  // Corridas de clipes sem transição entre si. Uma transição abre grupo novo.
  const grupos: number[][] = [];
  videos.forEach((_, i) => {
    if (i === 0 || transicoes.porClipe[i]) grupos.push([i]);
    else grupos[grupos.length - 1].push(i);
  });

  const rotulos = grupos.map((g, gi) => {
    // Grupo de um clipe só não precisa de concat — o rótulo do clipe serve.
    if (g.length === 1) return { v: `v${g[0]}`, a: `a${g[0]}` };
    partes.push(
      `${g.map((i) => `[v${i}][a${i}]`).join("")}` +
        `concat=n=${g.length}:v=1:a=1[gv${gi}][ga${gi}]`,
    );
    return { v: `gv${gi}`, a: `ga${gi}` };
  });

  const duracaoDoGrupo = (g: number[]) =>
    g.reduce((s, i) => s + janelaDoClipe(videos[i]), 0);

  let atual = rotulos[0];
  // O que já está montado à ESQUERDA, com as sobreposições anteriores já
  // descontadas. É daqui que sai o offset de cada xfade.
  let montado = duracaoDoGrupo(grupos[0]);

  for (let gi = 1; gi < grupos.length; gi++) {
    const t = transicoes.porClipe[grupos[gi][0]];
    if (!t) continue; // impossível pela construção dos grupos; o TS não sabe.

    // O offset é onde a sobreposição COMEÇA, contado no lado esquerdo já
    // montado. Usar a soma crua das janelas aqui empurraria a transição pra
    // depois do fim do vídeo a partir da segunda.
    const offset = montado - t.duracao_s;
    partes.push(
      `[${atual.v}][${rotulos[gi].v}]xfade=transition=${t.modo}:` +
        `duration=${t.duracao_s.toFixed(3)}:offset=${offset.toFixed(3)}[xv${gi}]`,
    );
    // acrossfade não tem offset: ele sempre cruza o FIM do primeiro com o
    // COMEÇO do segundo, que é onde o xfade também está. Os dois encurtam
    // pela mesma duração, então vídeo e áudio continuam do mesmo tamanho.
    partes.push(
      `[${atual.a}][${rotulos[gi].a}]` +
        `acrossfade=d=${t.duracao_s.toFixed(3)}:c1=tri:c2=tri[xa${gi}]`,
    );

    atual = { v: `xv${gi}`, a: `xa${gi}` };
    montado += duracaoDoGrupo(grupos[gi]) - t.duracao_s;
  }

  // A legenda entra por último, no vídeo já montado.
  if (nomeAss) partes.push(`[${atual.v}]ass=${nomeAss}[vout]`);

  return {
    grafo: partes.join(";"),
    saidaVideo: nomeAss ? "[vout]" : `[${atual.v}]`,
    saidaAudio: `[${atual.a}]`,
    // A soma das janelas da FONTE menos a sobreposição das transições — não
    // `duracaoDoProjeto()` (o maior fim_s). O concat cola os clipes e o xfade
    // ainda os sobrepõe, então nem buraco na linha nem transição aparecem no
    // fim_s; usar aquele número faria este mentir sobre o arquivo que sai.
    duracao_s: transicoes.duracao_s,
    avisos: avisosDoProjeto(projeto),
  };
}

/**
 * Argumentos completos do ffmpeg.
 *
 * Mesmo par de encoder dos cortes automáticos (veryfast + crf 20), medido em
 * worker/medir-render.ts: mesma qualidade que fast+crf21 em um quarto do
 * tempo, o que importa numa VPS de um núcleo.
 */
export function argumentosDeRender(
  fonteArquivo: string,
  plano: PlanoDeRender,
  saidaArquivo: string,
): string[] {
  return [
    "-i", fonteArquivo,
    "-filter_complex", plano.grafo,
    "-map", plano.saidaVideo,
    "-map", plano.saidaAudio,
    "-r", String(FPS_SAIDA),
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    "-y", saidaArquivo,
  ];
}
