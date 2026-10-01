// Lidas explicitamente para que o Next.js as injete no bundle do browser.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseEnv() {
  if (!url || !anonKey) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copia .env.example para .env.local e preenche com os dados do teu projeto Supabase.",
    );
  }
  return { url, anonKey };
}
