import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/**
 * Renova a sessão do Supabase (se o token expirou) e propaga os cookies
 * atualizados para o pedido e para a resposta.
 */
export async function updateSession(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // Não pôr código entre createServerClient e getClaims(): é esta chamada
  // que valida o JWT e dispara o refresh quando necessário.
  const { data } = await supabase.auth.getClaims();

  return { response, user: data?.claims ?? null };
}
