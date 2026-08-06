/**
 * Pushes data/korean_seed.json into the Supabase `words` table.
 *
 * Needs the service role key (it bypasses RLS, which the anon key can't do for
 * writes to reference tables). Put it in .env.local as SUPABASE_SERVICE_ROLE_KEY
 * — that file is gitignored and the key must never reach the browser bundle.
 *
 * Safe to re-run: rows are upserted on (language_id, frequency_rank).
 *
 * Usage: node --env-file=.env.local scripts/seed-supabase.mjs
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Add them to .env.local, then run:\n" +
      "  node --env-file=.env.local scripts/seed-supabase.mjs"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const { data: language, error: langError } = await supabase
  .from("languages")
  .select("id")
  .eq("code", "ko")
  .single();

if (langError || !language) {
  console.error(
    "Could not find the Korean language row. Run the schema migration first " +
      "(supabase/migrations/0001_initial_schema.sql).",
    langError?.message ?? ""
  );
  process.exit(1);
}

const words = JSON.parse(readFileSync("data/korean_seed.json", "utf8")).map(
  (word) => ({ ...word, language_id: language.id })
);

const BATCH = 500;
let inserted = 0;

for (let i = 0; i < words.length; i += BATCH) {
  const batch = words.slice(i, i + BATCH);
  const { error } = await supabase
    .from("words")
    .upsert(batch, { onConflict: "language_id,frequency_rank" });

  if (error) {
    console.error(`Batch starting at ${i} failed:`, error.message);
    process.exit(1);
  }

  inserted += batch.length;
  console.log(`  seeded ${inserted}/${words.length}`);
}

console.log(`\nDone. ${inserted} Korean words in the database.`);
