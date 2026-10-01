import { describe, expect, it } from "vitest";
import { parseCardsText, toCsv } from "./csv";
import { MAX_CARDS_PER_SAVE } from "./limits";

describe("parseCardsText", () => {
  it("deteta vírgula, ponto e vírgula e tabulação", () => {
    expect(parseCardsText("a,b\nc,d").cards).toEqual([
      { front: "a", back: "b" },
      { front: "c", back: "d" },
    ]);
    expect(parseCardsText("a;b\nc;d").cards).toHaveLength(2);
    expect(parseCardsText("a\tb\nc\td").cards).toHaveLength(2);
  });

  it("prefere a tabulação quando o texto também tem vírgulas", () => {
    expect(parseCardsText("Olá, mundo\tHello, world").cards).toEqual([{ front: "Olá, mundo", back: "Hello, world" }]);
  });

  it("respeita aspas: separadores, quebras de linha e aspas duplicadas", () => {
    const { cards } = parseCardsText('"um, dois","linha 1\nlinha 2"\n"diz ""olá""",ok');
    expect(cards).toEqual([
      { front: "um, dois", back: "linha 1\nlinha 2" },
      { front: 'diz "olá"', back: "ok" },
    ]);
  });

  it("ignora o cabeçalho, linhas vazias e linhas sem verso", () => {
    const result = parseCardsText("Frente;Verso\n\nPergunta;Resposta\nsó frente\n;só verso\n");
    expect(result.cards).toEqual([{ front: "Pergunta", back: "Resposta" }]);
    expect(result.skipped).toBe(2);
  });

  it("lê a exportação do Anki: cabeçalhos #, separador e HTML", () => {
    const anki = "#separator:tab\n#html:true\nCapital&nbsp;de França\t<b>Paris</b><br>Île-de-France\n";
    expect(parseCardsText(anki).cards).toEqual([{ front: "Capital de França", back: "Paris\nÎle-de-France" }]);
  });

  it("aceita o BOM e fins de linha do Windows", () => {
    expect(parseCardsText("﻿a,b\r\nc,d\r\n").cards).toHaveLength(2);
  });

  it("corta no limite por importação e diz quantos ficaram de fora", () => {
    const text = Array.from({ length: MAX_CARDS_PER_SAVE + 3 }, (_, i) => `p${i};r${i}`).join("\n");
    const result = parseCardsText(text);
    expect(result.cards).toHaveLength(MAX_CARDS_PER_SAVE);
    expect(result.overLimit).toBe(3);
  });

  it("devolve vazio para texto sem cards", () => {
    expect(parseCardsText("")).toEqual({ cards: [], skipped: 0, overLimit: 0 });
  });
});

describe("toCsv", () => {
  it("o que se exporta volta a importar igual", () => {
    const cards = [
      { front: 'Com "aspas", vírgulas; e ponto e vírgula', back: "duas\nlinhas" },
      { front: "simples", back: "ok" },
    ];
    expect(parseCardsText(toCsv(cards)).cards).toEqual(cards);
  });

  it("começa com BOM para o Excel ler UTF-8", () => {
    expect(toCsv([{ front: "a", back: "b" }])).toBe('﻿"a","b"\r\n');
  });
});
