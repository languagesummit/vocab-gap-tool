"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadWords, type Word } from "@/lib/local/words";
import { loadProgress, type Progress } from "@/lib/local/progress";
import type { Split } from "@/lib/local/analysis";
import {
  analyseGaps,
  isWellSampled,
  reach,
  strength,
  MIN_ASKED,
  type CategoryNode,
  type MajorCategory,
} from "@/lib/local/gaps";

export function Gaps() {
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
        <p className="text-zinc-400">Looking for the holes…</p>
      </Shell>
    );
  }

  const g = analyseGaps(progress, words);
  const anyTested = g.majors.some((m) => m.tested > 0);

  return (
    <Shell>
      <header>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← Home
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-black dark:text-zinc-50">
          What you&apos;re missing
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Korean · by meaning rather than by frequency
        </p>
      </header>

      <Card>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Vocabulary picked up through conversation comes out lumpy — strong
          where you&apos;ve had to talk, thin in whole pockets you&apos;ve never
          needed. Frequency rank can&apos;t see that shape, because a hole in
          colours or animals isn&apos;t at any particular rank. This groups the{" "}
          {g.tagged.toLocaleString()} words carrying a meaning tag into the
          categories they belong to, weakest first.
        </p>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Two different things are shown apart on purpose:{" "}
          <strong className="font-medium text-black dark:text-zinc-50">
            missed
          </strong>{" "}
          means asked and not known, which is a real gap;{" "}
          <strong className="font-medium text-black dark:text-zinc-50">
            unasked
          </strong>{" "}
          means never put to you, which says nothing about you yet.
        </p>
      </Card>

      {!anyTested && (
        <Card>
          <p className="text-zinc-500">
            Nothing has been tested yet, so every category below is simply
            unasked. Test some words and the shape appears.
          </p>
          <Link
            href="/test"
            className="mt-4 flex h-12 w-full items-center justify-center rounded-lg bg-black font-medium text-white dark:bg-zinc-50 dark:text-black"
          >
            Start testing
          </Link>
        </Card>
      )}

      {g.weakest.length > 0 && (
        <Card>
          <h2 className="font-semibold text-black dark:text-zinc-50">
            The thinnest pockets
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Weakest subjects across every category, so a small hole inside a big
            category is still findable. Ranked on what you were actually asked.
          </p>
          <ul className="mt-4 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {g.weakest.map((p) => (
              <li
                key={`${p.major}/${p.label}`}
                className="flex items-baseline justify-between gap-4 py-2"
              >
                <span>
                  <span className="text-black dark:text-zinc-50">
                    {p.label}
                  </span>
                  <span className="ml-2 text-xs text-zinc-400">{p.major}</span>
                </span>
                <span className="shrink-0 text-sm text-zinc-500">
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {strength(p)}%
                  </span>{" "}
                  of {p.tested} asked
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {g.unexplored.length > 0 && (
        <Card>
          <h2 className="font-semibold text-black dark:text-zinc-50">
            Barely explored
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Fewer than {MIN_ASKED} words of each has been put to you, so these
            aren&apos;t weaknesses — they&apos;re unknowns. Biggest first, since
            that&apos;s where testing would tell you most.
          </p>
          <ul className="mt-4 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {g.unexplored.map((p) => (
              <li
                key={`${p.major}/${p.label}`}
                className="flex items-baseline justify-between gap-4 py-2"
              >
                <span>
                  <span className="text-black dark:text-zinc-50">
                    {p.label}
                  </span>
                  <span className="ml-2 text-xs text-zinc-400">{p.major}</span>
                </span>
                <span className="shrink-0 text-sm text-zinc-500">
                  {p.unasked.length} of {p.total} unasked
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <h2 className="-mb-2 mt-2 font-semibold text-black dark:text-zinc-50">
        Every category
      </h2>
      <div className="flex flex-col gap-3">
        {g.majors.map((m) => (
          <MajorRow key={m.label} major={m} />
        ))}
      </div>

      {g.untagged > 0 && (
        <p className="text-xs text-zinc-500">
          {g.untagged.toLocaleString()} words carry no meaning tag and
          aren&apos;t shown. Most are grammar and function words — 것, 하다, -은
          — which don&apos;t belong to a pocket of meaning you could have a hole
          in. Tags come from 한국어 교육 어휘 내용 개발 (국립국어원, 2015).
        </p>
      )}
    </Shell>
  );
}

function MajorRow({ major }: { major: MajorCategory }) {
  const [open, setOpen] = useState(false);
  const s = strength(major);

  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full flex-col gap-2 p-5 text-left"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-lg font-medium text-black dark:text-zinc-50">
            {major.label}
          </span>
          <span className="shrink-0 text-sm text-zinc-500">
            {s === null ? (
              "none asked"
            ) : (
              <>
                <span
                  className={
                    isWellSampled(major)
                      ? "font-medium text-black dark:text-zinc-50"
                      : "text-zinc-400"
                  }
                >
                  {s}% known
                </span>
                {!isWellSampled(major) && " (thin sample)"}
              </>
            )}
          </span>
        </div>
        <Bar split={major} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          <span>{major.total.toLocaleString()} words</span>
          {major.missed.length > 0 && (
            <span className="text-red-600 dark:text-red-400">
              {major.missed.length.toLocaleString()} missed
            </span>
          )}
          {major.unasked.length > 0 && (
            <span>{major.unasked.length.toLocaleString()} unasked</span>
          )}
          <span>{reach(major)}% asked</span>
          <span className="ml-auto text-zinc-400">
            {open ? "Hide" : `${major.subs.length} subcategories`}
          </span>
        </div>
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
          {major.subs.map((sub) => (
            <SubRow key={sub.label} sub={sub} />
          ))}
        </div>
      )}
    </section>
  );
}

