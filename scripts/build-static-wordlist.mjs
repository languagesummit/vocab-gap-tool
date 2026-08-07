/**
 * Emits the browser-facing word list: public/korean.json
 *
 * In local mode the app has no database, so the word list ships as a static
 * file the browser fetches and caches. Only the fields the UI actually needs
 * are included — provenance stays in data/korean_seed.json.
 *
 * Usage: node scripts/build-static-wordlist.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";

const seed = JSON.parse(readFileSync("data/korean_seed.json", "utf8"));

/**
 * Strips parenthetical annotations — "(auxiliary)", "(a thing)" — from
 * glosses. Under a short timer they're noise: the eye has to skip past them
 * to find the actual meaning. Falls back to the original if stripping would
 * leave nothing behind.
 */
function cleanGloss(gloss) {
  const stripped = gloss
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,;])/g, "$1")
    .replace(/^[\s,;]+|[\s,;]+$/g, "")
    .trim();
  return stripped.length > 0 ? stripped : gloss.trim();
}

const kept = seed.filter((w) => w.gloss && w.gloss.trim().length > 0);

// 있다 is two separate entries at ranks 3 and 4 — the auxiliary "-고 있다" and
// the ordinary "to exist". Shown as a bare lemma they are the same question
// with two different right answers, so the sense has to be named in the
// prompt. Only where a lemma actually repeats: elsewhere a hint is clutter,
// and clutter is what makes a five-second read fail.
const senseCount = new Map();
for (const w of kept) senseCount.set(w.lemma, (senseCount.get(w.lemma) ?? 0) + 1);

function senseHint(w) {
  if ((senseCount.get(w.lemma) ?? 0) < 2) return null;
  // A collocation ("집에" for 집에 있다) says more than a grammar label, so it
  // wins where the source has one.
  const collocation = w.notes?.collocation?.trim();
  if (collocation) return collocation;
  return w.part_of_speech ?? null;
}

const words = kept.map((w) => ({
  // Stable identity for saved progress. Ranks can shift if the source list
  // is ever rebuilt; lemma+sense does not, so exported files stay valid.
  key: `${w.lemma}#${w.sense_index}`,
  rank: w.frequency_rank,
  lemma: w.lemma,
  gloss: cleanGloss(w.gloss),
  pos: w.part_of_speech ?? null,
  category: w.semantic_category ?? null,
  hint: senseHint(w),
}));

mkdirSync("public", { recursive: true });
writeFileSync("public/korean.json", JSON.stringify(words), "utf8");

const kb = Math.round(statSync("public/korean.json").size / 1024);
console.log(`public/korean.json — ${words.length} words, ${kb} KB`);
console.log(`ranks ${words[0].rank}–${words[words.length - 1].rank}`);
console.log(`dropped ${seed.length - words.length} entries with no gloss`);

const ambiguous = words.filter((w) => (senseCount.get(w.lemma) ?? 0) > 1);
console.log(
  `\n${ambiguous.length} entries share a lemma with another sense; ` +
    `${ambiguous.filter((w) => w.hint).length} carry a disambiguating hint`
);

const changed = seed
  .filter((w) => w.gloss && cleanGloss(w.gloss) !== w.gloss.trim())
  .slice(0, 10);
console.log(`\ncleaned ${
  seed.filter((w) => w.gloss && cleanGloss(w.gloss) !== w.gloss.trim()).length
} glosses, e.g.:`);
for (const w of changed) {
  console.log(`  ${w.lemma}: "${w.gloss}" -> "${cleanGloss(w.gloss)}"`);
}
