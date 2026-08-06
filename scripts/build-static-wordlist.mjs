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

const words = seed
  .filter((w) => w.gloss && w.gloss.trim().length > 0)
  .map((w) => ({
    // Stable identity for saved progress. Ranks can shift if the source list
    // is ever rebuilt; lemma+sense does not, so exported files stay valid.
    key: `${w.lemma}#${w.sense_index}`,
    rank: w.frequency_rank,
    lemma: w.lemma,
    gloss: cleanGloss(w.gloss),
    pos: w.part_of_speech ?? null,
    category: w.semantic_category ?? null,
  }));

mkdirSync("public", { recursive: true });
writeFileSync("public/korean.json", JSON.stringify(words), "utf8");

const kb = Math.round(statSync("public/korean.json").size / 1024);
console.log(`public/korean.json — ${words.length} words, ${kb} KB`);
console.log(`ranks ${words[0].rank}–${words[words.length - 1].rank}`);
console.log(`dropped ${seed.length - words.length} entries with no gloss`);

const changed = seed
  .filter((w) => w.gloss && cleanGloss(w.gloss) !== w.gloss.trim())
  .slice(0, 10);
console.log(`\ncleaned ${
  seed.filter((w) => w.gloss && cleanGloss(w.gloss) !== w.gloss.trim()).length
} glosses, e.g.:`);
for (const w of changed) {
  console.log(`  ${w.lemma}: "${w.gloss}" -> "${cleanGloss(w.gloss)}"`);
}
