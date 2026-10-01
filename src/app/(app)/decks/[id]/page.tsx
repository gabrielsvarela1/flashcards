import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isDue } from "@/lib/format";
import type { CardRow } from "@/types/database";
import { CardItem } from "./card-item";
import { DeckHeader } from "./deck-header";
import { NewCardForm } from "./new-card-form";

export const metadata: Metadata = { title: "Deck · Flashcards" };

type CardListItem = Pick<CardRow, "id" | "front" | "back" | "due" | "state">;

export default async function DeckPage({ params }: PageProps<"/decks/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();

  // RLS: um deck de outro utilizador simplesmente não é devolvido.
  const [{ data: deck }, { data: cards }] = await Promise.all([
    supabase.from("decks").select("id, name").eq("id", id).maybeSingle(),
    supabase
      .from("cards")
      .select("id, front, back, due, state")
      .eq("deck_id", id)
      .order("created_at", { ascending: false })
      .overrideTypes<CardListItem[], { merge: false }>(),
  ]);
  if (!deck) notFound();

  const dueCount = cards?.filter((c) => isDue(c.due)).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/decks" className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        ← Decks
      </Link>
      <DeckHeader id={deck.id} name={deck.name} />

      {dueCount > 0 ? (
        <Link
          href={`/review/${deck.id}`}
          className="flex min-h-14 items-center justify-center rounded-2xl bg-indigo-600 text-base font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 active:bg-indigo-700"
        >
          Rever {dueCount} {dueCount === 1 ? "card" : "cards"}
        </Link>
      ) : (
        cards &&
        cards.length > 0 && (
          <p className="rounded-2xl bg-emerald-50 p-4 text-center text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            Tudo em dia neste deck. 🎉
          </p>
        )
      )}

      <NewCardForm deckId={deck.id} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-neutral-500">
          {cards?.length ?? 0} {cards?.length === 1 ? "card" : "cards"}
        </h2>
        {cards?.map((card) => (
          <CardItem
            key={card.id}
            id={card.id}
            deckId={deck.id}
            front={card.front}
            back={card.back}
            due={card.due}
            isNew={card.state === 0}
          />
        ))}
      </section>
    </div>
  );
}
