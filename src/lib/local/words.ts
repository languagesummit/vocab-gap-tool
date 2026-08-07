export type Word = {
  key: string; // `${lemma}#${sense}` — stable across list rebuilds
  rank: number;
  lemma: string;
  gloss: string;
  pos: string | null;
  category: string | null;
  /**
   * Names which sense is being asked about, for the ~13% of entries whose
   * lemma appears more than once. Null elsewhere, where it would be clutter.
   */
  hint: string | null;
  /** NIKL 등급 — A 초급, B 중급, C 고급. Null for the handful ungraded. */
  nikl: "A" | "B" | "C" | null;
  /** TOPIK tier — I covers exam levels 1–2, II covers 3–6. Null when the word
   * is on neither TOPIK vocabulary list. */
  topik: "I" | "II" | null;
};

let cache: Word[] | null = null;

/** Fetches the static word list once per page load; the browser caches it. */
export async function loadWords(): Promise<Word[]> {
  if (cache) return cache;
  const res = await fetch("/korean.json");
  if (!res.ok) throw new Error(`Could not load word list (${res.status})`);
  cache = (await res.json()) as Word[];
  return cache;
}
