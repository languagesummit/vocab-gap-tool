/**
 * Turns raw answers into the picture of what you know.
 *
 * Because testing runs exhaustively from rank 1 upward rather than sampling,
 * everything below the frontier is a census, not an estimate — the counts here
 * are exact for the range covered. The only genuine uncertainty is "unsure",
 * which is why totals are reported as a range rather than a single number.
 */

import type { Word } from "./words";
import type { Progress, Status } from "./progress";

export type Split = {
  known: number;
  unsure: number;
  unknown: number;
  tested: number;
  total: number;
};

export type Group = Split & { label: string };

const emptySplit = (total = 0): Split => ({
  known: 0,
  unsure: 0,
  unknown: 0,
  tested: 0,
  total,
});

function add(split: Split, status: Status) {
  split[status] += 1;
  split.tested += 1;
}

/** Frequency bands, chosen so the early ranks — where most text lives — stay legible. */
const BANDS: Array<{ label: string; from: number; to: number }> = [
  { label: "1–100", from: 1, to: 100 },
  { label: "101–250", from: 101, to: 250 },
  { label: "251–500", from: 251, to: 500 },
  { label: "501–1,000", from: 501, to: 1000 },
  { label: "1,001–2,000", from: 1001, to: 2000 },
  { label: "2,001–3,000", from: 2001, to: 3000 },
  { label: "3,001–4,000", from: 3001, to: 4000 },
  { label: "4,001–5,000", from: 4001, to: 5000 },
  { label: "5,001+", from: 5001, to: Infinity },
];

/**
 * Knowing a word and reaching it instantly are different things. A word you
 * recall automatically costs nothing when reading; one you have to stop and
 * dig for still breaks the flow even though it counts as known. Splitting the
 * known pile by how fast it came back is what makes a coverage score mean
 * "comfortable" rather than merely "seen before".
 */
export type Recall = "automatic" | "solid" | "effortful";

export type TimedWord = { word: Word; ms: number; recall: Recall };

/**
 * Reading speed for the answer text itself, in ms per character. Subtracting
 * it means a two-word gloss and a rambling one are judged on the same
 * footing — the point is how long the *word* took, not the sentence.
 * Deliberately conservative: it should under-correct rather than invent time.
 */
const MS_PER_CHAR = 18;
const BASE_MS = 250; // fixed cost of registering the word at all

const AUTOMATIC_UNDER_MS = 900;
const EFFORTFUL_OVER_MS = 2200;

/**
 * Two median-length glosses. Records written before reading load was tracked
 * fall back to this rather than to zero, which would have judged every one of
 * them as though nothing was on screen to read.
 */
const TYPICAL_CHARS = 34;

/** Response time with the reading of the options discounted out of it. */
export function adjustedMs(ms: number, chars: number | undefined): number {
  const reading = BASE_MS + (chars ?? TYPICAL_CHARS) * MS_PER_CHAR;
  return Math.max(0, ms - reading);
}

function bandOf(adjusted: number): Recall {
  if (adjusted < AUTOMATIC_UNDER_MS) return "automatic";
  if (adjusted < EFFORTFUL_OVER_MS) return "solid";
  return "effortful";
}

export type Analysis = {
  overall: Split;
  bands: Group[];
  byPos: Group[];
  byCategory: Group[];
  /** How many of the list carry a category tag at all — most do not yet. */
  categorised: number;
  frontierRank: number;
  /** Median response time on words answered correctly, in ms. */
  medianKnownMs: number | null;
  /** Known words split by how readily they came back, slowest first. */
  recall: Record<Recall, TimedWord[]>;
  /** Known answers carrying no timing, so the split can be read honestly. */
  knownWithoutTiming: number;
  /** Words answered wrong or skipped, nearest-first. */
  unknownWords: Word[];
  /** Words the clock ran out on, nearest-first. */
  unsureWords: Word[];
};

export function analyse(progress: Progress, words: Word[]): Analysis {
  const overall = emptySplit(words.length);

  const bands = BANDS.map((b) => ({ ...b, split: emptySplit() }));
  const posMap = new Map<string, Split>();
  const catMap = new Map<string, Split>();

  const knownTimes: number[] = [];
  const unknownWords: Word[] = [];
  const unsureWords: Word[] = [];
  const timed: TimedWord[] = [];
  let categorised = 0;
  let knownWithoutTiming = 0;

  for (const word of words) {
    if (word.category) categorised += 1;

    const band = bands.find((b) => word.rank >= b.from && word.rank <= b.to);
    if (band) band.split.total += 1;

    const pos = word.pos ?? "uncategorised";
    if (!posMap.has(pos)) posMap.set(pos, emptySplit());
    posMap.get(pos)!.total += 1;

    if (word.category) {
      if (!catMap.has(word.category)) catMap.set(word.category, emptySplit());
      catMap.get(word.category)!.total += 1;
    }

    const record = progress.words[word.key];
    if (!record) continue;

    add(overall, record.status);
    if (band) add(band.split, record.status);
    add(posMap.get(pos)!, record.status);
    if (word.category) add(catMap.get(word.category)!, record.status);

    if (record.status === "known") {
      if (record.ms === null) knownWithoutTiming += 1;
      else {
        knownTimes.push(record.ms);
        timed.push({
          word,
          ms: record.ms,
          recall: bandOf(adjustedMs(record.ms, record.chars)),
        });
      }
    } else if (record.status === "unknown") unknownWords.push(word);
    else if (record.status === "unsure") unsureWords.push(word);
  }

  knownTimes.sort((a, b) => a - b);
  const medianKnownMs = knownTimes.length
    ? knownTimes[Math.floor(knownTimes.length / 2)]
    : null;

  const toGroups = (map: Map<string, Split>): Group[] =>
    [...map.entries()]
      .map(([label, split]) => ({ label, ...split }))
      .filter((g) => g.tested > 0)
      .sort((a, b) => b.tested - a.tested);

  return {
    overall,
    bands: bands
      .filter((b) => b.split.total > 0)
      .map((b) => ({ label: b.label, ...b.split })),
    byPos: toGroups(posMap),
    byCategory: toGroups(catMap),
    categorised,
    frontierRank: progress.frontierRank,
    medianKnownMs,
    knownWithoutTiming,
    recall: {
      automatic: timed
        .filter((t) => t.recall === "automatic")
        .sort((a, b) => a.ms - b.ms),
      solid: timed.filter((t) => t.recall === "solid").sort((a, b) => a.ms - b.ms),
      // Slowest first: these are the ones worth looking at.
      effortful: timed
        .filter((t) => t.recall === "effortful")
        .sort((a, b) => b.ms - a.ms),
    },
    unknownWords: unknownWords.sort((a, b) => a.rank - b.rank),
    unsureWords: unsureWords.sort((a, b) => a.rank - b.rank),
  };
}

/**
 * "Unsure" means the clock beat you, not that you didn't know the word — so a
 * single known-count would be misleading either way it resolved. The honest
 * answer is the interval its two extremes describe.
 */
export function knownRange(split: Split) {
  return { low: split.known, high: split.known + split.unsure };
}

export function pct(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}
