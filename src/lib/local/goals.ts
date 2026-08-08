/**
 * What a testing session is actually for.
 *
 * Testing every word from rank 1 upward gives the most complete picture, and
 * it is also a wall: 5,897 words is hours of work before the tool says anything
 * useful, and someone meeting it for the first time reasonably closes the tab.
 * The census is worth doing — it is the thing that makes gap analysis possible
 * — but it should be a choice, not the only door.
 *
 * So a session carries a goal. Small goals finish in minutes and produce a real
 * result over their own scope; the full sweep is still there for anyone who
 * wants it. A goal built from a text closes the loop the other way: read
 * something, find out which words you'd need, and test exactly those.
 */

import type { Word } from "./words";
import type { Progress } from "./progress";

export type Goal =
  | { kind: "all" }
  /** Everything the curriculum grades at or below this TOPIK level. */
  | { kind: "topik"; level: number }
  /** The first N words by frequency. */
  | { kind: "count"; n: number }
  /** A specific set of words, e.g. the unknown words of an article. */
  | { kind: "words"; keys: string[]; label: string };

const STORAGE_KEY = "vocab-gap-tool:goal:ko";

export function loadGoal(): Goal | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Goal;
    return parsed && typeof parsed.kind === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveGoal(goal: Goal): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goal));
}

export function clearGoal(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function goalLabel(goal: Goal): string {
  switch (goal.kind) {
    case "all":
      return "Every word on the list";
    case "topik":
      return `TOPIK level ${goal.level} and below`;
    case "count":
      return `The ${goal.n.toLocaleString()} most common words`;
    case "words":
      return goal.label;
  }
}

/** Words a goal covers, in frequency order, regardless of what's been tested. */
export function wordsFor(goal: Goal, words: Word[]): Word[] {
  const inScope = (() => {
    switch (goal.kind) {
      case "all":
        return words;
      case "topik":
        // Words the curriculum grades at or below the chosen level. Words it
        // doesn't grade at all are left out rather than swept in: the point of
        // choosing a level is a bounded, finishable scope.
        return words.filter(
          (w) => w.lv.topik !== undefined && w.lv.topik <= goal.level
        );
      case "count":
        return words.filter((w) => w.rank <= goal.n);
      case "words": {
        const keys = new Set(goal.keys);
        return words.filter((w) => keys.has(w.key));
      }
    }
  })();
  return [...inScope].sort((a, b) => a.rank - b.rank);
}

/** The queue for a goal: everything in scope that hasn't been answered yet. */
export function queueFor(
  goal: Goal,
  words: Word[],
  progress: Progress
): Word[] {
  return wordsFor(goal, words).filter((w) => !progress.words[w.key]);
}

export type GoalProgress = {
  total: number;
  tested: number;
  remaining: number;
};

export function goalProgress(
  goal: Goal,
  words: Word[],
  progress: Progress
): GoalProgress {
  const scope = wordsFor(goal, words);
  const tested = scope.filter((w) => progress.words[w.key]).length;
  return { total: scope.length, tested, remaining: scope.length - tested };
}

/**
 * Rough minutes for a number of words, for setting expectations before someone
 * commits. Deliberately not precise — it exists so "1,000 words" reads as an
 * evening rather than as an unknown quantity.
 *
 * Assumes roughly three seconds per word including reading the options, which
 * is slower than the timer allows and about what testing actually goes at.
 */
export function estimateMinutes(count: number): number {
  return Math.max(1, Math.round((count * 3) / 60));
}
