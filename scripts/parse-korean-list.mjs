/**
 * Normalizes the raw NIKL/TOPIK Korean vocabulary TSV into the shape the
 * `words` table expects.
 *
 * Input columns:  rank, word, part_of_speech, hanja, explanation,
 *                 nikl_level, topik_level
 *
 * Note that the last two headers are the wrong way round in the source file:
 * the column called `nikl_level` carries the TOPIK tier (초급/중급) and the one
 * called `topik_level` carries the NIKL grade (A/B/C). See scripts/levels.mjs
 * for the evidence. They are read positionally here and written out under
 * names that say what they actually are.
 *
 * Three things the raw data needs fixing for:
 *
 * 1. NIKL appends a homograph number to the headword (가구03 = household,
 *    가구04 = furniture). We split that into lemma + the original sense code.
 * 2. The same lemma can appear under several parts of speech (있다 is both
 *    보조 용언 and 형용사; 가까이 is both 부사 and 명사). Each is a genuinely
 *    separate thing to learn, so each gets its own row — sense_index is
 *    assigned per lemma in rank order to keep them distinct.
 *
 * Source ranks are sparse (they run to ~57k across ~5.9k listed words), so we
 * also assign a dense rank 1..N. The app tests densely from rank 1 upward, and
 * "cleared ranks 1–2,400" only means something if the ranks have no holes.
 *
 * Usage: node scripts/parse-korean-list.mjs <input.tsv> <output.json>
 */

import { readFileSync, writeFileSync } from "node:fs";
import { decodeLevels } from "./levels.mjs";

const POS_MAP = {
  명사: "noun",
  동사: "verb",
  형용사: "adjective",
  부사: "adverb",
  의존명사: "bound noun",
  관형사: "determiner",
  대명사: "pronoun",
  수사: "numeral",
  감탄사: "interjection",
  "보조 용언": "auxiliary",
  접사: "affix",
  "줄어든 말": "contraction",
  조사: "particle",
};

// Function words can't be tested with images or target-language definitions;
// they only work as translation multiple choice.
const FUNCTION_POS = new Set([
  "bound noun",
  "determiner",
  "pronoun",
  "numeral",
  "auxiliary",
  "affix",
  "particle",
  "contraction",
]);

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error(
    "Usage: node scripts/parse-korean-list.mjs <input.tsv> <output.json>"
  );
  process.exit(1);
}

const lines = readFileSync(inputPath, "utf8").split(/\r?\n/).slice(1);

const entries = [];
for (const line of lines) {
  if (!line.trim()) continue;
  // The last two columns are mislabelled in the source header, so they are
  // decoded by their values rather than trusted by position.
  const [rank, word, pos, hanja, explanation, sixth, seventh] =
    line.split("\t");

  if (!/^\d+$/.test(rank ?? "")) continue; // unranked affixes etc.

  const { niklGrade, topikTier } = decodeLevels({
    nikl_level: sixth,
    topik_level: seventh,
  });

  // 가구04 -> lemma 가구, senseCode 04
  const match = word.match(/^(.+?)(\d{2})$/);
  const lemma = match ? match[1] : word;
  const senseCode = match ? match[2] : null;

  entries.push({
    sourceRank: Number(rank),
    lemma,
    senseCode,
    partOfSpeech: POS_MAP[pos] ?? pos ?? null,
    hanja: hanja || null,
    collocation: explanation || null,
    niklGrade,
    topikTier,
  });
}

entries.sort((a, b) => a.sourceRank - b.sourceRank);

const senseCounter = new Map();
const words = entries.map((entry, i) => {
  const next = (senseCounter.get(entry.lemma) ?? 0) + 1;
  senseCounter.set(entry.lemma, next);

  return {
    frequency_rank: i + 1,
    lemma: entry.lemma,
    sense_index: next,
    gloss: null, // filled in by the glossing pass
    part_of_speech: entry.partOfSpeech,
    semantic_category: null, // filled in by the tagging pass
    concreteness: FUNCTION_POS.has(entry.partOfSpeech) ? "function" : null,
    notes: {
      source_rank: entry.sourceRank,
      nikl_sense: entry.senseCode,
      hanja: entry.hanja,
      collocation: entry.collocation,
      // NIKL 등급 A/B/C and TOPIK tier 초급/중급 — named for what they hold,
      // unlike the source columns they came from.
      nikl_grade: entry.niklGrade,
      topik_tier: entry.topikTier,
    },
  };
});

writeFileSync(outputPath, JSON.stringify(words, null, 2), "utf8");

const multiSense = [...senseCounter.entries()].filter(([, n]) => n > 1);
console.log(`Wrote ${words.length} words to ${outputPath}`);
console.log(`Lemmas with multiple senses/POS: ${multiSense.length}`);
console.log(
  "Examples:",
  multiSense
    .slice(0, 8)
    .map(([lemma, n]) => `${lemma}×${n}`)
    .join(", ")
);
