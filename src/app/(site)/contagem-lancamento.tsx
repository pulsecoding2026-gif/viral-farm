"use client";

import { useEffect, useState } from "react";
import {
  contagemAte,
  proximoMarco,
  LANCAMENTO,
  type MarcoOficial,
} from "@/lib/gta/lancamento";

/**
 * O contador regressivo do próximo marco oficial de GTA VI.
 *
 * A ARMADILHA DA HIDRATAÇÃO, e como este componente escapa dela
 *
 * Um contador lê o relógio, e o relógio do servidor não é o mesmo do
 * navegador. Se o componente calcular o tempo restante durante a renderização
 * do servidor, o HTML vai dizer "faltam 14h 32m 07s" e o cliente vai calcular
 * outro segundo — o React reclama de divergência e, o que é pior, o número
 * pisca na primeira pintura.
 *
 * A saída é não ter número nenhum no HTML do servidor. O estado começa `null`
 * e só vira número dentro do `useEffect`, que roda exclusivamente no cliente.
 * O espaço é reservado desde o começo (as caixas existem vazias), então nada
 * pula de lugar quando o número aparece.
 *
 * POR QUE O PRÓXIMO MARCO, E NÃO SÓ O LANÇAMENTO
 *
 * Faltam quase três meses para 19 de novembro, e "84 dias" não gera urgência
 * nenhuma. O que gera é o evento da semana — a estreia do Extended Look, o
 * preload. O contador segue o próximo marco e cai no lançamento quando não há
 * mais nada antes. É o mesmo componente entregando urgência real o ano
 * inteiro, em vez de um número grande e inerte.
 */

const CAIXAS = [
  { chave: "dias", rotulo: "dias" },
  { chave: "horas", rotulo: "horas" },
  { chave: "minutos", rotulo: "min" },
  { chave: "segundos", rotulo: "seg" },
] as const;

export function ContagemLancamento() {
  const [agora, setAgora] = useState<Date | null>(null);

  useEffect(() => {
    // Marca imediatamente e depois a cada segundo. Sem o primeiro `setAgora`
    // fora do intervalo, a tela ficaria um segundo inteiro em branco.
    setAgora(new Date());
    const id = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // No servidor e na primeira pintura: o lançamento, como rótulo estável.
  // Assim o texto ao redor não muda de tamanho quando o relógio chega.
  const marco: MarcoOficial =
    agora === null ? LANCAMENTO : (proximoMarco(agora) ?? LANCAMENTO);
  const contagem = agora === null ? null : contagemAte(marco.quando, agora);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="placa flex items-center gap-2 text-sm text-zinc-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
        {contagem?.chegou ? "acontecendo agora" : marco.rotulo}
      </p>

      <div className="flex items-start gap-2 sm:gap-3">
        {CAIXAS.map(({ chave, rotulo }) => (
          <div key={chave} className="flex flex-col items-center">
            <div className="min-w-[3.5rem] rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 sm:min-w-[4.5rem] sm:px-4 sm:py-3">
              <span
                className="numero-placa block text-center text-3xl leading-none text-zinc-50 sm:text-5xl"
                /* aria-hidden no número e o texto completo no rodapé: um leitor
                   de tela anunciando quatro números soltos a cada segundo é
                   ruído, não informação. */
                aria-hidden
              >
                {contagem === null
                  ? "--"
                  : String(contagem[chave]).padStart(2, "0")}
              </span>
            </div>
            <span className="placa mt-1.5 text-[11px] text-zinc-500 sm:text-xs">
              {rotulo}
            </span>
          </div>
        ))}
      </div>

      {/* A versão legível: uma frase, atualizada sem interromper a leitura. */}
      <p className="sr-only" aria-live="polite">
        {contagem === null
          ? `Contagem para ${marco.rotulo}.`
          : contagem.chegou
            ? `${marco.rotulo}: acontecendo agora.`
            : `Faltam ${contagem.dias} dias, ${contagem.horas} horas e ${contagem.minutos} minutos para ${marco.rotulo}.`}
      </p>

      {/*
        A fonte fica visível de propósito. Este projeto vive num fandom que caça
        erro factual, e uma data sem procedência é tratada como boato — mostrar
        de onde ela veio é o que separa agregador confiável de canal de rumor.
      */}
      <a
        href={marco.fonte}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] text-zinc-600 underline-offset-4 transition hover:text-zinc-400 hover:underline"
      >
        {marco.confirmado ? "Data confirmada pela Rockstar" : "Data ainda não confirmada"}
      </a>
    </div>
  );
}
