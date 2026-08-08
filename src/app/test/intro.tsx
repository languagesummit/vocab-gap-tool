"use client";

import { useState } from "react";
import Link from "next/link";
import type { Word } from "@/lib/local/words";
import type { Progress } from "@/lib/local/progress";
import {
  estimateMinutes,
  goalLabel,
  goalProgress,
  type Goal,
} from "@/lib/local/goals";

/**
 * The three questions people actually arrive with. Asking which of these you
 * want is fewer decisions than the list of scopes it replaces, not more: six
 * options that all looked like the same kind of thing gave no basis for
 * choosing between them, whereas these differ in what they answer and each one
 * settles its own scope.
 *
 * They are genuinely different bodies of words. Rank order covers the most text
 * per word tested; TOPIK front-loads what a syllabus teaches; daily life sits at
 * a median rank of 3,166 and overlaps TOPIK 1 by only a quarter, so neither of
 * the others reaches it early.
 */
const INTENTS: Array<{
  id: string;
  question: string;
  why: string;
  goal: Goal | null;
}> = [
  {
    id: "read",
    question: "I want to read more Korean",
    why: "Commonest words first — the most reading unlocked per word tested",
    goal: { kind: "all" },
  },
  {
    id: "exam",
    question: "I'm working towards a TOPIK level",
    why: "The vocabulary a curriculum teaches for that level, and a level finishes",
    goal: null,
  },
  {
    id: "life",
    question: "I want to handle daily life in Korean",
    why: "Food, home, clothes, shopping, transport, health — words rank order reaches late",
    goal: { kind: "everyday" },
  },
];

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
  const [open, setOpen] = useState<string | null>(null);


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
          What do you want to find out?
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Different questions are best answered by testing different words, so
          this picks where to start. Nothing is locked in:{" "}
          <strong className="font-medium text-black dark:text-zinc-50">
            every answer counts toward all of them
          </strong>
          , and you can change this whenever you like without losing anything.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {INTENTS.map((intent) => {
            const active = open === intent.id;
            return (
              <div key={intent.id}>
                <button
                  onClick={() => {
                    setOpen(intent.id);
                    if (intent.goal) setChoice(intent.goal);
                    else setChoice(null);
                  }}
                  className={`flex w-full items-baseline justify-between gap-3 rounded-lg border p-4 text-left transition ${
                    active
                      ? "border-black bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-900"
                      : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  }`}
                >
                  <span>
                    <span className="font-medium text-black dark:text-zinc-50">
                      {intent.question}
                    </span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      {intent.why}
                    </span>
                  </span>
                  {intent.goal && (
                    <span className="shrink-0 text-right text-xs text-zinc-500">
                      {goalProgress(intent.goal, words, progress).remaining.toLocaleString()}{" "}
                      left
                      <span className="block text-zinc-400">
                        ≈
                        {estimateMinutes(
                          goalProgress(intent.goal, words, progress).remaining
                        )}{" "}
                        min
                      </span>
                    </span>
                  )}
                </button>

                {active && intent.id === "exam" && (
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {[1, 2, 3, 4, 5, 6].map((level) => {
                      const goal: Goal = { kind: "topik", level };
                      const { total, remaining } = goalProgress(
                        goal,
                        words,
                        progress
                      );
                      if (total === 0) return null;
                      const on =
                        choice?.kind === "topik" && choice.level === level;
                      return (
                        <button
                          key={level}
                          onClick={() => setChoice(goal)}
                          className={`rounded-lg border p-2 text-center text-xs transition ${
                            on
                              ? "border-black bg-black text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-black"
                              : "border-zinc-300 text-black hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50"
                          }`}
                        >
                          <span className="block font-medium">TOPIK {level}</span>
                          <span
                            className={on ? "opacity-70" : "text-zinc-400"}
                          >
                            {remaining.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => choice && onStart(choice)}
          disabled={!choice}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-lg bg-black font-medium text-white transition hover:bg-zinc-800 disabled:opacity-30 dark:bg-zinc-50 dark:text-black"
        >
          {choice ? `Start — ${goalLabel(choice)}` : "Pick one to start"}
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


