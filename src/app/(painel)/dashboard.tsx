"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  ClockCounterClockwise,
  ArrowLeft,
} from "@phosphor-icons/react/dist/ssr";
import type { JobAnalise } from "@/lib/analises-db";
import { PainelErro } from "./painel-erro";
import { HistoricoAnalises } from "./historico-analises";
import { FormularioNovaAnalise } from "./formulario-nova-analise";
import { PainelProgresso } from "./painel-progresso";
import { ResultadoCortes } from "./resultado-cortes";
import { EstudioCortes } from "./estudio-cortes";

type Aba = "nova" | "historico";

export function Dashboard({
  jobsIniciais,
  nichoInicial,
  linkInicial,
}: {
  jobsIniciais: JobAnalise[];
  nichoInicial?: string;
  linkInicial?: string;
}) {
  // Vem pronto do servidor. Antes isto era um fetch em useEffect na montagem:
  // a tela pintava vazia e só então mostrava o histórico.
  const [jobs, setJobs] = useState<JobAnalise[]>(jobsIniciais);
  const [idSelecionado, setIdSelecionado] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("nova");
  const pollAtualRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollListaRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const carregarLista = useCallback(async () => {
    const r = await fetch("/api/analises", { cache: "no-store" });
    if (!r.ok) return;
    const lista: JobAnalise[] = await r.json();
    // A lista vem LEVE, sem os cortes (são carregados só no detalhe). Fundir
    // preservando os cortes que já temos em memória: substituir cegamente
    // apagava os cortes do vídeo aberto, o detalhe recarregava, e a lista
    // apagava de novo no próximo ciclo — a tela piscava em loop.
    setJobs((prev) => {
      const cortesCarregados = new Map(
        prev.filter((j) => j.cortes).map((j) => [j.id, j.cortes]),
      );
      return lista.map((j) =>
        cortesCarregados.has(j.id)
          ? { ...j, cortes: cortesCarregados.get(j.id) }
          : j,
      );
    });
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
      const atualizado: JobAnalise = await r.json();
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

  // Análise aberta pelo histórico chega sem os cortes (a lista é leve).
  // Uma busca única no detalhe completa — e o mesmo cobre as transições
  // processando → revisao/pronto, que o polling acima entrega com cortes.
  useEffect(() => {
    if (
      !idSelecionado ||
      (jobAtual?.status !== "pronto" && jobAtual?.status !== "revisao") ||
      jobAtual.cortes
    ) {
      return;
    }
    let cancelado = false;
    (async () => {
      const r = await fetch(`/api/analises/${idSelecionado}`, {
        cache: "no-store",
      });
      if (!r.ok || cancelado) return;
      const detalhe: JobAnalise = await r.json();
      setJobs((prev) => prev.map((j) => (j.id === detalhe.id ? detalhe : j)));
    })();
    return () => {
      cancelado = true;
    };
  }, [idSelecionado, jobAtual?.status, jobAtual?.cortes]);

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
        ) : jobAtual.status === "revisao" ? (
          <EstudioCortes
            job={jobAtual}
            onEnviado={() => {
              // Volta pro fluxo de progresso: o worker assume daqui.
              setJobs((prev) =>
                prev.map((j) =>
                  j.id === jobAtual.id
                    ? {
                        ...j,
                        status: "processando",
                        etapa: "renderizar_aprovados",
                        cortes: undefined,
                      }
                    : j,
                ),
              );
            }}
          />
        ) : jobAtual.status === "erro" ? (
          <PainelErro
            job={jobAtual}
            onOutroLink={abrirNova}
            onRetomado={() => {
              setJobs((prev) =>
                prev.map((j) =>
                  j.id === jobAtual.id
                    ? {
                        ...j,
                        status: "processando",
                        etapa: "na_fila",
                        mensagem: null,
                        resultado: null,
                        cortes: undefined,
                      }
                    : j,
                ),
              );
            }}
          />
        ) : (
          <ResultadoCortes
            job={jobAtual}
            onReeditado={() => {
              // O corte voltou pra esteira: reativa o fluxo de progresso.
              setJobs((prev) =>
                prev.map((j) =>
                  j.id === jobAtual.id
                    ? {
                        ...j,
                        status: "processando",
                        etapa: "renderizar_aprovados",
                        cortes: undefined,
                      }
                    : j,
                ),
              );
            }}
          />
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
                etapa: "na_fila",
                criado_em: Date.now(),
                mensagem: null,
                resultado: null,
                opcoes: novo.opcoes,
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
