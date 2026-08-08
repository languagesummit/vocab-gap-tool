/**
 * Reports which glosses are unfit to put on an answer button, and writes the
 * work queue for curation.
 *
 * A gloss fails if a person reading it under a five-second timer could not
 * use it: Korean text left in the English field, the word restated as its own
 * meaning, a paragraph where a phrase belongs, every sense of the lemma piled
 * into one string, or two senses of the same word carrying the same answer.
 *
 * Usage: node scripts/audit-glosses.mjs [--queue]
 */

import { readFileSync, writeFileSync } from "node:fs";

const words = JSON.parse(readFileSync("public/korean.json", "utf8"));

const HANGUL = /[가-힣]/;
const MAX_CHARS = 45;

const byLemma = new Map();
for (const w of words) {
  if (!byLemma.has(w.lemma)) byLemma.set(w.lemma, []);
  byLemma.get(w.lemma).push(w);
}

/** Every reason this gloss can't be shown as-is. */
export function faults(w) {
  const out = [];
  const gloss = w.gloss.trim();

  if (HANGUL.test(gloss)) out.push("korean-in-english");
  if (gloss === w.lemma) out.push("restates-the-word");
  if (gloss.length > MAX_CHARS) out.push("too-long");
  if ((gloss.match(/;/g) || []).length >= 2) out.push("piled-up-senses");

  const siblings = byLemma.get(w.lemma) ?? [];
  if (siblings.some((s) => s.key !== w.key && s.gloss.trim() === gloss)) {
    out.push("same-as-another-sense");
  }
  // "To be beautiful" reads as a sentence fragment mid-list; the curated
  // entries are all lowercase. Nationalities, months, titles and the pronoun
  // "I" keep their capital and are not faults — the same exemption the build
  // applies, mirrored here so the audit doesn't report its own allowances.
  const KEEPS_CAPITAL =
    /^(Korea|Korean|Seoul|Japan|Japanese|China|Chinese|America|American|England|English|Britain|British|France|French|Germany|German|Russia|Russian|Europe|European|Asia|Asian|Buddha|Buddhis[mt]|Christian|Christianity|Christmas|Confucian\w*|Taoism|God|Mr|Mrs|Ms|Hangul|Hanja|Seollal|Chuseok|Western|Eastern|Northern|Southern|January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b|^I\b|^[A-Z]{2,}/;
  if (/^[A-Z]/.test(gloss) && !KEEPS_CAPITAL.test(gloss)) out.push("capitalised");

  return out;
}

const flagged = words
  .map((w) => ({ ...w, faults: faults(w) }))
  .filter((w) => w.faults.length > 0);

const tally = {};
for (const w of flagged) {
  for (const f of w.faults) tally[f] = (tally[f] ?? 0) + 1;
}

console.log(`${flagged.length} of ${words.length} glosses need work\n`);
console.log("by fault:");
for (const [fault, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${fault.padEnd(24)} ${n}`);
}

console.log("\nby rank band:");
for (const [lo, hi] of [
  [1, 200],
  [201, 500],
  [501, 1000],
  [1001, 2000],
  [2001, 5897],
]) {
  const bad = flagged.filter((w) => w.rank >= lo && w.rank <= hi).length;
  const all = words.filter((w) => w.rank >= lo && w.rank <= hi).length;
  const pct = Math.round((bad / all) * 100);
  console.log(`  ${String(lo).padStart(4)}–${String(hi).padEnd(4)} ${String(bad).padStart(4)} of ${String(all).padStart(4)}  ${pct}%`);
}

// How much is fixable by rule alone — capitalisation is the only fault that
// needs no judgement, so it should never reach a curation batch.
const onlyMechanical = flagged.filter(
  (w) => w.faults.length === 1 && w.faults[0] === "capitalised"
);
console.log(
  `\n${onlyMechanical.length} need only lowercasing; ${
    flagged.length - onlyMechanical.length
  } need a written gloss`
);

if (process.argv.includes("--queue")) {
  const queue = flagged
    .filter((w) => !(w.faults.length === 1 && w.faults[0] === "capitalised"))
    .sort((a, b) => a.rank - b.rank);
  writeFileSync(
    "data/gloss-work-queue.json",
    JSON.stringify(queue, null, 1),
    "utf8"
  );
  console.log(`\nwrote data/gloss-work-queue.json — ${queue.length} entries`);
}
