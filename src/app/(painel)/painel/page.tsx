import Link from "next/link";
import { ArrowRight, Broadcast } from "@phosphor-icons/react/dist/ssr";
import { SECOES, destinoDaSecao, destinoDoModulo } from "@/lib/modulos";
import { icone } from "../icones";
import { InicioHero } from "../inicio-hero";

export default function DashboardPage() {
  return (
    <div className="surgir">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Dashboard
        </h1>
        {/*
          O público mudou (docs/gta/plano-mestre.md §1): quem chega aqui não
          tem vídeo próprio — não grava, não aparece, não tem câmera. A
          pergunta dele não é "como corto" (isso o Analisador resolve
          sozinho), é "de onde tiro o material". O subtítulo responde a essa
          pergunta em vez de descrever a esteira de produção.
        */}
        <p className="mt-1.5 text-sm text-zinc-400">
          Sem vídeo seu? Comece pelas lives — é de lá que sai o seu primeiro
          corte.
        </p>
      </header>

      {/*
        A "primeira tela de quem não tem nada" (plano-mestre §5): antes do
        campo de link, que pressupõe que o usuário já tem um vídeo em mãos.
        Cartão liso, sem gradiente — o INICIOHERO logo abaixo já é a única
        superfície com degradê da tela, e o brandbook pede no máximo uma
        (docs/gta/tokens.css / identidade.md §1).
      */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
        <p className="placa text-[13px] text-orange-400">Comece por aqui</p>
        <h2 className="mt-1.5 text-lg font-semibold text-zinc-50 sm:text-xl">
          Sem gravar nada, veja quem está ao vivo agora
        </h2>
        <p className="mt-1.5 max-w-[58ch] text-sm text-zinc-400">
          O material do seu canal não precisa ser seu: são as lives de RP de
          GTA na Twitch e na Kick. Escolha uma, confirme que tem permissão de
          usar e cole o link do VOD assim que ela terminar.
        </p>
        <Link
          href="/lives"
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-orange-700 px-4 text-sm font-medium text-white transition hover:bg-orange-600 active:scale-[0.98]"
        >
          <Broadcast size={17} weight="bold" />
          Ver quem está ao vivo agora
        </Link>
      </div>

      <div className="mt-6">
        <p className="placa mb-2 text-[13px] text-zinc-400">
          Já tem um link?
        </p>
        <InicioHero />
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
        <span className="mt-0.5 text-base" aria-hidden>
          💡
        </span>
        <p className="max-w-[70ch]">
          Como funciona: você cola o link de uma live encerrada, VOD ou
          vídeo, a IA transcreve palavra por palavra, escolhe os melhores
          trechos e renderiza cortes 9:16 com legenda animada. O vídeo
          original fica no máximo 24h no servidor e é apagado — ficam só os
          cortes.
        </p>
      </div>

      <section className="mt-10">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-zinc-300">Por onde começar</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {SECOES.map((secao) => {
            const IconeSecao = icone(secao.icone);
            return (
              <div
                // bg-zinc-900 sólido, não /30: o brandbook define cartão como
                // #111111 chapado (docs/gta/tokens.css), e translúcido sobre
                // o fundo escurece isso pra quase invisível.
                key={secao.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
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
                        // zinc-400, não zinc-600: o ícone em repouso media
                        // 2,5:1 aqui e reprovava até o piso de 3:1 de
                        // não-texto.
                        className="text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-orange-500"
                      />
                    </p>
                    <p className="mt-0.5 text-sm text-zinc-400">{secao.descricao}</p>
                  </div>
                </Link>

                <ul className="mt-4 space-y-1">
                  {secao.modulos.map((m) => {
                    const Icone = icone(m.icone);
                    return (
                      <li key={m.slug}>
                        <Link
                          href={destinoDoModulo(m)}
                          // min-h-11 = 44px de alvo de toque, sem inflar o
                          // ícone nem o texto — só a área clicável da linha.
                          className="flex min-h-11 items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
                        >
                          <Icone size={16} className="shrink-0 text-zinc-500" />
                          <span className="min-w-0 flex-1 truncate">{m.rotulo}</span>
                          {m.principal && (
                            // 11px é o piso do brandbook (docs/gta/identidade.md
                            // §3: "nada abaixo de 11px"); 10px é a única
                            // exceção que ele proíbe explicitamente.
                            <span className="placa shrink-0 rounded-full bg-orange-950/60 px-1.5 py-0.5 text-[11px] text-orange-400">
                              principal
                            </span>
                          )}
                          {m.subs ? (
                            <span className="shrink-0 text-xs text-zinc-400">
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
