import { parseSides, type CardSides } from "@/lib/cards";
import { MAX_CARDS_PER_SAVE } from "@/lib/limits";

const DELIMITERS = ["\t", ";", ","] as const;
const ANKI_SEPARATORS: Record<string, string> = { tab: "\t", comma: ",", semicolon: ";", pipe: "|", space: " " };
const HEADER_WORDS = new Set(["front", "back", "frente", "verso", "pergunta", "resposta", "question", "answer"]);

export type ParsedCards = {
  cards: CardSides[];
  /** Linhas ignoradas por não terem frente e verso válidos. */
  skipped: number;
  /** Cards válidos que ficaram de fora por excederem o limite por importação. */
  overLimit: number;
};

/**
 * Lê cards de texto separado por tabulações, vírgulas ou ponto e vírgula:
 * a primeira coluna é a frente e a segunda o verso. Aceita CSV de folhas de
 * cálculo e a exportação do Anki ("Notes in Plain Text").
 */
export function parseCardsText(input: string): ParsedCards {
  let text = input.replace(/^﻿/, "");

  // O Anki começa o ficheiro com linhas "#chave:valor".
  let delimiter: string | undefined;
  while (text.startsWith("#")) {
    const end = text.indexOf("\n");
    const line = (end === -1 ? text : text.slice(0, end)).trim();
    const separator = line.match(/^#separator:(.+)$/i)?.[1].trim().toLowerCase();
    if (separator) delimiter = ANKI_SEPARATORS[separator] ?? separator;
    text = end === -1 ? "" : text.slice(end + 1);
  }

  const rows = parseRows(text, delimiter ?? detectDelimiter(text));
  if (rows.length && rows[0].length >= 2 && rows[0].slice(0, 2).every((f) => HEADER_WORDS.has(f.trim().toLowerCase()))) {
    rows.shift();
  }

  const cards: CardSides[] = [];
  let skipped = 0;
  let overLimit = 0;
  for (const row of rows) {
    if (row.every((f) => !f.trim())) continue;
    const sides = parseSides(cleanField(row[0]), cleanField(row[1]));
    if ("error" in sides) skipped++;
    else if (cards.length >= MAX_CARDS_PER_SAVE) overLimit++;
    else cards.push(sides);
  }
  return { cards, skipped, overLimit };
}

/** CSV com uma linha por card (frente, verso), que o Excel, o Sheets e o Anki abrem. */
export function toCsv(cards: CardSides[]) {
  const quote = (field: string) => `"${field.replace(/"/g, '""')}"`;
  // O BOM faz o Excel ler o ficheiro como UTF-8.
  return "﻿" + cards.map((c) => `${quote(c.front)},${quote(c.back)}`).join("\r\n") + "\r\n";
}

/** O separador que divide mais linhas em pelo menos dois campos. */
function detectDelimiter(text: string) {
  const sample = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 20);
  let best: string = ",";
  let bestScore = 0;
  for (const d of DELIMITERS) {
    const score = sample.filter((line) => (parseRows(line, d)[0]?.length ?? 0) >= 2).length;
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
}

/** Leitor de CSV (RFC 4180): campos entre aspas podem ter separadores, quebras de linha e "" para aspas. */
function parseRows(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === "") {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

/** O Anki exporta os campos em HTML: fica só o texto. */
function cleanField(field: string | undefined) {
  return (field ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li)>/gi, "\n")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m])
    .trim();
}
