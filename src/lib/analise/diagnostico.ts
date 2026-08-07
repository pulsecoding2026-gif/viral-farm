/**
 * Tradução de falha técnica em mensagem de gente.
 *
 * O worker orquestra binários externos (yt-dlp, ffmpeg) e o erro deles é
 * stderr cru — nome do processo, código de saída, flags de linha de comando,
 * link de wiki. Isso chegava inteiro na tela do cliente:
 *
 *   "yt-dlp" saiu com código 1. ERROR: [youtube] 14YXeHKOBUY: Sign in to
 *   confirm you're not a bot. Use --cookies-from-browser or --cookies ...
 *
 * Além de não dizer nada a quem não é dev, isso vaza a implementação e passa
 * a impressão de protótipo quebrado. Aqui a falha vira um código estável
 * (que a UI usa pra decidir o que oferecer) mais uma frase que explica a
 * causa e o próximo passo.
 *
 * Cuidado ao mexer: a classificação é por ASSINATURA do texto de erro. Se um
 * padrão não bater, cai em `desconhecido` — que é seguro, só menos útil.
 * Nunca deixe o texto cru vazar como fallback.
 */

export type CodigoErro =
  | "bloqueio_plataforma"
  | "video_indisponivel"
  | "video_privado"
  | "restricao_idade"
  | "restricao_regiao"
  | "ao_vivo"
  | "so_membros"
  | "muitas_tentativas"
  | "rede"
  | "tempo_esgotado"
  | "sem_fala"
  | "sem_corte_bom"
  | "render_falhou"
  | "entrada_invalida"
  | "servico_indisponivel"
  | "desconhecido";

/** O que a tela oferece depois da falha. */
export type AcaoErro = "tentar" | "outro_link" | "esperar" | "nenhuma";

export type Diagnostico = {
  codigo: CodigoErro;
  /** Uma frase: o que aconteceu e o que fazer. Vai direto pra tela. */
  mensagem: string;
  acao: AcaoErro;
};

/**
 * Assinaturas na ordem em que são testadas — da mais específica pra mais
 * genérica. `rede` fica no fim de propósito: "unable to download" aparece
 * junto de causas mais precisas, e a específica tem que ganhar.
 */
