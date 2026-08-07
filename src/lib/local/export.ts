/**
 * Anki export.
 *
 * Plain tab-separated text rather than a real `.apkg`: Anki imports TSV
 * natively, it needs no library and no server, and the file stays something you
 * can open and read before trusting it. An `.apkg` would need a SQLite database
 * built in the browser to gain nothing a learner would notice.
 *
 * The header lines are Anki's own import directives, so the file carries its
 * own settings and the import dialog doesn't have to be configured by hand.
 */

import type { Word } from "./words";
import type { Progress } from "./progress";
import { recallOf } from "./analysis";

/**
 * Tabs and newlines inside a field would silently shift every later column, so
 * they're flattened rather than escaped — no gloss needs them, and a corrupted
 * deck that imports without complaint is worse than a slightly plainer one.
 */
function clean(value: string): string {
  return value.replace(/[\t\r\n]+/g, " ").trim();
}

export type CardSide = "recognition" | "recall";

/**
 * Tags let a deck be re-sliced inside Anki after import, so the export doesn't
 * have to be the last chance to make a decision about scope.
 */
function tagsFor(word: Word, progress: Progress): string {
  const tags = ["vocab-gap-tool"];
  if (word.category) tags.push(`cat::${word.category}`);
  if (word.sub) tags.push(`cat::${word.category}::${word.sub}`);
  if (word.pos) tags.push(`pos::${word.pos.replace(/\s+/g, "-")}`);
  if (word.lv.topik) tags.push(`topik::${word.lv.topik}`);

  // Rank band rather than raw rank: "the first hundred animals" is a thing you
  // might want to study, rank 1,743 exactly is not.
  const band = Math.floor((word.rank - 1) / 500) * 500;
  tags.push(`rank::${band + 1}-${band + 500}`);

  const record = progress.words[word.key];
  tags.push(`status::${record ? record.status : "untested"}`);
  const recall = record ? recallOf(record) : null;
  if (recall) tags.push(`recall::${recall}`);

  return tags.join(" ");
}

export function toAnkiTsv(
  words: Word[],
  progress: Progress,
  side: CardSide
): string {
  const lines = [
    "#separator:tab",
    "#html:false",
    "#notetype:Basic",
    "#tags column:3",
  ];

  for (const word of words) {
    // The sense hint has to ride along on whichever side shows the Korean:
    // 있다 asked bare is the same question with two different right answers.
    const korean = word.hint
      ? `${clean(word.lemma)} (${clean(word.hint)})`
      : clean(word.lemma);
    const english = clean(word.gloss);
    const [front, back] =
      side === "recognition" ? [korean, english] : [english, korean];
    lines.push([front, back, tagsFor(word, progress)].join("\t"));
  }

  return lines.join("\n") + "\n";
}

export function downloadText(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/tab-separated-values" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** `anki-korean-동물류-2026-08-07.tsv`, or a plainer name when unfiltered. */
export function exportFilename(label: string | null): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = label ? `-${label.replace(/[\s/]+/g, "-")}` : "";
  return `anki-korean${slug}-${stamp}.tsv`;
}
