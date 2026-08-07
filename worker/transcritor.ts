import fs from "node:fs";
import Groq from "groq-sdk";

/**
 * Transcrição POR PALAVRA — a espinha dorsal do corte.
 *
 * A transcrição por frase (src/lib/analise/transcrever.ts) basta pra escrever
 * roteiro; pra CORTAR vídeo e animar legenda, não: sem o tempo de cada
 * palavra não existe corte preciso nem destaque palavra-a-palavra.
 *
 * O provedor é plugável de propósito (env TRANSCRITOR): a decisão de qual
 * usar em produção ainda está aberta, e trocar não pode exigir reescrita.
 */

export type Palavra = {
  texto: string;
  inicio_s: number;
  fim_s: number;
};

export type TranscricaoPalavras = {
  texto: string;
  idioma: string | null;
  palavras: Palavra[];
};

export interface Transcritor {
  nome: string;
  transcrever(caminhoAudio: string): Promise<TranscricaoPalavras>;
}

/* ------------------------------------------------------------------- groq */

type VerboseJsonComPalavras = {
  text?: string;
  language?: string;
  words?: { word?: string; start?: number; end?: number }[];
};

function transcritorGroq(chave: string): Transcritor {
  const cliente = new Groq({ apiKey: chave });

  return {
    nome: "groq/whisper-large-v3-turbo",
    async transcrever(caminhoAudio) {
      const resposta = (await cliente.audio.transcriptions.create({
        file: fs.createReadStream(caminhoAudio),
        model: "whisper-large-v3-turbo",
        response_format: "verbose_json",
        // É isto que muda o retorno de frases pra palavras.
        timestamp_granularities: ["word"],
      })) as unknown as VerboseJsonComPalavras;

      const palavras = (resposta.words ?? [])
        .map((w) => ({
          texto: (w.word ?? "").trim(),
          inicio_s: w.start ?? 0,
          fim_s: w.end ?? 0,
        }))
        .filter((w) => w.texto.length > 0);

      return {
        texto: (resposta.text ?? "").trim(),
        idioma: resposta.language ?? null,
        palavras,
      };
    },
  };
}

/* --------------------------------------------------------------- registro */

/**
 * Devolve o transcritor configurado.
 *
 * Pra adicionar um provedor novo (Deepgram, Scribe...), implementa a
 * interface e registra um case aqui — o resto do worker não muda.
 */
export function criarTranscritor(
  provedor: string,
  chaves: { groq?: string },
): Transcritor {
  switch (provedor) {
    case "groq": {
      if (!chaves.groq) {
        throw new Error(
          "TRANSCRITOR=groq exige GROQ_API_KEY no .env do worker.",
        );
      }
      return transcritorGroq(chaves.groq);
    }
    default:
      throw new Error(
        `Transcritor "${provedor}" não existe. Disponíveis: groq.`,
      );
  }
}
