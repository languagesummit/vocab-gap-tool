"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveSession, type Answer } from "./actions";

export type Question = {
  wordId: string;
  rank: number;
  lemma: string;
  answer: string;
  options: string[];
};

type Props = {
  languageId: string;
  questions: Question[];
  timerMs: number;
  startingRank: number;
};

export function Quiz({ languageId, questions, timerMs, startingRank }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [remaining, setRemaining] = useState(timerMs);
  const [saveState, setSaveState] = useState<"pending" | "saved" | "error">(
    "pending"
  );

  // Stamped when each question is shown, so response time excludes render.
  const questionStart = useRef(0);
  const hasSaved = useRef(false);
  const current = questions[index];
  const done = index >= questions.length;

  const record = useCallback(
    (status: Answer["status"], timedOut: boolean) => {
      const question = questions[index];
      if (!question) return;

      setAnswers((prev) => [
        ...prev,
        {
          wordId: question.wordId,
          status,
          responseMs: timedOut ? null : Date.now() - questionStart.current,
          timedOut,
        },
      ]);
      setIndex((i) => i + 1);
      questionStart.current = Date.now();
      setRemaining(timerMs);
    },
    [index, questions, timerMs]
  );

  // Running out of time means the word was recognised but not recalled fast
  // enough — that's "unsure", distinct from getting it wrong.
  useEffect(() => {
    if (done) return;
    const started = Date.now();
    questionStart.current = started;
    const tick = setInterval(() => {
      const left = timerMs - (Date.now() - started);
      if (left <= 0) {
        clearInterval(tick);
        record("unsure", true);
      } else {
        setRemaining(left);
      }
    }, 50);
    return () => clearInterval(tick);
  }, [index, done, timerMs, record]);

  const choose = useCallback(
    (option: string) => {
      if (!current) return;
      record(option === current.answer ? "known" : "unknown", false);
    },
    [current, record]
  );

  useEffect(() => {
    if (done) return;
    function onKey(e: KeyboardEvent) {
      if (e.key >= "1" && e.key <= "4") {
        const option = current?.options[Number(e.key) - 1];
        if (option) choose(option);
      } else if (e.key === " " || e.key === "0") {
        e.preventDefault();
        record("unknown", false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, choose, record, done]);

  useEffect(() => {
    if (!done || hasSaved.current || answers.length === 0) return;
    hasSaved.current = true;
    const highestRank = questions[questions.length - 1].rank;
    saveSession(languageId, answers, highestRank)
      .then(() => {
        setSaveState("saved");
        router.refresh();
      })
      .catch((err) => {
        console.error("Failed to save session:", err);
        setSaveState("error");
      });
  }, [done, answers, languageId, questions, router]);

  if (done) {
    const known = answers.filter((a) => a.status === "known").length;
    const unsure = answers.filter((a) => a.status === "unsure").length;
    const unknown = answers.filter((a) => a.status === "unknown").length;

    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white p-8 dark:bg-black">
        <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Batch complete
        </h2>
        <div className="flex gap-8 text-center">
          <Stat label="Known" value={known} tone="text-emerald-600" />
          <Stat label="Unsure" value={unsure} tone="text-amber-600" />
          <Stat label="Unknown" value={unknown} tone="text-red-600" />
        </div>
        <p className="text-sm text-zinc-500">
          {saveState === "pending" && "Saving…"}
          {saveState === "saved" &&
            `Saved. Cleared through rank ${questions[
              questions.length - 1
            ].rank.toLocaleString()}.`}
          {saveState === "error" &&
            "Could not save this batch — your answers may not have been recorded."}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.refresh()}
            className="rounded-lg bg-black px-5 py-2.5 font-medium text-white dark:bg-zinc-50 dark:text-black"
          >
            Next batch
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-300 px-5 py-2.5 font-medium text-black dark:border-zinc-700 dark:text-zinc-50"
          >
            Done for now
          </Link>
        </div>
      </main>
    );
  }

  const pct = Math.max(0, (remaining / timerMs) * 100);

  return (
    <main className="flex min-h-screen flex-col bg-white dark:bg-black">
      <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-900">
        <div
          className="h-full bg-black transition-none dark:bg-zinc-50"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between px-6 py-3 text-sm text-zinc-500">
        <span>
          Rank {current.rank.toLocaleString()} · {index + 1} of{" "}
          {questions.length}
        </span>
        <span>Cleared through {startingRank.toLocaleString()}</span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 pb-16">
        <div className="text-7xl font-semibold text-black dark:text-zinc-50">
          {current.lemma}
        </div>

        <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
          {current.options.map((option, i) => (
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
    </main>
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
