import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Etapa } from "./analise/pipeline";
import type { SaidaDoPipeline } from "./analise/pipeline";

/**
 * Registro de análises, passadas e em andamento.
 *
 * PROVISÓRIO: persiste num JSON local (`data/analises.json`), não num banco.
 * Serve pro MVP rodando local e num único servidor, mas não escala pra mais
 * de uma instância nem tem controle de acesso por usuário. A Fase 1 do
 * PLANO_MVP troca isto por uma tabela no Supabase (`analises`) — a interface
 * abaixo foi desenhada pra essa troca não vazar pra API nem pra UI.
 */

type JobBase = { id: string; link: string; nicho: string; criado_em: number };

export type Job =
  | (JobBase & { status: "processando"; etapa: Etapa })
  | (JobBase & { status: "pronto"; resultado: SaidaDoPipeline })
  | (JobBase & { status: "erro"; mensagem: string });

const ARQUIVO = path.join(process.cwd(), "data", "analises.json");

function carregarDoDisco(): Map<string, Job> {
  let lista: Job[] = [];
  try {
    lista = JSON.parse(fs.readFileSync(ARQUIVO, "utf-8"));
  } catch {
    return new Map();
  }

  const agora = Date.now();
  const LIMITE_ORFA_MS = 10 * 60 * 1000;

  return new Map(
    lista.map((job) => {
      // Um job "processando" só existe enquanto o processo Node que o criou
      // está de pé. Se sobreviveu a um restart, ele nunca vai terminar.
      if (job.status === "processando" && agora - job.criado_em > LIMITE_ORFA_MS) {
        const orfa: Job = {
          id: job.id,
          link: job.link,
          nicho: job.nicho,
          criado_em: job.criado_em,
          status: "erro",
          mensagem: "Interrompida: o servidor reiniciou no meio da análise.",
        };
        return [job.id, orfa];
      }
      return [job.id, job];
    }),
  );
}

// Turbopack recarrega módulos em dev; sem o globalThis o mapa recarregaria
// do disco a cada edição de arquivo, perdendo atualizações ainda não salvas.
const store: Map<string, Job> =
  (globalThis as { __viralxJobs?: Map<string, Job> }).__viralxJobs ??
  ((globalThis as { __viralxJobs?: Map<string, Job> }).__viralxJobs = carregarDoDisco());

function salvarNoDisco() {
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  fs.writeFileSync(ARQUIVO, JSON.stringify([...store.values()]), "utf-8");
}

export function criarJob(link: string, nicho: string): string {
  const id = randomUUID();
  store.set(id, {
    id,
    link,
    nicho,
    status: "processando",
    etapa: "validando",
    criado_em: Date.now(),
  });
  salvarNoDisco();
  return id;
}

export function marcarEtapa(id: string, etapa: Etapa) {
  const job = store.get(id);
  if (job?.status === "processando") {
    store.set(id, { ...job, etapa });
    salvarNoDisco();
  }
}

export function concluir(id: string, resultado: SaidaDoPipeline) {
  const job = store.get(id);
  if (!job) return;
  store.set(id, {
    id: job.id,
    link: job.link,
    nicho: job.nicho,
    criado_em: job.criado_em,
    status: "pronto",
    resultado,
  });
  salvarNoDisco();
}

export function falhar(id: string, mensagem: string) {
  const job = store.get(id);
  if (!job) return;
  store.set(id, {
    id: job.id,
    link: job.link,
    nicho: job.nicho,
    criado_em: job.criado_em,
    status: "erro",
    mensagem,
  });
  salvarNoDisco();
}

export function lerJob(id: string): Job | null {
  return store.get(id) ?? null;
}

export function listarJobs(): Job[] {
  return [...store.values()].sort((a, b) => b.criado_em - a.criado_em);
}
