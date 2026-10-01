import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Garante sessão em Server Components/Actions. O proxy já redireciona,
 * mas cada página protegida volta a validar (defesa em profundidade).
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  return { supabase, userId: data.claims.sub, email: data.claims.email as string | undefined };
}
