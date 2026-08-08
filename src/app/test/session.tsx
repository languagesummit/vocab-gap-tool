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
import {
  clearGoal,
  goalLabel,
  loadGoal,
  queueFor,
  saveGoal,
  type Goal,
} from "@/lib/local/goals";
import { Intro } from "./intro";
import {
  counterCount,
  counterUnits,
  isBoundPos,
  patternFor,
  patternMeaning,
} from "@/lib/local/patterns";

// Distractors are drawn from nearby ranks so the wrong answers are plausible
// rather than obviously advanced vocabulary.
const DISTRACTOR_WINDOW = 400;

// When the clock runs out the word stays on screen for a moment before the
// next one appears, and input is ignored for that moment. Without it, an
// answer begun just before the buzzer lands on the following word instead.
const GRACE_MS = 700;

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

  const [goal, setGoal] = useState<Goal | null>(null);
  const [paused, setPaused] = useState(false);
  const [frontier, setFrontier] = useState(0);
  // The word whose timer just ran out. Set for GRACE_MS, during which the
  // next question is held back and answers are ignored.
  const [expired, setExpired] = useState<Word | null>(null);

  const progressRef = useRef<Progress | null>(null);
  /**
   * Words taken back with Undo. Once a word and its options have been seen,
   * answering it again measures recognition-after-exposure rather than recall,
   * so a fast second attempt is not the same evidence as a fast first one and
   * must not be recorded as though it were.
   */
  const reAsked = useRef<Set<string>>(new Set());
  // Time left on the current word, carried across pauses.
  const remainingRef = useRef(0);
  const startedAt = useRef(0);

  useEffect(() => {
    const saved = loadProgress();
    progressRef.current = saved;
    // localStorage can only be read on the client, so this genuinely is
    // "sync React state from an external system" despite the lint rule.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setProgress(saved);
    setFrontier(saved.frontierRank);

    const chosen = loadGoal();
    setGoal(chosen);

    loadWords()
      .then((all) => {
        setWords(all);
        // Only what the chosen goal covers, in frequency order and skipping
        // anything already answered. No batching — the session runs until it
        // is paused or the goal is finished.
        if (chosen) setQueue(queueFor(chosen, all, saved));
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const current = queue[position];
  const finished = words !== null && position >= queue.length;

  const options = useMemo(() => {
    if (!current || !words) return [];
    const choices = progress?.settings.choices ?? 3;

    // Every meaning this lemma carries anywhere in the list. 있다 sits at ranks
    // 3, 4 and 854; offering "to exist" against "to be in the middle of doing"
    // asks which sense was meant rather than whether the word is known. Barring
    // the lemma alone is not enough — an unrelated word can carry the same
    // gloss text, which would be just as wrong to mark incorrect.
    const ownMeanings = new Set(
      words.filter((w) => w.lemma === current.lemma).map((w) => w.gloss)
    );

    // Every verb and adjective ends in -다, so the dictionary form announces
    // the part of speech before the glosses are even read. A noun sitting
    // opposite a verb can be dismissed on shape alone, which turns the
    // question into a free point. Distractors match the part of speech.
    const eligible = words.filter(
      (w) =>
        w.lemma !== current.lemma &&
        !ownMeanings.has(w.gloss) &&
        w.pos === current.pos
    );

    const needed = choices - 1;
    const distinct = (list: Word[]) => new Set(list.map((w) => w.gloss)).size;

    // Nearby ranks keep the wrong answers plausible rather than obviously
    // advanced. Rare parts of speech — 11 contractions in the whole list —
    // can't always field neighbours, so widen until there are enough.
    let pool: Word[] = [];
    for (const window of [
      DISTRACTOR_WINDOW,
      DISTRACTOR_WINDOW * 4,
      Infinity,
    ]) {
      pool = eligible.filter((w) => Math.abs(w.rank - current.rank) <= window);
      if (distinct(pool) >= needed) break;
    }

    // Last resort: a part of speech too small to fill the question at all.
    // A mismatched distractor beats a missing one.
    if (distinct(pool) < needed) {
      pool = words.filter(
        (w) => w.lemma !== current.lemma && !ownMeanings.has(w.gloss)
      );
    }

    const answer = patternMeaning(current.key, current.gloss);

    // A counter asked against ordinary glosses gives itself away: only one
    // option is a countable unit. So the wrong answers are other counters,
    // all wearing the same number as the question.
    const count = counterCount(current.key);
    if (count) {
      const others = counterUnits().filter((u) => u.key !== current.key);
      const chosen: string[] = [];
      let n = current.rank * 2654435761;
      while (chosen.length < choices - 1 && others.length > 0) {
        n = (n * 1103515245 + 12345) & 0x7fffffff;
        const pick = others.splice(n % others.length, 1)[0];
        const text = `${count} ${pick.unit}`;
        if (text !== answer && !chosen.includes(text)) chosen.push(text);
      }
      const all = [answer, ...chosen];
      let cs = current.rank * 40503;
      for (let i = all.length - 1; i > 0; i--) {
        cs = (cs * 1103515245 + 12345) & 0x7fffffff;
        const j = cs % (i + 1);
        [all[i], all[j]] = [all[j], all[i]];
      }
      return all;
    }

    const picked: string[] = [];
    const seen = new Set<string>([answer, current.gloss]);
    // Deterministic per word so a re-render doesn't reshuffle mid-question.
    let seed = current.rank * 2654435761;
    while (picked.length < needed && pool.length > 0) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const candidate = pool[seed % pool.length];
      if (!seen.has(candidate.gloss)) {
        seen.add(candidate.gloss);
        picked.push(candidate.gloss);
      } else if (seen.size >= pool.length + 1) {
        break;
      }
    }

    const all = [answer, ...picked];
    // Shuffle deterministically too, so the answer isn't always first.
    let s = current.rank * 40503;
    for (let i = all.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
  }, [current, words, progress?.settings.choices]);

  const timerMs = progress?.settings.timerMs ?? 5000;

  const record = useCallback(
    (status: Status, timedOut: boolean) => {
      const word = queue[position];
      const saved = progressRef.current;
      if (!word || !saved) return;

      // Active time on the word — excludes however long it sat paused.
      const activeMs =
        timerMs - remainingRef.current + (Date.now() - startedAt.current);

      saved.words[word.key] = {
        status,
        at: Date.now(),
        // No timing for a word already seen this session — see `reAsked`.
        ms: timedOut || reAsked.current.has(word.key) ? null : activeMs,
        chars: options.reduce((n, o) => n + o.length, 0),
      };
      saved.frontierRank = Math.max(saved.frontierRank, word.rank);
      // Written after every answer, so quitting the tab never loses work.
      saveProgress(saved);

      setTally((t) => ({ ...t, [status]: t[status] + 1 }));
      setFrontier((f) => Math.max(f, word.rank));
      setPosition((p) => p + 1);
    },
    [queue, position, timerMs, options]
  );

  // Steps back to the previous word and un-records it, so a mis-click or a
  // word answered before it was read can be redone.
  const goBack = useCallback(() => {
    const saved = progressRef.current;
    if (position === 0 || !saved || !words) return;

    const previous = queue[position - 1];
    const undone = saved.words[previous.key];
    if (undone) {
      delete saved.words[previous.key];
      reAsked.current.add(previous.key);
      setTally((t) => ({
        ...t,
        [undone.status]: Math.max(0, t[undone.status] - 1),
      }));
    }

    // The frontier is the highest rank still answered, which may now be lower.
    let highest = 0;
    for (const word of words) {
      if (saved.words[word.key] && word.rank > highest) highest = word.rank;
    }
    saved.frontierRank = highest;
    saveProgress(saved);

    setFrontier(highest);
    setPaused(false);
    setExpired(null);
    setPosition((p) => p - 1);
  }, [position, queue, words]);

  // Each new word gets a full allowance. Declared before the timer effect so
  // it runs first when the question changes.
  useEffect(() => {
    remainingRef.current = timerMs;
  }, [position, timerMs]);

  // Holding here means the next word's clock hasn't started yet, so the pause
  // costs the user nothing.
  useEffect(() => {
    if (!current || paused || finished || expired) return;
    startedAt.current = Date.now();

    // A single timeout instead of a 50ms interval — the visible countdown is
    // a CSS animation, so React doesn't need to re-render while it runs.
    const id = setTimeout(() => {
      // Out of time means recognised but not recalled fast enough —
      // "unsure", which is distinct from getting it wrong.
      setExpired(current);
      record("unsure", true);
    }, remainingRef.current);

    return () => {
      clearTimeout(id);
      remainingRef.current = Math.max(
        0,
        remainingRef.current - (Date.now() - startedAt.current)
      );
    };
  }, [current, paused, finished, expired, record]);

  useEffect(() => {
    if (!expired) return;
    const id = setTimeout(() => setExpired(null), GRACE_MS);
    return () => clearTimeout(id);
  }, [expired]);

  const choose = useCallback(
    (option: string) => {
      if (!current || expired) return;
      record(
        option === patternMeaning(current.key, current.gloss)
          ? "known"
          : "unknown",
        false
      );
    },
    [current, expired, record]
  );

  const answerUnknown = useCallback(() => {
    if (expired) return;
    record("unknown", false);
  }, [expired, record]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // P is the natural reach for pause; escape still works.
      if (e.key === "Escape" || e.key === "p" || e.key === "P") {
        setPaused((p) => !p);
        return;
      }
      // While paused, space resumes rather than answering.
      if (paused) {
        if (e.key === " ") {
          e.preventDefault();
          setPaused(false);
        }
        return;
      }
      if (e.key === "Backspace" || e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
        return;
      }
      // Answers are dropped during the grace beat — that keystroke belonged
      // to the word that just timed out, not the one coming up. Going back is
      // still allowed, which is how you reclaim it.
      if (finished || !current || expired) return;
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) {
        choose(options[n - 1]);
      } else if (e.key === " " || e.key === "0") {
        e.preventDefault();
        answerUnknown();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    current,
    options,
    choose,
    answerUnknown,
    goBack,
    paused,
    finished,
    expired,
  ]);

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

  if (!goal) {
    return (
      <Intro
        words={words}
        progress={progress}
        onStart={(chosen) => {
          saveGoal(chosen);
          setGoal(chosen);
          setQueue(queueFor(chosen, words, progress));
          setPosition(0);
        }}
      />
    );
  }

  if (queue.length === 0) {
    return (
      <Centered>
        <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Nothing left in this goal
        </h2>
        <p className="text-zinc-500">
          Every word in &ldquo;{goalLabel(goal)}&rdquo; has been answered.
          Choose a wider goal to keep going.
        </p>
        <button
          onClick={() => setGoal(null)}
          className="flex h-12 items-center justify-center rounded-lg bg-black px-6 font-medium text-white dark:bg-zinc-50 dark:text-black"
        >
          Choose another goal
        </button>
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
        <ResultsLink />
        <HomeLink />
      </Centered>
    );
  }

  return (
    // dvh rather than vh: iOS measures 100vh behind the address bar, which
    // pushed the answers off-screen. select-none stops fast tapping from
    // dragging a text selection across the glosses.
    <main className="flex min-h-[100dvh] select-none flex-col bg-white dark:bg-black">
      <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-900">
        <div
          // Restarting the animation per word is what the key is for.
          key={position}
          className="countdown-bar h-full w-full bg-black dark:bg-zinc-50"
          style={{
            // Duration stays fixed; pausing freezes the sweep where it is and
            // resuming continues from that point.
            animationDuration: `${timerMs}ms`,
            animationPlayState: paused || expired ? "paused" : "running",
          }}
        />
      </div>

      <div className="flex items-center justify-between px-6 py-3 text-sm text-zinc-500">
        <span className="flex items-center gap-3">
          <button
            onClick={goBack}
            disabled={position === 0}
            title="Undo the last answer and ask that word again (backspace)"
            className="flex h-11 items-center rounded-md border border-zinc-300 px-3 text-xs text-black transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            ← Undo last
          </button>
          {/* During the beat the header still belongs to the word on screen. */}
          <span>Rank {(expired ?? current).rank.toLocaleString()}</span>
        </span>
        <span className="flex items-center gap-4">
          <span className="text-emerald-600">{tally.known}</span>
          <span className="text-amber-600">{tally.unsure}</span>
          <span className="text-red-600">{tally.unknown}</span>
          <button
            onClick={() => setPaused(true)}
            className="flex h-11 items-center rounded-md border border-zinc-300 px-3 text-xs text-black transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Pause
            <span className="hidden text-zinc-400 sm:inline">&nbsp;(P)</span>
          </button>
        </span>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-10">
        {expired && (
          // Sits over the answers so a click thrown just after the buzzer is
          // swallowed here instead of answering the next word.
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-white/95 dark:bg-black/95">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Time&apos;s up — marked unsure
            </span>
            <div className="text-center text-4xl font-semibold text-zinc-400 dark:text-zinc-600">
              {patternFor(expired.key)?.form ?? expired.lemma}
            </div>
            {expired.hint && (
              <span className="-mt-2 text-sm text-zinc-400 dark:text-zinc-600">
                {expired.hint}
              </span>
            )}
            <span className="text-sm text-zinc-500">
              Press ← Undo last to answer it after all
            </span>
          </div>
        )}

        <div className="flex flex-col items-center gap-3">
          {patternFor(current.key) ? (
            // A bound word shown bare asks the wrong question: 수 alone means
            // nothing, while -(으)ㄹ 수 있다 is something a learner uses daily.
            // The pattern leads and the lemma sits under it, so what is being
            // asked about stays clear.
            <>
              <div className="text-center text-4xl font-semibold text-black dark:text-zinc-50">
                {patternFor(current.key)?.form}
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500 dark:bg-zinc-900">
                grammar pattern · {current.lemma}
              </span>
            </>
          ) : (
            <>
              <div className="text-5xl font-semibold text-black dark:text-zinc-50">
                {current.lemma}
              </div>
              {isBoundPos(current.pos) && (
                // No curated pattern for this one, but it is still bound —
                // saying so beats letting it look like an ordinary word you
                // ought to recognise on its own.
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500 dark:bg-zinc-900">
                  never used alone — attaches to another word
                </span>
              )}
            </>
          )}
          {/* Only set where the lemma repeats, so its presence is itself the
              signal that this word has more than one sense in the list. */}
          {current.hint && !patternFor(current.key) && (
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              {current.hint}
            </span>
          )}
        </div>

        <div className="grid w-full max-w-sm grid-cols-1 gap-2">
          {options.map((option, i) => (
            <button
              key={option}
              onClick={() => choose(option)}
              className="relative flex items-center justify-center rounded-lg border border-zinc-300 px-10 py-3 text-center text-black transition hover:border-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              <span className="absolute left-3 hidden h-6 w-6 items-center justify-center rounded border border-zinc-300 text-xs text-zinc-500 sm:flex dark:border-zinc-700">
                {i + 1}
              </span>
              <span>{option}</span>
            </button>
          ))}
        </div>

        {/*
          On a phone there is no space bar, so this is the honesty button the
          whole result depends on. It gets the same reach as the answers.
        */}
        <button
          onClick={answerUnknown}
          className="flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 text-zinc-600 transition hover:border-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          I don&apos;t know
          <span className="hidden text-xs text-zinc-400 sm:inline">(space)</span>
        </button>
      </div>

      {paused && (
        // Translucent rather than solid, so the question stays visible behind
        // it and pausing reads as a held game rather than a different screen.
        // The blur is heavy enough that the glosses can't be read through it,
        // which keeps pause from doubling as unlimited thinking time.
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-white/60 px-6 backdrop-blur-md dark:bg-black/70">
          <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
            Paused
          </h2>
          <TallyRow tally={tally} />
          <p className="text-sm text-zinc-500">
            Everything so far is saved. You can close the tab safely.
          </p>
          {/* Stacked on a phone — side by side they hit both screen edges
              and wrapped onto two lines. */}
          <div className="flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center">
            <button
              onClick={() => setPaused(false)}
              autoFocus
              className="flex h-12 items-center justify-center rounded-lg bg-black px-5 font-medium whitespace-nowrap text-white dark:bg-zinc-50 dark:text-black"
            >
              Resume
              <span className="hidden opacity-60 sm:inline">&nbsp;(space)</span>
            </button>
            <button
              onClick={goBack}
              disabled={position === 0}
              className="flex h-12 items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium whitespace-nowrap text-black transition disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-50"
            >
              ← Undo last answer
            </button>
            <button
              onClick={() => {
                clearGoal();
                setGoal(null);
                setPaused(false);
              }}
              className="flex h-12 items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium whitespace-nowrap text-black transition dark:border-zinc-700 dark:text-zinc-50"
            >
              Change goal
            </button>
            <Link
              href="/results"
              className="flex h-12 items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium whitespace-nowrap text-black dark:border-zinc-700 dark:text-zinc-50"
            >
              Results
            </Link>
            <Link
              href="/"
              className="flex h-12 items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium whitespace-nowrap text-black dark:border-zinc-700 dark:text-zinc-50"
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
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-white px-6 text-center dark:bg-black">
      {children}
    </main>
  );
}

function HomeLink() {
  return (
    <Link
      href="/"
      className="flex h-12 items-center rounded-lg bg-black px-5 font-medium text-white dark:bg-zinc-50 dark:text-black"
    >
      Home
    </Link>
  );
}

function ResultsLink() {
  return (
    <Link
      href="/results"
      className="flex h-12 items-center rounded-lg border border-zinc-300 px-5 font-medium text-black dark:border-zinc-700 dark:text-zinc-50"
    >
      See what this says
    </Link>
  );
}
