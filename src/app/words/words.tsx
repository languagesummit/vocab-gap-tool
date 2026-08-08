"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadWords, type Word } from "@/lib/local/words";
import { loadProgress, type Progress } from "@/lib/local/progress";
import { pct } from "@/lib/local/analysis";
import { estimateMinutes, saveGoal } from "@/lib/local/goals";
import { useRouter } from "next/navigation";
import {
  emptyFilters,
  facets,
  filterWords,
  sliceLabel,
  tally,
  STATUS_FILTERS,
  RECALL_FILTERS,
  type BrowseRow,
  type Filters,
  type StatusFilter,
} from "@/lib/local/browse";
import type { Recall } from "@/lib/local/analysis";
import { patternFor } from "@/lib/local/patterns";
import {
  addPart,
  deckSize,
  deckWords,
  loadDeck,
  overlapWith,
  removePart,
  saveDeck,
  type Deck,
} from "@/lib/local/deck";
import {
  downloadText,
  exportFilename,
  toAnkiTsv,
  type CardSide,
} from "@/lib/local/export";

const SHOWN = 400;

export function Words() {
  const router = useRouter();
  const [words, setWords] = useState<Word[] | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [side, setSide] = useState<CardSide>("recognition");
  const [deck, setDeck] = useState<Deck>({ parts: [] });

  useEffect(() => {
    // localStorage is client-only, so state has to be filled in after mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    setProgress(loadProgress());
    setDeck(loadDeck());
    /* eslint-enable react-hooks/set-state-in-effect */
    loadWords()
      .then(setWords)
      .catch((e: Error) => setError(e.message));
  }, []);

  function updateDeck(next: Deck) {
    saveDeck(next);
    setDeck(next);
  }

  const f = useMemo(() => (words ? facets(words) : null), [words]);
  const rows = useMemo(
    () => (words && progress ? filterWords(words, progress, filters) : []),
    [words, progress, filters]
  );
  /** Words in the current slice that haven't been answered yet. */
  const untestedRows = rowsUntested(rows);

  if (error) {
    return (
      <Shell>
        <p className="text-red-600">{error}</p>
      </Shell>
    );
  }
  if (!words || !progress || !f) {
    return (
      <Shell>
        <p className="text-zinc-400">Loading the list…</p>
      </Shell>
    );
  }

  const counts = tally(rows);
  const asked = counts.known + counts.unsure + counts.unknown;
  const subs =
    f.categories.find((c) => c.label === filters.category)?.subs ?? [];

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function toggleRecall(value: Recall) {
    setFilters((prev) => {
      const next = new Set(prev.recalls);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, recalls: next };
    });
  }

  function toggleStatus(value: StatusFilter) {
    setFilters((prev) => {
      const next = new Set(prev.statuses);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, statuses: next };
    });
  }

  function exportDeck() {
    if (!progress || !words) return;
    const chosen = deckWords(deck, words);
    const name =
      deck.parts.length === 1 ? deck.parts[0].label : `${deck.parts.length}-part`;
    downloadText(exportFilename(name), toAnkiTsv(chosen, progress, side));
  }

  return (
    <Shell>
      <header>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← Home
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-black dark:text-zinc-50">
          The list
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Korean · filter any slice, commonest first
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <input
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search a word or its meaning"
          className="h-11 w-full rounded-lg border border-zinc-300 bg-transparent px-3 text-black placeholder:text-zinc-400 dark:border-zinc-700 dark:text-zinc-50"
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Category"
            value={filters.category}
            options={f.categories.map((c) => c.label)}
            onChange={(v) => setFilters((p) => ({ ...p, category: v, sub: null }))}
          />
          <Select
            label="Subject"
            value={filters.sub}
            options={subs}
            disabled={!filters.category}
            onChange={(v) => set("sub", v)}
          />
          <Select
            label="Part of speech"
            value={filters.pos}
            options={f.pos}
            onChange={(v) => set("pos", v)}
          />
          <Select
            label="TOPIK level"
            value={filters.level === null ? null : String(filters.level)}
            options={f.levels.map(String)}
            format={(v) => `Level ${v}`}
            onChange={(v) => set("level", v === null ? null : Number(v))}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => {
            const on = filters.statuses.has(s.value);
            return (
              <button
                key={s.value}
                onClick={() => toggleStatus(s.value)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  on
                    ? "border-black bg-black text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-black"
                    : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
                }`}
              >
                {s.label}
                <span className={on ? "ml-1.5" : "ml-1.5 text-zinc-400"}>
                  {counts[s.value].toLocaleString()}
                </span>
              </button>
            );
          })}
          {(filters.category ||
            filters.pos ||
            filters.level ||
            filters.statuses.size > 0 ||
            filters.recalls.size > 0 ||
            filters.search) && (
            <button
              onClick={() => setFilters(emptyFilters())}
              className="rounded-full px-3 py-1.5 text-xs text-zinc-500 underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {RECALL_FILTERS.map((r) => {
            const on = filters.recalls.has(r.value);
            return (
              <button
                key={r.value}
                onClick={() => toggleRecall(r.value)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  on
                    ? "border-black bg-black text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-black"
                    : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <strong className="font-medium text-black dark:text-zinc-50">
            {rows.length.toLocaleString()}
          </strong>{" "}
          words
          {asked > 0 && (
            <>
              {" "}
              · {pct(counts.known, asked)}% of the {asked.toLocaleString()} asked
              came back known
            </>
          )}
        </p>
      </section>

      {untestedRows.length > 0 && (
        <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="font-semibold text-black dark:text-zinc-50">
            Test this slice
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {untestedRows.length.toLocaleString()} of these{" "}
            {rows.length.toLocaleString()} words have never been put to you.
            Testing just them takes about {estimateMinutes(untestedRows.length)}{" "}
            {estimateMinutes(untestedRows.length) === 1 ? "minute" : "minutes"},
            and fills in this corner of the map without touching the rest.
          </p>
          <button
            onClick={() => {
              saveGoal({
                kind: "words",
                keys: untestedRows.map((r) => r.word.key),
                label: sliceLabel(filters)
                  ? `${sliceLabel(filters)} — ${untestedRows.length} words`
                  : `${untestedRows.length} selected words`,
              });
              router.push("/test");
            }}
            className="flex h-12 items-center justify-center rounded-lg bg-black font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black"
          >
            Test me on these {untestedRows.length.toLocaleString()} words
          </button>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="font-semibold text-black dark:text-zinc-50">
          Build an Anki deck
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Add this slice, change the filters, add another. Colours, then animals,
          then job words — they come out as one deck. Words in more than one
          slice are only exported once.
        </p>

        <button
          onClick={() =>
            updateDeck(
              addPart(
                deck,
                sliceLabel(filters) ?? "all words",
                rows.map((r) => r.word.key)
              )
            )
          }
          disabled={rows.length === 0}
          className="flex h-12 items-center justify-center rounded-lg border border-zinc-300 font-medium text-black transition hover:bg-zinc-50 disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Add these {rows.length.toLocaleString()} words
          {deck.parts.length > 0 && overlapWith(deck, rows.map((r) => r.word.key)) > 0 && (
            <span className="ml-2 text-xs font-normal text-zinc-500">
              {overlapWith(deck, rows.map((r) => r.word.key)).toLocaleString()}{" "}
              already in
            </span>
          )}
        </button>

        {deck.parts.length > 0 && (
          <>
            <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
              {deck.parts.map((part) => (
                <li
                  key={part.id}
                  className="flex items-baseline justify-between gap-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate text-black dark:text-zinc-50">
                    {part.label}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-3">
                    <span className="text-zinc-500">
                      {part.keys.length.toLocaleString()}
                    </span>
                    <button
                      onClick={() => updateDeck(removePart(deck, part.id))}
                      className="text-xs text-zinc-400 underline hover:text-red-600"
                    >
                      remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex gap-2">
              {(
                [
                  ["recognition", "Korean → English"],
                  ["recall", "English → Korean"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setSide(value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                    side === value
                      ? "border-black bg-black text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-black"
                      : "border-zinc-300 text-black hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={exportDeck}
              className="flex h-12 items-center justify-center rounded-lg bg-black font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black"
            >
              Download {deckSize(deck).toLocaleString()} cards
            </button>
            <button
              onClick={() => updateDeck({ parts: [] })}
              className="text-xs text-zinc-500 underline"
            >
              Empty the deck
            </button>
          </>
        )}

        <p className="text-xs text-zinc-500">
          Tab-separated, with Anki&apos;s import settings in the header. Subject,
          word type, TOPIK level, rank band, status and recall speed all travel
          as tags, so the deck can be re-sliced after import.
        </p>
      </section>

      <div className="flex flex-col divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {rows.slice(0, SHOWN).map((row) => (
          <Row key={row.word.key} row={row} />
        ))}
        {rows.length === 0 && (
          <p className="p-5 text-sm text-zinc-500">
            Nothing matches those filters.
          </p>
        )}
        {rows.length > SHOWN && (
          <p className="p-4 text-sm text-zinc-500">
            Showing the first {SHOWN} of {rows.length.toLocaleString()}. Narrow
            the filters, or export to get the lot.
          </p>
        )}
      </div>
    </Shell>
  );
}

/** Untested rows only — retesting what you've answered is a different action. */
function rowsUntested(rows: BrowseRow[]): BrowseRow[] {
  return rows.filter((r) => r.status === "untested");
}

const STATUS_STYLE: Record<StatusFilter, string> = {
  known: "bg-emerald-500",
  unsure: "bg-amber-400",
  unknown: "bg-red-500",
  untested: "bg-zinc-300 dark:bg-zinc-700",
};

const RECALL_LABEL = {
  automatic: "instant",
  solid: "solid",
  effortful: "slow",
} as const;

function Row({ row }: { row: BrowseRow }) {
  const { word } = row;
  return (
    <div className="flex items-baseline gap-3 px-5 py-2.5">
      <span
        className={`h-2 w-2 shrink-0 translate-y-[-1px] rounded-full ${STATUS_STYLE[row.status]}`}
        title={row.status}
      />
      <span className="text-lg text-black dark:text-zinc-50">{word.lemma}</span>
      {patternFor(word.key) ? (
        <span className="shrink-0 text-xs text-zinc-500">
          {patternFor(word.key)?.form}
        </span>
      ) : (
        word.hint && (
          <span className="shrink-0 text-xs text-zinc-400">{word.hint}</span>
        )
      )}
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-500">
        {word.gloss}
      </span>
      {row.recall && (
        <span className="shrink-0 text-xs text-zinc-400">
          {RECALL_LABEL[row.recall]}
        </span>
      )}
      <span className="shrink-0 font-mono text-xs text-zinc-400">
        {word.rank.toLocaleString()}
      </span>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  disabled,
  format,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
  disabled?: boolean;
  format?: (value: string) => string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-zinc-500">{label}</span>
      <select
        value={value ?? ""}
        disabled={disabled || options.length === 0}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-11 rounded-lg border border-zinc-300 bg-transparent px-2 text-sm text-black disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-50"
      >
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {format ? format(o) : o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col gap-6 bg-white px-6 py-12 dark:bg-black">
      {children}
    </main>
  );
}
