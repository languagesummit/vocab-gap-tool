/**
 * A deck under construction.
 *
 * One filter at a time is the wrong unit for building an Anki deck. Nobody
 * wants a deck of only animals — they want animals *and* colours *and* job
 * words, which is several passes over the list gathered into one export. So
 * selections accumulate into a basket that survives navigation, and the export
 * happens once at the end.
 *
 * Parts keep their own labels so the basket stays readable — "동물류 · 26
 * words" rather than an anonymous pile — and can be removed individually when
 * you change your mind about one without losing the rest.
 */

import type { Word } from "./words";

export type DeckPart = {
  /** Stable id so a part can be removed. */
  id: string;
  /** What this slice was, for reading the basket back. */
  label: string;
  keys: string[];
};

export type Deck = { parts: DeckPart[] };

const STORAGE_KEY = "vocab-gap-tool:deck:ko";

export function loadDeck(): Deck {
  if (typeof window === "undefined") return { parts: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { parts: [] };
    const parsed = JSON.parse(raw) as Deck;
    return Array.isArray(parsed?.parts) ? parsed : { parts: [] };
  } catch {
    return { parts: [] };
  }
}

export function saveDeck(deck: Deck): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
}

export function addPart(deck: Deck, label: string, keys: string[]): Deck {
  if (keys.length === 0) return deck;
  return {
    parts: [
      ...deck.parts,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, label, keys },
    ],
  };
}

export function removePart(deck: Deck, id: string): Deck {
  return { parts: deck.parts.filter((p) => p.id !== id) };
}

/**
 * Every word in the deck, deduplicated and in frequency order.
 *
 * Overlap between parts is expected — colours and adjectives share words — and
 * a card appearing twice in an Anki import is a duplicate to clean up by hand,
 * so it's resolved here instead.
 */
export function deckWords(deck: Deck, words: Word[]): Word[] {
  const wanted = new Set(deck.parts.flatMap((p) => p.keys));
  return words
    .filter((w) => wanted.has(w.key))
    .sort((a, b) => a.rank - b.rank);
}

/** Unique word count, which is what the download will actually contain. */
export function deckSize(deck: Deck): number {
  return new Set(deck.parts.flatMap((p) => p.keys)).size;
}

/** How many of a part's words are already covered by earlier parts. */
export function overlapWith(deck: Deck, keys: string[]): number {
  const existing = new Set(deck.parts.flatMap((p) => p.keys));
  return keys.filter((k) => existing.has(k)).length;
}
