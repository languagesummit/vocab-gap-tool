"use client";

import type { Split } from "@/lib/local/analysis";

/**
 * What a proportion is measured against.
 *
 * Both are honest and they say different things. Against **everything** is the
 * true scale of the language and the only basis on which "I know 12% of Korean"
 * means anything — but with 5,897 words in the list it renders as a sliver of
 * colour on an empty track, which reads as hopeless rather than as informative,
 * and hides the difference between doing well and doing badly.
 *
 * Against **what you were asked** is your actual hit rate. It can't tell you
 * how far through the language you are, and on its own it would flatter a tiny
 * sample — so the counts stay on screen either way and nothing is inferred
 * from the bar alone.
 */
export type Basis = "all" | "asked";

export function SplitBar({
  split,
  basis,
  thin = false,
}: {
  split: Split;
  basis: Basis;
  thin?: boolean;
}) {
  const denominator = basis === "asked" ? split.tested : split.total;
  const total = denominator || 1;
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div
      className={`mt-1.5 flex w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900 ${
        thin ? "h-2.5" : "h-3"
      }`}
    >
      <div className="bg-emerald-500" style={{ width: seg(split.known) }} />
      <div className="bg-amber-400" style={{ width: seg(split.unsure) }} />
      <div className="bg-red-500" style={{ width: seg(split.unknown) }} />
    </div>
  );
}

export function BasisToggle({
  basis,
  onChange,
}: {
  basis: Basis;
  onChange: (basis: Basis) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-zinc-500">Bars show share of</span>
      <div className="flex overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700">
        {(
          [
            ["asked", "what I was asked"],
            ["all", "every word"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => onChange(value)}
            className={`px-3 py-1.5 transition ${
              basis === value
                ? "bg-black font-medium text-white dark:bg-zinc-50 dark:text-black"
                : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
