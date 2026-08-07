import type { Metadata } from "next";
import { Dashboard } from "../dashboard";
import { clienteSupabase } from "@/lib/supabase/servidor";
import { listarAnalises } from "@/lib/analises-db";

export const metadata: Metadata = { title: "Analisador" };

// Histórico vem do banco a cada visita — nada de cache de outra pessoa.
export const dynamic = "force-dynamic";

export default async function AnalisadorPage({
  searchParams,
}: {
  searchParams: Promise<{ nicho?: string; link?: string }>;
}) {
  const { nicho, link } = await searchParams;

  const supabase = await clienteSupabase();
  const jobs = await listarAnalises(supabase);

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
          Cole o link de um vídeo — seu ou uma live, um podcast, uma gravação
          longa. A IA acha os melhores momentos e devolve cortes 9:16 com
          legenda animada, prontos pra postar.
        </p>
      </header>

      <Dashboard
        jobsIniciais={jobs}
        nichoInicial={nicho}
        linkInicial={link}
      />
    </div>
  );
}
