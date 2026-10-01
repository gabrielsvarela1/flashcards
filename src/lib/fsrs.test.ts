import { createEmptyCard, Rating, State } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import { fromFsrsCard, isGrade, previewIntervals, scheduler, toFsrsCard, type FsrsFields } from "./fsrs";

const now = new Date("2026-10-01T12:00:00Z");

// Um card acabado de criar, tal como sai da tabela (defaults da migration).
const newRow: FsrsFields = {
  due: now.toISOString(),
  stability: 0,
  difficulty: 0,
  elapsed_days: 0,
  scheduled_days: 0,
  learning_steps: 0,
  reps: 0,
  lapses: 0,
  state: 0,
  last_review: null,
};

describe("ponte entre a tabela cards e o ts-fsrs", () => {
  it("um card novo da tabela equivale a um card vazio do ts-fsrs", () => {
    const card = toFsrsCard(newRow);
    const empty = createEmptyCard(now);
    expect(card.state).toBe(State.New);
    expect(card.due.getTime()).toBe(empty.due.getTime());
    expect(card.last_review).toBeUndefined();
  });

  it("ida e volta preserva todos os campos", () => {
    const { card } = scheduler.next(toFsrsCard(newRow), now, Rating.Good);
    const row = fromFsrsCard(card);
    expect(fromFsrsCard(toFsrsCard(row))).toEqual(row);
    expect(row.last_review).toBe(now.toISOString());
    expect(row.reps).toBe(1);
  });

  it("as datas saem em ISO, prontas para o Postgres", () => {
    const row = fromFsrsCard(scheduler.next(toFsrsCard(newRow), now, Rating.Easy).card);
    expect(row.due).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(row.due).getTime()).toBeGreaterThan(now.getTime());
  });
});

describe("agendamento", () => {
  it("respostas melhores dão intervalos maiores ou iguais", () => {
    const intervals = previewIntervals(newRow, now);
    expect(intervals[Rating.Again]).toBeGreaterThan(0);
    expect(intervals[Rating.Hard]).toBeGreaterThanOrEqual(intervals[Rating.Again]);
    expect(intervals[Rating.Good]).toBeGreaterThanOrEqual(intervals[Rating.Hard]);
    expect(intervals[Rating.Easy]).toBeGreaterThan(intervals[Rating.Good]);
  });

  it("errar um card consolidado conta como lapso e volta a aprendizagem", () => {
    let card = toFsrsCard(newRow);
    let when = now;
    // Até ficar em revisão espaçada.
    for (let i = 0; i < 10 && card.state !== State.Review; i++) {
      card = scheduler.next(card, when, Rating.Good).card;
      when = card.due;
    }
    expect(card.state).toBe(State.Review);

    const failed = fromFsrsCard(scheduler.next(card, when, Rating.Again).card);
    expect(failed.lapses).toBe(1);
    expect(failed.state).toBe(State.Relearning);
  });
});

describe("isGrade", () => {
  it("só aceita as quatro respostas", () => {
    expect([1, 2, 3, 4].every(isGrade)).toBe(true);
    expect([0, 5, 2.5, NaN, -1].some(isGrade)).toBe(false);
  });
});
