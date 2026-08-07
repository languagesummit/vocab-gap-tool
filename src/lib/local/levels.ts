/**
 * What the tested vocabulary says about exam readiness.
 *
 * Two independent gradings ride along with every word, and they answer
 * different questions:
 *
 *   - **TOPIK tier** (I or II) comes from the 2015 TOPIK vocabulary list and is
 *     the exam-facing one. TOPIK I covers levels 1–2, TOPIK II covers 3–6.
 *     1,438 words in the list are on neither, being ordinary vocabulary the
 *     exam list doesn't cover.
 *   - **NIKL grade** (A/B/C = 초급/중급/고급) comes from 국립국어원's graded
 *     learner list (조남호, 2003) and is a judgement of difficulty made by
 *     panel, independent of the exam.
 *
 * Neither resolves TOPIK's six levels on its own: the exam list stops at two
 * tiers. Crossing them gets closer — within TOPIK II, NIKL's B and C grades
 * separate the intermediate half from the advanced half — and that crossing is
 * what `BANDS` below describes. It is an alignment, not an official mapping,
 * and everything that renders it is required to say so.
 */

import type { Word } from "./words";
import type { Progress } from "./progress";
import { pct, type Split } from "./analysis";

export type NiklGrade = "A" | "B" | "C";
export type TopikTier = "I" | "II";

/**
 * The exam-facing split. This is the part taken straight from the TOPIK list,
 * with no inference layered on it.
 */
export const TIERS: Array<{
  tier: TopikTier;
  label: string;
  levels: string;
  cefr: string;
  blurb: string;
}> = [
  {
    tier: "I",
    label: "TOPIK I",
    levels: "Levels 1–2",
    cefr: "A1–A2",
    blurb:
      "The beginner paper. Listening and reading only, no writing section.",
  },
  {
    tier: "II",
    label: "TOPIK II",
    levels: "Levels 3–6",
    cefr: "B1–C2",
    blurb:
      "One paper covering four levels — your score decides which you're awarded.",
  },
];

/**
 * The finer bands, from crossing the exam tier with the NIKL grade. Order is
 * the order they'd be met.
 *
 * The off-diagonal cells are deliberately folded into the nearest band rather
 * than shown separately: a word on the TOPIK I list that NIKL graded advanced
 * is still TOPIK I vocabulary, because exam membership is the thing being
 * measured and the grade is only refining it. So the tier decides the band
 * first, and the grade subdivides TOPIK II.
 */
export const BANDS: Array<{
  key: string;
  label: string;
  cefr: string;
  approximate: boolean;
  describe: (n: number) => string;
}> = [
  {
    key: "I",
    label: "TOPIK I · levels 1–2",
    cefr: "A1–A2",
    approximate: false,
    describe: (n) => `${n.toLocaleString()} words on the TOPIK I list.`,
  },
  {
    key: "II-B",
    label: "TOPIK II · lower, around levels 3–4",
    cefr: "B1–B2",
    approximate: true,
    describe: (n) =>
      `${n.toLocaleString()} TOPIK II words NIKL grades intermediate.`,
  },
  {
    key: "II-C",
    label: "TOPIK II · upper, around levels 5–6",
    cefr: "C1–C2",
    approximate: true,
    describe: (n) =>
      `${n.toLocaleString()} TOPIK II words NIKL grades advanced.`,
  },
  {
    key: "none",
    label: "Not on a TOPIK list",
    cefr: "—",
    approximate: false,
    describe: (n) =>
      `${n.toLocaleString()} words from the frequency list the exam vocabulary doesn't cover.`,
  },
];

/** Which band a word falls in. Exam tier first, NIKL grade only to subdivide. */
export function bandOf(word: Word): string {
  if (word.topik === "I") return "I";
  if (word.topik === "II") return word.nikl === "C" ? "II-C" : "II-B";
  return "none";
}

export type LevelGroup = Split & {
  key: string;
  label: string;
  cefr: string;
  approximate: boolean;
  blurb: string;
  /** Untested words in this band, nearest rank first — what's left to prove. */
  unasked: Word[];
};

