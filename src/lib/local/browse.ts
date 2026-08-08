/**
 * Filtering and ordering for the word browser.
 *
 * The question this answers is "show me the animals, commonest first, and tell
 * me which I know" — so frequency order is the default within any slice. A
 * category is a set of words to learn, and inside it frequency still decides
 * what pays off soonest: knowing 개 before 고라니 is worth more even though both
 * are animals.
 */

import type { Word } from "./words";
import type { Progress, Status } from "./progress";
import { recallOf, type Recall } from "./analysis";

export type StatusFilter = Status | "untested";

export const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "known", label: "Known" },
  { value: "unsure", label: "Timed out" },
  { value: "unknown", label: "Didn't know" },
  { value: "untested", label: "Never asked" },
];

/**
 * Known words split by how readily they came back. "Slow" is the interesting
 * one for study: it counts as known, but a word you have to dig for still
 * breaks reading, and it is exactly the pile worth putting on a flashcard.
 */
export const RECALL_FILTERS: Array<{ value: Recall; label: string }> = [
  { value: "automatic", label: "Instant" },
  { value: "solid", label: "Solid" },
  { value: "effortful", label: "Slow — worth drilling" },
];

export type SortKey = "frequency" | "alphabetical" | "level" | "recall";

export const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: "frequency", label: "Commonest first" },
  { value: "alphabetical", label: "A–Z (가나다)" },
  { value: "level", label: "TOPIK level" },
  { value: "recall", label: "Slowest first" },
];

export type Filters = {
  sort: SortKey;
  category: string | null;
  sub: string | null;
  pos: string | null;
  level: number | null;
  statuses: Set<StatusFilter>;
  recalls: Set<Recall>;
  search: string;
};

export const emptyFilters = (): Filters => ({
  sort: "frequency",
  category: null,
  sub: null,
  pos: null,
  level: null,
  statuses: new Set<StatusFilter>(),
  recalls: new Set<Recall>(),
  search: "",
});

export type BrowseRow = {
  word: Word;
  status: StatusFilter;
  recall: Recall | null;
};

export function statusOf(progress: Progress, word: Word): StatusFilter {
  return progress.words[word.key]?.status ?? "untested";
}

export function filterWords(
  words: Word[],
  progress: Progress,
  filters: Filters
): BrowseRow[] {
  const needle = filters.search.trim().toLowerCase();

  const rows: BrowseRow[] = [];
  for (const word of words) {
    if (filters.category && word.category !== filters.category) continue;
    if (filters.sub && word.sub !== filters.sub) continue;
    if (filters.pos && word.pos !== filters.pos) continue;
    if (filters.level && word.lv.topik !== filters.level) continue;

    const status = statusOf(progress, word);
    if (filters.statuses.size > 0 && !filters.statuses.has(status)) continue;

    const record = progress.words[word.key];
    const recall = record ? recallOf(record) : null;
    // Recall only exists for known words that carry a timing, so filtering on
    // it necessarily excludes everything else rather than silently keeping it.
    if (filters.recalls.size > 0 && (!recall || !filters.recalls.has(recall))) {
      continue;
    }

    if (
      needle &&
      !word.lemma.toLowerCase().includes(needle) &&
      !word.gloss.toLowerCase().includes(needle)
    ) {
      continue;
    }

    rows.push({ word, status, recall });
  }

  // Frequency is the tie-breaker under every other ordering, since within any
  // equal group the commoner word is still the one worth meeting first.
  const byRank = (a: BrowseRow, b: BrowseRow) => a.word.rank - b.word.rank;
  const RANK: Record<Recall, number> = { effortful: 0, solid: 1, automatic: 2 };

  switch (filters.sort) {
    case "alphabetical":
      return rows.sort(
        (a, b) => a.word.lemma.localeCompare(b.word.lemma, "ko") || byRank(a, b)
      );
    case "level":
      // Ungraded words sort last rather than first, where a missing level would
      // otherwise masquerade as level zero.
      return rows.sort(
        (a, b) =>
          (a.word.lv.topik ?? 99) - (b.word.lv.topik ?? 99) || byRank(a, b)
      );
    case "recall":
      return rows.sort(
        (a, b) =>
          (a.recall ? RANK[a.recall] : 3) - (b.recall ? RANK[b.recall] : 3) ||
          byRank(a, b)
      );
    default:
      return rows.sort(byRank);
  }
}

/** Counts per status for the current slice, so the filter bar can show them. */
export function tally(rows: BrowseRow[]): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = {
    known: 0,
    unsure: 0,
    unknown: 0,
    untested: 0,
  };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}

/** Every distinct value present, for populating the filter dropdowns. */
export function facets(words: Word[]) {
  const categories = new Map<string, Set<string>>();
  const pos = new Set<string>();
  const levels = new Set<number>();

  for (const word of words) {
    if (word.category) {
      if (!categories.has(word.category)) {
        categories.set(word.category, new Set());
      }
      if (word.sub) categories.get(word.category)!.add(word.sub);
    }
    if (word.pos) pos.add(word.pos);
    if (word.lv.topik) levels.add(word.lv.topik);
  }

  return {
    categories: [...categories.entries()]
      .map(([label, subs]) => ({ label, subs: [...subs].sort() }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    pos: [...pos].sort(),
    levels: [...levels].sort((a, b) => a - b),
  };
}

/** A short name for the current slice, used for the export filename. */
export function sliceLabel(filters: Filters): string | null {
  const parts = [
    filters.sub ?? filters.category ?? null,
    filters.pos,
    filters.level ? `TOPIK ${filters.level}` : null,
    filters.recalls.size === 1 ? [...filters.recalls][0] : null,
    filters.statuses.size === 1 ? [...filters.statuses][0] : null,
    filters.search.trim() || null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
