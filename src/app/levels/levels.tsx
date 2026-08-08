"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadWords, type Word } from "@/lib/local/words";
import { loadProgress, type Progress } from "@/lib/local/progress";
import { knownRange } from "@/lib/local/analysis";
import { BasisToggle, SplitBar, type Basis } from "@/components/split-bar";
import { frameworksFor } from "@/lib/frameworks";
import { badgesFor } from "@/lib/local/badges";
import { BadgeShelf } from "@/components/badges";
import {
  analyseFramework,
  clearedThrough,
  coveragePct,
  reachPct,
  underSampled,
  REACHED_AT,
  type FrameworkAnalysis,
  type LevelGroup,
} from "@/lib/local/levels";

export function Levels() {
  const [words, setWords] = useState<Word[] | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [basis, setBasis] = useState<Basis>("asked");

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

  const frameworks = frameworksFor(progress.language);

  if (frameworks.length === 0) {
    return (
      <Shell>
        <Header />
        <Card>
          <p className="text-zinc-500">
            No proficiency framework has been sourced for this language yet, so
            there&apos;s nothing to place your vocabulary against. What you know
            is still tracked in full on the results page.
          </p>
        </Card>
      </Shell>
    );
  }

  const analyses = frameworks.map((f) => analyseFramework(progress, words, f));

  if (analyses.every((a) => a.tested === 0)) {
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
      {frameworks
        .filter((f) => f.kind === "exam")
        .map((f) => (
          <BadgeShelf key={f.id} badges={badgesFor(progress, words, f)} />
        ))}
      <BasisToggle basis={basis} onChange={setBasis} />
      {analyses.map((a) => (
        <FrameworkSection key={a.framework.id} analysis={a} basis={basis} />
      ))}
    </Shell>
  );
}

function FrameworkSection({
  analysis,
  basis,
}: {
  analysis: FrameworkAnalysis;
  basis: Basis;
}) {
  const { framework: f } = analysis;
  const cleared = clearedThrough(analysis);
  const thin = underSampled(analysis);

  return (
    <>
      <Card>
        <h2 className="font-semibold text-black dark:text-zinc-50">
          {f.name}
        </h2>
        <p className="mt-0.5 text-sm text-zinc-500">{f.fullName}</p>

        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          {cleared ? (
            <>
              Your vocabulary holds up through{" "}
              <strong className="font-semibold text-black dark:text-zinc-50">
                {cleared.level.label}
              </strong>
              {cleared.level.cefr && ` (${cleared.level.cefr})`} — known
              outright, on enough of the level to mean it.
            </>
          ) : (
            <>
              No level is yet both well known and well enough sampled to call
              it cleared. The bars below show which part is missing.
            </>
          )}
        </p>

        <div className="mt-5 flex flex-col gap-5">
          {analysis.levels.map((l) => (
            <LevelRow key={l.level.index} row={l} basis={basis} />
          ))}
        </div>

        {analysis.ungraded > 0 && (
          <p className="mt-5 text-xs text-zinc-500">
            {analysis.ungraded.toLocaleString()} words in your list aren&apos;t
            graded by {f.name} at all. They still count as language you know —
            they just can&apos;t be placed on this scale.
          </p>
        )}
      </Card>

      {f.groups.length > 0 && (
        <Card>
          <h3 className="font-semibold text-black dark:text-zinc-50">
            By paper
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {f.name} sets one paper across several levels, so &ldquo;ready to
            sit this paper&rdquo; is a different question from &ldquo;at this
            level&rdquo;.
          </p>
          <div className="mt-4 flex flex-col gap-5">
            {analysis.groups.map((g) => {
              const range = knownRange(g);
              return (
                <div key={g.group.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-medium text-black dark:text-zinc-50">
                      {g.group.label}
                    </span>
                    <span className="text-sm text-zinc-500">
                      Levels {g.group.levels.join(", ")}
                    </span>
                  </div>
                  <SplitBar split={g} basis={basis} />
                  <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                    {range.low.toLocaleString()}
                    {range.high !== range.low &&
                      `–${range.high.toLocaleString()}`}{" "}
                    of {g.total.toLocaleString()} known
                    {g.total > g.tested && (
                      <span className="text-zinc-400">
                        {" "}
                        · {(g.total - g.tested).toLocaleString()} never asked
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {g.group.blurb}
                    {g.viaTier > 0 && (
                      <>
                        {" "}
                        {g.viaTier.toLocaleString()} of these are placed by the
                        exam&apos;s own two-tier list only, with no finer level.
                      </>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {thin.length > 0 && (
        <Card tone="amber">
          <h3 className="font-semibold text-amber-900 dark:text-amber-200">
            Too thin to judge:{" "}
            {thin.map((l) => l.level.label.replace("Level ", "")).join(", ")}
          </h3>
          <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/80">
            Fewer than {Math.round(REACHED_AT * 100)}% of these levels&apos;
            words have been asked, so any percentage would describe the sample
            rather than your knowledge. Usually this means the frequency list
            itself doesn&apos;t reach that far — the advanced levels are largely
            made of words rarer than the list goes.
          </p>
          <ul className="mt-3 flex flex-col gap-1 text-sm text-amber-900/80 dark:text-amber-200/80">
            {thin.map((l) => (
              <li key={l.level.index} className="flex justify-between gap-3">
                <span>{l.level.label}</span>
                <span>
                  {l.tested.toLocaleString()} of {l.total.toLocaleString()}{" "}
                  asked
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {f.caveat && (
        <p className="-mt-2 text-xs text-zinc-500">
          <strong className="font-medium">{f.name}:</strong> {f.caveat} Source:{" "}
          {f.source}.
        </p>
      )}
    </>
  );
}

const LIST_LIMIT = 100;

function LevelRow({ row, basis }: { row: LevelGroup; basis: Basis }) {
  const [open, setOpen] = useState(false);
  const range = knownRange(row);
  const coverage = coveragePct(row);
  const reach = reachPct(row);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-medium text-black dark:text-zinc-50">
          {row.level.label}
        </span>
        <span className="text-sm text-zinc-500">
          {row.level.cefr && <>CEFR {row.level.cefr} · </>}
          {coverage === null ? "none asked" : `${coverage}% of asked known`}
        </span>
      </div>
      <SplitBar split={row} basis={basis} />
      <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">
        {range.low.toLocaleString()}
        {range.high !== range.low && `–${range.high.toLocaleString()}`} of{" "}
        {row.total.toLocaleString()} known
        <span className="text-zinc-400"> · {reach}% of the level asked</span>
      </p>

      {row.unasked.length > 0 && (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-1.5 text-xs text-zinc-500 underline hover:text-black dark:hover:text-zinc-50"
          >
            {open ? "Hide" : "Show"} {row.unasked.length.toLocaleString()} never
            asked
          </button>
          {open && (
            <ul className="mt-2 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
              {row.unasked.slice(0, LIST_LIMIT).map((w) => (
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
              {row.unasked.length > LIST_LIMIT && (
                <li className="py-2 text-sm text-zinc-500">
                  Showing the first {LIST_LIMIT} of{" "}
                  {row.unasked.length.toLocaleString()}.
                </li>
              )}
            </ul>
          )}
        </>
      )}
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
        Korean · your tested vocabulary against the graded lists
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
