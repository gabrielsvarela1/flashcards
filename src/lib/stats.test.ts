import { describe, expect, it } from "vitest";
import { addDays, computeStats, dayKey, type ReviewPoint } from "./stats";

const at = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
const review = (iso: string, rating = 3): ReviewPoint => [at(iso), rating];

describe("dayKey e addDays", () => {
  it("o dia depende do fuso horário", () => {
    const instant = new Date("2026-10-01T23:30:00Z");
    expect(dayKey(instant, "UTC")).toBe("2026-10-01");
    expect(dayKey(instant, "Europe/Lisbon")).toBe("2026-10-02");
    expect(dayKey(instant, "America/Sao_Paulo")).toBe("2026-10-01");
  });

  it("soma dias atravessando meses e anos", () => {
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("computeStats", () => {
  const now = new Date("2026-10-01T15:00:00Z");
  const tz = "Europe/Lisbon";

  it("conta as revisões de hoje e a sequência de dias", () => {
    const stats = computeStats(
      [review("2026-10-01T09:00:00Z"), review("2026-10-01T10:00:00Z"), review("2026-09-30T20:00:00Z"), review("2026-09-29T08:00:00Z"), review("2026-09-27T08:00:00Z")],
      [],
      now,
      tz,
    );
    expect(stats.today).toBe(2);
    // 1 out, 30 set e 29 set; dia 28 não tem revisões e quebra a sequência.
    expect(stats.streak).toBe(3);
  });

  it("hoje sem revisões não quebra a sequência; dois dias sem rever, sim", () => {
    expect(computeStats([review("2026-09-30T10:00:00Z"), review("2026-09-29T10:00:00Z")], [], now, tz).streak).toBe(2);
    expect(computeStats([review("2026-09-29T10:00:00Z")], [], now, tz).streak).toBe(0);
    expect(computeStats([], [], now, tz).streak).toBe(0);
  });

  it("atribui a revisão ao dia local, não ao dia UTC", () => {
    // 23:30 UTC de 30 set já é 1 out em Lisboa (UTC+1 no verão).
    const stats = computeStats([review("2026-09-30T23:30:00Z")], [], now, tz);
    expect(stats.today).toBe(1);
    expect(computeStats([review("2026-09-30T23:30:00Z")], [], now, "UTC").today).toBe(0);
  });

  it("calcula a taxa de acerto só com os últimos 30 dias", () => {
    const stats = computeStats(
      [review("2026-10-01T09:00:00Z", 1), review("2026-09-20T09:00:00Z", 3), review("2026-09-10T09:00:00Z", 2), review("2026-09-05T09:00:00Z", 4), review("2026-08-01T09:00:00Z", 1)],
      [],
      now,
      tz,
    );
    expect(stats.reviews30).toBe(4);
    expect(stats.correct30).toBe(3);
  });

  it("devolve uma entrada por dia, da mais antiga para hoje", () => {
    const { daily } = computeStats([review("2026-09-29T08:00:00Z")], [], now, tz, { historyDays: 3 });
    expect(daily.map((d) => [d.key, d.count])).toEqual([
      ["2026-09-29", 1],
      ["2026-09-30", 0],
      ["2026-10-01", 0],
    ]);
  });

  it("na previsão, os cards atrasados contam em hoje", () => {
    const dues = ["2026-09-20T10:00:00Z", "2026-10-01T22:00:00Z", "2026-10-03T08:00:00Z", "2026-10-20T08:00:00Z"].map((d) => new Date(d).getTime());
    const { forecast } = computeStats([], dues, now, tz, { forecastDays: 3 });
    expect(forecast.map((d) => [d.key, d.count])).toEqual([
      ["2026-10-01", 2],
      ["2026-10-02", 0],
      ["2026-10-03", 1],
    ]);
  });
});
