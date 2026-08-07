/**
 * What the tested vocabulary says about a proficiency framework.
 *
 * Framework-agnostic by construction: everything specific to TOPIK or to any
 * other grading lives in `src/lib/frameworks`, and this file only knows that a
 * framework has levels, maybe groups, and that words carry a level index for
 * it. Adding a language's exam means adding data, not editing this.
 *
 * Two things it takes care to keep separate, because conflating them is how a
 * vocabulary tool starts making claims it can't support:
 *
 *   - **Coverage** — the share of a level's words you know. Meaningful only
 *     over what you've actually been asked.
 *   - **Reach** — how much of the level you've been asked at all. Testing runs
 *     in frequency order, which is not level order, so a level can be almost
 *     entirely unasked while the words you *have* seen from it all came back.
 *     Reporting coverage without reach turns a small sample into a grade.
 */

import type { Word } from "./words";
import type { Progress } from "./progress";
import type { Framework, FrameworkGroup, FrameworkLevel } from "../frameworks";
import { pct, type Split } from "./analysis";

export type LevelGroup = Split & {
  level: FrameworkLevel;
  /** Untested words at this level, nearest rank first — what's left to prove. */
  unasked: Word[];
};

export type GroupSplit = Split & {
  group: FrameworkGroup;
  /**
   * Words counted into this group only via the coarse tier, having no level of
   * their own. Reported so the group's total is never quietly larger than the
   * levels beneath it appear to justify.
   */
  viaTier: number;
};

export type FrameworkAnalysis = {
  framework: Framework;
  levels: LevelGroup[];
  groups: GroupSplit[];
  /** Words this framework doesn't grade at all. */
  ungraded: number;
  /** Whether anything at all has been tested against this framework. */
  tested: number;
};

/**
 * The share of a level's vocabulary that must be known before calling it
 * covered — and separately, how much of it must have been asked before the
 * number means anything. Both have to hold: 90% of a 5% sample is not a level.
 */
export const COVERED_AT = 0.9;
export const REACHED_AT = 0.5;

const empty = (): Split => ({
  known: 0,
  unsure: 0,
  unknown: 0,
  tested: 0,
  total: 0,
});

function count(split: Split, progress: Progress, word: Word) {
  split.total += 1;
  const record = progress.words[word.key];
  if (!record) return;
  split[record.status] += 1;
  split.tested += 1;
}

export function analyseFramework(
  progress: Progress,
  words: Word[],
  framework: Framework
): FrameworkAnalysis {
  const levelSplits = new Map<number, Split>(
    framework.levels.map((l) => [l.index, empty()])
  );
  const unasked = new Map<number, Word[]>(
    framework.levels.map((l) => [l.index, []])
  );
  const groupSplits = new Map<string, Split>(
    framework.groups.map((g) => [g.id, empty()])
  );
  const viaTier = new Map<string, number>(
    framework.groups.map((g) => [g.id, 0])
  );

  let ungraded = 0;
  let tested = 0;

  for (const word of words) {
    const level = word.lv[framework.id];

    if (level) {
      const split = levelSplits.get(level);
      if (split) {
        count(split, progress, word);
        if (!progress.words[word.key]) unasked.get(level)?.push(word);
      }
    } else if (!framework.useTierFallback || !word.tier) {
      ungraded += 1;
    }

    // Groups gather levels, and fall back to the coarse tier for words the
    // level-graded source never listed.
    const group = level
      ? framework.groups.find((g) => g.levels.includes(level))
      : framework.useTierFallback && word.tier
        ? framework.groups.find((g) => g.id === word.tier)
        : undefined;

    if (group) {
      count(groupSplits.get(group.id) as Split, progress, word);
      if (!level) viaTier.set(group.id, (viaTier.get(group.id) ?? 0) + 1);
    }

    if ((level || (framework.useTierFallback && word.tier)) &&
        progress.words[word.key]) {
      tested += 1;
    }
  }

  for (const list of unasked.values()) list.sort((a, b) => a.rank - b.rank);

  return {
    framework,
    levels: framework.levels.map((level) => ({
      level,
      ...(levelSplits.get(level.index) as Split),
      unasked: unasked.get(level.index) ?? [],
    })),
    groups: framework.groups.map((group) => ({
      group,
      ...(groupSplits.get(group.id) as Split),
      viaTier: viaTier.get(group.id) ?? 0,
    })),
    ungraded,
    tested,
  };
}

/** How much of a level has been asked at all. */
export function reachPct(split: Split): number {
  return pct(split.tested, split.total);
}

/** How much of what was asked came back known. Null when nothing was asked. */
export function coveragePct(split: Split): number | null {
  return split.tested === 0 ? null : pct(split.known, split.tested);
}

/**
 * The highest level that is both well covered and well enough sampled to say
 * so, walking upward and stopping at the first that fails. Levels build on each
 * other, so a gap low down isn't redeemed by strength above it.
 */
export function clearedThrough(analysis: FrameworkAnalysis): LevelGroup | null {
  let cleared: LevelGroup | null = null;
  for (const level of analysis.levels) {
    const reached = level.total > 0 && level.tested / level.total >= REACHED_AT;
    const covered = level.tested > 0 && level.known / level.tested >= COVERED_AT;
    if (!reached || !covered) break;
    cleared = level;
  }
  return cleared;
}

/**
 * Levels too thinly sampled to report on. Worth naming explicitly: the reason
 * is usually that the word list itself doesn't reach that far, not that the
 * learner hasn't got there.
 */
export function underSampled(analysis: FrameworkAnalysis): LevelGroup[] {
  return analysis.levels.filter(
    (l) => l.total > 0 && l.tested / l.total < REACHED_AT
  );
}
