import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Cria-se um por pedido — nunca reutilizar entre pedidos.
 */
export async function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

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
