import { describe, expect, it } from "vitest";
import { formatDue, formatInterval, isDue } from "./format";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatInterval", () => {
  it("usa minutos abaixo de uma hora, com mínimo de 1", () => {
    expect(formatInterval(0)).toBe("1 min");
    expect(formatInterval(10 * MINUTE)).toBe("10 min");
    expect(formatInterval(59 * MINUTE)).toBe("59 min");
  });

  it("usa horas, dias, meses e anos conforme a grandeza", () => {
    expect(formatInterval(3 * HOUR)).toBe("3 h");
    expect(formatInterval(4 * DAY)).toBe("4 d");
    expect(formatInterval(60 * DAY)).toBe("2 m");
    expect(formatInterval(365 * DAY)).toBe("1 a");
  });
});

describe("formatDue e isDue", () => {
  const now = new Date("2026-10-01T12:00:00Z");

  it("trata como vencido o que é agora ou anterior", () => {
    expect(isDue("2026-10-01T12:00:00Z", now)).toBe(true);
    expect(isDue("2026-10-01T11:59:59Z", now)).toBe(true);
    expect(isDue("2026-10-01T12:00:01Z", now)).toBe(false);
    expect(formatDue("2026-09-30T12:00:00Z", now)).toBe("Para rever");
  });

  it("descreve quando falta tempo", () => {
    expect(formatDue("2026-10-04T12:00:00Z", now)).toBe("Daqui a 3 d");
  });
});
