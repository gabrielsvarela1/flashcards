import type { Metadata } from "next";
import { AuthForm } from "./auth-form";

export const metadata: Metadata = { title: "Entrar · Flashcards" };

const errors: Record<string, string> = {
  confirm:
    "Não foi possível iniciar sessão a partir do link. Se o email já ficou confirmado, entra com a tua palavra-passe.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Flashcards</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Estuda com repetição espaçada.
          </p>
        </div>
        <AuthForm
          next={typeof next === "string" ? next : undefined}
          initialError={typeof error === "string" ? errors[error] : undefined}
        />
      </div>
    </main>
  );
}
