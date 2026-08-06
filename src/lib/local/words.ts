export type Word = {
  key: string; // `${lemma}#${sense}` — stable across list rebuilds
  rank: number;
  lemma: string;
  gloss: string;
  pos: string | null;
  category: string | null;
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
