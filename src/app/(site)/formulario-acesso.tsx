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

  // `h-11` (44px) em vez do `py-2.5` de antes: 2,5 de padding + linha de
  // texto ficava em ~40px, abaixo do alvo de toque mínimo que a identidade
  // exige (docs/gta/identidade.md §7). Campo de formulário é onde isso mais
  // importa — é onde a pessoa mais erra o toque no celular.
  const campo =
    "h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950/60 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-orange-600 focus:ring-4 focus:ring-orange-600/15";

  // Cadastro feito, falta o clique no e-mail: o formulário já cumpriu o
  // papel — mostrar só a instrução evita a pessoa reenviar sem querer.
  if (estado?.confirmarEmail) {
    return (
      // `role="status"`: essa tela substitui o formulário inteiro depois do
      // envio, e sem uma região viva quem usa leitor de tela não fica
      // sabendo que algo mudou — o foco continua onde estava, no botão que
      // já sumiu.
      <div
        role="status"
        className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4"
      >
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
          className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-zinc-700 px-4 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-white/[0.04] active:scale-[0.99] disabled:opacity-60"
        >
          <GoogleLogo size={17} weight="bold" />
          {cadastro ? "Criar conta com Google" : "Entrar com Google"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-zinc-800" />
        <span className="text-[11px] tracking-wide text-zinc-400 uppercase">
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
            // O erro do servidor não diz qual campo falhou (pode ser e-mail
            // OU senha), então os dois se anunciam como inválidos e apontam
            // pra mesma mensagem — melhor um leitor de tela avisar demais do
            // que a pessoa não descobrir por quê o login não passou.
            aria-invalid={Boolean(erro)}
            aria-describedby={erro ? "erro-acesso" : undefined}
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
              aria-invalid={Boolean(erro) || senhaCurta}
              aria-describedby={
                [erro && "erro-acesso", senhaCurta && "senha-dica"]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              className={campo + " pr-11"}
            />
            {/* Botão de 44×44 de verdade, não só o ícone de 17px: o `w-11
                h-11` preenche exatamente o `pr-11` reservado no input acima,
                então o alvo de toque cresce sem mexer no desenho. */}
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              className="absolute top-0 right-0 flex h-11 w-11 items-center justify-center text-zinc-400 transition hover:text-zinc-300"
            >
              {mostrarSenha ? <EyeSlash size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {senhaCurta && (
            <p id="senha-dica" className="mt-1.5 text-xs text-amber-500">
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
            {/* zinc-500 media 4,02:1 aqui — abaixo do mínimo de 4,5:1. */}
            <span className="text-xs leading-relaxed text-zinc-400">
              Aceito os termos de uso e a política de privacidade. Seus vídeos
              são processados e apagados — fica só a análise.
            </span>
          </label>
        )}

        {erro && (
          // `role="alert"` já é uma região viva implícita — o leitor de tela
          // anuncia sozinho assim que o erro aparece, sem precisar que a
          // pessoa navegue até aqui. O `id` é o alvo do `aria-describedby`
          // dos campos acima.
          <div
            id="erro-acesso"
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300"
          >
            <WarningCircle
              size={15}
              weight="fill"
              className="mt-px shrink-0 text-rose-500"
            />
            <p>{erro}</p>
          </div>
        )}

        {/*
          `bg-orange-600` com texto branco mede 3,39:1 — REPROVA para texto
          normal (precisa de 4,5:1). `bg-orange-700` mede 4,85:1 e passa; é a
          mesma cor da marca um degrau mais escuro, não uma cor nova. O brilho
          usa o token `--brilho-acao` (a cor certa da marca) em vez do rosa
          antigo `rgb(255 62 2)` que tinha ficado hardcoded aqui.
        */}
        <button
          type="submit"
          disabled={enviando}
          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-700 px-4 text-sm font-semibold text-white shadow-[var(--brilho-acao)] transition hover:bg-orange-800 active:scale-[0.99] disabled:opacity-60"
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
