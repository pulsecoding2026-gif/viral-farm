"use client";

import { useActionState, useState } from "react";
import {
  Eye,
  EyeSlash,
  WarningCircle,
  GoogleLogo,
  EnvelopeSimple,
  CircleNotch,
} from "@phosphor-icons/react/dist/ssr";
import {
  entrar,
  cadastrar,
  entrarComGoogle,
  type EstadoAcesso,
} from "./acoes-acesso";

/**
 * Formulário de entrar e criar conta — ligado no Supabase de verdade.
 *
 * A validação de formato continua no cliente (resposta imediata), mas a
 * decisão é sempre da Server Action: credencial não passa por JS de cliente
 * e o erro que aparece é o que o servidor devolveu, traduzido.
 */
export function FormularioAcesso({ modo }: { modo: "entrar" | "cadastro" }) {
  const cadastro = modo === "cadastro";

  const [estado, agir, enviando] = useActionState<EstadoAcesso, FormData>(
    cadastro ? cadastrar : entrar,
    null,
  );
  const [estadoGoogle, agirGoogle, enviandoGoogle] = useActionState<
    EstadoAcesso,
    FormData
  >(entrarComGoogle, null);

  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const senhaCurta = cadastro && senha.length > 0 && senha.length < 8;
  const erro = estado?.erro ?? estadoGoogle?.erro;

  const campo =
    "w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15";

  // Cadastro feito, falta o clique no e-mail: o formulário já cumpriu o
  // papel — mostrar só a instrução evita a pessoa reenviar sem querer.
  if (estado?.confirmarEmail) {
    return (
      <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4">
        <p className="flex items-start gap-2.5 text-sm leading-relaxed text-emerald-200/90">
          <EnvelopeSimple
            size={17}
            weight="fill"
            className="mt-0.5 shrink-0 text-emerald-500"
          />
          <span>
            <b className="font-semibold">Conta criada!</b> Enviamos um link de
            confirmação pro seu e-mail. Clique nele e você cai direto no
            painel.
          </span>
        </p>
      </div>
    );
  }

  return (
    <>
      <form action={agirGoogle}>
        <button
          type="submit"
          disabled={enviandoGoogle}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-white/[0.04] active:scale-[0.99] disabled:opacity-60"
        >
          <GoogleLogo size={17} weight="bold" />
          {cadastro ? "Criar conta com Google" : "Entrar com Google"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-zinc-800" />
        <span className="text-[11px] tracking-wide text-zinc-600 uppercase">
          ou
        </span>
        <span className="h-px flex-1 bg-zinc-800" />
      </div>

      <form action={agir} className="space-y-3.5">
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
              name="nome"
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
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="voce@exemplo.com"
            className={campo}
          />
        </div>

        <div>
          <label
            htmlFor="senha"
            className="mb-1.5 block text-sm font-medium text-zinc-300"
          >
            Senha
          </label>
          <div className="relative">
            <input
              id="senha"
              name="senha"
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
              name="aceite"
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

        <button
          type="submit"
          disabled={enviando}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_16px_rgb(255_62_2/0.35)] transition hover:bg-orange-500 active:scale-[0.99] disabled:opacity-60"
        >
          {enviando && (
            <CircleNotch size={16} weight="bold" className="animate-spin" />
          )}
          {enviando
            ? cadastro
              ? "Criando conta…"
              : "Entrando…"
            : cadastro
              ? "Criar conta"
              : "Entrar"}
        </button>
      </form>
    </>
  );
}
