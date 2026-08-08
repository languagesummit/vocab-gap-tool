"use client";

import { BADGE_THRESHOLD, type Badge } from "@/lib/local/badges";

/**
 * The permanent shelf. Unearned levels stay visible rather than hidden, so the
 * next one is always a stated distance away instead of a mystery.
 */
export function BadgeShelf({ badges }: { badges: Badge[] }) {
  const present = badges.filter((b) => b.total > 0);
  if (present.length === 0) return null;

  return (
    <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
      <h2 className="font-semibold text-black dark:text-zinc-50">
        Levels cleared
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Earned by knowing {Math.round(BADGE_THRESHOLD * 100)}% of a level&apos;s
        words outright — measured against the whole level, not just the part
        you&apos;ve been asked.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {present.map((b) => (
          <div
            key={b.id}
            className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center ${
              b.earned
                ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40"
                : "border-dashed border-zinc-300 dark:border-zinc-700"
            }`}
          >
            <span
              className={`text-2xl ${b.earned ? "" : "opacity-25 grayscale"}`}
              aria-hidden
            >
              {b.earned ? "🏅" : "○"}
            </span>
            <span
              className={`text-xs font-medium ${
                b.earned
                  ? "text-emerald-900 dark:text-emerald-200"
                  : "text-zinc-500"
              }`}
            >
              {b.label}
            </span>
            {b.sub && (
              <span className="text-[10px] text-zinc-400">{b.sub}</span>
            )}
            <span className="text-[10px] text-zinc-400">
              {b.earned
                ? `${b.known.toLocaleString()}/${b.total.toLocaleString()}`
                : `${b.toGo.toLocaleString()} to go`}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        A badge says the vocabulary is there, not that you&apos;ll pass. TOPIK
        also tests listening and writing, and grammar isn&apos;t measured here
        yet — but at this level, words are no longer the thing in your way.
      </p>
    </section>
  );
}

/** Shown once, on the visit after a badge is earned. */
export function BadgeCelebration({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null;
  return (
    <section className="rounded-xl border-2 border-emerald-400 bg-emerald-50 p-6 dark:border-emerald-600 dark:bg-emerald-950/50">
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden>
          🏅
        </span>
        <div>
          <h2 className="font-semibold text-emerald-900 dark:text-emerald-100">
            {badges.length === 1
              ? `${badges[0].label} cleared`
              : `${badges.length} levels cleared`}
          </h2>
          <p className="text-sm text-emerald-900/80 dark:text-emerald-200/80">
            {badges.map((b) => b.label).join(", ")} —{" "}
            {Math.round(BADGE_THRESHOLD * 100)}% of the vocabulary known
            outright. That&apos;s the whole level, not a sample of it.
          </p>
        </div>
      </div>
    </section>
  );
}
