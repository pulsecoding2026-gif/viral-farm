"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  WarningCircle,
  Plus,
  ClockCounterClockwise,
  ArrowLeft,
} from "@phosphor-icons/react/dist/ssr";
import type { Job } from "@/lib/jobs";
import { HistoricoAnalises } from "./historico-analises";
import { FormularioNovaAnalise } from "./formulario-nova-analise";
import { PainelProgresso } from "./painel-progresso";
import { ResultadoAnalise } from "./resultado-analise";

type Aba = "nova" | "historico";

export function Dashboard({
  jobsIniciais,
  nichoInicial,
  linkInicial,
}: {
  jobsIniciais: Job[];
  nichoInicial?: string;
  linkInicial?: string;
}) {
  // Vem pronto do servidor. Antes isto era um fetch em useEffect na montagem:
  // a tela pintava vazia e só então mostrava o histórico.
  const [jobs, setJobs] = useState<Job[]>(jobsIniciais);
  const [idSelecionado, setIdSelecionado] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("nova");
  const pollAtualRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollListaRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const carregarLista = useCallback(async () => {
    const r = await fetch("/api/analises", { cache: "no-store" });
    if (r.ok) setJobs(await r.json());
  }, []);

  const jobAtual = jobs.find((j) => j.id === idSelecionado) ?? null;

  // Enquanto qualquer análise estiver em andamento, a lista inteira é
  // reconsultada de tempos em tempos — cobre reabrir a aba com uma análise
  // ainda rodando em background no servidor.
  useEffect(() => {
    const temProcessando = jobs.some((j) => j.status === "processando");
    if (!temProcessando) return;

    pollListaRef.current = setInterval(carregarLista, 4000);
    return () => {
      if (pollListaRef.current) clearInterval(pollListaRef.current);
    };
  }, [jobs, carregarLista]);

  // Polling rápido só da análise aberta no momento, pro painel de progresso
  // reagir etapa a etapa sem esperar o ciclo de 4s da lista.
  useEffect(() => {
    if (!idSelecionado || jobAtual?.status !== "processando") return;

    pollAtualRef.current = setInterval(async () => {
      const r = await fetch(`/api/analises/${idSelecionado}`, {
        cache: "no-store",
      });
      if (!r.ok) return;
      const atualizado: Job = await r.json();
      setJobs((prev) =>
        prev.some((j) => j.id === atualizado.id)
          ? prev.map((j) => (j.id === atualizado.id ? atualizado : j))
          : [atualizado, ...prev],
      );
    }, 1500);

    return () => {
      if (pollAtualRef.current) clearInterval(pollAtualRef.current);
    };
  }, [idSelecionado, jobAtual?.status]);

  function abrirNova() {
    setIdSelecionado(null);
    setAba("nova");
  }

  /* --------------------------------------------------------- análise aberta */

  // Com uma análise aberta, ela ocupa a tela inteira: é o conteúdo, não um
  // painel ao lado de um menu. O caminho de volta fica explícito no topo.
  if (jobAtual) {
    return (
      <div>
        <div className="mb-5 flex items-center gap-2">
          <button
            type="button"
            onClick={abrirNova}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-100"
          >
            <ArrowLeft size={15} />
            Nova análise
          </button>
          {jobs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setIdSelecionado(null);
                setAba("historico");
              }}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-100"
            >
              <ClockCounterClockwise size={15} />
              Histórico
              <span className="tabular-nums text-zinc-600">{jobs.length}</span>
            </button>
          )}
        </div>

        {jobAtual.status === "processando" ? (
          <PainelProgresso etapa={jobAtual.etapa} />
        ) : jobAtual.status === "erro" ? (
          <div className="surgir flex items-start gap-3 rounded-2xl border border-rose-900/60 bg-rose-950/25 p-5 text-sm text-rose-300">
            <WarningCircle
              size={19}
              weight="fill"
              className="mt-0.5 shrink-0 text-rose-500"
            />
            <div>
              <p className="font-medium text-rose-200">A análise falhou</p>
              <p className="mt-1 leading-relaxed">{jobAtual.mensagem}</p>
            </div>
          </div>
        ) : (
          <ResultadoAnalise saida={jobAtual.resultado} jobId={jobAtual.id} />
        )}
      </div>
    );
  }

  /* ------------------------------------------------------- nova / histórico */

  const abas: { id: Aba; rotulo: string; icone: typeof Plus; contador?: number }[] = [
    { id: "nova", rotulo: "Nova análise", icone: Plus },
    {
      id: "historico",
      rotulo: "Histórico",
      icone: ClockCounterClockwise,
      contador: jobs.length,
    },
  ];

  return (
    <div>
      {/* Segmentado no lugar da coluna lateral: a lista de análises só ganha
          espaço quando é ela que você quer ver. */}
      <div
        role="tablist"
        aria-label="Analisador"
        className="mb-5 inline-flex gap-0.5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-1"
      >
        {abas.map((a) => {
          const ativa = a.id === aba;
          const Icone = a.icone;
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={() => setAba(a.id)}
              className={
                "flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition " +
                (ativa
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-300")
              }
            >
              <Icone size={15} weight={ativa ? "fill" : "regular"} />
              {a.rotulo}
              {a.contador !== undefined && a.contador > 0 && (
                <span
                  className={
                    "rounded-full px-1.5 text-[11px] tabular-nums " +
                    (ativa ? "bg-zinc-700 text-zinc-200" : "bg-zinc-800 text-zinc-500")
                  }
                >
                  {a.contador}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {aba === "nova" ? (
        <FormularioNovaAnalise
          nichoInicial={nichoInicial}
          linkInicial={linkInicial}
          onCriada={(novo) => {
            setJobs((prev) => [
              {
                id: novo.id,
                link: novo.link,
                nicho: novo.nicho,
                status: "processando",
                etapa: "validando",
                criado_em: Date.now(),
              },
              ...prev,
            ]);
            setIdSelecionado(novo.id);
          }}
        />
      ) : (
        <HistoricoAnalises
          jobs={jobs}
          idSelecionado={idSelecionado}
          onSelecionar={setIdSelecionado}
          onNova={abrirNova}
        />
      )}
    </div>
  );
}
