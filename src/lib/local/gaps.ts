/**
 * Where the holes are, by meaning.
 *
 * Frequency order says what to learn next in the abstract; it says nothing
 * about the shape of what you already have. Someone who picked up Korean
 * through conversation can be fluent about work and weather and still not know
 * the word for "purple" — the gap isn't at some frequency rank, it's in a
 * pocket of meaning, and only a semantic tagging can find it.
 *
 * Two different kinds of hole, kept apart because the fix differs:
 *
 *   - **Missed** — asked, and you didn't know it. A genuine gap in knowledge.
 *   - **Unasked** — never put to you. Not a gap in you, a gap in the testing,
 *     and the honest response is to go and test it rather than to conclude
 *     anything.
 *
 * A category that is 90% unasked tells you nothing yet, and sorting it above a
 * category you demonstrably failed would send you off studying the wrong thing.
 * So weakness is ranked on what was actually asked, and reach is reported
 * beside it rather than folded into it.
 */

import type { Word } from "./words";
import type { Progress } from "./progress";
import { pct, type Split } from "./analysis";

export type CategoryNode = Split & {
  label: string;
  /** Words asked and not known — the study list for this pocket of meaning. */
  missed: Word[];
  /** Words never put to you. Test these before drawing conclusions. */
  unasked: Word[];
};

export type MajorCategory = CategoryNode & {
  subs: CategoryNode[];
};

export type Pocket = CategoryNode & { major: string };

/**
 * A way of cutting the vocabulary up. Meaning and part of speech answer
 * genuinely different questions and neither substitutes for the other, so they
 * stay separate cuts rather than being folded into one score.
 *
 * The nesting is what makes the pair earn its keep: part of speech nested
 * under meaning asks "which pockets am I thin on"; meaning nested under part of
 * speech asks "am I weak on adjectives, and about what". Same words, different
 * question.
 *
 * Part of speech also covers all 5,897 words where the semantic tagging reaches
 * 3,151 — verbs especially are mostly untagged — so it is the more complete of
 * the two even though it is the blunter.
 */
export type Dimension = {
  id: string;
  label: string;
  blurb: string;
  major: (word: Word) => string | null;
  sub: (word: Word) => string | null;
  /** Explains what falls outside this cut, and why that's expected. */
  untaggedNote: string;
};

/** Subgroup label for words the nested cut doesn't reach. Never ranked. */
export const UNTAGGED = "(no meaning tag)";

/**
 * English for the 14 major categories. The source labels them in Korean, which
 * is precisely backwards for a tool whose users are learning the language —
 * 인간 as a heading tells a beginner nothing, and being unable to read your own
 * gap report defeats the point. Shown alongside the Korean rather than instead
 * of it, since the Korean is what the source says and worth learning.
 */
export const CATEGORY_EN: Record<string, string> = {
  "인간": "people & the body",
  "개념": "abstract concepts",
  "사회생활": "social life",
  "삶": "life & health",
  "식생활": "food & eating",
  "교육": "education",
  "주생활": "home & housing",
  "경제생활": "money & work",
  "자연": "nature & weather",
  "정치와 행정": "politics & government",
  "동식물": "animals & plants",
  "의생활": "clothing",
  "문화": "arts & culture",
  "종교": "religion",
};

/**
 * English for a label, wherever it appears. Deliberately not scoped to one
 * dimension: the Korean categories show up as *sub*groups under the
 * part-of-speech cut too, and leaving those unglossed reproduces exactly the
 * problem this solves. Parts of speech are already English and simply miss.
 */
export function englishFor(label: string): string | null {
  return CATEGORY_EN[label] ?? null;
}

export const DIMENSIONS: Dimension[] = [
  {
    id: "pos",
    label: "By word type",
    blurb:
      "Whether the shape of a word predicts whether you know it — nouns against verbs against adjectives, and what each is about.",
    major: (w) => w.pos,
    sub: (w) => w.category,
    untaggedNote: "carry no part-of-speech tag.",
  },
  {
    id: "meaning",
    label: "By subject",
    blurb:
      "Colours, animals, the body, food. Holes here sit at no particular frequency rank, which is why rank-ordered testing can't find them.",
    major: (w) => w.category,
    sub: (w) => w.sub,
    untaggedNote:
      "carry no subject tag. Most are grammar and function words — 것, 하다, -은 — which belong to no subject you could have a hole in. Verbs are also thinly tagged at source.",
  },
];

export type GapAnalysis = {
  majors: MajorCategory[];
  /**
   * The weakest subcategories across every major, so a small hole in a big
   * category is findable. 색깔 sits inside 개념 among twenty-odd siblings —
   * without this you'd have to already suspect the gap to go looking for it,
   * which defeats the purpose.
   */
  weakest: Pocket[];
  /** Subcategories with too little asked to rank, largest first. */
  unexplored: Pocket[];
  /** Words carrying no semantic category — function words, mostly. */
  untagged: number;
  /** Total words that do carry one. */
  tagged: number;
};

