import { describe, expect, it } from "vitest";
import { CARD_SIDE_MAX, parseSides } from "./cards";

describe("parseSides", () => {
  it("apara espaços e devolve os dois lados", () => {
    expect(parseSides("  Pergunta? ", "\nResposta\n")).toEqual({ front: "Pergunta?", back: "Resposta" });
  });

  it("recusa lados vazios ou em falta", () => {
    expect(parseSides("", "x")).toHaveProperty("error");
    expect(parseSides("x", "   ")).toHaveProperty("error");
    expect(parseSides(undefined, null)).toHaveProperty("error");
  });

  it("recusa lados acima do limite e aceita o limite exato", () => {
    expect(parseSides("a".repeat(CARD_SIDE_MAX), "b")).toEqual({ front: "a".repeat(CARD_SIDE_MAX), back: "b" });
    expect(parseSides("a".repeat(CARD_SIDE_MAX + 1), "b")).toHaveProperty("error");
  });

  it("converte valores que não são texto", () => {
    expect(parseSides(42, true)).toEqual({ front: "42", back: "true" });
  });
});
