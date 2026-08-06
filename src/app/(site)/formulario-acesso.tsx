"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Eye,
  EyeSlash,
  WarningCircle,
  GoogleLogo,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";

/**
 * Formulário de entrar e criar conta.
 *
 * NÃO autentica nada — não existe backend de sessão ainda. Os campos validam
 * de verdade (formato, tamanho, confirmação), mas o envio devolve um aviso
 * explícito de que falta conectar o Supabase.
 *
 * Foi decisão consciente não simular login: um formulário que "entra" sem
 * verificar credencial faria qualquer pessoa achar que tem conta, e esconderia
 * exatamente o trabalho que ainda falta. Quando o Supabase entrar, é trocar o
 * corpo de `enviar()` por signInWithPassword / signUp.
 */
export function FormularioAcesso({ modo }: { modo: "entrar" | "cadastro" }) {
  const cadastro = modo === "cadastro";

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [naoConectado, setNaoConectado] = useState(false);

  const senhaCurta = cadastro && senha.length > 0 && senha.length < 8;

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (cadastro && senha.length < 8) {
      setErro("A senha precisa de pelo menos 8 caracteres.");
      return;
    }
    if (cadastro && !aceite) {
      setErro("É preciso aceitar os termos para criar a conta.");
      return;
    }

    setNaoConectado(true);
  }

  const campo =
    "w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15";

  return (
    <>
      <button
        type="button"
        onClick={() => setNaoConectado(true)}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-white/[0.04] active:scale-[0.99]"
      >
        <GoogleLogo size={17} weight="bold" />
        {cadastro ? "Criar conta com Google" : "Entrar com Google"}
      </button>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-zinc-800" />
        <span className="text-[11px] tracking-wide text-zinc-600 uppercase">
          ou
        </span>
        <span className="h-px flex-1 bg-zinc-800" />
      </div>

      <form onSubmit={enviar} className="space-y-3.5">
        {cadastro && (
          <div>
            <label
              htmlFor="nome"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Como quer ser chamado
            </label>
            <input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              autoComplete="name"
              placeholder="Seu nome"
              className={campo}
            />
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-zinc-300"
          >
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="voce@exemplo.com"
            className={campo}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor="senha" className="text-sm font-medium text-zinc-300">
              Senha
            </label>
            {!cadastro && (
              <button
                type="button"
                onClick={() => setNaoConectado(true)}
                className="text-xs text-zinc-500 transition hover:text-orange-400"
              >
                Esqueci minha senha
              </button>
            )}
          </div>
          <div className="relative">
            <input
              id="senha"
              type={mostrarSenha ? "text" : "password"}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={cadastro ? 8 : undefined}
              autoComplete={cadastro ? "new-password" : "current-password"}
              placeholder={cadastro ? "Mínimo 8 caracteres" : "Sua senha"}
              className={campo + " pr-11"}
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-600 transition hover:text-zinc-300"
            >
              {mostrarSenha ? <EyeSlash size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {senhaCurta && (
            <p className="mt-1.5 text-xs text-amber-500">
              Faltam {8 - senha.length} caracteres.
            </p>
          )}
        </div>

        {cadastro && (
          <label className="flex cursor-pointer items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              checked={aceite}
              onChange={(e) => setAceite(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-600 bg-zinc-950 accent-orange-600"
            />
            <span className="text-xs leading-relaxed text-zinc-500">
              Aceito os termos de uso e a política de privacidade. Seus vídeos
              são processados e apagados — fica só a análise.
            </span>
          </label>
        )}

        {erro && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300">
            <WarningCircle
              size={15}
              weight="fill"
              className="mt-px shrink-0 text-rose-500"
            />
            <p>{erro}</p>
          </div>
        )}

        {/*
          O aviso honesto. Trocar por autenticação de verdade quando o
          Supabase estiver configurado.
        */}
        {naoConectado && (
          <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-3.5">
            <p className="text-xs leading-relaxed text-amber-200/90">
              <b className="font-semibold">Login ainda não está ligado.</b> A
              tela está pronta, mas falta conectar o Supabase — sem isso não há
              onde guardar conta nem sessão.
            </p>
            <Link
              href="/painel"
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-orange-400 transition hover:text-orange-300"
            >
              Ver o painel mesmo assim
              <ArrowRight size={12} weight="bold" />
            </Link>
          </div>
        )}

        <button
          type="submit"
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_16px_rgb(255_62_2/0.35)] transition hover:bg-orange-500 active:scale-[0.99]"
        >
          {cadastro ? "Criar conta" : "Entrar"}
        </button>
      </form>
    </>
  );
}
