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
    p: "O que é a GTA VIRAL?",
    r: "É um painel que transforma live longa em cortes prontos pra postar. Você cola um link — uma stream de RP, um VOD, um vídeo de 6 horas — e a IA transcreve, acha os melhores momentos e renderiza cortes verticais com legenda animada. É a ferramenta pra montar um canal de cortes de GTA sem gravar nem aparecer.",
  },
  {
    p: "Posso usar vídeo de outra pessoa?",
    r: "Tecnicamente sim, e é o que a maioria dos canais de cortes faz. Mas o vídeo é de quem gravou, e isso não muda por passar por aqui: o certo é ter a permissão do streamer e creditar o canal de origem em todo corte. Muitos streamers liberam e até incentivam — clipe é divulgação de graça pra eles — e vários têm regra publicada sobre isso. Peça antes: um pedido educado costuma virar um sim, e um sim escrito é o que te protege se o canal crescer. O que não dá é material vazado ou de build não lançada, que a gente não aceita de jeito nenhum.",
  },
  {
    p: "Preciso ter audiência pra usar?",
    r: "Não. A análise lê o vídeo em si — o que é falado, quais trechos prendem, onde está o gancho. Um canal com zero inscrito funciona igual a um com um milhão. No pré-lançamento de GTA VI o interesse pelo tema é tão grande que o tamanho do canal deixa de ser o filtro — é justamente pra quem ainda não emplacou.",
  },
  {
    p: "De onde posso mandar o link?",
    r: "Twitch, Kick, YouTube, TikTok, Instagram e Facebook. O vídeo precisa estar público ou não listado, e ter até 90 minutos. Live em andamento ainda não funciona: espere a transmissão terminar e cole o link do VOD.",
  },
  {
    p: "Meu vídeo fica guardado?",
    r: "O arquivo original fica no máximo 24 horas no servidor de processamento — só o tempo de você revisar e reeditar os cortes — e depois é apagado automaticamente. O que fica guardado são os cortes gerados e a transcrição, na sua conta.",
  },
  {
    p: "Quanto tempo demora?",
    r: "Depende da duração: alguns minutos pra um vídeo curto, mais tempo pra uma live longa. A renderização de cada corte é a etapa mais pesada. Você pode fechar a aba — o processamento continua no servidor e os cortes aparecem no histórico.",
  },
  {
    p: "Qual IA vocês usam?",
    r: "A transcrição é feita com Whisper, que devolve o tempo exato de cada palavra falada. A seleção dos trechos é feita por um modelo de linguagem que lê essa transcrição e pontua cada corte em quatro dimensões: gancho, fluxo, valor e tendência.",
  },
  {
    p: "O que vem em cada corte?",
    r: "Um vídeo 9:16 em 1080p com legenda animada queimada, título na tela nos primeiros segundos, e uma legenda pronta pra postar. Cada corte vem com o motivo da escolha e a nota nas quatro dimensões, pra você entender por que aquele trecho foi selecionado.",
  },
  {
    p: "Eu escolho os cortes ou a IA decide?",
    r: "Você escolhe. No modo Estúdio a IA propõe os cortes e para: você vê o gancho, a nota e o trecho falado de cada um, aprova os que valem e descarta o resto — só o aprovado é renderizado. Se preferir, o modo Automático entrega tudo pronto de uma vez.",
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
        <span className="placa inline-block rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-xs text-orange-500">
          FAQ
        </span>
        <h2 className="titulo-letreiro mt-5 text-2xl leading-[1.05] sm:text-4xl">
          Antes de <span className="acento-rosa">começar</span>
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
