/**
 * Attaches candidate English glosses to the parsed Korean frequency list by
 * joining against kengdic (an open Korean/English dictionary).
 *
 * Where NIKL gives hanja for a sense (가구/家口 household vs 가구/家具
 * furniture), a kengdic entry with matching hanja is preferred — that's what
 * separates homographs that would otherwise collapse into one gloss.
 *
 * Output glosses are *candidates*. They still need a review pass before they
 * become quiz answers; kengdic is known to be noisy.
 *
 * Usage: node scripts/join-glosses.mjs <words.json> <kengdic.tsv> <out.json>
 */

import { readFileSync, writeFileSync } from "node:fs";

const [, , wordsPath, kengdicPath, outPath] = process.argv;
if (!wordsPath || !kengdicPath || !outPath) {
  console.error(
    "Usage: node scripts/join-glosses.mjs <words.json> <kengdic.tsv> <out.json>"
  );
  process.exit(1);
}

const words = JSON.parse(readFileSync(wordsPath, "utf8"));

// surface -> [{gloss, hanja}]
const dict = new Map();
const kengdicLines = readFileSync(kengdicPath, "utf8").split(/\r?\n/).slice(1);
for (const line of kengdicLines) {
  if (!line.trim()) continue;
  const [, surface, hanja, gloss] = line.split("\t");
  if (!surface || !gloss) continue;

  const clean = gloss.replace(/\s+/g, " ").trim();
  if (!clean) continue;

  if (!dict.has(surface)) dict.set(surface, []);
  dict.get(surface).push({ gloss: clean, hanja: hanja || null });
}

const MAX_GLOSSES = 4;
let exact = 0;
let viaHanja = 0;
let missing = 0;

const enriched = words.map((word) => {
  const candidates = dict.get(word.lemma) ?? [];

  if (candidates.length === 0) {
    missing += 1;
    return { ...word, gloss_candidates: [], gloss_source: null };
  }

  // Prefer glosses whose hanja matches this sense's hanja.
  const wantHanja = word.notes?.hanja;
  const matched = wantHanja
    ? candidates.filter((c) => c.hanja === wantHanja)
    : [];

  const chosen = matched.length > 0 ? matched : candidates;
  if (matched.length > 0) viaHanja += 1;
  else exact += 1;

  const glosses = [...new Set(chosen.map((c) => c.gloss))].slice(0, MAX_GLOSSES);

  return {
    ...word,
    gloss_candidates: glosses,
    gloss_source: matched.length > 0 ? "kengdic+hanja" : "kengdic",
  };
});

writeFileSync(outPath, JSON.stringify(enriched, null, 2), "utf8");

const top1000Missing = enriched
  .slice(0, 1000)
  .filter((w) => w.gloss_candidates.length === 0).length;

console.log(`Total words:            ${enriched.length}`);
console.log(`Matched (hanja-scoped): ${viaHanja}`);
console.log(`Matched (lemma only):   ${exact}`);
console.log(`No dictionary entry:    ${missing}`);
console.log(`Coverage:               ${(((enriched.length - missing) / enriched.length) * 100).toFixed(1)}%`);
console.log(`Unglossed in top 1000:  ${top1000Missing}`);
