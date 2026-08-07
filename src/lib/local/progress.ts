/**
 * Progress lives in the browser's localStorage — no account, no server.
 *
 * The saved shape is also the export format, so a downloaded file can be
 * dropped straight back in on another machine or browser. Words are keyed by
 * lemma+sense rather than rank so an export stays valid even if the frequency
 * list is later rebuilt.
 */

export type Status = "known" | "unsure" | "unknown";

export type WordRecord = {
  status: Status;
  at: number; // epoch ms
  ms: number | null; // response time, null when the timer expired
  /**
   * Characters of gloss text on screen when answered. A long or awkwardly
   * worded definition takes longer to read whether or not the word is known,
   * so response time only means something against how much there was to read.
   * Absent on records written before this was tracked.
   */
  chars?: number;
};

export type Progress = {
  format: "vocab-gap-tool/progress";
  version: 1;
  language: string;
  updatedAt: number;
  frontierRank: number; // highest rank tested so far
  settings: {
    timerMs: number;
    choices: number;
  };
  words: Record<string, WordRecord>;
};

const STORAGE_KEY = "vocab-gap-tool:progress:ko";

// Two choices keeps the read fast; being honest with the space bar is what
// makes the result meaningful, not the number of distractors.
export const DEFAULT_SETTINGS = { timerMs: 5000, choices: 2 };
export const CHOICE_OPTIONS = [2, 3, 4];
export const TIMER_MIN_MS = 1000;
export const TIMER_MAX_MS = 30000;

export function emptyProgress(): Progress {
  return {
    format: "vocab-gap-tool/progress",
    version: 1,
    language: "ko",
    updatedAt: Date.now(),
    frontierRank: 0,
    settings: { ...DEFAULT_SETTINGS },
    words: {},
  };
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    return normalize(JSON.parse(raw));
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: Progress): void {
  if (typeof window === "undefined") return;
  progress.updatedAt = Date.now();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

/** Fills in anything missing so older or hand-edited files still load. */
function normalize(input: unknown): Progress {
  const base = emptyProgress();
  if (!input || typeof input !== "object") return base;
  const raw = input as Partial<Progress>;

  return {
    ...base,
    language: typeof raw.language === "string" ? raw.language : base.language,
    frontierRank:
      typeof raw.frontierRank === "number" && raw.frontierRank >= 0
        ? raw.frontierRank
        : base.frontierRank,
    settings: {
      timerMs: clampTimer(raw.settings?.timerMs),
      choices: CHOICE_OPTIONS.includes(raw.settings?.choices as number)
        ? (raw.settings!.choices as number)
        : DEFAULT_SETTINGS.choices,
    },
    words:
      raw.words && typeof raw.words === "object"
        ? (raw.words as Record<string, WordRecord>)
        : {},
  };
}

export function clampTimer(value: unknown): number {
  const n = typeof value === "number" ? value : DEFAULT_SETTINGS.timerMs;
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.timerMs;
  return Math.min(TIMER_MAX_MS, Math.max(TIMER_MIN_MS, Math.round(n)));
}

export function countByStatus(progress: Progress) {
  let known = 0;
  let unsure = 0;
  let unknown = 0;
  for (const record of Object.values(progress.words)) {
    if (record.status === "known") known++;
    else if (record.status === "unsure") unsure++;
    else unknown++;
  }
  return { known, unsure, unknown, tested: known + unsure + unknown };
}

// --- export / import -------------------------------------------------------

export function downloadProgress(progress: Progress): void {
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(progress, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vocab-progress-${progress.language}-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type ImportResult =
  | { ok: true; progress: Progress; wordCount: number }
  | { ok: false; error: string };

export function parseImport(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  const raw = parsed as Partial<Progress>;
  if (raw?.format !== "vocab-gap-tool/progress") {
    return {
      ok: false,
      error: "That doesn't look like a progress file from this app.",
    };
  }

  const progress = normalize(parsed);
  return {
    ok: true,
    progress,
    wordCount: Object.keys(progress.words).length,
  };
}
