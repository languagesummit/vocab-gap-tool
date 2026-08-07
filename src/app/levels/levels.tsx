"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadWords, type Word } from "@/lib/local/words";
import { loadProgress, type Progress } from "@/lib/local/progress";
import { knownRange, pct, type Split } from "@/lib/local/analysis";
import {
  COVERED_AT,
  readiness,
  unaskedPct,
  type LevelGroup,
} from "@/lib/local/levels";

export function Levels() {
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
        <p className="text-zinc-400">Working out where you stand…</p>
      </Shell>
    );
  }

  const r = readiness(progress, words);
  const tested = r.tiers.reduce((n, t) => n + t.tested, 0);

  if (tested === 0) {
    return (
      <Shell>
        <Header />
        <Card>
          <p className="text-zinc-500">
            Nothing tested yet, so there&apos;s nothing to place against a
            level. Test some words and this fills in.
          </p>
          <Link
            href="/test"
            className="mt-4 flex h-12 w-full items-center justify-center rounded-lg bg-black font-medium text-white dark:bg-zinc-50 dark:text-black"
          >
            Start testing
          </Link>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Header />

      <Card>
        <h2 className="font-semibold text-black dark:text-zinc-50">
          Where the vocabulary puts you
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {r.clearedTier === null ? (
            <>
              Not enough of either tier is confirmed yet to call it covered.
              Keep going — the bars below fill as you test.
            </>
          ) : (
            <>
              You know at least {Math.round(COVERED_AT * 100)}% of the{" "}
              <strong className="font-semibold text-black dark:text-zinc-50">
                {r.clearedTier === "II" ? "TOPIK II" : "TOPIK I"}
              </strong>{" "}
              vocabulary outright.
            </>
          )}
        </p>

        <div className="mt-5 flex flex-col gap-5">
          {r.tiers.map((t) => {
            const range = knownRange(t);
            return (
              <div key={t.tier}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-medium text-black dark:text-zinc-50">
                    {t.label}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {t.levels} · CEFR {t.cefr}
                  </span>
                </div>
                <Bar split={t} />
                <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                  {range.low.toLocaleString()}
                  {range.high !== range.low && `–${range.high.toLocaleString()}`}{" "}
                  of {t.total.toLocaleString()} known
                  {t.total > t.tested && (
                    <span className="text-zinc-400">
                      {" "}
                      · {(t.total - t.tested).toLocaleString()} never asked
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">{t.blurb}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card tone="amber">
        <h2 className="font-semibold text-amber-900 dark:text-amber-200">
          What this can and can&apos;t tell you
        </h2>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-amber-900/80 dark:text-amber-200/80">
          <li>
            TOPIK grades vocabulary in two tiers, not six. Nothing in this data
            separates a level-3 word from a level-6 one, so the six levels
            can&apos;t be scored directly — the finer bands below are inferred.
          </li>
          <li>
            The exam tests listening, reading and writing. Vocabulary is the
            floor under those, not a substitute for them. Knowing the words is
            necessary, not sufficient.
          </li>
          <li>
            Only what you&apos;ve been asked counts. Where a tier is largely
            unasked, the percentage describes a sample, not your knowledge.
          </li>
        </ul>
      </Card>

      {r.tiers.some((t) => unaskedPct(t) >= 25) && (
        <Card>
          <h2 className="font-semibold text-black dark:text-zinc-50">
            Testing by frequency skips past exam vocabulary
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Words are asked in frequency order, but the TOPIK lists aren&apos;t
            ordered that way — 안녕 sits at rank 5,018 and 냉장고 at 2,987, both
            beginner vocabulary. So a frontier deep into the list can still
            leave a lot of the exam&apos;s own words never shown to you.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {r.tiers.map((t) => (
              <div
                key={t.tier}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="text-black dark:text-zinc-50">{t.label}</span>
                <span className="text-zinc-500">
                  {unaskedPct(t)}% never asked (
                  {(t.total - t.tested).toLocaleString()} words)
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold text-black dark:text-zinc-50">
          Finer bands
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          TOPIK II spans four levels in one paper. Crossing it with NIKL&apos;s
          own difficulty grade splits it into a lower and an upper half — the
          closest this data gets to per-level detail. The two middle bands are
          an alignment between two separate gradings, not an official mapping.
        </p>
        <div className="mt-4 flex flex-col gap-5">
          {r.bands.map((b) => (
            <BandRow key={b.key} band={b} />
          ))}
        </div>
        {r.untiered > 0 && (
          <p className="mt-4 text-xs text-zinc-500">
            {r.untiered.toLocaleString()} words in the frequency list appear on
            neither TOPIK list. They still count as Korean you know — they just
            can&apos;t be placed against the exam.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold text-black dark:text-zinc-50">
          By difficulty, ignoring the exam
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          국립국어원&apos;s graded learner list (조남호, 2003), judged by panel
          rather than by frequency. A useful second opinion: it disagrees with
          rank often enough to be worth reading on its own.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          {r.byNikl.map((g) => (
            <div key={g.grade}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-black dark:text-zinc-50">{g.label}</span>
                <span className="text-zinc-500">
                  {g.tested === 0
                    ? "untested"
                    : `${pct(g.known, g.tested)}% known of ${g.tested.toLocaleString()} asked`}
                </span>
              </div>
              <Bar split={g} />
              {g.total > g.tested && (
                <p className="mt-1 text-xs text-zinc-500">
                  {(g.total - g.tested).toLocaleString()} of{" "}
                  {g.total.toLocaleString()} never asked — the bar is drawn
                  against the whole grade, so the empty part is what&apos;s
                  still unknown territory.
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <p className="text-xs text-zinc-500">
        Tier membership from the 2015 TOPIK vocabulary list; grades from
        국립국어원&apos;s 한국어 학습용 어휘 목록 (조남호, 2003). TOPIK↔CEFR
        correspondence is the widely used one: levels 1–6 to A1–C2.
      </p>
    </Shell>
  );
}

const LIST_LIMIT = 100;

function BandRow({ band }: { band: LevelGroup }) {
  const [open, setOpen] = useState(false);
  const range = knownRange(band);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-medium text-black dark:text-zinc-50">
          {band.label}
          {band.approximate && (
            <span
              className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 align-middle text-[11px] font-normal text-zinc-500 dark:bg-zinc-900"
              title="Inferred by crossing the TOPIK tier with the NIKL grade — not an official mapping."
            >
              approx
            </span>
          )}
        </span>
        {band.cefr !== "—" && (
          <span className="text-sm text-zinc-500">CEFR {band.cefr}</span>
        )}
      </div>
      <Bar split={band} />
      <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
        {band.tested === 0 ? (
          "None asked yet."
        ) : (
          <>
            {range.low.toLocaleString()}
            {range.high !== range.low && `–${range.high.toLocaleString()}`} of{" "}
            {band.total.toLocaleString()} known
          </>
        )}
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">{band.blurb}</p>

      {band.unasked.length > 0 && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-1.5 text-xs text-zinc-500 underline hover:text-black dark:hover:text-zinc-50"
          >
            {open ? "Hide" : "Show"} {band.unasked.length.toLocaleString()} never
            asked
          </button>
          {open && (
            <ul className="mt-2 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
              {band.unasked.slice(0, LIST_LIMIT).map((w) => (
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
              {band.unasked.length > LIST_LIMIT && (
                <li className="py-2 text-sm text-zinc-500">
                  Showing the first {LIST_LIMIT} of{" "}
                  {band.unasked.length.toLocaleString()}.
                </li>
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Bar({ split }: { split: Split }) {
  // Bars are drawn against the whole band, not just what's been asked, so a
  // tier that's mostly unasked reads as mostly empty rather than as mastered.
  const total = split.total || 1;
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="mt-1.5 flex h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
      <div className="bg-emerald-500" style={{ width: seg(split.known) }} />
      <div className="bg-amber-400" style={{ width: seg(split.unsure) }} />
      <div className="bg-red-500" style={{ width: seg(split.unknown) }} />
    </div>
  );
}

function Header() {
  return (
    <header>
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Home
      </Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-black dark:text-zinc-50">
        Exam levels
      </h1>
      <p className="mt-1 text-zinc-600 dark:text-zinc-400">
        Korean · your tested vocabulary against TOPIK and 국립국어원 grades
      </p>
    </header>
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
  return (
    <section className={`rounded-xl border p-6 ${style}`}>{children}</section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col gap-6 bg-white px-6 py-12 dark:bg-black">
      {children}
    </main>
  );
}
