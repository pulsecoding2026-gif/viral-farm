"use client";

import { useState } from "react";
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";

/**
 * Alternador de "salvo na Biblioteca", compartilhado entre a grade e a lista.
 *
 * Otimista de propósito: o marcador responde no clique e volta atrás se o
 * servidor recusar. Salvar referência é ação leve e frequente — esperar o
 * round-trip a cada clique tornaria a varredura do Radar cansativa.
 */
export function useSalvo(video: ItemBiblioteca, inicial: boolean) {
  const [salvo, setSalvo] = useState(inicial);
  const [ocupado, setOcupado] = useState(false);

  async function alternar() {
    const alvo = !salvo;
    setSalvo(alvo);
    setOcupado(true);
    try {
      const res = alvo
        ? await fetch("/api/salvos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tipo: "video", id: video.id, video }),
          })
        : await fetch(`/api/salvos?id=${encodeURIComponent(video.id)}`, {
            method: "DELETE",
          });
      if (!res.ok) setSalvo(!alvo);
    } catch {
      setSalvo(!alvo);
    } finally {
      setOcupado(false);
    }
  }

  return { salvo, ocupado, alternar };
}

/** Curtidas por visualização, em %. É o sinal de que o vídeo prendeu. */
export function engajamento(v: ItemBiblioteca): number {
  if (!v.visualizacoes) return 0;
  return (v.curtidas / v.visualizacoes) * 100;
}

/**
 * Faixas de leitura do engajamento. Os cortes seguem o que se considera bom
 * em vídeo curto: abaixo de 3% é fraco, acima de 8% é excepcional.
 */
export function corDoEngajamento(pct: number): string {
  if (pct >= 8) return "text-emerald-400";
  if (pct >= 4) return "text-zinc-300";
  return "text-zinc-600";
}

export function formatarNumero(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}mil`;
  return String(n);
}

export function tempoRelativo(iso: string): string {
  const dias = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000),
  );
  if (dias <= 0) return "hoje";
  if (dias === 1) return "1 dia";
  if (dias < 30) return `${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "1 mês" : `${meses} meses`;
}

export const PLATAFORMA: Record<
  ItemBiblioteca["plataforma"],
  { rotulo: string; cor: string }
> = {
  youtube: { rotulo: "YouTube", cor: "bg-red-600" },
  tiktok: { rotulo: "TikTok", cor: "bg-zinc-800" },
  instagram: { rotulo: "Instagram", cor: "bg-pink-600" },
};
