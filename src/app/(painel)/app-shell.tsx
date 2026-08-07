"use client";

import { useEffect, useRef, useState, ViewTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  List,
  X,
  House,
  CaretDown,
  CaretUpDown,
  SidebarSimple,
  User,
  Lock,
  SlidersHorizontal,
  SignOut,
} from "@phosphor-icons/react/dist/ssr";
import {
  SECOES,
  SECAO_CONTA,
  acharSecao,
  acharPai,
  destinoDaSecao,
  destinoDoModulo,
} from "@/lib/modulos";
import { icone } from "./icones";
import { Logo, Simbolo } from "../logo";
import { sair } from "../(site)/acoes-acesso";

/** Quem está logado — vem do layout do painel, que valida a sessão. */
type Usuario = { nome: string; email: string };

/** Preferência de lateral recolhida, lembrada entre visitas. */
const CHAVE_RECOLHIDA = "vsi:lateral-recolhida";

/**
 * Onde o painel começa.
 *
 * Já foi "/", quando o app morava na raiz. Depois que a landing tomou a raiz,
 * apontar pra lá mandava quem está logado pra página de VENDAS — que mostra
 * "Entrar / Começar" independente de sessão, então parecia deslogamento.
 */
const INICIO = "/painel";

/** Slug da rota atual — "" na raiz. */
function slugAtual(pathname: string): string {
  return pathname === "/" ? "" : pathname.split("/")[1];
}

/* ---------------------------------------------------------------- lateral */

