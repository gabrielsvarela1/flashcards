import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { GenerateFlow } from "./generate-flow";

export const metadata: Metadata = { title: "Gerar cards · Flashcards" };

// Descarregar o PDF, enviá-lo ao Gemini e gerar os cards pode demorar;
// aplica-se às Server Actions desta página.
export const maxDuration = 120;

export default async function GeneratePage({ params }: PageProps<"/decks/[id]/generate">) {
  const { id } = await params;
  const { supabase, userId } = await requireUser();
  const { data: deck } = await supabase.from("decks").select("id, name").eq("id", id).maybeSingle();
  if (!deck) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/decks/${deck.id}`} className="truncate text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        ← {deck.name}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gerar cards de um PDF</h1>
        <p className="mt-1 text-neutral-500">A IA lê o documento e sugere cards. Revês tudo antes de guardar.</p>
      </div>
      <GenerateFlow deckId={deck.id} userId={userId} />
    </div>
  );
}
