import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { SECOES, destinoDaSecao, destinoDoModulo } from "@/lib/modulos";
import { icone } from "../icones";
import { InicioHero } from "../inicio-hero";

// Só as telas de produto: Perfil, Segurança e Preferências existem, mas são
// conta — contá-las aqui inflaria o número e daria uma impressão errada.
const MODULOS_PRODUTO = SECOES.flatMap((s) =>
  s.modulos.flatMap((m) => m.subs ?? [m]),
);
const PRONTOS = MODULOS_PRODUTO.filter((m) => m.pronto).length;

export default function DashboardPage() {
  return (
    <div className="surgir">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Do vídeo longo ao corte publicado — tudo num lugar só.
        </p>
      </header>

      <InicioHero />

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 text-sm text-zinc-400">
        <span className="mt-0.5 text-base" aria-hidden>
          💡
        </span>
        <p className="max-w-[70ch]">
          Como funciona: o link entra, a IA transcreve palavra por palavra,
          escolhe os melhores trechos e renderiza cortes 9:16 com legenda
          animada. O vídeo original fica no máximo 24h no servidor e é apagado —
          ficam só os cortes.
        </p>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-300">Por onde começar</h2>
          <span className="text-xs text-zinc-600">
            {PRONTOS} de {MODULOS_PRODUTO.length} módulos prontos
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SECOES.map((secao) => {
            const IconeSecao = icone(secao.icone);
            return (
              <div
                key={secao.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5"
              >
                <Link
                  href={destinoDaSecao(secao)}
                  className="group flex items-start gap-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800/80 text-zinc-300 transition group-hover:bg-orange-600 group-hover:text-white">
                    <IconeSecao size={20} weight="fill" />
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-semibold text-zinc-100">
                      {secao.rotulo}
                      <ArrowRight
                        size={14}
                        weight="bold"
                        className="text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-orange-500"
                      />
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-500">{secao.descricao}</p>
                  </div>
                </Link>

                <ul className="mt-4 space-y-1">
                  {secao.modulos.map((m) => {
                    const Icone = icone(m.icone);
                    return (
                      <li key={m.slug}>
                        <Link
                          href={destinoDoModulo(m)}
                          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
                        >
                          <Icone size={16} className="shrink-0 text-zinc-500" />
                          <span className="min-w-0 flex-1 truncate">{m.rotulo}</span>
                          {m.principal && (
                            <span className="shrink-0 rounded-full bg-orange-950/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-400">
                              principal
                            </span>
                          )}
                          {m.subs ? (
                            <span className="shrink-0 text-xs text-zinc-600">
                              {m.subs.length}
                            </span>
                          ) : m.pronto ? (
                            <span
                              title="Pronto pra usar"
                              aria-label="Pronto pra usar"
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                            />
                          ) : (
                            <span
                              title="Em construção"
                              aria-label="Em construção"
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-700"
                            />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