function SubRow({ sub }: { sub: CategoryNode }) {
  const [show, setShow] = useState<"missed" | "unasked" | null>(null);
  const s = strength(sub);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-black dark:text-zinc-50">{sub.label}</span>
        <span className="shrink-0 text-sm text-zinc-500">
          {s === null ? "none asked" : `${s}% known`}
          <span className="text-zinc-400">
            {" "}
            · {sub.total.toLocaleString()}
          </span>
        </span>
      </div>
      <Bar split={sub} />

      <div className="mt-1.5 flex flex-wrap gap-x-4 text-xs">
        {sub.missed.length > 0 && (
          <button
            onClick={() => setShow(show === "missed" ? null : "missed")}
            className="text-red-600 underline dark:text-red-400"
          >
            {sub.missed.length} missed
          </button>
        )}
        {sub.unasked.length > 0 && (
          <button
            onClick={() => setShow(show === "unasked" ? null : "unasked")}
            className="text-zinc-500 underline"
          >
            {sub.unasked.length} unasked
          </button>
        )}
      </div>

      {show && (
        <ul className="mt-2 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {(show === "missed" ? sub.missed : sub.unasked)
            .slice(0, LIST_LIMIT)
            .map((w) => (
              <li
                key={w.key}
                className="flex items-baseline justify-between gap-4 py-1.5"
              >
                <span className="flex items-baseline gap-3">
                  <span className="text-black dark:text-zinc-50">
                    {w.lemma}
                  </span>
                  <span className="text-sm text-zinc-500">{w.gloss}</span>
                </span>
                <span className="shrink-0 font-mono text-xs text-zinc-400">
                  {w.rank.toLocaleString()}
                </span>
              </li>
            ))}
          {(show === "missed" ? sub.missed : sub.unasked).length >
            LIST_LIMIT && (
            <li className="py-1.5 text-xs text-zinc-500">
              Showing the first {LIST_LIMIT}.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

const LIST_LIMIT = 80;

function Bar({ split }: { split: Split }) {
  // Against the whole category, so the untested remainder stays visible as
  // empty track rather than being hidden by a percentage of a small sample.
  const total = split.total || 1;
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="mt-1 flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
      <div className="bg-emerald-500" style={{ width: seg(split.known) }} />
      <div className="bg-amber-400" style={{ width: seg(split.unsure) }} />
      <div className="bg-red-500" style={{ width: seg(split.unknown) }} />
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
      {children}
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col gap-6 bg-white px-6 py-12 dark:bg-black">
      {children}
    </main>
  );
}
