/**
 * Changes that invalidate answers already given.
 *
 * The tool is being built while it is being used, and some changes alter *the
 * question*, not just the presentation around it. When 수 stopped being asked
 * as a bare noun and started being asked as -(으)ㄹ 수 있다, every earlier answer
 * to it became an answer to a question no longer being asked. Silently keeping
 * those would quietly corrupt the map; silently discarding them would throw
 * away honest work.
 *
 * So changes of that kind are recorded here with a date, and any answer given
 * before its change is flagged as stale. The user decides whether to redo it.
 * Being able to see "these 40 answers predate a change, everything else stands"
 * is the difference between trusting the data and wondering whether to start
 * over.
 *
 * Only list changes that alter what is being asked. Renaming a button, moving
 * a gloss, adding a filter — none of those touch the answers, and listing them
 * would train the user to ignore this.
 */

import type { Word } from "./words";
import type { Progress } from "./progress";
import { isBoundPos, isGrammar } from "./patterns";

export type Revision = {
  id: string;
  /** When the change shipped. Answers older than this are suspect. */
  at: number;
  date: string;
  title: string;
  detail: string;
  affects: (word: Word) => boolean;
};

export const REVISIONS: Revision[] = [
  {
    id: "grammar-patterns-2026-08-08",
    at: Date.parse("2026-08-08T00:00:00Z"),
    date: "8 August 2026",
    title: "Grammar words are asked as patterns",
    detail:
      "Bound words like 수 and auxiliary 있다 used to be shown alone, which asked whether you knew a grammar term rather than whether you could use the language. They now appear as -(으)ㄹ 수 있다 and -고 있다, and the answer matches the pattern. Earlier answers judged a different question.",
    affects: (w) => isGrammar(w.key) || isBoundPos(w.pos),
  },
];

export type Stale = {
  revision: Revision;
  keys: string[];
};

/**
 * Answers that predate a change affecting their word. An answer with no
 * timestamp is treated as old, since it cannot be shown to be recent.
 */
export function staleAnswers(progress: Progress, words: Word[]): Stale[] {
  return REVISIONS.map((revision) => ({
    revision,
    keys: words
      .filter((word) => {
        const record = progress.words[word.key];
        if (!record) return false;
        if (!revision.affects(word)) return false;
        return !record.at || record.at < revision.at;
      })
      .map((w) => w.key),
  })).filter((s) => s.keys.length > 0);
}

/** Every stale key across all revisions, deduplicated. */
export function allStaleKeys(stale: Stale[]): string[] {
  return [...new Set(stale.flatMap((s) => s.keys))];
}
