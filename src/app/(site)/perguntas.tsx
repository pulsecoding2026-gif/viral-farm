"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";

/**
 * FAQ em sanfona.
 *
 * As respostas descrevem o comportamento real do pipeline — limite de 3
 * minutos, hosts aceitos, descarte do arquivo, tempo de processamento. Se
 * alguma dessas regras mudar em src/lib/analise, o texto aqui precisa mudar
 * junto: FAQ desatualizado é promessa quebrada.
 */

const PERGUNTAS = [
  {
    p: "O que é o Viral Farm?",
    r: "É um painel que parte do material que você já gravou. A IA assiste ao vídeo cru — sem edição, sem roteiro — entende o que dá pra aproveitar e escreve três roteiros a partir dele. Junto vêm as ferramentas de descoberta: o que está em alta, o que estão pesquisando e quem está com audiência ao vivo.",
  },
  {
    p: "Preciso ter audiência pra usar?",
    r: "Não. A análise lê o vídeo em si — o que aparece, o que é falado, quais trechos prendem. Um vídeo com zero visualização funciona igual a um com um milhão. É justamente pra quem ainda não emplacou.",
  },
  {
    p: "De onde posso mandar o link?",
    r: "YouTube, TikTok, Instagram e Facebook. O vídeo precisa estar público ou não listado, e ter até 3 minutos. Se quiser testar sem publicar pra ninguém, suba como não listado no YouTube e cole o link.",
  },
  {
    p: "Meu vídeo fica guardado?",
    r: "Não. O arquivo é baixado, processado e apagado no fim da análise. O que fica guardado é só o resultado em texto — os roteiros, os trechos marcados e o diagnóstico. Nunca o vídeo.",
  },
  {
    p: "Quanto tempo demora?",
    r: "De 40 a 90 segundos, dependendo da duração do vídeo. A etapa mais longa é a própria análise da IA. Você pode fechar a aba: o processamento continua no servidor e o resultado aparece no histórico.",
  },
  {
    p: "Qual IA vocês usam?",
    r: "Claude, da Anthropic, para a análise dos frames e a escrita dos roteiros. A transcrição do áudio é feita com Whisper. Os frames e a transcrição são lidos juntos, e não separadamente — é isso que permite amarrar o roteiro ao segundo exato do que acontece.",
  },
  {
    p: "O que vem em cada roteiro?",
    r: "Um gancho para os primeiros segundos, blocos com o que falar e o que aparece na tela em cada trecho, duração estimada e a chamada final. São três roteiros por análise, cada um com um ângulo diferente sobre o mesmo material.",
  },
  {
    p: "A IA escreve por mim?",
    r: "Ela escreve a partir do que você gravou, não do nada. O roteiro sai amarrado ao seu material, com os trechos aproveitáveis marcados por tempo. O texto é ponto de partida para você ajustar com a sua voz — não um roteiro genérico que serviria para qualquer um.",
  },
];

export function Perguntas() {
  const [aberta, setAberta] = useState<number | null>(0);

  return (
    <section
      id="perguntas"
      className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24"
    >
      <div className="text-center">
        <span className="inline-block rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-orange-500 uppercase">
          FAQ
        </span>
        <h2 className="mt-5 text-3xl leading-tight font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          Perguntas frequentes
        </h2>
      </div>

      <div className="mt-10 space-y-2.5">
        {PERGUNTAS.map((q, i) => {
          const abertaAgora = aberta === i;
          return (
            <div
              key={q.p}
              className={
                "overflow-hidden rounded-2xl border transition " +
                (abertaAgora
                  ? "border-orange-900/60 bg-zinc-900/50"
                  : "border-zinc-800 bg-zinc-900/25 hover:border-zinc-700")
              }
            >
              <h3>
                <button
                  type="button"
                  onClick={() => setAberta(abertaAgora ? null : i)}
                  aria-expanded={abertaAgora}
                  className="flex w-full items-center gap-3.5 px-4 py-4 text-left sm:px-5"
                >
                  <span
                    className={
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold tabular-nums transition " +
                      (abertaAgora
                        ? "bg-orange-600 text-white"
                        : "bg-zinc-800 text-zinc-500")
                    }
                  >
                    0{i + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-zinc-100 sm:text-base">
                    {q.p}
                  </span>
                  <CaretDown
                    size={15}
                    weight="bold"
                    className={
                      "shrink-0 text-zinc-600 transition-transform duration-200 " +
                      (abertaAgora ? "rotate-180" : "")
                    }
                  />
                </button>
              </h3>

              {/* Altura animada pelo truque de grid — sem precisar medir. */}
              <div
                className="grid transition-[grid-template-rows] duration-200 ease-out"
                style={{ gridTemplateRows: abertaAgora ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p className="px-4 pb-4 pl-[3.9rem] text-sm leading-relaxed text-zinc-400 sm:px-5 sm:pl-[4.1rem]">
                    {q.r}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
