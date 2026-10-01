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

const secondaryLink =
  "flex min-h-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white text-sm font-medium text-neutral-700 transition-colors hover:border-indigo-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-indigo-700";

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

      <div className="flex flex-col gap-2">
        <Link
          href={`/decks/${deck.id}/generate`}
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900"
        >
          <span aria-hidden>✨</span> Gerar cards com IA
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/decks/${deck.id}/import`} className={secondaryLink}>
            Importar
          </Link>
          {/* Descarrega um ficheiro: não é uma navegação, por isso <a> e não <Link>. */}
          <a
            href={`/decks/${deck.id}/export`}
            download
            aria-disabled={!cards?.length}
            className={`${secondaryLink} ${cards?.length ? "" : "pointer-events-none opacity-50"}`}
          >
            Exportar CSV
          </a>
        </div>
      </div>

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
