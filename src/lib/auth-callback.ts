import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-redirect";

/**
 * Abre a sessão a partir de um link do Supabase (email ou OAuth) e
 * redireciona. Suporta os dois formatos:
 * - ?code=…              (template padrão do Supabase e OAuth, fluxo PKCE)
 * - ?token_hash=…&type=… (template personalizado, funciona noutro dispositivo)
 */
export async function completeAuth(request: NextRequest, defaultNext: string, errorCode: string) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"), defaultNext);

  const supabase = await createClient();

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }

  return NextResponse.redirect(new URL(ok ? next : `/login?error=${errorCode}`, origin));
}
