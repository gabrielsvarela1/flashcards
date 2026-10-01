import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { NewDeckForm } from "./new-deck-form";

export const metadata: Metadata = { title: "Decks · Flashcards" };

type DeckWithCount = {
  id: string;
  name: string;
  cards: { count: number }[];
};

export default async function DecksPage() {
  const { supabase } = await requireUser();

  const [{ data: decks, error }, { data: dueCards }] = await Promise.all([
    supabase
      .from("decks")
      .select("id, name, cards(count)")
      .order("created_at", { ascending: false })
      .overrideTypes<DeckWithCount[], { merge: false }>(),
    supabase.from("cards").select("deck_id").lte("due", new Date().toISOString()),
  ]);

  const dueByDeck = new Map<string, number>();
  for (const { deck_id } of dueCards ?? []) {
    dueByDeck.set(deck_id, (dueByDeck.get(deck_id) ?? 0) + 1);
  }

  const totalDue = dueCards?.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Os teus decks</h1>

      {totalDue > 0 && (
        <Link
          href="/review/all"
          className="flex min-h-14 items-center justify-center rounded-2xl bg-indigo-600 text-base font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 active:bg-indigo-700"
        >
          Rever tudo · {totalDue} {totalDue === 1 ? "card" : "cards"}
        </Link>
      )}

      <NewDeckForm />

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Não foi possível carregar os decks.
        </p>
      )}

      {decks && decks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500 dark:border-neutral-700">
          Ainda não tens decks. Cria o primeiro acima.
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {decks?.map((deck) => {
          const total = deck.cards[0]?.count ?? 0;
          const due = dueByDeck.get(deck.id) ?? 0;
          return (
            <li key={deck.id}>
              <Link
                href={`/decks/${deck.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-4 transition-colors hover:border-indigo-300 active:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-700"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{deck.name}</p>
                  <p className="text-sm text-neutral-500">
                    {total} {total === 1 ? "card" : "cards"}
                  </p>
                </div>
                {due > 0 && (
                  <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {due} para rever
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