export type Readiness = {
  /** The two published tiers, unrefined. */
  tiers: Array<
    Split & { tier: TopikTier; label: string; levels: string; cefr: string; blurb: string }
  >;
  /** The finer crossed bands, flagged where they're an approximation. */
  bands: LevelGroup[];
  /** Highest tier whose vocabulary is comfortably covered, or null. */
  clearedTier: TopikTier | null;
  /** Words graded by NIKL difficulty, ignoring the exam entirely. */
  byNikl: Array<Split & { grade: NiklGrade; label: string }>;
  /** Total words carrying no TOPIK tier. */
  untiered: number;
};

/**
 * The share of a tier's vocabulary that has to be known before calling it
 * covered. Not a pass mark — TOPIK tests listening, reading and writing, and
 * vocabulary is only the floor under those. Set where a learner would stop
 * meeting unfamiliar words often enough for them to be the limiting factor.
 */
export const COVERED_AT = 0.9;

const NIKL_LABELS: Record<NiklGrade, string> = {
  A: "A · 초급 · beginner",
  B: "B · 중급 · intermediate",
  C: "C · 고급 · advanced",
};

const empty = (): Split => ({
  known: 0,
  unsure: 0,
  unknown: 0,
  tested: 0,
  total: 0,
});

export function readiness(progress: Progress, words: Word[]): Readiness {
  const tierSplits = new Map<TopikTier, Split>([
    ["I", empty()],
    ["II", empty()],
  ]);
  const bandSplits = new Map(BANDS.map((b) => [b.key, empty()]));
  const bandUnasked = new Map<string, Word[]>(BANDS.map((b) => [b.key, []]));
  const niklSplits = new Map<NiklGrade, Split>([
    ["A", empty()],
    ["B", empty()],
    ["C", empty()],
  ]);

  let untiered = 0;

  for (const word of words) {
    const band = bandOf(word);
    const record = progress.words[word.key];

    const buckets: Split[] = [];
    const bandSplit = bandSplits.get(band);
    if (bandSplit) buckets.push(bandSplit);

    if (word.topik) {
      const tierSplit = tierSplits.get(word.topik);
      if (tierSplit) buckets.push(tierSplit);
    } else {
      untiered += 1;
    }

    if (word.nikl) {
      const niklSplit = niklSplits.get(word.nikl);
      if (niklSplit) buckets.push(niklSplit);
    }

    for (const bucket of buckets) {
      bucket.total += 1;
      if (record) {
        bucket[record.status] += 1;
        bucket.tested += 1;
      }
    }

    if (!record) bandUnasked.get(band)?.push(word);
  }

  for (const list of bandUnasked.values()) list.sort((a, b) => a.rank - b.rank);

  const tiers = TIERS.map((t) => ({
    ...t,
    ...(tierSplits.get(t.tier) as Split),
  }));

  // Covered means known outright — the timed-out words are exactly the ones a
  // readiness claim shouldn't lean on, so they don't count toward it.
  const covered = (s: Split) => s.total > 0 && s.known / s.total >= COVERED_AT;
  const clearedTier: TopikTier | null = covered(
    tierSplits.get("II") as Split
  )
    ? "II"
    : covered(tierSplits.get("I") as Split)
      ? "I"
      : null;

  return {
    tiers,
    bands: BANDS.map((b) => {
      const split = bandSplits.get(b.key) as Split;
      return {
        ...b,
        ...split,
        blurb: b.describe(split.total),
        unasked: bandUnasked.get(b.key) ?? [],
      };
    }),
    clearedTier,
    byNikl: (["A", "B", "C"] as NiklGrade[]).map((grade) => ({
      grade,
      label: NIKL_LABELS[grade],
      ...(niklSplits.get(grade) as Split),
    })),
    untiered,
  };
}

/**
 * How much of a tier is still unasked. The frequency-first test order walks
 * ranks, not exam tiers, so a long way into the list can still leave a lot of
 * beginner vocabulary never shown — this is the number that says so.
 */
export function unaskedPct(split: Split): number {
  return pct(split.total - split.tested, split.total);
}
