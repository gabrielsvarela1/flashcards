import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card,
  type Grade,
} from "ts-fsrs";
import type { CardRow, CardState } from "@/types/database";

export const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

/** Campos FSRS guardados na tabela cards (e nos snapshots de reviews). */
export type FsrsFields = Pick<
  CardRow,
  | "due"
  | "stability"
  | "difficulty"
  | "elapsed_days"
  | "scheduled_days"
  | "learning_steps"
  | "reps"
  | "lapses"
  | "state"
  | "last_review"
>;

export const FSRS_COLUMNS =
  "due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state, last_review";

export function toFsrsCard(row: FsrsFields): Card {
  return {
    ...createEmptyCard(),
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  };
}

export function fromFsrsCard(card: Card): FsrsFields {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as CardState,
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}

export const GRADES = [
  { rating: Rating.Again, label: "Errei" },
  { rating: Rating.Hard, label: "Difícil" },
  { rating: Rating.Good, label: "Bom" },
  { rating: Rating.Easy, label: "Fácil" },
] as const satisfies readonly { rating: Grade; label: string }[];

export function isGrade(value: number): value is Grade {
  return value >= Rating.Again && value <= Rating.Easy && Number.isInteger(value);
}

/** Tempo até à próxima revisão para cada resposta (para os botões). */
export function previewIntervals(row: FsrsFields, now: Date) {
  const preview = scheduler.repeat(toFsrsCard(row), now);
  return Object.fromEntries(
    GRADES.map(({ rating }) => [rating, preview[rating].card.due.getTime() - now.getTime()]),
  ) as Record<Grade, number>;
}
