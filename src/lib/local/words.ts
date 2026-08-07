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
  /**
   * Level index per proficiency framework, keyed by framework id — e.g.
   * `{ topik: 4, nikl: 2 }`. A missing key means that framework doesn't grade
   * this word, which is information rather than a gap.
   */
  lv: Record<string, number>;
  /**
   * TOPIK's own two-tier grading — I covers exam levels 1–2, II covers 3–6.
   * Coarser than `lv.topik` but drawn from a different source, so it still
   * places words the curriculum never graded. Null when on neither list.
   */
  tier: "I" | "II" | null;
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
