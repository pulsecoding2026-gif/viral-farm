import type { Metadata } from "next";
import Link from "next/link";
import { Broadcast, Target, ArrowRight } from "@phosphor-icons/react/dist/ssr";
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

        O texto mudou de público: a versão antiga falava com quem já grava
        ("uma gravação", "seu vídeo") — a pessoa da GTA VIRAL monta um canal
        de cortes com live de RP de outra pessoa (Twitch/Kick), não com
        material próprio. "Cole o link" continua sendo a promessa, mas agora
        nomeia de onde esse link costuma vir.
      */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
          Analisador
        </h1>
        <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed text-[var(--texto-2)]">
          Cole o link de uma live de RP da Twitch ou da Kick — ou de qualquer
          vídeo longo de GTA. A IA acha os melhores momentos e devolve cortes
          9:16 com legenda animada, prontos pra postar no seu canal.
        </p>
      </header>

      {/*
        O ESTADO VAZIO É A PRIMEIRA TELA DE QUEM ACABOU DE CRIAR CONTA.

        Sem análise nenhuma no histórico, a pergunta de quem chega não é
        "como eu corto" — é "de onde eu tiro o vídeo": ele não streama, não
        grava, só quer montar canal com material de terceiro. Emburrar essa
        resposta pra dentro do formulário (que já assume que a pessoa TEM um
        link na mão) deixa quem não tem nada sem rumo, e é exatamente o
        motivo dela sair sem tentar de novo. Este bloco só aparece uma vez —
        assim que existe histórico, o Analisador já provou o que faz e o
        aviso vira ruído.
      */}
      {jobs.length === 0 && (
        <div className="surgir mb-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30">
          <div className="grid gap-0 sm:grid-cols-[1.1fr_1fr]">
            <div className="border-b border-zinc-800 p-5 sm:border-r sm:border-b-0 sm:p-6">
              <p className="placa text-xs text-orange-400">Primeira vez aqui</p>
              <h2 className="mt-1.5 text-base font-bold text-zinc-50">
                Ainda não tem link pra colar?
              </h2>
              <p className="mt-1.5 max-w-[46ch] text-sm leading-relaxed text-[var(--texto-2)]">
                Você não precisa gravar nada. Pegue o link de uma transmissão
                sua ou de alguém que te deu permissão pra clipar — a live de
                hoje é o corte de amanhã.
              </p>
            </div>
            <div className="flex flex-col divide-y divide-zinc-800/70 sm:divide-y-0">
              <Link
                href="/lives"
                className="group flex items-center gap-3 p-4 transition hover:bg-white/[0.04] sm:p-5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fuchsia-600/15 text-fuchsia-400">
                  <Broadcast size={18} weight="fill" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-100">
                    Lives
                  </span>
                  <span className="block truncate text-xs text-[var(--texto-3)]">
                    Quem está transmitindo GTA agora
                  </span>
                </span>
                <ArrowRight
                  size={15}
                  className="shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-400"
                />
              </Link>
              <Link
                href="/radar-viral"
                className="group flex items-center gap-3 p-4 transition hover:bg-white/[0.04] sm:p-5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/15 text-blue-400">
                  <Target size={18} weight="fill" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-100">
                    Radar Viral
                  </span>
                  <span className="block truncate text-xs text-[var(--texto-3)]">
                    O que já está bombando, pra saber o que cortar
                  </span>
                </span>
                <ArrowRight
                  size={15}
                  className="shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-400"
                />
              </Link>
            </div>
          </div>
          <p className="border-t border-zinc-800 bg-zinc-950/40 px-5 py-3 text-xs leading-relaxed text-[var(--texto-3)] sm:px-6">
            Vídeo longo leva alguns minutos pra processar — pode colar o link
            abaixo e voltar depois, o trabalho continua no servidor.
          </p>
        </div>
      )}

      <Dashboard
        jobsIniciais={jobs}
        nichoInicial={nicho}
        linkInicial={link}
      />
    </div>
  );
}
