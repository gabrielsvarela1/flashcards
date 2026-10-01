import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-redirect";

describe("safeNext", () => {
  it("aceita caminhos internos", () => {
    expect(safeNext("/decks/abc?x=1")).toBe("/decks/abc?x=1");
  });

  it("recusa URLs externos e truques de protocolo", () => {
    expect(safeNext("https://evil.example")).toBe("/decks");
    expect(safeNext("//evil.example")).toBe("/decks");
    expect(safeNext("/\\evil.example")).toBe("/decks");
    expect(safeNext("decks")).toBe("/decks");
  });

  it("usa o destino por omissão quando não há valor", () => {
    expect(safeNext(null)).toBe("/decks");
    expect(safeNext(undefined, "/account/password")).toBe("/account/password");
  });
});
