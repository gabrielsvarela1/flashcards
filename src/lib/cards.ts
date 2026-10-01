export const CARD_SIDE_MAX = 2000;

export type CardSides = { front: string; back: string };

/** Valida e normaliza os dois lados de um card. */
export function parseSides(front: unknown, back: unknown): CardSides | { error: string } {
  const f = String(front ?? "").trim();
  const b = String(back ?? "").trim();
  if (!f || !b) return { error: "Preenche a frente e o verso." };
  if (f.length > CARD_SIDE_MAX || b.length > CARD_SIDE_MAX) {
    return { error: `Cada lado pode ter no máximo ${CARD_SIDE_MAX} caracteres.` };
  }
  return { front: f, back: b };
}
