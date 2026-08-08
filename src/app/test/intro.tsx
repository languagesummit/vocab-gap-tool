"use client";

import { useState } from "react";
import Link from "next/link";
import type { Word } from "@/lib/local/words";
import type { Progress } from "@/lib/local/progress";
import {
  estimateMinutes,
  goalProgress,
  type Goal,
} from "@/lib/local/goals";

/**
 * What someone sees before their first session.
 *
 * Two jobs, and the first matters more. **Honesty beats accuracy** — a test
 * answered by guessing measures nothing, and someone who doesn't know that
 * will try to score well and quietly ruin their own data. Everything else on
 * this screen is secondary to getting that across.
 *
 * The second is scope. The full list is 5,897 words, and presented as the only
 * option it reads as a wall rather than an invitation.
 */
export function Intro({
  words,
  progress,
  onStart,
}: {
  words: Word[];
  progress: Progress;
  onStart: (goal: Goal) => void;
}) {
  const [choice, setChoice] = useState<Goal | null>(null);

  const options: Goal[] = [
    { kind: "count", n: 300 },
    { kind: "topik", level: 1 },
    { kind: "topik", level: 2 },
    { kind: "topik", level: 3 },
    { kind: "topik", level: 4 },
    { kind: "all" },
  ];

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col gap-6 bg-white px-6 py-12 dark:bg-black">
      <header>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← Home
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-black dark:text-zinc-50">
          Before you start
        </h1>
      </header>

      <section className="rounded-xl border-2 border-black p-6 dark:border-zinc-50">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          Be honest, not accurate
        </h2>
        <p className="mt-2 text-zinc-700 dark:text-zinc-300">
          This isn&apos;t an exam and nobody is scoring you. If you would be
          guessing at all — even a good guess — press{" "}
          <strong className="font-semibold text-black dark:text-zinc-50">
            I don&apos;t know
          </strong>
          .
        </p>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          A word you guessed right gets recorded as known, and then every number
          this tool gives you afterwards is wrong — including which words it
          tells you to study. Guessing only cheats you.
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="font-semibold text-black dark:text-zinc-50">
          How it works
        </h2>
        <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
          <li>
            <strong className="font-medium text-black dark:text-zinc-50">
              Go fast.
            </strong>{" "}
            A few seconds a word. If it doesn&apos;t come to you almost at once,
            that&apos;s an answer in itself — say you don&apos;t know it and move
            on.
          </li>
          <li>
            <strong className="font-medium text-black dark:text-zinc-50">
              Commonest words first.
            </strong>{" "}
            The list runs from the most frequent word in Korean outwards, so it
            gets rarer as you go.
          </li>
          <li>
            <strong className="font-medium text-black dark:text-zinc-50">
              Not knowing a common word is fine.
            </strong>{" "}
            Frequent doesn&apos;t mean essential — plenty of high-frequency words
            are ones you can live without. It&apos;s information, not a failure.
          </li>
          <li>
            <strong className="font-medium text-black dark:text-zinc-50">
              Expect surprises.
            </strong>{" "}
            Some words you were sure of will turn out to be a different meaning
            than you thought. That&apos;s the tool doing its job.
          </li>
          <li>
            <strong className="font-medium text-black dark:text-zinc-50">
              Speed is part of the answer.
            </strong>{" "}
            How long you take is recorded, and a word that comes back instantly
            counts as more securely known than one you had to dig for — both are
            &ldquo;known&rdquo;, but only one won&apos;t interrupt your reading.
            Answer at your natural pace rather than deliberating.
          </li>
          <li>
            <strong className="font-medium text-black dark:text-zinc-50">
              You can undo.
            </strong>{" "}
            <strong className="font-medium text-black dark:text-zinc-50">
              ← Undo last
            </strong>{" "}
            takes back the answer you just gave and asks that word again — for a
            mis-tap, or when you realise you did know it after all. A word asked
            twice records no time, since you&apos;ve already seen it and a quick
            second answer wouldn&apos;t mean the same thing.
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="font-semibold text-black dark:text-zinc-50">
          How much do you want to test?
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          You can stop any time and pick up where you left off — and change this
          later. Smaller scopes still give a real answer over their own range.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          New to Korean? Take <strong className="font-medium">TOPIK 1</strong> —
          it finishes, and it front-loads the everyday words. Further along?{" "}
          <strong className="font-medium">Commonest first</strong> finds your
          gaps faster, since it covers more reading per word tested.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {options.map((goal) => {
            const { total, remaining } = goalProgress(goal, words, progress);
            if (total === 0) return null;
            const selected =
              choice !== null && JSON.stringify(choice) === JSON.stringify(goal);
            return (
              <button
                key={JSON.stringify(goal)}
                onClick={() => setChoice(goal)}
                className={`flex items-baseline justify-between gap-3 rounded-lg border p-4 text-left transition ${
                  selected
                    ? "border-black bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-900"
                    : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                }`}
              >
                <span>
                  <span className="font-medium text-black dark:text-zinc-50">
                    {describe(goal)}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {why(goal)}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs text-zinc-500">
                  {remaining.toLocaleString()} left
                  <span className="block text-zinc-400">
                    ≈{estimateMinutes(remaining)} min
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => choice && onStart(choice)}
          disabled={!choice}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-lg bg-black font-medium text-white transition hover:bg-zinc-800 disabled:opacity-30 dark:bg-zinc-50 dark:text-black"
        >
          {choice ? "Start testing" : "Pick one to start"}
        </button>
      </section>

      <p className="text-xs text-zinc-500">
        The list is the National Institute of Korean Language&apos;s
        frequency-ranked vocabulary, one entry per meaning — so 먹어요, 먹었어요
        and 먹는다 all count as the single word 먹다, and you&apos;re never asked
        the same word twice in different clothes.
      </p>
    </main>
  );
}

function describe(goal: Goal): string {
  switch (goal.kind) {
    case "count":
      return `The ${goal.n.toLocaleString()} most common words`;
    case "topik":
      return `TOPIK level ${goal.level}`;
    case "all":
      return "Everything";
    case "words":
      return goal.label;
  }
}

/**
 * What each goal actually buys, measured rather than asserted.
 *
 * The two orderings genuinely disagree. Frequency order covers more text per
 * word — its first 795 words account for 61% of running Korean against TOPIK
 * 1's 52% — because that is what frequency ordering is for. But TOPIK 1 carries
 * 462 words frequency would not reach for thousands of ranks, and they are
 * numbers, shops and everyday places: rare on a page, unavoidable in a day.
 *
 * So neither is simply better. A beginner needs 편의점 and 여덟 sooner than they
 * need 때문 and 대하다, and gets a finishable target as well; someone already
 * past that gets more from the frequency order, where their gaps actually are.
 */
function why(goal: Goal): string {
  switch (goal.kind) {
    case "count":
      return "A quick sample of the commonest words — the fastest read on where you stand";
    case "topik":
      return goal.level === 1
        ? "A finishable target. Covers everyday things — numbers, shops, food — that frequency order won't reach for thousands of words"
        : `Everything the curriculum expects by level ${goal.level}`;
    case "all":
      return "The full census, commonest first. Covers the most reading per word tested, and the only route to complete gap analysis";
    case "words":
      return "The words from the text you scored";
  }
}
