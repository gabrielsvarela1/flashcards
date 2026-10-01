import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { FSRS_COLUMNS, type FsrsFields } from "@/lib/fsrs";
import { ReviewSession, type ReviewCard } from "../review-session";

export const metadata: Metadata = { title: "Rever tudo · Flashcards" };

const SESSION_LIMIT = 100;

type Row = FsrsFields & { id: string; front: string; back: string; deck: { name: string } | null };

/** Revisão de todos os decks de uma vez, pela ordem em que os cards venceram. */
export default async function ReviewAllPage() {
  const { supabase } = await requireUser();

  const { data: rows } = await supabase
    .from("cards")
    .select(`id, front, back, ${FSRS_COLUMNS}, deck:decks(name)`)
    .lte("due", new Date().toISOString())
    .order("due", { ascending: true })
    .limit(SESSION_LIMIT)
    .overrideTypes<Row[], { merge: false }>();

  if (!rows?.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Nada para rever</h1>
        <p className="text-neutral-500">Todos os teus cards estão em dia.</p>
        <Link
          href="/decks"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Voltar aos decks
        </Link>
      </div>
    );
  }

  const cards: ReviewCard[] = rows.map(({ deck, ...card }) => ({ ...card, deckName: deck?.name }));

  // key: uma nova sessão (após router.refresh) recomeça do início.
  return <ReviewSession key={cards.map((c) => c.id).join()} backHref="/decks" backLabel="Decks" cards={cards} />;
}
