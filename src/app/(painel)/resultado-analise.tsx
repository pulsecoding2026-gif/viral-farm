"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Clock,
  User,
  Lightning,
  Megaphone,
  ThumbsUp,
  Warning,
  FilmSlate,
  Waveform,
  Scissors,
  BookmarkSimple,
} from "@phosphor-icons/react/dist/ssr";
import type { SaidaDoPipeline } from "@/lib/analise/pipeline";

/** Guarda a análise na Biblioteca. É o que faz o roteiro sobreviver à aba. */
function BotaoSalvar({
  id,
  saida,
  salvoInicial,
}: {
  id: string;
  saida: SaidaDoPipeline;
  salvoInicial: boolean;
}) {
  const [salvo, setSalvo] = useState(salvoInicial);
  const [ocupado, setOcupado] = useState(false);

  async function alternar() {
    const alvo = !salvo;
    setSalvo(alvo); // otimista
    setOcupado(true);
    try {
      const res = alvo
        ? await fetch("/api/salvos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tipo: "analise",
              id,
              titulo: saida.metadados.titulo,
              nicho: saida.analise.nicho_identificado,
              link: saida.metadados.url,
              qtd_roteiros: saida.analise.roteiros.length,
            }),
          })
        : await fetch(`/api/salvos?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
      if (!res.ok) setSalvo(!alvo);
    } catch {
      setSalvo(!alvo);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={ocupado}
      aria-pressed={salvo}
      className={
        "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition active:scale-[0.97] disabled:opacity-60 " +
        (salvo
          ? "border-orange-900/70 bg-orange-950/30 text-orange-400"
          : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200")
      }
    >
      <BookmarkSimple size={14} weight={salvo ? "fill" : "bold"} />
      {salvo ? "Na Biblioteca" : "Salvar"}
    </button>
  );
}

function Cartao({
  titulo,
  icone,
  children,
}: {
  titulo: string;
  icone?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 sm:p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
        {icone}
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function BotaoCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }}
      className={
        "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition active:scale-[0.97] " +
        (copiado
          ? "border-emerald-800 bg-emerald-950/40 text-emerald-400"
          : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200")
      }
    >
      {copiado ? <Check size={13} weight="bold" /> : <Copy size={13} />}
      {copiado ? "Copiado" : "Copiar roteiro"}
    </button>
  );
}

/** Dado bruto do vídeo, em linha. Números com tabular-nums pra não dançar. */
function Metrica({ icone, valor }: { icone: React.ReactNode; valor: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs tabular-nums text-zinc-500">
      {icone}
      {valor}
    </span>
  );
}

export function ResultadoAnalise({
  saida,
  jobId,
  salvoInicial = false,
}: {
  saida: SaidaDoPipeline;
  jobId?: string;
  salvoInicial?: boolean;
}) {
  const { analise, metadados, uso } = saida;

  return (
    <div className="surgir space-y-4">
      {/* Cabeçalho: o que foi analisado */}
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-orange-600/12 via-zinc-900/40 to-zinc-900/40">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
            <h2 className="min-w-0 flex-1 text-lg font-semibold leading-snug text-zinc-50">
              {metadados.titulo}
            </h2>
            <span className="shrink-0 rounded-full bg-orange-600/15 px-2.5 py-1 text-xs font-semibold text-orange-400">
              {analise.nicho_identificado}
            </span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <Metrica icone={<User size={13} />} valor={metadados.autor} />
            <Metrica icone={<Clock size={13} />} valor={`${metadados.duracao_s}s`} />
            {jobId && (
              <span className="ml-auto">
                <BotaoSalvar id={jobId} saida={saida} salvoInicial={salvoInicial} />
              </span>
            )}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-zinc-300">
            {analise.resumo}
          </p>
        </div>
      </div>

      {/* Os roteiros vêm ANTES do diagnóstico: é o que a pessoa veio buscar. */}
      <div className="space-y-4">
        {analise.roteiros.map((r, i) => {
          const textoCompleto = [
            r.titulo,
            ``,
            `HOOK: ${r.hook}`,
            ``,
            ...r.blocos.map((b) => `${b.tempo} — ${b.fala}\n   [visual] ${b.visual}`),
            ``,
            `CTA: ${r.cta}`,
          ].join("\n");

          return (
            <section
              key={i}
              className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40"
            >
              <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-orange-600 text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                    <h3 className="truncate font-semibold text-zinc-50">
                      {r.titulo}
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {r.angulo} · ~{r.duracao_estimada_s}s
                  </p>
                </div>
                <BotaoCopiar texto={textoCompleto} />
              </div>

              <div className="space-y-4 px-5 py-5 sm:px-6">
                <div className="rounded-xl border-l-2 border-orange-600 bg-orange-600/8 py-3 pl-4 pr-4">
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-orange-400">
                    <Lightning size={12} weight="fill" />
                    Gancho
                  </p>
                  <p className="text-sm font-medium leading-relaxed text-zinc-50">
                    {r.hook}
                  </p>
                </div>

                <ol className="space-y-3">
                  {r.blocos.map((b, j) => (
                    <li key={j} className="flex gap-3.5">
                      <span className="mt-0.5 shrink-0 rounded-md bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-zinc-400">
                        {b.tempo}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm leading-relaxed text-zinc-200">
                          {b.fala}
                        </p>
                        <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-zinc-500">
                          <FilmSlate size={13} className="mt-0.5 shrink-0" />
                          {b.visual}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="flex items-start gap-2 border-t border-zinc-800 pt-4">
                  <Megaphone size={15} className="mt-0.5 shrink-0 text-zinc-500" />
                  <p className="text-sm text-zinc-300">
                    <span className="font-medium text-zinc-400">CTA:</span>{" "}
                    {r.cta}
                  </p>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Diagnóstico do material — o "porquê" por trás dos roteiros. */}
      <Cartao
        titulo="Momentos aproveitáveis"
        icone={<Scissors size={15} className="text-zinc-500" />}
      >
        <ol className="space-y-3">
          {analise.momentos_utilizaveis.map((m, i) => (
            <li key={i} className="flex gap-3.5">
              <span className="mt-0.5 shrink-0 rounded-md bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-zinc-400">
                {m.inicio_s}–{m.fim_s}s
              </span>
              <div className="min-w-0">
                <p className="text-sm leading-relaxed text-zinc-200">
                  {m.o_que_mostra}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                  {m.como_usar}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Cartao>

      <div className="grid gap-4 lg:grid-cols-2">
        <Cartao
          titulo="O que tem no material"
          icone={<FilmSlate size={15} className="text-zinc-500" />}
        >
          <dl className="space-y-3.5 text-sm">
            {[
              ["O que acontece", analise.conteudo.o_que_acontece],
              ["Cenário", analise.conteudo.cenario],
              ["Quem ou o que aparece", analise.conteudo.pessoas_ou_objetos],
              ["Qualidade", analise.conteudo.qualidade_do_material],
            ].map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {rotulo}
                </dt>
                <dd className="mt-1 leading-relaxed text-zinc-300">{valor}</dd>
              </div>
            ))}
          </dl>
        </Cartao>

        <div className="space-y-4">
          <Cartao
            titulo="Áudio original"
            icone={<Waveform size={15} className="text-zinc-500" />}
          >
            <div className="mb-3 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                {analise.audio.tem_fala ? "Tem fala" : "Sem fala"}
              </span>
              <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                {analise.audio.tem_musica_ambiente
                  ? "Tem som ambiente"
                  : "Sem som ambiente"}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-zinc-300">
              {analise.audio.aproveitavel}
            </p>
          </Cartao>

          <Cartao titulo="Avaliação">
            <div className="space-y-4">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-500">
                  <ThumbsUp size={13} weight="fill" />A favor
                </p>
                <ul className="space-y-1.5">
                  {analise.avaliacao.pontos_fortes.map((p, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm leading-relaxed text-zinc-300"
                    >
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-emerald-600" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-500">
                  <Warning size={13} weight="fill" />
                  Limitações
                </p>
                <ul className="space-y-1.5">
                  {analise.avaliacao.limitacoes.map((p, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-sm leading-relaxed text-zinc-300"
                    >
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-amber-600" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Cartao>
        </div>
      </div>

      <p className="pt-1 text-center text-xs tabular-nums text-zinc-600">
        {(saida.duracao_total_ms / 1000).toFixed(0)}s · US${" "}
        {uso.custo_usd_estimado.toFixed(3)} · {uso.tokens_entrada.toLocaleString("pt-BR")}{" "}
        tokens de entrada
      </p>
    </div>
  );
}
