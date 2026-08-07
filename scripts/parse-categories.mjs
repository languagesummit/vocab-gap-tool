/**
 * Reads the semantic category tagging and emits a lemma -> category map.
 *
 * Source: 한국어 교육 어휘 내용 개발 (4단계), 국립국어원 2015 — 12,019 words, of
 * which 6,898 carry a 대범주/소범주 pair: 14 major categories over 139
 * subcategories. The rest are untagged at source, so category coverage tops out
 * below the full list however the join goes.
 *
 * This is the tagging the gap analysis has been starved of — before it, 200
 * hand-curated words carried a category and 5,697 carried nothing, which meant
 * "you're weak on colours" was a question the tool could not answer.
 *
 * Homographs are numbered as elsewhere (가구03), so the join can be
 * sense-aware. Usage: node scripts/parse-categories.mjs
 *   in:  data/korean_categories_raw.tsv
 *   out: data/korean_categories.json
 */

import { readFileSync, writeFileSync } from "node:fs";

const lines = readFileSync("data/korean_categories_raw.tsv", "utf8")
  .split("\n")
  .slice(1)
  .filter((l) => l.trim());

/** 가구03 -> { lemma: "가구", code: "03" } */
function splitCode(form) {
  const match = form.match(/^(.+?)(\d{2})$/);
  return match
    ? { lemma: match[1], code: match[2] }
    : { lemma: form, code: null };
}

const byLemma = new Map();
let rows = 0;

for (const line of lines) {
  const [word, pos, major, minor] = line.split("\t");
  if (!word || !major) continue;
  rows += 1;

  // Affixes and bound forms are listed with a leading hyphen (-가02). They
  // aren't testable words and never match the frequency list, but stripping
  // the marker would collide them with real lemmas, so they're kept as-is.
  const { lemma, code } = splitCode(word.trim());
  if (!lemma) continue;

  if (!byLemma.has(lemma)) byLemma.set(lemma, []);
  byLemma.get(lemma).push({
    code,
    major: major.trim(),
    minor: minor?.trim() || null,
    pos: pos?.trim() || null,
  });
}

const out = {};
for (const [lemma, entries] of byLemma) {
  const majors = [...new Set(entries.map((e) => e.major))];
  out[lemma] = {
    // Where every sense agrees the lemma-wide answer is safe; where they don't,
    // the caller falls back to matching on the sense code.
    major: majors.length === 1 ? majors[0] : null,
    minor:
      majors.length === 1
        ? [...new Set(entries.map((e) => e.minor).filter(Boolean))][0] ?? null
        : null,
    senses: entries
      .filter((e) => e.code)
      .map((e) => ({ code: e.code, major: e.major, minor: e.minor })),
  };
}

writeFileSync(
  "data/korean_categories.json",
  JSON.stringify(
    {
      source: "한국어 교육 어휘 내용 개발 (4단계), 국립국어원 2015",
      categories: out,
    },
    null,
    0
  ),
  "utf8"
);

const majors = {};
for (const line of lines) {
  const m = line.split("\t")[2]?.trim();
  if (m) majors[m] = (majors[m] ?? 0) + 1;
}

console.log(`Read ${rows} tagged rows across ${byLemma.size} lemmas`);
console.log("Major categories:", majors);
console.log(
  `Lemmas whose senses disagree on category: ${
    [...byLemma.values()].filter(
      (e) => new Set(e.map((x) => x.major)).size > 1
    ).length
  }`
);
