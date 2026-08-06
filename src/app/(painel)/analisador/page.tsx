import type { Metadata } from "next";
import { Dashboard } from "../dashboard";
import { listarJobs } from "@/lib/jobs";

export const metadata: Metadata = { title: "Analisador" };

// Lê o histórico de análises do disco a cada visita.
export const dynamic = "force-dynamic";

export default async function AnalisadorPage({
  searchParams,
}: {
  searchParams: Promise<{ nicho?: string; link?: string }>;
}) {
  const { nicho, link } = await searchParams;

  return (
    <div>
      {/*
        Cabeçalho enxuto: a descrição longa empurrava o formulário — a coisa
        que a pessoa veio usar — para baixo da dobra. Duas linhas bastam, e o
        resto do contexto já vive dentro do próprio formulário.
      */}
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Analisador
        </h1>
        <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-zinc-500">
          Cole o link do seu material cru — sem edição, sem roteiro, sem
          precisar ter views. A IA lê o que dá pra aproveitar e escreve três
          roteiros a partir do que você já gravou.
        </p>
      </header>

      <Dashboard
        jobsIniciais={listarJobs()}
        nichoInicial={nicho}
        linkInicial={link}
      />
    </div>
  );
}