function Lateral({
  recolhida,
  aoNavegar,
}: {
  recolhida?: boolean;
  aoNavegar?: () => void;
}) {
  const pathname = usePathname();
  const slug = slugAtual(pathname);
  const secaoAtiva = acharSecao(slug);
  const pai = acharPai(slug);
  const noInicio = pathname === INICIO;

  // Tudo aberto por padrão: com poucos blocos, o mapa inteiro à vista custa
  // menos que um clique pra descobrir o que existe. O estado guarda só o que
  // o usuário fechou na mão.
  const [manual, setManual] = useState<Record<string, boolean>>({});
  const expandido = (id: string) => manual[id] ?? true;

  const classeTopo = (ativo: boolean) =>
    "flex items-center gap-3 rounded-lg text-sm font-medium transition " +
    (recolhida ? "justify-center px-0 py-2.5 " : "px-3 py-2 ") +
    (ativo
      ? "bg-orange-600 text-white shadow-[0_2px_12px_rgb(255_62_2/0.35)]"
      : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100");

  return (
    // gap-1.5 entre blocos, não entre itens: o respiro fica ENTRE os grupos,
    // que é o que comunica hierarquia. Dentro do bloco os itens seguem
    // próximos, porque proximidade é o que diz "isto pertence àquilo".
    <nav className={"flex flex-col gap-1.5 " + (recolhida ? "px-2" : "px-2")}>
      <Link
        href={INICIO}
        onClick={aoNavegar}
        aria-current={noInicio ? "page" : undefined}
        title={recolhida ? "Dashboard" : undefined}
        className={classeTopo(noInicio)}
      >
        <House size={19} weight={noInicio ? "fill" : "regular"} />
        {!recolhida && "Dashboard"}
      </Link>

      {SECOES.map((secao) => {
        const ativa = secaoAtiva?.id === secao.id;
        const aberta = !recolhida && expandido(secao.id);
        const IconeSecao = icone(secao.icone);

        return (
          <div key={secao.id} className="group/bloco">
            <div className="relative">
              <Link
                href={destinoDaSecao(secao)}
                onClick={aoNavegar}
                aria-current={ativa ? "page" : undefined}
                title={recolhida ? secao.rotulo : undefined}
                className={classeTopo(ativa) + (recolhida ? "" : " pr-9")}
              >
                <IconeSecao size={19} weight={ativa ? "fill" : "regular"} />
                {!recolhida && secao.rotulo}
              </Link>

              {/* Alvo de clique separado: abre e fecha sem sair da página. */}
              {!recolhida && (
                <button
                  type="button"
                  onClick={() =>
                    setManual((p) => ({ ...p, [secao.id]: !expandido(secao.id) }))
                  }
                  aria-expanded={aberta}
                  aria-label={
                    (aberta ? "Recolher " : "Expandir ") + secao.rotulo
                  }
                  className={
                    "absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1 opacity-0 transition focus-visible:opacity-100 group-hover/bloco:opacity-100 " +
                    (ativa
                      ? "text-white/70 hover:bg-white/20"
                      : "text-zinc-500 hover:bg-white/10 hover:text-zinc-200")
                  }
                >
                  <CaretDown
                    size={11}
                    weight="bold"
                    className={
                      "transition-transform duration-200 " +
                      (aberta ? "rotate-0" : "-rotate-90")
                    }
                  />
                </button>
              )}
            </div>

            {/*
              Altura animada pelo truque de grid: 0fr -> 1fr transiciona sem
              precisar saber a altura final. `inert` tira os links fechados do
              foco e dos leitores de tela, já que eles seguem no DOM.
            */}
            {!recolhida && (
              <div
                className="grid transition-[grid-template-rows] duration-200 ease-out"
                style={{ gridTemplateRows: aberta ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <ul
                    inert={!aberta}
                    className="mt-1 mb-0.5 ml-[21px] space-y-0.5 border-l border-zinc-800/70 pl-2.5"
                  >
                    {secao.modulos.map((m) => {
                      const ativo = m.slug === slug || m === pai;
                      const Icone = icone(m.icone);
                      return (
                        <li key={m.slug}>
                          <Link
                            href={destinoDoModulo(m)}
                            onClick={aoNavegar}
                            aria-current={ativo ? "page" : undefined}
                            className={
                              "flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition " +
                              (ativo
                                ? "bg-white/[0.09] font-medium text-zinc-50"
                                : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300")
                            }
                          >
                            <Icone size={15} weight={ativo ? "fill" : "regular"} />
                            <span className="min-w-0 flex-1 truncate">{m.rotulo}</span>
                            {!m.pronto && !m.subs && (
                              <span
                                title="Em construção"
                                aria-label="Em construção"
                                className="h-1 w-1 shrink-0 rounded-full bg-zinc-700"
                              />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------- área conta */

const ITENS_CONTA = [
  { href: "/perfil", rotulo: "Perfil e dados", Icone: User },
  { href: "/seguranca", rotulo: "E-mail e senha", Icone: Lock },
  { href: "/preferencias", rotulo: "Preferências", Icone: SlidersHorizontal },
];

function AreaConta({
  usuario,
  recolhida,
  aoNavegar,
}: {
  usuario: Usuario;
  recolhida?: boolean;
  aoNavegar?: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const slug = slugAtual(pathname);
  const naConta = SECAO_CONTA.modulos.some((m) => m.slug === slug);

  // Fecha ao clicar fora ou apertar Esc — sem isso o menu fica preso aberto.
  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent) {
      if (caixa.current && !caixa.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  return (
    <div
      ref={caixa}
      className={
        "relative border-t border-zinc-800/60 " + (recolhida ? "p-2" : "px-2 py-2.5")
      }
    >
      {aberto && (
        <div
          role="menu"
          className={
            "absolute bottom-[calc(100%-0.25rem)] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl shadow-black/50 " +
            (recolhida ? "left-2 w-52" : "left-3 right-3")
          }
        >
          {ITENS_CONTA.map(({ href, rotulo, Icone }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => {
                setAberto(false);
                aoNavegar?.();
              }}
              className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-zinc-300 transition hover:bg-white/5"
            >
              <Icone size={16} className="text-zinc-500" />
              {rotulo}
            </Link>
          ))}
          <form action={sair}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 border-t border-zinc-800 px-3 py-2.5 text-left text-[13px] text-zinc-400 transition hover:bg-white/5"
            >
              <SignOut size={16} className="text-zinc-500" />
              Sair
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        title={recolhida ? `${usuario.nome} · conta` : undefined}
        className={
          "flex w-full items-center gap-2.5 rounded-lg transition " +
          (recolhida ? "justify-center py-2" : "px-2 py-2 text-left") +
          (naConta || aberto ? " bg-white/[0.09]" : " hover:bg-white/[0.06]")
        }
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-600 to-orange-800 text-[13px] font-semibold text-white">
          {(usuario.nome[0] ?? "?").toUpperCase()}
        </span>
        {!recolhida && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-zinc-200">
                {usuario.nome}
              </span>
              <span className="block truncate text-[11px] text-zinc-500">
                {usuario.email}
              </span>
            </span>
            <CaretUpDown size={15} className="shrink-0 text-zinc-500" />
          </>
        )}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- submenu */

/**
 * Segunda fileira, no topo da página. Mostra SÓ o submenu (nível 3) — os
 * módulos (nível 2) já vivem na lateral expandida, e repetir os dois lugares
 * criaria dois menus dizendo a mesma coisa.
 */
function Submenu() {
  const pathname = usePathname();
  const slug = slugAtual(pathname);
  const pai = acharPai(slug);
  const subs = pai?.subs ?? [];

  if (subs.length === 0) return null;

  return (
    <div className="sticky top-0 z-20 border-b border-zinc-800/80 bg-[var(--background)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3 sm:px-8">
        <span className="shrink-0 text-xs text-zinc-500">{pai?.rotulo}</span>
        <div
          role="tablist"
          aria-label={pai?.rotulo}
          className="flex gap-1.5 overflow-x-auto"
        >
          {subs.map((s) => {
            const ativo = s.slug === slug;
            const Icone = icone(s.icone);
            return (
              <Link
                key={s.slug}
                href={"/" + s.slug}
                role="tab"
                aria-selected={ativo}
                className={
                  "flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs transition " +
                  (ativo
                    ? "bg-zinc-800 font-medium text-zinc-100"
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300")
                }
              >
                <Icone size={14} weight={ativo ? "fill" : "regular"} />
                {s.rotulo}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ shell */

export function AppShell({
  children,
  usuario,
}: {
  children: React.ReactNode;
  usuario: Usuario;
}) {
  const pathname = usePathname();
  const [gaveta, setGaveta] = useState(false);
  const [recolhida, setRecolhida] = useState(false);

  // Lido depois da montagem: ler localStorage durante o render faria o HTML
  // do servidor divergir do cliente e quebrar a hidratação. É exatamente o
  // caso que a regra abaixo não cobre — sincronizar com um sistema externo
  // (o navegador) que só existe depois que a página monta.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecolhida(localStorage.getItem(CHAVE_RECOLHIDA) === "1");
  }, []);

  function alternarLateral() {
    setRecolhida((v) => {
      const novo = !v;
      localStorage.setItem(CHAVE_RECOLHIDA, novo ? "1" : "0");
      return novo;
    });
  }

  const marca = <Logo />;

  return (
    <div className="flex h-full">
      {/* Lateral fixa — desktop */}
      <aside
        // Nome de view transition = âncora espacial. Ver globals.css: o grupo
        // "lateral" fica congelado, então só o conteúdo se move na navegação.
        style={{ viewTransitionName: "lateral" }}
        // Mais escura que o conteúdo de propósito: a lateral recua, o
        // conteúdo avança. Antes era zinc-950/40 sobre um corpo #09090b — na
        // prática, a mesma cor, sem separação nenhuma.
        className={
          "hidden h-full shrink-0 flex-col border-r border-zinc-800/60 bg-[#060609] transition-[width] duration-300 ease-out lg:flex " +
          (recolhida ? "w-[68px]" : "w-60")
        }
      >
        {/*
          Marca e controle na mesma linha. Isso só passou a caber depois que o
          lockup perdeu o "IA": a 9,7:1 dividir a faixa derrubava a altura para
          ~21px; a 6,6:1 sobra espaço e o texto ainda fica em ~25px.

          px-5 alinha a ponta esquerda do play com os ícones do menu
          (nav px-2 + item px-3 = 20px).
        */}
        <div
          className={
            "flex items-center gap-3 pt-8 pb-8 " +
            (recolhida ? "flex-col gap-4 px-2" : "px-5")
          }
        >
          <Link
            href={INICIO}
            title={recolhida ? "Viral Farm" : undefined}
            aria-label="Viral Farm"
            className={
              "min-w-0 transition-opacity hover:opacity-80 " +
              (recolhida
                ? "flex h-9 items-center justify-center text-orange-600"
                : "flex-1")
            }
          >
            {recolhida ? <Simbolo tamanho={28} /> : marca}
          </Link>
          <button
            type="button"
            onClick={alternarLateral}
            aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
            title={recolhida ? "Expandir menu" : "Recolher menu"}
            className="shrink-0 rounded-lg p-1.5 text-zinc-600 transition hover:bg-white/[0.06] hover:text-zinc-300"
          >
            <SidebarSimple size={17} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-4">
          <Lateral recolhida={recolhida} />
        </div>

        <AreaConta usuario={usuario} recolhida={recolhida} />
      </aside>

      {/* Gaveta — mobile e tablet */}
      {gaveta && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Fechar menu"
            onClick={() => setGaveta(false)}
            className="absolute inset-0 bg-black/60"
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-zinc-800 bg-[#060609]">
            <div className="flex items-center gap-3 px-5 pt-8 pb-8">
              {/* max-w para casar com a lateral do desktop (~24px de altura):
                  sem ele o flex-1 estica o lockup para 27px e a marca muda de
                  tamanho conforme a tela, o que lê como descuido. */}
              <Link
                href={INICIO}
                onClick={() => setGaveta(false)}
                aria-label="Viral Farm"
                className="min-w-0 flex-1 transition-opacity hover:opacity-80"
              >
                <Logo className="max-w-[152px]" />
              </Link>
              <button
                onClick={() => setGaveta(false)}
                aria-label="Fechar menu"
                className="shrink-0 rounded-lg p-1 text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-300"
              >
                <X size={19} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pb-4">
              <Lateral aoNavegar={() => setGaveta(false)} />
            </div>
            <AreaConta usuario={usuario} aoNavegar={() => setGaveta(false)} />
          </aside>
        </div>
      )}

      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/*
          O max-w não é enfeite: o lockup é `w-full`, e num flex sem limite ele
          esticava para 299px de largura (45px de altura) — quase o dobro do
          logo da lateral no desktop. Travado em 132px ele fica em ~20px de
          altura, que é o tamanho certo para uma barra compacta.
        */}
        <header className="flex items-center gap-3 border-b border-zinc-800/60 px-4 py-4 lg:hidden">
          <button
            onClick={() => setGaveta(true)}
            aria-label="Abrir menu"
            className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <List size={20} />
          </button>
          <Link
            href={INICIO}
            aria-label="Viral Farm"
            className="min-w-0 transition-opacity hover:opacity-80"
          >
            <Logo className="max-w-[132px]" />
          </Link>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          {/*
            A `key` por rota é o que faz a transição disparar: sem ela o
            elemento nunca sai nem entra na árvore (o shell é fixo), então a
            navegação seria só um update e `enter`/`exit` não valeriam.
            `default="none"` mantém a animação restrita à navegação — abrir o
            menu de conta, por exemplo, não dispara nada.
          */}
          <ViewTransition
            key={pathname}
            enter="pagina-entra"
            exit="pagina-sai"
            default="none"
          >
            <div>
              <Submenu />
              <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
                {children}
              </div>
            </div>
          </ViewTransition>
        </main>
      </div>
    </div>
  );
}
