"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadWords, type Word } from "@/lib/local/words";
import { loadProgress, type Progress } from "@/lib/local/progress";
import { saveGoal } from "@/lib/local/goals";
import { addPart, loadDeck, saveDeck } from "@/lib/local/deck";
import { useRouter } from "next/navigation";
import { buildIndex } from "@/lib/korean/lemmatize";
import {
  scoreText,
  verdictFor,
  LIST_CEILING,
  SWEET_SPOT,
  type TextScore,
} from "@/lib/local/score";

export function Read() {
  const router = useRouter();
  const [words, setWords] = useState<Word[] | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    // localStorage is client-only, so state has to be filled in after mount.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setProgress(loadProgress());
    loadWords()
      .then(setWords)
      .catch((e: Error) => setError(e.message));
  }, []);

  // Building the index walks every lemma's conjugations, so it happens once
  // rather than on every keystroke.
  const index = useMemo(() => (words ? buildIndex(words) : null), [words]);

  const score = useMemo(
    () =>
      index && progress && text.trim() ? scoreText(text, index, progress) : null,
    [text, index, progress]
  );

  if (error) {
    return (
      <Shell>
        <p className="text-red-600">{error}</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <header>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← Home
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-black dark:text-zinc-50">
          Can I read this?
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Paste any Korean text and see how much of it you already know
        </p>
      </header>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder="한국어 텍스트를 여기에 붙여넣으세요."
        className="w-full rounded-xl border border-zinc-300 bg-transparent p-4 text-black placeholder:text-zinc-400 dark:border-zinc-700 dark:text-zinc-50"
      />

      {!words && (
        <p className="text-sm text-zinc-400">Loading the word list…</p>
      )}

      {score && <Result score={score} router={router} />}

      <p className="text-xs text-zinc-500">
        Nothing you paste is sent anywhere — the word list is already in your
        browser and the analysis runs there. Korean is matched by rule rather
        than by any model, so the same text always gives the same answer.
      </p>
    </Shell>
  );
}

function Result({
  score,
  router,
}: {
  score: TextScore;
  router: { push: (href: string) => void };
}) {
  const verdict = verdictFor(score);
  const [showUnresolved, setShowUnresolved] = useState(false);

  const tone = {
    good: "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
    close: "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
    hard: "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
  }[verdict.tone];

  return (
    <>
      <section className={`rounded-xl border p-6 ${tone}`}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-lg font-semibold text-black dark:text-zinc-50">
            {verdict.label}
          </span>
          <span className="text-3xl font-semibold text-black dark:text-zinc-50">
            {score.coverage}%
          </span>
        </div>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          {verdict.detail}
        </p>
        <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
          The comfortable band for learning is {SWEET_SPOT.low}–
          {SWEET_SPOT.high}% — enough known to carry you, enough new to be worth
          the effort.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="font-semibold text-black dark:text-zinc-50">
          Why the word list alone won&apos;t get you there
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Knowing every one of the 5,897 words on this list would cover about{" "}
          <strong className="font-medium text-black dark:text-zinc-50">
            {LIST_CEILING}%
          </strong>{" "}
          of running Korean — measured, not estimated. Comfortable reading needs{" "}
          {SWEET_SPOT.low}%. So finishing the list is a real achievement and
          still leaves a gap, and a learner who works through all of it and
          can&apos;t yet read a chapter book hasn&apos;t failed at anything.
        </p>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Closing that gap word by word from a general list is slow: the last
          3,900 words on it buy only ten percentage points. Going after a
          specific text is far faster — one book needs a few hundred words, and
          they are the ones that actually stand between you and it. That is what
          this page is for.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="font-semibold text-black dark:text-zinc-50">
          What the number is over
        </h2>
        <dl className="mt-3 flex flex-col gap-1.5 text-sm">
          <Row label="Korean words found" value={score.tokens} />
          <Row label="Matched to the list" value={score.resolved} />
          <Row label="You know" value={score.known} tone="text-emerald-600" />
          <Row label="Timed out when tested" value={score.unsure} tone="text-amber-600" />
          <Row label="Tested and didn't know" value={score.unknown} tone="text-red-600" />
          <Row label="Never tested" value={score.untested} tone="text-zinc-500" />
        </dl>
        {score.untested > 0 && (
          <p className="mt-3 text-xs text-zinc-500">
            Never-tested words count against the score. You may well know them —
            but this tool only claims what it has actually asked you, and
            assuming in your favour would inflate every number on the page.
          </p>
        )}
      </section>

      {score.toLearn.length > 0 && (
        <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <h2 className="font-semibold text-black dark:text-zinc-50">
            What you&apos;d need to learn
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {score.toLearn.length.toLocaleString()} words, the ones that appear
            most often here first — a word used five times is worth more than
            five used once.
          </p>
          <button
            onClick={() => {
              saveGoal({
                kind: "words",
                keys: score.toLearn.map((t) => t.word.key),
                label: `${score.toLearn.length} words from a text`,
              });
              router.push("/test");
            }}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-lg bg-black font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black"
          >
            Test me on these {score.toLearn.length.toLocaleString()} words
          </button>
          <button
            onClick={() => {
              saveDeck(
                addPart(
                  loadDeck(),
                  `${score.toLearn.length} words from a text`,
                  score.toLearn.map((t) => t.word.key)
                )
              );
              router.push("/words");
            }}
            className="mt-2 flex h-12 w-full items-center justify-center rounded-lg border border-zinc-300 font-medium text-black transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Add them to an Anki deck
          </button>
          <ul className="mt-4 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {score.toLearn.slice(0, 60).map(({ word, count }) => (
              <li
                key={word.key}
                className="flex items-baseline justify-between gap-4 py-2"
              >
                <span className="flex min-w-0 items-baseline gap-3">
                  <span className="text-lg text-black dark:text-zinc-50">
                    {word.lemma}
                  </span>
                  <span className="truncate text-sm text-zinc-500">
                    {word.gloss}
                  </span>
                </span>
                <span className="flex shrink-0 items-baseline gap-3 text-xs text-zinc-400">
                  {count > 1 && <span>×{count}</span>}
                  <span className="font-mono">{word.rank.toLocaleString()}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {score.unresolved.length > 0 && (
        <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <button
            onClick={() => setShowUnresolved((o) => !o)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span>
              <span className="font-semibold text-black dark:text-zinc-50">
                Not recognised
              </span>
              <span className="ml-2 font-semibold text-zinc-400">
                {score.unresolved.length.toLocaleString()}
              </span>
              <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-400">
                Left out of the score entirely. Mostly names and places, which a
                list of common words won&apos;t contain — but check them, because
                if a lot of ordinary words are here the score means less.
              </span>
            </span>
            <span className="shrink-0 text-zinc-400">
              {showUnresolved ? "Hide" : "Show"}
            </span>
          </button>
          {showUnresolved && (
            <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-500">
              {score.unresolved.slice(0, 120).map(({ token, count }) => (
                <span key={token}>
                  {token}
                  {count > 1 && (
                    <span className="text-zinc-400"> ×{count}</span>
                  )}
                </span>
              ))}
            </p>
          )}
        </section>
      )}
    </>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-zinc-600 dark:text-zinc-400">{label}</dt>
      <dd className={`font-medium ${tone ?? "text-black dark:text-zinc-50"}`}>
        {value.toLocaleString()}
      </dd>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col gap-6 bg-white px-6 py-12 dark:bg-black">
      {children}
    </main>
  );
}
