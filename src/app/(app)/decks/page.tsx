import type { Metadata } from "next";

export const metadata: Metadata = { title: "Decks · Flashcards" };

export default function DecksPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">Os teus decks</h1>
      <p className="text-neutral-500">Em breve: criar e gerir decks.</p>
    </div>
  );
}
