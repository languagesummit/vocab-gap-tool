"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { loadWords, type Word } from "@/lib/local/words";
import {
  loadProgress,
  saveProgress,
  type Progress,
  type Status,
} from "@/lib/local/progress";

// Distractors are drawn from nearby ranks so the wrong answers are plausible
// rather than obviously advanced vocabulary.
const DISTRACTOR_WINDOW = 400;

type Tally = { known: number; unsure: number; unknown: number };

export function Session() {
  const [words, setWords] = useState<Word[] | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [queue, setQueue] = useState<Word[]>([]);
  const [position, setPosition] = useState(0);
  const [tally, setTally] = useState<Tally>({
    known: 0,
    unsure: 0,
    unknown: 0,
  });

  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [frontier, setFrontier] = useState(0);

  const progressRef = useRef<Progress | null>(null);
  const shownAt = useRef(0);

  useEffect(() => {
    const saved = loadProgress();
    progressRef.current = saved;
    // localStorage can only be read on the client, so this genuinely is
    // "sync React state from an external system" despite the lint rule.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setProgress(saved);
    setFrontier(saved.frontierRank);

    loadWords()
      .then((all) => {
        setWords(all);
        // Everything not yet answered, in frequency order. No batching —
        // the session runs until it's paused or finished.
        const untested = all
          .filter((w) => !saved.words[w.key])
          .sort((a, b) => a.rank - b.rank);
        setQueue(untested);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const current = queue[position];
  const finished = words !== null && position >= queue.length;

  const options = useMemo(() => {
    if (!current || !words) return [];
    const choices = progress?.settings.choices ?? 3;

    const pool = words.filter(
      (w) =>
        w.key !== current.key &&
        w.gloss !== current.gloss &&
        Math.abs(w.rank - current.rank) <= DISTRACTOR_WINDOW
    );

    const picked: string[] = [];
    const seen = new Set<string>([current.gloss]);
    // Deterministic per word so a re-render doesn't reshuffle mid-question.
    let seed = current.rank * 2654435761;
    while (picked.length < choices - 1 && pool.length > 0) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const candidate = pool[seed % pool.length];
      if (!seen.has(candidate.gloss)) {
        seen.add(candidate.gloss);
        picked.push(candidate.gloss);
      } else if (seen.size >= pool.length + 1) {
        break;
      }
    }

    const all = [current.gloss, ...picked];
    // Shuffle deterministically too, so the answer isn't always first.
    let s = current.rank * 40503;
    for (let i = all.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
  }, [current, words, progress?.settings.choices]);

  const record = useCallback(
    (status: Status, timedOut: boolean) => {
      const word = queue[position];
      const saved = progressRef.current;
      if (!word || !saved) return;

      saved.words[word.key] = {
        status,
        at: Date.now(),
        ms: timedOut ? null : Date.now() - shownAt.current,
      };
      saved.frontierRank = Math.max(saved.frontierRank, word.rank);
      // Written after every answer, so quitting the tab never loses work.
      saveProgress(saved);

      setTally((t) => ({ ...t, [status]: t[status] + 1 }));
      setFrontier((f) => Math.max(f, word.rank));
      setPosition((p) => p + 1);
    },
    [queue, position]
  );

  const timerMs = progress?.settings.timerMs ?? 5000;

  useEffect(() => {
    if (!current || paused || finished) return;
    const started = Date.now();
    shownAt.current = started;
    // Resets the countdown bar as each question appears.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setRemaining(timerMs);

    const tick = setInterval(() => {
      const left = timerMs - (Date.now() - started);
      if (left <= 0) {
        clearInterval(tick);
        // Out of time means recognised but not recalled fast enough —
        // "unsure", which is distinct from getting it wrong.
        record("unsure", true);
      } else {
        setRemaining(left);
      }
    }, 50);
    return () => clearInterval(tick);
  }, [current, paused, finished, timerMs, record]);

  const choose = useCallback(
    (option: string) => {
      if (!current) return;
      record(option === current.gloss ? "known" : "unknown", false);
    },
    [current, record]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPaused((p) => !p);
        return;
      }
      if (paused || finished || !current) return;
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) {
        choose(options[n - 1]);
      } else if (e.key === " " || e.key === "0") {
        e.preventDefault();
        record("unknown", false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, options, choose, record, paused, finished]);

  if (error) {
    return (
      <Centered>
        <p className="text-red-600">{error}</p>
        <HomeLink />
      </Centered>
    );
  }

  if (!words || !progress) {
    return (
      <Centered>
        <p className="text-zinc-400">Loading words…</p>
      </Centered>
    );
  }

  if (queue.length === 0) {
    return (
      <Centered>
        <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Every word tested
        </h2>
        <p className="text-zinc-500">
          All 5,897 words have a status. Reset from the home screen to run
          through them again.
        </p>
        <HomeLink />
      </Centered>
    );
  }

  if (finished) {
    return (
      <Centered>
        <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Session complete
        </h2>
        <TallyRow tally={tally} />
        <p className="text-sm text-zinc-500">
          Cleared through rank {frontier.toLocaleString()}. Saved in this
          browser.
        </p>
        <HomeLink />
      </Centered>
    );
  }

  const pct = Math.max(0, (remaining / timerMs) * 100);

  return (
    <main className="flex min-h-screen flex-col bg-white dark:bg-black">
      <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-900">
        <div
          className="h-full bg-black dark:bg-zinc-50"
          style={{ width: paused ? "100%" : `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between px-6 py-3 text-sm text-zinc-500">
        <span>Rank {current.rank.toLocaleString()}</span>
        <span className="flex items-center gap-4">
          <span className="text-emerald-600">{tally.known}</span>
          <span className="text-amber-600">{tally.unsure}</span>
          <span className="text-red-600">{tally.unknown}</span>
          <button
            onClick={() => setPaused(true)}
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-black transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Pause (esc)
          </button>
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 pb-16">
        <div className="text-7xl font-semibold text-black dark:text-zinc-50">
          {current.lemma}
        </div>

        <div className="grid w-full max-w-xl grid-cols-1 gap-3">
          {options.map((option, i) => (
            <button
              key={option}
              onClick={() => choose(option)}
              className="flex items-center gap-3 rounded-lg border border-zinc-300 px-4 py-3 text-left text-black transition hover:border-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-zinc-300 text-xs text-zinc-500 dark:border-zinc-700">
                {i + 1}
              </span>
              <span>{option}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => record("unknown", false)}
          className="text-sm text-zinc-500 underline underline-offset-4 hover:text-zinc-800 dark:hover:text-zinc-300"
        >
          I don&apos;t know (space)
        </button>
      </div>

      {paused && (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-white/95 backdrop-blur dark:bg-black/95">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Paused
          </h2>
          <TallyRow tally={tally} />
          <p className="text-sm text-zinc-500">
            Everything so far is saved. You can close the tab safely.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setPaused(false)}
              className="rounded-lg bg-black px-5 py-2.5 font-medium text-white dark:bg-zinc-50 dark:text-black"
            >
              Resume
            </button>
            <Link
              href="/"
              className="rounded-lg border border-zinc-300 px-5 py-2.5 font-medium text-black dark:border-zinc-700 dark:text-zinc-50"
            >
              Finish
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

function TallyRow({ tally }: { tally: Tally }) {
  return (
    <div className="flex gap-8 text-center">
      <Stat label="Known" value={tally.known} tone="text-emerald-600" />
      <Stat label="Unsure" value={tally.unsure} tone="text-amber-600" />
      <Stat label="Unknown" value={tally.unknown} tone="text-red-600" />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div>
      <div className={`text-3xl font-semibold ${tone}`}>{value}</div>
      <div className="text-sm text-zinc-500">{label}</div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-white px-6 text-center dark:bg-black">
      {children}
    </main>
  );
}

function HomeLink() {
  return (
    <Link
      href="/"
      className="rounded-lg bg-black px-5 py-2.5 font-medium text-white dark:bg-zinc-50 dark:text-black"
    >
      Home
    </Link>
  );
}
