/**
 * Scoring a piece of text against what you actually know.
 *
 * The number this produces is the whole point of the tool, so it is built to be
 * honest about its own denominator rather than flattering:
 *
 *   - **Coverage** is measured over tokens the lemmatiser could resolve. A word
 *     it failed to analyse is not evidence either way, and quietly counting it
 *     as unknown would punish you for the tool's limits.
 *   - **Unresolved tokens are reported separately and shown.** They are mostly
 *     proper nouns, which a frequency list of common words will never contain.
 *     Seeing them is what lets you judge whether the score means anything.
 *   - **Untested words count against comprehension.** You may well know them,
 *     but this tool's claim is only ever about what it has actually asked, and
 *     assuming in your favour would inflate every score.
 */

import type { Word } from "./words";
import type { Progress } from "./progress";
import type { WordIndex } from "../korean/lemmatize";
import { lemmatize } from "../korean/lemmatize";
import { pct } from "./analysis";

/**
 * The band where reading is comfortable enough to carry you but still teaches
 * something. Below it you're decoding rather than reading; above it there's
 * little left to pick up from context.
 */
export const SWEET_SPOT = { low: 95, high: 98 };

/**
 * What knowing the entire list would cover, measured over 69,464 running words
 * of the Tatoeba Korean corpus: 81.9% of tokens resolve to a word on it, rising
 * to roughly 86% once names and places — which a reader handles without
 * knowing them as vocabulary — are set aside.
 *
 * That is below the 95% at which reading becomes comfortable, and it is the
 * single most important thing this tool can tell someone honestly. A learner
 * who works through all 5,897 words and still cannot read a chapter book has
 * not failed; the list is a map of the common core, not a syllabus that ends in
 * fluency. Reaching 95% takes a larger vocabulary than any list this size
 * contains, or a text-by-text approach that targets what a specific book needs.
 */
export const LIST_CEILING = 86;

export type Unknown = {
  word: Word;
  /** How often it appears here — the reason to learn this one before others. */
  count: number;
};

export type TextScore = {
  /** Every Korean token found, including ones that didn't resolve. */
  tokens: number;
  /** Tokens the lemmatiser matched to a word on the list. */
  resolved: number;
  /** Tokens it could not match, with counts, commonest first. */
  unresolved: Array<{ token: string; count: number }>;
  known: number;
  unsure: number;
  unknown: number;
  untested: number;
  /** Known as a share of resolved tokens. */
  coverage: number;
  /** Distinct words you'd need, heaviest first. */
  toLearn: Unknown[];
  /** Distinct words in the text that resolved. */
  distinct: number;
};

export function scoreText(
  text: string,
  index: WordIndex,
  progress: Progress
): TextScore {
  const matches = lemmatize(text, index);

  let known = 0;
  let unsure = 0;
  let unknown = 0;
  let untested = 0;

  const missing = new Map<string, Unknown>();
  const unresolved = new Map<string, number>();
  const seen = new Set<string>();

  for (const { token, word } of matches) {
    if (!word) {
      unresolved.set(token, (unresolved.get(token) ?? 0) + 1);
      continue;
    }
    seen.add(word.key);

    const status = progress.words[word.key]?.status;
    if (status === "known") {
      known += 1;
      continue;
    }
    if (status === "unsure") unsure += 1;
    else if (status === "unknown") unknown += 1;
    else untested += 1;

    const existing = missing.get(word.key);
    if (existing) existing.count += 1;
    else missing.set(word.key, { word, count: 1 });
  }

  const resolved = known + unsure + unknown + untested;

  return {
    tokens: matches.length,
    resolved,
    unresolved: [...unresolved.entries()]
      .map(([token, count]) => ({ token, count }))
      .sort((a, b) => b.count - a.count),
    known,
    unsure,
    unknown,
    untested,
    coverage: pct(known, resolved),
    // Weight by how often the word appears here: one word appearing five times
    // is worth more than five appearing once, which part of speech alone would
    // never tell you.
    toLearn: [...missing.values()].sort(
      (a, b) => b.count - a.count || a.word.rank - b.word.rank
    ),
    distinct: seen.size,
  };
}

export type Verdict = {
  label: string;
  detail: string;
  tone: "good" | "close" | "hard";
};

export function verdictFor(score: TextScore): Verdict {
  if (score.resolved === 0) {
    return {
      label: "Nothing to judge",
      detail: "No word here matched the list, so there's nothing to score.",
      tone: "hard",
    };
  }
  if (score.coverage >= SWEET_SPOT.high) {
    return {
      label: "Comfortable",
      detail:
        "You know almost everything here. Easy reading, though there's little new in it.",
      tone: "good",
    };
  }
  if (score.coverage >= SWEET_SPOT.low) {
    return {
      label: "In the sweet spot",
      detail:
        "Enough is familiar to carry you, and enough is new to be worth reading. This is the band to look for.",
      tone: "good",
    };
  }
  if (score.coverage >= 85) {
    return {
      label: "A stretch",
      detail:
        "Readable with effort, but you'll be stopping often enough to break the flow. Learning the words below would bring it into range.",
      tone: "close",
    };
  }
  return {
    label: "Too hard for now",
    detail:
      "Too much is unfamiliar to read for meaning — you'd be decoding rather than reading. Worth coming back to.",
    tone: "hard",
  };
}
