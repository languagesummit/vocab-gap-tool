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
  type TimedWord,
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
  const knownTimed =
    a.recall.automatic.length + a.recall.solid.length + a.recall.effortful.length;

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
          Against the exam
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          The same answers placed against the TOPIK vocabulary lists and
          국립국어원&apos;s difficulty grades, rather than against frequency.
        </p>
        <Link
          href="/levels"
          className="mt-4 flex h-12 items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium text-black transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          See exam levels
        </Link>
      </Card>

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

      <Card>
        <h2 className="font-semibold text-black dark:text-zinc-50">
          By meaning
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Where the holes are by subject rather than by rank — colours, animals,
          the body, food. Vocabulary picked up by talking comes out lumpy, and
          frequency order can&apos;t see that shape.
        </p>
        <Link
          href="/gaps"
          className="mt-4 flex h-12 items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium text-black transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          See what you&apos;re missing
        </Link>
      </Card>

      {a.medianKnownMs !== null && (
        <Card>
          <h2 className="font-semibold text-black dark:text-zinc-50">
            How readily it comes back
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Knowing a word and reaching it instantly are different things. A
            word you recall automatically costs nothing when reading; one you
            have to dig for still breaks the flow. Your median on a known word
            is{" "}
            <span className="font-mono text-black dark:text-zinc-50">
              {(a.medianKnownMs / 1000).toFixed(1)}s
            </span>
            . Reading the options is discounted out of the split below, so a
            long definition isn&apos;t counted against you.
          </p>

          <div className="mt-4 flex flex-col gap-4">
            <RecallRow
              label="Automatic"
              blurb="Came back with no hunting."
              words={a.recall.automatic}
              colour="bg-emerald-500"
              total={knownTimed}
            />
            <RecallRow
              label="Solid"
              blurb="Known, with a beat of thought."
              words={a.recall.solid}
              colour="bg-sky-500"
              total={knownTimed}
            />
            <RecallRow
              label="Effortful"
              blurb="Known, but slow enough to interrupt reading."
              words={a.recall.effortful}
              colour="bg-violet-500"
              total={knownTimed}
            />
          </div>

          {a.knownWithoutTiming > 0 && (
            <p className="mt-4 text-xs text-zinc-500">
              {a.knownWithoutTiming.toLocaleString()} known{" "}
              {a.knownWithoutTiming === 1 ? "word carries" : "words carry"} no
              timing and {a.knownWithoutTiming === 1 ? "is" : "are"} left out of
              this split.
            </p>
          )}
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

function RecallRow({
  label,
  blurb,
  words,
  colour,
  total,
}: {
  label: string;
  blurb: string;
  words: TimedWord[];
  colour: string;
  total: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => words.length > 0 && setOpen((o) => !o)}
        className="flex w-full items-baseline justify-between gap-3 text-left"
      >
        <span className="text-sm">
          <span className="text-black dark:text-zinc-50">{label}</span>
          <span className="ml-2 text-zinc-500">{blurb}</span>
        </span>
        <span className="shrink-0 text-sm font-medium text-black dark:text-zinc-50">
          {words.length.toLocaleString()}
        </span>
      </button>
      <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
        <div
          className={`h-full ${colour}`}
          style={{ width: `${total === 0 ? 0 : (words.length / total) * 100}%` }}
        />
      </div>
      {open && (
        <ul className="mt-2 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {words.slice(0, LIST_LIMIT).map((t) => (
            <li
              key={t.word.key}
              className="flex items-baseline justify-between gap-4 py-2"
            >
              <span className="flex items-baseline gap-3">
                <span className="text-lg text-black dark:text-zinc-50">
                  {t.word.lemma}
                </span>
                <span className="text-sm text-zinc-500">{t.word.gloss}</span>
              </span>
              <span className="shrink-0 font-mono text-xs text-zinc-400">
                {(t.ms / 1000).toFixed(1)}s
              </span>
            </li>
          ))}
        </ul>
      )}
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
