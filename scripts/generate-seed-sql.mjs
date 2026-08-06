/**
 * Emits the Korean word seed as plain SQL, split into chunks small enough to
 * paste into the Supabase SQL Editor. This is the no-credentials path — it
 * needs nothing but the dashboard.
 *
 * The language id is resolved by subquery rather than hardcoded, so the files
 * work regardless of what uuid the languages row was given.
 *
 * Usage: node scripts/generate-seed-sql.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const ROWS_PER_FILE = 1500;
const seed = JSON.parse(readFileSync("data/korean_seed.json", "utf8"));

mkdirSync("supabase/seed", { recursive: true });

const q = (value) => {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
};

const files = [];
for (let start = 0; start < seed.length; start += ROWS_PER_FILE) {
  const chunk = seed.slice(start, start + ROWS_PER_FILE);
  const part = files.length + 1;

  const values = chunk
    .map((w) => {
      // Only the fields worth keeping in the database; the full provenance
      // stays in data/korean_seed.json in the repo.
      const notes = JSON.stringify({
        source_rank: w.notes.source_rank,
        hanja: w.notes.hanja,
        nikl_level: w.notes.nikl_level,
        curated: w.notes.curated === true,
        needs_review: w.notes.needs_review === true,
      });

      return `((select id from public.languages where code = 'ko'), ${w.frequency_rank}, ${q(w.lemma)}, ${w.sense_index}, ${q(w.gloss)}, ${q(w.part_of_speech)}, ${q(w.semantic_category)}, ${q(w.concreteness)}, ${q(notes)}::jsonb)`;
    })
    .join(",\n  ");

  const sql = `-- Korean word seed, part ${part}
-- Paste into Supabase SQL Editor and Run. Safe to re-run.

insert into public.words
  (language_id, frequency_rank, lemma, sense_index, gloss, part_of_speech, semantic_category, concreteness, notes)
values
  ${values}
on conflict (language_id, frequency_rank) do update set
  lemma = excluded.lemma,
  sense_index = excluded.sense_index,
  gloss = excluded.gloss,
  part_of_speech = excluded.part_of_speech,
  semantic_category = excluded.semantic_category,
  concreteness = excluded.concreteness,
  notes = excluded.notes;
`;

  const name = `supabase/seed/korean_part${part}.sql`;
  writeFileSync(name, sql, "utf8");
  files.push({ name, rows: chunk.length, kb: Math.round(sql.length / 1024) });
}

console.log(`Ranks ${seed[0].frequency_rank}–${seed[seed.length - 1].frequency_rank}`);
for (const f of files) console.log(`  ${f.name}  ${f.rows} rows  ${f.kb} KB`);
