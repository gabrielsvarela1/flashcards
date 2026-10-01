import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { CardSides } from "@/lib/cards";
import { toCsv } from "@/lib/csv";

const PAGE = 1000;

/** Descarrega os cards do deck em CSV (frente, verso). */
export async function GET(_request: Request, { params }: RouteContext<"/decks/[id]/export">) {
  const { id } = await params;
  const { supabase } = await requireUser();

  // RLS: um deck de outro utilizador simplesmente não é devolvido.
  const { data: deck } = await supabase.from("decks").select("name").eq("id", id).maybeSingle();
  if (!deck) notFound();

  // O Supabase devolve no máximo 1000 linhas por pedido.
  const cards: CardSides[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("cards")
      .select("front, back")
      .eq("deck_id", id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1)
      .overrideTypes<CardSides[], { merge: false }>();
    if (error) return new Response("Não foi possível exportar o deck.", { status: 500 });
    cards.push(...data);
    if (data.length < PAGE) break;
  }

  const filename = `${deck.name.replace(/[\\/:*?"<>|\s]+/g, " ").trim() || "deck"}.csv`;
  return new Response(toCsv(cards), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="deck.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
