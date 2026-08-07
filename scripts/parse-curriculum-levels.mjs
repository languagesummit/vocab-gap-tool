/**
 * Reads the 6-level Korean vocabulary grading and emits a lemma -> level map.
 *
 * Source: 국제 통용 한국어 표준 교육과정 적용 연구 (4단계), 국립국어원 2017 —
 * 10,635 words graded 1급 through 6급 (735 / 1,100 / 1,655 / 2,200 / 2,365 /
 * 2,580). This is a curriculum standard rather than the exam's own list; TOPIK
 * has never published per-level vocabulary. The curriculum was built to align
 * with TOPIK's six levels, so level N means "what a syllabus aiming at TOPIK N
 * teaches" — a far better claim than the two-tier list supports, but not the
 * exam speaking for itself, and the UI says so.
 *
 * The source numbers homographs the same way the frequency list does (가격02),
 * which is what makes a sense-aware join possible at all.
 *
 * Usage: node scripts/parse-curriculum-levels.mjs
 *   in:  data/korean_curriculum_raw.tsv
 *   out: data/korean_levels.json
 */

import { readFileSync, writeFileSync } from "node:fs";

const LEVELS = { "1급": 1, "2급": 2, "3급": 3, "4급": 4, "5급": 5, "6급": 6 };

const lines = readFileSync("data/korean_curriculum_raw.tsv", "utf8")
  .split("\n")
  .slice(1)
  .filter((l) => l.trim());

/**
 * A row's word field can name more than one homograph at once
 * ("독립적01∙ 독립적02"), meaning the level covers both. Each is emitted
 * separately so the join sees them individually.
 */
function splitForms(word) {
  return word
    .split(/[∙·/,]/)
    .map((w) => w.trim())
    .filter(Boolean);
}

/** 가격02 -> { lemma: "가격", code: "02" } */
function splitCode(form) {
  const match = form.match(/^(.+?)(\d{2})$/);
  return match
    ? { lemma: match[1], code: match[2] }
    : { lemma: form, code: null };
}

// lemma -> array of { code, level, pos }
const byLemma = new Map();
let rows = 0;

for (const line of lines) {
  const [levelText, word, pos] = line.split("\t");
  const level = LEVELS[levelText?.trim()];
  if (!level || !word) continue;
  rows += 1;

  for (const form of splitForms(word)) {
    const { lemma, code } = splitCode(form);
    if (!lemma) continue;
    if (!byLemma.has(lemma)) byLemma.set(lemma, []);
    byLemma.get(lemma).push({ code, level, pos: pos?.trim() ?? null });
  }
}

const out = {};
for (const [lemma, entries] of byLemma) {
  // Distinct levels this lemma carries across its senses. Most carry exactly
  // one, which makes the join unambiguous regardless of sense numbering.
  const levels = [...new Set(entries.map((e) => e.level))].sort(
    (a, b) => a - b
  );
  out[lemma] = {
    levels,
    // Kept so a caller holding a sense code can pick the right one rather than
    // falling back to the lemma-wide answer.
    senses: entries
      .filter((e) => e.code)
      .map((e) => ({ code: e.code, level: e.level, pos: e.pos })),
  };
}

writeFileSync(
  "data/korean_levels.json",
  JSON.stringify({ source: "국제 통용 한국어 표준 교육과정 (4단계), 국립국어원 2017", levels: out }, null, 0),
  "utf8"
);

const perLevel = {};
for (const line of lines) {
  const lv = line.split("\t")[0]?.trim();
  if (lv) perLevel[lv] = (perLevel[lv] ?? 0) + 1;
}

console.log(`Read ${rows} graded rows`);
console.log("Per level:", perLevel);
console.log(`Distinct lemmas: ${byLemma.size}`);
console.log(
  `Lemmas whose senses disagree on level: ${
    [...byLemma.values()].filter(
      (e) => new Set(e.map((x) => x.level)).size > 1
    ).length
  }`
);
