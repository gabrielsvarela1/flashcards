import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DeckHeader } from "./deck-header";

export default async function DeckPage({ params }: PageProps<"/decks/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();

  // RLS: um deck de outro utilizador simplesmente não é devolvido.
  const { data: deck } = await supabase
    .from("decks")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!deck) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/decks" className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        ← Decks
      </Link>
      <DeckHeader id={deck.id} name={deck.name} />
      <p className="text-neutral-500">Os cards deste deck aparecem aqui.</p>
    </div>
  );
}
