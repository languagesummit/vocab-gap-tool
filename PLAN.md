# Vocab Frequency Tracker — Project Plan

A web app for exhaustively testing and tracking foreign-language vocabulary
knowledge by frequency rank. The known-word list is the core asset everything
else builds on (gap analysis, comprehensible-input scoring, and eventually
content recommendation to fill gaps).

## Locked decisions

- **Stack**: Next.js (App Router, TypeScript, Tailwind) on Vercel free tier;
  Supabase free tier for auth + Postgres. Zero runtime LLM calls — all LLM
  work (tagging, definition generation) happens at build time and is committed
  as data.
- **Auth**: passwordless only. Google OAuth primary (free/unlimited), magic
  link email secondary (Supabase free tier rate-limits built-in email).
- **Knowledge states**: `known` / `unsure` / `unknown`; untested = no row in
  `user_words`. Users can retest or manually edit any word's status.
- **Per-word testing only** (no batch grid). 3-second timer per word
  (configurable in user settings). Outcome mapping:
  - correct within timer → known
  - wrong answer or "I don't know" → unknown
  - timer expires with no answer → unsure
- **Test design principle**: shortest possible proof of knowledge. 5,000 words
  must not take months.
- **Sense-level word entries**: a lemma with multiple meanings (e.g. Korean 일
  = "day" / "work") appears as separate entries at their own frequency ranks.
- **Korean first.** Lemma-based frequency list from a known-good source —
  target: National Institute of Korean Language (국립국어원) frequency data,
  which is lemma-based and numbers homographs. Never surface-form lists
  (먹어/먹어요/먹었어요 must all be one lemma 먹다).
- **Definitions pre-generated from earlier ranks**: each word's target-language
  definition/cloze uses only words of lower rank (more frequent). Definition
  mode unlocks for a word once the user's tested frontier covers its
  vocabulary. Fallback: translation-based multiple choice (no dependencies).
- **Images** for concrete nouns: sourcing decision deferred (open datasets vs.
  batch-generated images, curated before import).

## Schema (Supabase Postgres, RLS on all user tables)

- `languages` — code, name.
- `words` — language_id, frequency_rank, lemma, sense_gloss, part_of_speech,
  semantic_category, concreteness, JSONB extras. Unique (language_id, rank).
- `user_words` — (user_id, word_id) → status enum, how earned (test type),
  updated_at. No row = untested.
- `test_events` — append-only answer log (enables retesting, stats, undo).
- `user_language_settings` — per-user frontier rank, timer duration, etc.
- `word_definitions` — pre-generated constrained definitions/cloze, with the
  max rank of vocabulary used (gates when the mode unlocks).

## Build phases

1. ✅ Scaffold Next.js app, Supabase libs, Vercel auto-deploy from GitHub.
2. ✅ Auth (magic link; Google OAuth behind `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH`)
   + protected app shell.
3. ✅ Schema migration + Korean word list ingest. 5,897 sense-level entries
   from the NIKL/TOPIK frequency list, glosses joined from kengdic (99.1%
   coverage), top 200 ranks hand-curated with categories.
4. ✅ Per-word test UI: translation MCQ, 3s timer, keyboard 1–4 and space,
   frontier progress, resumable sessions.
5. Curate glosses beyond rank 200 (5,644 rows still flagged `needs_review`).
6. Pre-generated constrained-definition test mode.
7. Analytics: category × status heatmap, coverage breakdown.
8. Comprehensible-input scorer (paste text → % known, 95–98% sweet spot).
9. Image-based MCQ for concrete nouns (after sourcing decision).

## Regenerating the word data

```
npm run data:parse   # raw NIKL TSV  -> data/korean_words.json
node scripts/join-glosses.mjs data/korean_words.json <kengdic.tsv> data/korean_words_glossed.json
npm run data:build   # + curated overrides -> data/korean_seed.json
npm run db:seed      # -> Supabase (needs SUPABASE_SERVICE_ROLE_KEY in .env.local)
```
