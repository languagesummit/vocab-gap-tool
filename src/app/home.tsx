"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadWords, type Word } from "@/lib/local/words";
import { allStaleKeys, staleAnswers } from "@/lib/local/revisions";
import {
  CHOICE_OPTIONS,
  countByStatus,
  downloadProgress,
  emptyProgress,
  loadProgress,
  parseImport,
  saveProgress,
  clampTimer,
  TIMER_MAX_MS,
  TIMER_MIN_MS,
  type Progress,
} from "@/lib/local/progress";

const TOTAL_WORDS = 5897;

export function Home() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [words, setWords] = useState<Word[] | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // localStorage is client-only, so state has to be filled in after mount.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setProgress(loadProgress());
    loadWords()
      .then(setWords)
      .catch(() => setWords([]));
  }, []);

  function update(next: Progress) {
    saveProgress(next);
    setProgress({ ...next });
  }

  // Rendered only after localStorage is read, so the markup can't mismatch
  // what the server produced.
  if (!progress) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-white dark:bg-black">
        <p className="text-zinc-400">Loading…</p>
      </main>
    );
  }

  const counts = countByStatus(progress);
  const staleKeys = words ? allStaleKeys(staleAnswers(progress, words)) : [];
  const pctTested = Math.round((counts.tested / TOTAL_WORDS) * 100);

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = parseImport(await file.text());
    if (!result.ok) {
      setNotice(result.error);
    } else {
      update(result.progress);
      setNotice(`Imported ${result.wordCount.toLocaleString()} words.`);
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col gap-8 bg-white px-6 py-12 dark:bg-black">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-zinc-50">
          Vocab Tracker
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Korean · tested by frequency, one word at a time
        </p>
      </header>

      {staleKeys.length > 0 && (
        <Link
          href="/results"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <strong className="font-semibold">
            {staleKeys.length.toLocaleString()}{" "}
            {staleKeys.length === 1 ? "answer needs" : "answers need"} re-asking
          </strong>{" "}
          — the way those words are tested has changed since you answered them.
          Everything else still stands.
        </Link>
      )}

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-zinc-500">Cleared through rank</span>
          <span className="text-3xl font-semibold text-black dark:text-zinc-50">
            {progress.frontierRank.toLocaleString()}
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
          <div
            className="h-full rounded-full bg-black dark:bg-zinc-50"
            style={{ width: `${Math.min(100, pctTested)}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          {counts.tested.toLocaleString()} of {TOTAL_WORDS.toLocaleString()}{" "}
          words tested ({pctTested}%)
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <Stat label="Known" value={counts.known} tone="text-emerald-600" />
          <Stat label="Unsure" value={counts.unsure} tone="text-amber-600" />
          <Stat label="Unknown" value={counts.unknown} tone="text-red-600" />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/test"
            className="flex h-12 flex-1 items-center justify-center rounded-lg bg-black font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            {counts.tested === 0 ? "Start testing" : "Continue testing"}
          </Link>
          {counts.tested > 0 && (
            <>
              <Link
                href="/results"
                className="flex h-12 items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium text-black transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                See results
              </Link>
              <Link
                href="/gaps"
                className="flex h-12 items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium text-black transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                My weak spots
              </Link>
              <Link
                href="/words"
                className="flex h-12 items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium text-black transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Word list &amp; Anki
              </Link>
              <Link
                href="/read"
                className="flex h-12 items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium text-black transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Score a text
              </Link>
              <Link
                href="/levels"
                className="flex h-12 items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium text-black transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                TOPIK coverage
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="font-semibold text-black dark:text-zinc-50">Settings</h2>

        <label className="mt-5 block">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Time per word
            </span>
            <span className="font-mono text-sm text-black dark:text-zinc-50">
              {(progress.settings.timerMs / 1000).toFixed(1)}s
            </span>
          </div>
          <input
            type="range"
            min={TIMER_MIN_MS}
            max={TIMER_MAX_MS}
            step={500}
            value={progress.settings.timerMs}
            onChange={(e) =>
              update({
                ...progress,
                settings: {
                  ...progress.settings,
                  timerMs: clampTimer(Number(e.target.value)),
                },
              })
            }
            className="mt-2 w-full accent-black dark:accent-zinc-50"
          />
          <div className="flex justify-between text-xs text-zinc-400">
            <span>1s</span>
            <span>30s</span>
          </div>
        </label>

        <div className="mt-5">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Answer choices
          </span>
          <div className="mt-2 flex gap-2">
            {CHOICE_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() =>
                  update({
                    ...progress,
                    settings: { ...progress.settings, choices: n },
                  })
                }
                className={`h-10 flex-1 rounded-lg border font-medium transition ${
                  progress.settings.choices === n
                    ? "border-black bg-black text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-black"
                    : "border-zinc-300 text-black hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
                }`}
              >
                {n} options
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="font-semibold text-black dark:text-zinc-50">
          Your data
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Progress is saved in this browser only. Download it to move to another
          device — or to keep a backup, since clearing site data erases it.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => downloadProgress(progress)}
            className="h-10 rounded-lg border border-zinc-300 px-4 font-medium text-black transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Download progress
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            className="h-10 rounded-lg border border-zinc-300 px-4 font-medium text-black transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Upload progress
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            onChange={onImportFile}
            className="hidden"
          />
          <button
            onClick={() => {
              if (
                confirm(
                  "Erase all progress in this browser? Download a copy first if you want to keep it."
                )
              ) {
                update(emptyProgress());
                setNotice("Progress cleared.");
              }
            }}
            className="h-10 rounded-lg px-4 font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950"
          >
            Reset
          </button>
        </div>

        {notice && <p className="mt-3 text-sm text-zinc-500">{notice}</p>}
      </section>

      <footer className="text-xs text-zinc-500">
        Word list, meanings, levels, categories and grammar come from 국립국어원,
        TOPIK, kengdic and Tatoeba —{" "}
        <Link href="/credits" className="underline hover:text-black dark:hover:text-zinc-50">
          sources and method
        </Link>
        , including how every number here is worked out.
      </footer>
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
      <div className={`text-2xl font-semibold ${tone}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}
