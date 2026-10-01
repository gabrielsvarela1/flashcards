"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-redirect";

export type AuthState = { error?: string; message?: string };

const errorMessages: Record<string, string> = {
  invalid_credentials: "Email ou palavra-passe incorretos.",
  email_not_confirmed: "Confirma o teu email antes de entrar.",
  user_already_exists: "Já existe uma conta com este email.",
  weak_password: "A palavra-passe é demasiado fraca.",
  over_email_send_rate_limit:
    "Demasiados emails enviados. Tenta novamente daqui a pouco.",
  over_request_rate_limit: "Demasiadas tentativas. Tenta novamente daqui a pouco.",
};

function translate(code: string | undefined) {
  return (code && errorMessages[code]) || "Algo correu mal. Tenta novamente.";
}

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Preenche email e palavra-passe." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translate(error.code) };

  redirect(safeNext(formData.get("next")));
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Preenche email e palavra-passe." };
  if (password.length < 6) {
    return { error: "A palavra-passe precisa de pelo menos 6 caracteres." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await getOrigin()}/auth/confirm` },
  });
  if (error) return { error: translate(error.code) };

  // Com a confirmação de email desligada, o Supabase devolve logo uma sessão.
  if (data.session) redirect("/decks");

  return {
    message: `Enviámos um link de confirmação para ${email}. Abre-o para ativar a conta.`,
  };
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Indica o teu email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getOrigin()}/auth/recovery`,
  });
  // Só os limites de envio são mostrados: dizer que o email não existe
  // revelava quem tem conta.
  if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
    return { error: translate(error.code) };
  }

  return {
    message: `Se existir uma conta com ${email}, enviámos um link para definires uma nova palavra-passe.`,
  };
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await getOrigin()}/auth/confirm` },
  });
  redirect(error || !data.url ? "/login?error=google" : data.url);
}

async function getOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
