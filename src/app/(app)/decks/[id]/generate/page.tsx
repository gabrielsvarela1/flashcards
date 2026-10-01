import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AI_LIMITS, getAiUsage } from "@/lib/ai-usage";
import { GenerateFlow } from "./generate-flow";

export const metadata: Metadata = { title: "Gerar cards · Flashcards" };

// Descarregar o PDF, enviá-lo ao Gemini e gerar os cards pode demorar;
// aplica-se às Server Actions desta página.
export const maxDuration = 120;

export default async function GeneratePage({ params }: PageProps<"/decks/[id]/generate">) {
  const { id } = await params;
  const { supabase, userId } = await requireUser();
  const [{ data: deck }, used] = await Promise.all([
    supabase.from("decks").select("id, name").eq("id", id).maybeSingle(),
    getAiUsage(supabase, "generate"),
  ]);
  if (!deck) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/decks/${deck.id}`} className="truncate text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        ← {deck.name}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gerar cards com IA</h1>
        <p className="mt-1 text-neutral-500">
          A IA lê um PDF, um texto ou fotos e sugere cards. Revês tudo antes de guardar.
        </p>
        {used !== null && (
          <p className="mt-2 text-sm text-neutral-500">
            {used} de {AI_LIMITS.generate} gerações usadas nas últimas 24 horas.
          </p>
        )}
      </div>
      <GenerateFlow deckId={deck.id} userId={userId} />
    </div>
  );
}