const empty = (label: string): CategoryNode => ({
  label,
  known: 0,
  unsure: 0,
  unknown: 0,
  tested: 0,
  total: 0,
  missed: [],
  unasked: [],
});

function add(node: CategoryNode, progress: Progress, word: Word) {
  node.total += 1;
  const record = progress.words[word.key];
  if (!record) {
    node.unasked.push(word);
    return;
  }
  node[record.status] += 1;
  node.tested += 1;
  // "Unsure" means the clock beat you, which is not the same as not knowing —
  // but it's not proof either, so it belongs on the list to revisit.
  if (record.status !== "known") node.missed.push(word);
}

export function analyseGaps(
  progress: Progress,
  words: Word[],
  dimension: Dimension
): GapAnalysis {
  const majors = new Map<string, MajorCategory>();
  let untagged = 0;
  let tagged = 0;

  for (const word of words) {
    const majorLabel = dimension.major(word);
    if (!majorLabel) {
      untagged += 1;
      continue;
    }
    tagged += 1;

    if (!majors.has(majorLabel)) {
      majors.set(majorLabel, { ...empty(majorLabel), subs: [] });
    }
    const major = majors.get(majorLabel)!;
    add(major, progress, word);

    const subLabel = dimension.sub(word) ?? UNTAGGED;
    let sub = major.subs.find((s) => s.label === subLabel);
    if (!sub) {
      sub = empty(subLabel);
      major.subs.push(sub);
    }
    add(sub, progress, word);
  }

  const byRank = (a: Word, b: Word) => a.rank - b.rank;
  for (const major of majors.values()) {
    major.missed.sort(byRank);
    major.unasked.sort(byRank);
    for (const sub of major.subs) {
      sub.missed.sort(byRank);
      sub.unasked.sort(byRank);
    }
    major.subs.sort(compareWeakness);
  }

  // Words the nested cut doesn't reach are grouped so the totals still add up,
  // but never ranked: "untagged" is not a subject you can be weak at.
  const pockets: Pocket[] = [];
  for (const major of majors.values()) {
    for (const sub of major.subs) {
      if (sub.label !== UNTAGGED) pockets.push({ ...sub, major: major.label });
    }
  }

  return {
    majors: [...majors.values()].sort(compareWeakness),
    weakest: pockets
      .filter((p) => isRankable(p) && p.known < p.tested)
      .sort(compareWeakness)
      .slice(0, 10),
    // Biggest first: an unexplored pocket of forty words is worth more of your
    // time than one of three, and neither is evidence of a weakness yet.
    unexplored: pockets
      .filter((p) => !isRankable(p))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
    untagged,
    tagged,
  };
}

/**
 * Weakest first, judged only on what was asked. Categories with nothing asked
 * sink to the bottom: they're unknowns, not weaknesses, and putting them at the
 * top would be indistinguishable from having failed them.
 */
function compareWeakness(a: CategoryNode, b: CategoryNode): number {
  if (a.tested === 0 && b.tested === 0) return b.total - a.total;
  if (a.tested === 0) return 1;
  if (b.tested === 0) return -1;
  const aScore = a.known / a.tested;
  const bScore = b.known / b.tested;
  if (aScore !== bScore) return aScore - bScore;
  return b.total - a.total;
}

/** Share of the category that came back known, over what was asked. */
export function strength(node: CategoryNode): number | null {
  return node.tested === 0 ? null : pct(node.known, node.tested);
}

/** Share of the category that has been asked at all. */
export function reach(node: CategoryNode): number {
  return pct(node.tested, node.total);
}

/**
 * Two different questions, and conflating them hides exactly the finding this
 * page exists for.
 *
 * How much to trust a percentage depends on how many words were *asked*, not
 * on what fraction of the category that was: none of 6 animal words known is
 * strong evidence even though 6 is a fifth of the pocket, while one of 3 known
 * is noise even though 3 is all that was there. Ranking on the fraction put a
 * 3-word sample above a demonstrated hole.
 *
 * So `isRankable` gates comparison on the absolute count, and `isWellSampled`
 * separately asks whether enough of the category has been seen to generalise
 * from. Both get reported; neither stands in for the other.
 */
export const MIN_ASKED = 5;
export const ENOUGH_ASKED = 0.3;

export function isRankable(node: CategoryNode): boolean {
  return node.tested >= MIN_ASKED;
}

export function isWellSampled(node: CategoryNode): boolean {
  return node.total > 0 && node.tested / node.total >= ENOUGH_ASKED;
}
