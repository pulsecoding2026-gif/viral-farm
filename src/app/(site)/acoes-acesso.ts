"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { clienteSupabase } from "@/lib/supabase/servidor";

/**
 * Autenticação de verdade — Server Actions chamadas pelos formulários de
 * entrar e criar conta. Sempre no servidor: credencial não passa por
 * JavaScript de cliente.
 */

export type EstadoAcesso = {
  erro?: string;
  /** Cadastro feito mas falta clicar no link do e-mail. */
  confirmarEmail?: boolean;
} | null;

/** Mensagens do Supabase que valem tradução — o resto cai no genérico. */
const ERROS: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed:
    "Esse e-mail ainda não foi confirmado — procure o link na sua caixa de entrada.",
  user_already_exists: "Já existe uma conta com esse e-mail. Tente entrar.",
  email_exists: "Já existe uma conta com esse e-mail. Tente entrar.",
  weak_password: "A senha precisa de pelo menos 8 caracteres.",
  over_request_rate_limit:
    "Muitas tentativas seguidas. Espere um minuto e tente de novo.",
  validation_failed: "Confira o e-mail digitado — o formato não parece válido.",
};

/** Mensagens em inglês que o GoTrue devolve quando não manda `code`. */
const ERROS_POR_MENSAGEM: [RegExp, string][] = [
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/email not confirmed/i, ERROS.email_not_confirmed],
  [/already registered|already exists/i, ERROS.user_already_exists],
  [/password should be at least/i, ERROS.weak_password],
  [/rate limit/i, ERROS.over_request_rate_limit],
  [/is invalid/i, ERROS.validation_failed],
];

function traduzir(
  erro: { code?: string; message: string },
  fallback: string,
): string {
  if (erro.code && ERROS[erro.code]) return ERROS[erro.code];
  const porMensagem = ERROS_POR_MENSAGEM.find(([re]) => re.test(erro.message));
  return porMensagem?.[1] ?? fallback;
}

export async function entrar(
  _anterior: EstadoAcesso,
  dados: FormData,
): Promise<EstadoAcesso> {
  const email = String(dados.get("email") ?? "").trim();
  const senha = String(dados.get("senha") ?? "");
  if (!email || !senha) return { erro: "Preencha e-mail e senha." };

  const supabase = await clienteSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    return { erro: traduzir(error, "Não deu pra entrar. Tente de novo.") };
  }

  redirect("/painel");
}

export async function cadastrar(
  _anterior: EstadoAcesso,
  dados: FormData,
): Promise<EstadoAcesso> {
  const nome = String(dados.get("nome") ?? "").trim();
  const email = String(dados.get("email") ?? "").trim();
  const senha = String(dados.get("senha") ?? "");

  if (!nome) return { erro: "Diga como quer ser chamado." };
  if (senha.length < 8)
    return { erro: "A senha precisa de pelo menos 8 caracteres." };
  if (!dados.get("aceite"))
    return { erro: "É preciso aceitar os termos para criar a conta." };

  const origem = (await headers()).get("origin") ?? "";
  const supabase = await clienteSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome },
      emailRedirectTo: `${origem}/auth/callback`,
    },
  });

  if (error) {
    return { erro: traduzir(error, "Não deu pra criar a conta. Tente de novo.") };
  }

  // Com confirmação de e-mail ligada o signUp devolve user sem session —
  // aí o próximo passo é o link na caixa de entrada, não o painel.
  if (!data.session) return { confirmarEmail: true };

  redirect("/painel");
}

export async function entrarComGoogle(): Promise<EstadoAcesso> {
  const origem = (await headers()).get("origin") ?? "";
  const supabase = await clienteSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origem}/auth/callback` },
  });

  if (error || !data.url) {
    return {
      erro:
        "Login com Google ainda não está habilitado no projeto. Use e-mail e senha.",
    };
  }

  redirect(data.url);
}

export async function sair(): Promise<void> {
  const supabase = await clienteSupabase();
  await supabase.auth.signOut();
  redirect("/entrar");
}
