/**
 * Folds a curation batch into data/korean_curated_glosses.json.
 *
 * Curation arrives in batches rather than all at once, so batches are written
 * to data/gloss-patch.json and merged here. Later batches win, which makes a
 * correction just another batch. The patch file is left in place; it is the
 * record of what the last batch contained.
 *
 * Usage: node scripts/merge-curated.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";

const TARGET = "data/korean_curated_glosses.json";
const PATCH = "data/gloss-patch.json";

const target = JSON.parse(readFileSync(TARGET, "utf8"));
const patch = JSON.parse(readFileSync(PATCH, "utf8"));

const before = Object.keys(target.glosses).length;
let replaced = 0;
let added = 0;

for (const [rank, entry] of Object.entries(patch.glosses)) {
  if (target.glosses[rank]) replaced += 1;
  else added += 1;
  target.glosses[rank] = entry;
}

// Numeric order, so the file stays readable as it grows.
target.glosses = Object.fromEntries(
  Object.entries(target.glosses).sort((a, b) => Number(a[0]) - Number(b[0]))
);

writeFileSync(TARGET, JSON.stringify(target, null, 2), "utf8");

console.log(`curated glosses: ${before} -> ${Object.keys(target.glosses).length}`);
console.log(`  added ${added}, replaced ${replaced}`);
