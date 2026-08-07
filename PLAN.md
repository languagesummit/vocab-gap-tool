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
5. Curate glosses beyond rank 200 (5,697 rows still flagged `needs_review`).
6. ✅ Exam-level reporting: tested vocabulary placed against the TOPIK
   vocabulary lists and 국립국어원's graded learner list. See below.
7. Pre-generated constrained-definition test mode.
8. Analytics: category × status heatmap, coverage breakdown.
9. Comprehensible-input scorer (paste text → % known, 95–98% sweet spot).
   Blocked on a Korean lemmatizer: the word list is lemma-based (먹다) but real
   text is inflected (먹었어요/먹고/먹는), so surface forms have to be reduced
   before they can be matched. That lemmatizer is the actual build; a YouTube
   transcript is just one source feeding it, and fetching those is separately
   unreliable from datacenter IPs, so pasting text has to work regardless.
10. Image-based MCQ for concrete nouns (after sourcing decision).

## The two proficiency gradings

The source TSV combines two published lists, and **its header labels them the
wrong way round** — the column called `topik_level` holds the NIKL grade and
the one called `nikl_level` holds the TOPIK tier. `scripts/levels.mjs` decodes
them by value rather than by name and is the single place that knows this.

- **NIKL grade** — A/B/C from 국립국어원's 한국어 학습용 어휘 목록 (조남호,
  2003), graded by panel. Ours: 960/2,081/2,856 against the published
  982/2,111/2,872; the shortfall is rows the parser drops for having no
  frequency rank. A=초급, B=중급, C=고급.
- **TOPIK tier** — 초급/중급 from the 2015 TOPIK list, i.e. TOPIK I (exam
  levels 1–2) and TOPIK II (levels 3–6). There is no third tier: the 2014
  reform merged 초급/중급/고급 into two papers. 1,438 words are on neither list.

**TOPIK's six levels cannot be scored from this data** — the exam list stops at
two tiers. Crossing the tier with the NIKL grade splits TOPIK II into a lower
(B ≈ levels 3–4 ≈ CEFR B1–B2) and an upper half (C ≈ levels 5–6 ≈ C1–C2), which
is the closest available to per-level detail. That crossing is an alignment
between two independent gradings, not an official mapping, and the UI is
required to label it as approximate wherever it appears.

Exam membership decides the band first and the grade only subdivides, so a
TOPIK I word NIKL graded advanced still counts as TOPIK I vocabulary.

TOPIK level ↔ CEFR, the correspondence used throughout: 1→A1, 2→A2, 3→B1,
4→B2, 5→C1, 6→C2.

Worth knowing: **frequency rank and exam level disagree badly.** 안녕 is rank
5,018 and 냉장고 is 2,987, both beginner vocabulary. Testing densely from rank 1
therefore walks past a lot of exam vocabulary — at a frontier of 1,200, 59% of
TOPIK I is still unasked. The levels page reports that gap explicitly rather
than letting a percentage of a small sample stand in for knowledge.

## Regenerating the word data

```
npm run data:parse   # raw NIKL TSV  -> data/korean_words.json
node scripts/join-glosses.mjs data/korean_words.json <kengdic.tsv> data/korean_words_glossed.json
npm run data:build   # + curated overrides -> data/korean_seed.json
npm run data:static  # -> public/korean.json (the guest-mode word list)
npm run db:seed      # -> Supabase (needs SUPABASE_SERVICE_ROLE_KEY in .env.local)
```

`data/korean_seed.json` still carries the swapped level key names, because
rebuilding it needs kengdic and that isn't in the repo. Nothing reads those
keys directly — `scripts/levels.mjs` accepts either spelling — so the file is
correct in substance and only its key names are legacy. A future rebuild via
`data:parse` writes the honest names (`nikl_grade`, `topik_tier`).
