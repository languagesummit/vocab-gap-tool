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
import { decodeLevels, topikTierCode } from "./levels.mjs";

const seed = JSON.parse(readFileSync("data/korean_seed.json", "utf8"));
const curriculum = JSON.parse(
  readFileSync("data/korean_levels.json", "utf8")
).levels;
const categories = JSON.parse(
  readFileSync("data/korean_categories.json", "utf8")
).categories;

/**
 * Resolves a word to its 대범주/소범주 pair, sense-exact where both sources
 * number the homograph and lemma-wide where every sense agrees. Words whose
 * senses genuinely disagree are left untagged rather than guessed at: a wrong
 * category is worse than none, because the whole point is to trust a gap.
 */
function categoryFor(word) {
  const entry = categories[word.lemma];
  if (!entry) return { major: null, minor: null };

  const code = word.notes?.nikl_sense;
  if (code) {
    const exact = entry.senses.find((s) => s.code === code);
    if (exact) return { major: exact.major, minor: exact.minor };
  }

  return { major: entry.major, minor: entry.minor };
}

/**
 * Resolves a word to a curriculum level 1–6.
 *
 * Both lists number homographs (가격02), so where the seed row carries a sense
 * code and the curriculum has that same code, the match is sense-exact. Where
 * it doesn't, a lemma whose senses all sit at one level is still unambiguous —
 * which covers all but a few hundred. Only when the codes miss *and* the
 * senses genuinely disagree is there a real choice to make, and there the
 * lowest level is taken: those are common words whose rarer senses are graded
 * higher, and overstating difficulty would hide them from the level they're
 * actually first met at.
 */
function levelFor(word) {
  const entry = curriculum[word.lemma];
  if (!entry) return { level: null, resolution: "unmatched" };

  const code = word.notes?.nikl_sense;
  if (code) {
    const exact = entry.senses.find((s) => s.code === code);
    if (exact) return { level: exact.level, resolution: "sense" };
  }

  if (entry.levels.length === 1) {
    return { level: entry.levels[0], resolution: "lemma" };
  }

  return { level: entry.levels[0], resolution: "ambiguous" };
}

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

const resolutions = {};
const words = kept.map((w) => {
  const { niklGrade, topikTier } = decodeLevels(w.notes);
  const { level, resolution } = levelFor(w);
  resolutions[resolution] = (resolutions[resolution] ?? 0) + 1;
  const { major, minor } = categoryFor(w);

  // Framework level indices, keyed by framework id. Absent keys mean the word
  // isn't graded by that framework — which is information, not a gap to fill.
  const lv = {};
  if (level) lv.topik = level;
  if (niklGrade) lv.nikl = { A: 1, B: 2, C: 3 }[niklGrade];

  return {
    lv,
    // Stable identity for saved progress. Ranks can shift if the source list
    // is ever rebuilt; lemma+sense does not, so exported files stay valid.
    key: `${w.lemma}#${w.sense_index}`,
    rank: w.frequency_rank,
    lemma: w.lemma,
    gloss: cleanGloss(w.gloss),
    pos: w.part_of_speech ?? null,
    // 대범주 / 소범주 from the NIKL tagging. The hand-curated English tags on
    // the top 200 are deliberately not used as a fallback: they're a different
    // taxonomy, and two schemes in one column makes "which category am I
    // weakest in" a meaningless comparison. What they mostly covered was
    // function words, which have no semantic category to be missing anyway.
    category: major,
    sub: minor,
    hint: senseHint(w),
    // TOPIK I/II from the 2015 exam list. Coarser than the curriculum level
    // but independent of it, so it still places words the curriculum skips.
    tier: topikTierCode(topikTier),
  };
});

mkdirSync("public", { recursive: true });
writeFileSync("public/korean.json", JSON.stringify(words), "utf8");

const kb = Math.round(statSync("public/korean.json").size / 1024);
console.log(`public/korean.json — ${words.length} words, ${kb} KB`);
console.log(`ranks ${words[0].rank}–${words[words.length - 1].rank}`);
console.log(`dropped ${seed.length - words.length} entries with no gloss`);

const tally = (get) =>
  words.reduce((acc, w) => {
    const k = get(w) ?? "(none)";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
console.log("\nTOPIK tier (2015 list):", tally((w) => w.tier));
console.log("NIKL grade:", tally((w) => w.lv.nikl));
console.log("Curriculum level 1–6:", tally((w) => w.lv.topik));
console.log("How each level was resolved:", resolutions);
console.log(
  `Categorised: ${words.filter((w) => w.category).length} of ${words.length}` +
    ` (${words.filter((w) => w.sub).length} with a subcategory)`
);

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
