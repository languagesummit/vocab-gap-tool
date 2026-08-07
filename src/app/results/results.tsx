"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadWords, type Word } from "@/lib/local/words";
import { loadProgress, saveProgress, type Progress } from "@/lib/local/progress";
import {
  analyse,
  knownRange,
  pct,
  type Group,
  type Split,
} from "@/lib/local/analysis";

export function Results() {
  const [words, setWords] = useState<Word[] | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // localStorage is client-only, so state has to be filled in after mount.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setProgress(loadProgress());
    loadWords()
      .then(setWords)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <Shell>
        <p className="text-red-600">{error}</p>
      </Shell>
    );
  }

  if (!words || !progress) {
    return (
      <Shell>
        <p className="text-zinc-400">Reading your answers…</p>
      </Shell>
    );
  }

  const a = analyse(progress, words);

  if (a.overall.tested === 0) {
    return (
      <Shell>
        <p className="text-zinc-500">
          Nothing to show yet — test some words and this fills in.
        </p>
        <Link
          href="/test"
          className="flex h-12 w-full items-center justify-center rounded-lg bg-black font-medium text-white dark:bg-zinc-50 dark:text-black"
        >
          Start testing
        </Link>
      </Shell>
    );
  }

  const range = knownRange(a.overall);
  const timedOutPct = pct(a.overall.unsure, a.overall.tested);

  /** Clears the timed-out words so they return to the front of the queue. */
  function retestUnsure() {
    if (!words) return;
    const unsureKeys = analyse(loadProgress(), words).unsureWords.map(
      (w) => w.key
    );
    if (
      !confirm(
        `Clear ${unsureKeys.length.toLocaleString()} timed-out words so they come round again? Your known and unknown answers stay as they are.`
      )
    ) {
      return;
    }
    const next = loadProgress();
    for (const key of unsureKeys) delete next.words[key];

    let highest = 0;
    for (const word of words) {
      if (next.words[word.key] && word.rank > highest) highest = word.rank;
    }
    next.frontierRank = highest;
    saveProgress(next);
    setProgress({ ...next });
  }

  return (
    <Shell>
      <header>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← Home
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-black dark:text-zinc-50">
          What you know
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Korean · exact for ranks 1–{a.frontierRank.toLocaleString()}, untested
          beyond that
        </p>
      </header>

      <Card>
        <div className="text-sm text-zinc-500">Words you know</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-4xl font-semibold text-black dark:text-zinc-50">
            {range.low.toLocaleString()}
          </span>
          {range.high !== range.low && (
            <span className="text-2xl text-zinc-400">
              – {range.high.toLocaleString()}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Out of {a.overall.tested.toLocaleString()} tested. The range is what
          the timed-out words could turn out to be — confirmed at the bottom,
          all of them known at the top.
        </p>
        <div className="mt-4">
          <Bar split={a.overall} />
          <Legend split={a.overall} />
        </div>
      </Card>

      {timedOutPct >= 25 && (
        <Card tone="amber">
          <h2 className="font-semibold text-amber-900 dark:text-amber-200">
            The clock is doing most of the answering
          </h2>
          <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/80">
            {timedOutPct}% of your answers ran out of time rather than being
            answered — {a.overall.unsure.toLocaleString()} words. Those sit
            between known and unknown, so most of your result is currently
            undecided. Either give yourself longer per word, or clear them and
            go again.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={retestUnsure}
              className="flex h-12 items-center justify-center rounded-lg bg-amber-600 px-5 font-medium text-white transition hover:bg-amber-700"
            >
              Retest the timed-out words
            </button>
            <Link
              href="/"
              className="flex h-12 items-center justify-center rounded-lg border border-amber-300 px-5 font-medium text-amber-900 dark:border-amber-800 dark:text-amber-200"
            >
              Change the timer
            </Link>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold text-black dark:text-zinc-50">
          By how common the word is
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          The most useful shape on this page. Knowledge should thin out as
          words get rarer — where it drops off is where studying pays.
        </p>
        <Groups groups={a.bands} showUntested />
      </Card>

      <Card>
        <h2 className="font-semibold text-black dark:text-zinc-50">
          By part of speech
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Tagged for all {(5897).toLocaleString()} words.
        </p>
        <Groups groups={a.byPos} />
      </Card>

      {a.byCategory.length > 0 && (
        <Card>
          <h2 className="font-semibold text-black dark:text-zinc-50">
            By meaning
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Only {a.categorised.toLocaleString()} of the{" "}
            {(5897).toLocaleString()} words carry a meaning tag so far, so this
            covers the early ranks only.
          </p>
          <Groups groups={a.byCategory} />
        </Card>
      )}

      {a.medianKnownMs !== null && (
        <Card>
          <h2 className="font-semibold text-black dark:text-zinc-50">Pace</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            When you know a word you answer in{" "}
            <span className="font-mono text-black dark:text-zinc-50">
              {(a.medianKnownMs / 1000).toFixed(1)}s
            </span>{" "}
            typically. Words you know tend to come fast, so a timer comfortably
            above this mostly buys hesitation rather than accuracy.
          </p>
        </Card>
      )}

      <WordList
        title="Didn't know"
        blurb="Answered wrong or skipped. This is the study list."
        words={a.unknownWords}
        tone="text-red-600"
      />
      <WordList
        title="Ran out of time"
        blurb="Seen but not confirmed. Worth a second pass."
        words={a.unsureWords}
        tone="text-amber-600"
      />
    </Shell>
  );
}

function Groups({
  groups,
  showUntested = false,
}: {
  groups: Group[];
  showUntested?: boolean;
}) {
  return (
    <div className="mt-4 flex flex-col gap-4">
      {groups.map((g) => {
        const untested = g.total - g.tested;
        return (
          <div key={g.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-black dark:text-zinc-50">{g.label}</span>
              <span className="text-zinc-500">
                {g.tested === 0 ? (
                  "untested"
                ) : (
                  <>
                    {pct(g.known, g.tested)}% known
                    {showUntested && untested > 0 && (
                      <span className="text-zinc-400">
                        {" "}
                        · {untested.toLocaleString()} untested
                      </span>
                    )}
                  </>
                )}
              </span>
            </div>
            <Bar split={g} />
          </div>
        );
      })}
    </div>
  );
}

function Bar({ split }: { split: Split }) {
  const total = split.tested || 1;
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="mt-1.5 flex h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
      <div className="bg-emerald-500" style={{ width: seg(split.known) }} />
      <div className="bg-amber-400" style={{ width: seg(split.unsure) }} />
      <div className="bg-red-500" style={{ width: seg(split.unknown) }} />
    </div>
  );
}

function Legend({ split }: { split: Split }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
      <Key colour="bg-emerald-500" label="Known" value={split.known} />
      <Key colour="bg-amber-400" label="Timed out" value={split.unsure} />
      <Key colour="bg-red-500" label="Didn't know" value={split.unknown} />
    </div>
  );
}

function Key({
  colour,
  label,
  value,
}: {
  colour: string;
  label: string;
  value: number;
}) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${colour}`} />
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <span className="font-medium text-black dark:text-zinc-50">
        {value.toLocaleString()}
      </span>
    </span>
  );
}

const LIST_LIMIT = 150;

function WordList({
  title,
  blurb,
  words,
  tone,
}: {
  title: string;
  blurb: string;
  words: Word[];
  tone: string;
}) {
  const [open, setOpen] = useState(false);
  if (words.length === 0) return null;
  const shown = open ? words.slice(0, LIST_LIMIT) : [];

  return (
    <Card>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="font-semibold text-black dark:text-zinc-50">
            {title}
          </span>
          <span className={`ml-2 font-semibold ${tone}`}>
            {words.length.toLocaleString()}
          </span>
          <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">
            {blurb}
          </span>
        </span>
        <span className="shrink-0 text-zinc-400">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <ul className="mt-4 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {shown.map((w) => (
            <li
              key={w.key}
              className="flex items-baseline justify-between gap-4 py-2"
            >
              <span className="flex items-baseline gap-3">
                <span className="text-lg text-black dark:text-zinc-50">
                  {w.lemma}
                </span>
                <span className="text-sm text-zinc-500">{w.gloss}</span>
              </span>
              <span className="shrink-0 font-mono text-xs text-zinc-400">
                {w.rank.toLocaleString()}
              </span>
            </li>
          ))}
          {words.length > LIST_LIMIT && (
            <li className="py-2 text-sm text-zinc-500">
              Showing the first {LIST_LIMIT} of {words.length.toLocaleString()}.
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}

function Card({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "amber";
}) {
  const style =
    tone === "amber"
      ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
      : "border-zinc-200 dark:border-zinc-800";
  return <section className={`rounded-xl border p-6 ${style}`}>{children}</section>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col gap-6 bg-white px-6 py-12 dark:bg-black">
      {children}
    </main>
  );
}
