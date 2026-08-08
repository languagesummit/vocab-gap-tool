/**
 * Earned marks for finishing a level's vocabulary.
 *
 * A badge here is a **measurement, not a prediction**. "You know 95% of the
 * words TOPIK 3 expects" is something this tool can actually establish, having
 * asked you every one of them. "You will pass TOPIK 3" is not, and the
 * difference matters enough to keep out of the wording: the exam also tests
 * listening and writing, and grammar is not yet testable here at all.
 *
 * What 95% does buy is real. At that level, unfamiliar vocabulary stops being
 * the thing standing between you and the paper — whatever else is, it isn't
 * words. That is worth marking, and worth marking honestly.
 *
 * The threshold counts words **known outright** against the whole level, not
 * against what happens to have been asked. A badge earned on a 5% sample would
 * be worse than no badge, because it would feel like evidence.
 */

import type { Word } from "./words";
import type { Progress } from "./progress";
import type { Framework } from "../frameworks";

export const BADGE_THRESHOLD = 0.95;

export type Badge = {
  /** Stable id, stored once earned so it is only celebrated the first time. */
  id: string;
  label: string;
  /** CEFR or other subtitle, where the framework gives one. */
  sub: string | null;
  /** Words known outright at this level. */
  known: number;
  /** Words the level contains. */
  total: number;
  earned: boolean;
  /** How many more words would earn it. Zero once earned. */
  toGo: number;
};

export function badgesFor(
  progress: Progress,
  words: Word[],
  framework: Framework
): Badge[] {
  return framework.levels.map((level) => {
    const inLevel = words.filter((w) => w.lv[framework.id] === level.index);
    const known = inLevel.filter(
      (w) => progress.words[w.key]?.status === "known"
    ).length;
    const total = inLevel.length;
    const needed = Math.ceil(total * BADGE_THRESHOLD);
    return {
      id: `${framework.id}-${level.index}`,
      label: `${framework.name} ${level.index}`,
      sub: level.cefr,
      known,
      total,
      earned: total > 0 && known >= needed,
      toGo: Math.max(0, needed - known),
    };
  });
}

const SEEN_KEY = "vocab-gap-tool:badges-seen:ko";

function loadSeen(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Badges earned since this was last checked, and marks them seen so the
 * celebration happens once rather than on every visit.
 */
export function takeNewlyEarned(badges: Badge[]): Badge[] {
  const seen = new Set(loadSeen());
  const fresh = badges.filter((b) => b.earned && !seen.has(b.id));
  if (fresh.length > 0 && typeof window !== "undefined") {
    const next = [...seen, ...fresh.map((b) => b.id)];
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(next));
  }
  return fresh;
}

/** The nearest unearned badge, for showing what's within reach. */
export function nextUp(badges: Badge[]): Badge | null {
  const pending = badges
    .filter((b) => !b.earned && b.total > 0)
    .sort((a, b) => a.toGo - b.toGo);
  return pending[0] ?? null;
}