const REGRAS: { codigo: CodigoErro; padrao: RegExp; mensagem: string; acao: AcaoErro }[] = [
  {
    codigo: "bloqueio_plataforma",
    padrao: /sign in to confirm you.?re not a bot|confirm you are not a bot|failed to extract any player response/i,
    mensagem:
      "O YouTube pediu verificação de robô pra liberar esse vídeo — acontece de forma intermitente com servidores. Tentar de novo em alguns minutos costuma resolver; se insistir, use outro link.",
    acao: "tentar",
  },
  {
    codigo: "restricao_idade",
    padrao: /sign in to confirm your age|age.?restricted|inappropriate for some users/i,
    mensagem:
      "Esse vídeo tem restrição de idade e o YouTube só entrega pra quem está logado. Não consigo processar por enquanto.",
    acao: "outro_link",
  },
  {
    codigo: "so_membros",
    padrao: /members[- ]only|available to music premium|join this channel/i,
    mensagem:
      "Esse vídeo é exclusivo para membros do canal. Só dá pra analisar vídeo de acesso público.",
    acao: "outro_link",
  },
  {
    codigo: "video_privado",
    padrao: /private video|this video is private/i,
    mensagem:
      "Esse vídeo está privado. Deixe ele público ou não listado e mande de novo.",
    acao: "outro_link",
  },
  {
    codigo: "restricao_regiao",
    // Cobre as duas formas que o YouTube usa: "not available in your country"
    // e "has not made this video available in your country".
    padrao: /available in your country|available (from|in) your location|blocked it in your country|geo.?restricted/i,
    mensagem:
      "Esse vídeo está bloqueado na região do nosso servidor. Tente outro link do mesmo conteúdo.",
    acao: "outro_link",
  },
  {
    codigo: "ao_vivo",
    padrao: /this live event will begin|is a live event|premieres in|live stream recording is not/i,
    mensagem:
      "Isso é uma transmissão ao vivo ou uma estreia que ainda não acabou. Espere terminar e mande o link da gravação.",
    acao: "esperar",
  },
  {
    codigo: "video_indisponivel",
    padrao: /video unavailable|removed by the uploader|account associated with this video has been terminated|does not exist/i,
    mensagem:
      "Esse vídeo não está mais disponível na plataforma — pode ter sido removido ou o canal encerrado.",
    acao: "outro_link",
  },
  {
    /**
     * Falha do NOSSO lado: LLM ou transcrição sem crédito, chave inválida,
     * cota estourada, provedor fora do ar.
     *
     * Precisa vir ANTES do 429 genérico e do bloco de rede: sem regra
     * própria, isto caía em "desconhecido" e a tela mandava tentar outro
     * vídeo — conselho ativamente errado, porque vídeo nenhum ia funcionar.
     * O dono não tem o que consertar aqui, e fingir que tem é pior que
     * admitir a falha.
     */
    codigo: "servico_indisponivel",
    padrao:
      /insufficient balance|insufficient_quota|exceeded your current quota|respondeu 4(01|02|03)|invalid api key|authentication_error|respondeu 5\d\d/i,
    mensagem:
      "Nosso serviço de IA está indisponível no momento — é um problema nosso, não do seu vídeo. Nada foi cobrado de você. Tente de novo em alguns minutos.",
    acao: "tentar",
  },
  {
    codigo: "muitas_tentativas",
    padrao: /http error 429|too many requests|rate.?limit/i,
    mensagem:
      "A plataforma limitou nossas requisições por excesso de acessos. Espere alguns minutos e tente de novo.",
    acao: "esperar",
  },
  {
    codigo: "tempo_esgotado",
    padrao: /estourou o timeout|timed out|etimedout/i,
    mensagem:
      "O processamento passou do tempo limite. Vídeo muito longo ou conexão instável com a plataforma — tentar de novo costuma resolver.",
    acao: "tentar",
  },
  {
    codigo: "sem_fala",
    padrao: /nenhuma fala detectada/i,
    mensagem:
      "Não encontrei fala nesse vídeo. Os cortes são escolhidos pelo que é dito — vídeo só com música ou sem áudio não dá pra analisar.",
    acao: "outro_link",
  },
  {
    codigo: "sem_corte_bom",
    padrao: /não rendeu nenhum corte|nenhum corte bom/i,
    mensagem:
      "A IA não achou nenhum trecho forte o bastante nesse vídeo. Tente um material com mais fala direta, ou escreva uma direção no formulário apontando o que procurar.",
    acao: "outro_link",
  },
  {
    codigo: "render_falhou",
    padrao: /nenhum corte sobreviveu|ffmpeg/i,
    mensagem:
      "Os trechos foram escolhidos, mas a renderização falhou. Tente de novo — se repetir, o vídeo pode ter um formato de áudio ou vídeo que ainda não suportamos.",
    acao: "tentar",
  },
  {
    // Estúdio: o fonte expirou (24h) ou a análise foi retomada sem seleção.
    codigo: "render_falhou",
    padrao: /transcrição dessa análise não está|nenhum corte aprovado/i,
    mensagem:
      "O material desta análise expirou (guardamos o vídeo fonte por 24h). Mande o link de novo pra refazer os cortes.",
    acao: "outro_link",
  },
  {
    codigo: "rede",
    padrao: /unable to download|econnreset|enotfound|network|getaddrinfo|socket hang up/i,
    mensagem:
      "Falha de rede ao falar com a plataforma. Tente de novo em instantes.",
    acao: "tentar",
  },
];

/**
 * ErroDeEntrada (src/lib/analise/extrair.ts) já nasce escrito pra pessoa —
 * limite de duração, link inválido, host fora da lista.
 *
 * Checagem por `name` e não por `instanceof`: importar extrair.ts aqui
 * arrastaria child_process e o yt-dlp inteiro pro bundle do cliente, que
 * também usa este módulo (ROTULO_ACAO).
 */
function ehErroDeEntrada(erro: unknown): boolean {
  return (
    typeof erro === "object" &&
    erro !== null &&
    (erro as { name?: unknown }).name === "ErroDeEntrada"
  );
}

export function diagnosticar(erro: unknown): Diagnostico {
  const bruto = erro instanceof Error ? erro.message : String(erro ?? "");

  // Antes das regras: é mensagem nossa, já revisada, e não deve ser
  // reescrita por um padrão que caiu por acaso.
  if (ehErroDeEntrada(erro)) {
    return { codigo: "entrada_invalida", mensagem: bruto, acao: "outro_link" };
  }

  for (const r of REGRAS) {
    if (r.padrao.test(bruto)) {
      return { codigo: r.codigo, mensagem: r.mensagem, acao: r.acao };
    }
  }

  // Sem correspondência, o texto cru NÃO passa adiante. A versão anterior
  // tentava adivinhar se a mensagem "parecia humana" por ausência de flag e
  // de nome de binário — e deixava vazar qualquer erro técnico curto, tipo
  // "RangeError: Maximum call stack size exceeded at 0x8007". Erro que não
  // sei traduzir vira mensagem genérica; o original fica no log da VPS.
  return {
    codigo: "desconhecido",
    mensagem:
      "Não consegui processar esse vídeo. Tente de novo — se repetir com o mesmo link, tente outro vídeo.",
    acao: "tentar",
  };
}

/** Rótulo do botão principal que a tela de erro oferece. */
export const ROTULO_ACAO: Record<AcaoErro, string | null> = {
  tentar: "Tentar de novo",
  esperar: "Tentar de novo",
  outro_link: "Analisar outro vídeo",
  nenhuma: null,
};
