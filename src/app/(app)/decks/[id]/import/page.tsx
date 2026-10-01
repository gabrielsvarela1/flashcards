import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ImportFlow } from "./import-flow";

export const metadata: Metadata = { title: "Importar cards · Flashcards" };

export default async function ImportPage({ params }: PageProps<"/decks/[id]/import">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: deck } = await supabase.from("decks").select("id, name").eq("id", id).maybeSingle();
  if (!deck) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/decks/${deck.id}`} className="truncate text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        ← {deck.name}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importar cards</h1>
        <p className="mt-1 text-neutral-500">
          De um ficheiro CSV, de uma folha de cálculo ou do Anki. Cada linha é um card: primeiro a frente, depois o
          verso.
        </p>
      </div>
      <ImportFlow deckId={deck.id} />
    </div>
  );
}
