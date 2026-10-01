import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { FSRS_COLUMNS } from "@/lib/fsrs";
import { ReviewSession, type ReviewCard } from "../review-session";

export const metadata: Metadata = { title: "Revisão · Flashcards" };

const SESSION_LIMIT = 100;

export default async function ReviewPage({ params }: PageProps<"/review/[deckId]">) {
  const { deckId } = await params;
  const { supabase } = await requireUser();

  const [{ data: deck }, { data: cards }] = await Promise.all([
    supabase.from("decks").select("id, name").eq("id", deckId).maybeSingle(),
    supabase
      .from("cards")
      .select(`id, front, back, ${FSRS_COLUMNS}`)
      .eq("deck_id", deckId)
      .lte("due", new Date().toISOString())
      .order("due", { ascending: true })
      .limit(SESSION_LIMIT)
      .overrideTypes<ReviewCard[], { merge: false }>(),
  ]);
  if (!deck) notFound();

  if (!cards?.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Nada para rever</h1>
        <p className="text-neutral-500">Todos os cards de “{deck.name}” estão em dia.</p>
        <Link
          href={`/decks/${deck.id}`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Voltar ao deck
        </Link>
      </div>
    );
  }

  // key: uma nova sessão (após router.refresh) recomeça do início.
  return (
    <ReviewSession
      key={cards.map((c) => c.id).join()}
      backHref={`/decks/${deck.id}`}
      backLabel={deck.name}
      cards={cards}
    />
  );
}
