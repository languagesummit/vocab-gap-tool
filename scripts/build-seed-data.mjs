/**
 * Merges the automatic kengdic glosses with the hand-curated overrides and
 * writes the final seed file.
 *
 * Curated entries win outright. Uncurated ones keep their dictionary
 * candidates joined together and are flagged needs_review, so it's always
 * clear which words have a vetted single meaning and which are still raw.
 *
 * Usage: node scripts/build-seed-data.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";

const glossed = JSON.parse(
  readFileSync("data/korean_words_glossed.json", "utf8")
);
const curated = JSON.parse(
  readFileSync("data/korean_curated_glosses.json", "utf8")
).glosses;

let curatedCount = 0;
let reviewCount = 0;
let emptyCount = 0;

const seed = glossed.map((word) => {
  const override = curated[String(word.frequency_rank)];

  if (override) {
    curatedCount += 1;
    return {
      frequency_rank: word.frequency_rank,
      lemma: word.lemma,
      sense_index: word.sense_index,
      gloss: override.gloss,
      part_of_speech: word.part_of_speech,
      semantic_category: override.semantic_category,
      concreteness: override.concreteness,
      notes: { ...word.notes, curated: true },
    };
  }

  const fallback = word.gloss_candidates.join("; ");
  if (!fallback) emptyCount += 1;
  else reviewCount += 1;

  return {
    frequency_rank: word.frequency_rank,
    lemma: word.lemma,
    sense_index: word.sense_index,
    gloss: fallback || word.lemma,
    part_of_speech: word.part_of_speech,
    semantic_category: null,
    concreteness: word.concreteness,
    notes: {
      ...word.notes,
      curated: false,
      needs_review: true,
      no_dictionary_entry: !fallback,
    },
  };
});

writeFileSync("data/korean_seed.json", JSON.stringify(seed, null, 2), "utf8");

console.log(`Seed rows written:      ${seed.length}`);
console.log(`Curated (vetted):       ${curatedCount}`);
console.log(`Auto-glossed (review):  ${reviewCount}`);
console.log(`No gloss available:     ${emptyCount}`);
