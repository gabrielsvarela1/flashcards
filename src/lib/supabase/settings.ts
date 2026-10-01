import "server-only";
import { getSupabaseEnv } from "./env";

/**
 * Indica se o login com Google está ligado no projeto Supabase
 * (Authentication → Sign In / Providers). Assim o botão aparece sozinho
 * quando o fornecedor é configurado, sem variáveis de ambiente.
 */
export async function isGoogleLoginEnabled() {
  try {
    const { url, anonKey } = getSupabaseEnv();
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anonKey },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const settings = (await res.json()) as { external?: { google?: boolean } };
    return settings.external?.google === true;
  } catch {
    return false;
  }
}
