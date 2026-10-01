import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Cria-se um por pedido — nunca reutilizar entre pedidos.
 */
export async function createClient() {
  // cookies() primeiro: marca a rota como dinâmica antes de qualquer erro,
  // para o build nunca tentar pré-renderizar páginas que dependem da sessão.
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado a partir de um Server Component, onde não se podem
          // escrever cookies. O proxy já trata do refresh da sessão.
        }
      },
    },
  });
}
