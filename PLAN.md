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
7. ✅ Semantic gap analysis (`/gaps`). Category tagging ingested from 한국어
   교육 어휘 내용 개발 (국립국어원 2015) — 14 major categories over 139
   subcategories, 3,151 of 5,897 words tagged, up from 200. This is the core
   feature: conversational vocabulary is lumpy, and holes in colours or animals
   sit at no particular frequency rank.
8. Pre-generated constrained-definition test mode.
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

- **Curriculum level 1–6** — from 국제 통용 한국어 표준 교육과정 적용 연구
  (4단계), 국립국어원 2017: 10,635 words graded 1급–6급 (735 / 1,100 / 1,655 /
  2,200 / 2,365 / 2,580). This is what makes levels 3, 4, 5 and 6 separable.

TOPIK itself publishes no per-level vocabulary list — only the two-tier one.
The standard curriculum was built against TOPIK's level descriptors, so a level
means "what a syllabus aiming at that TOPIK level teaches", which is enough to
name a level but is not the exam board speaking. Every view says so.

The curriculum numbers homographs the same way the frequency list does
(가격02), so the join is sense-aware: 5,052 of 5,897 words get a level — 649
sense-exact, 4,147 unambiguous because every sense of the lemma shares a level,
256 ambiguous (lowest taken, since a common word whose rare sense is graded
higher should surface at the level it's first met). 845 are ungraded; 3 of
those still carry a TOPIK tier and are placed by paper only.

TOPIK level ↔ CEFR, the correspondence used throughout: 1→A1, 2→A2, 3→B1,
4→B2, 5→C1, 6→C2.

**Levels 5 and 6 are barely testable from the current list.** They hold only
304 and 124 words here, because the curriculum's advanced vocabulary is mostly
rarer than the 5,897-word frequency list reaches. Assessing them properly needs
the word list extended with the curriculum's own advanced entries. The levels
page reports reach separately from coverage so a 5% sample never reads as a
grade.

## Frameworks are data, not code

Nothing in the core knows what TOPIK is. `src/lib/frameworks/` defines a
framework as a list of levels, optional groups (an exam setting one paper
across several levels), provenance and caveats; `src/lib/local/levels.ts`
reports against any of them; words carry `lv: { <framework>: <level> }`.

Adding JLPT N5–N1, HSK 1–9 or DELE is a definition file plus a level per word —
no change to the reporting code or the page. A language with no framework
sourced simply doesn't offer the view. Finding a trustworthy graded list per
language is the real work, and it's a sourcing problem rather than an
engineering one.

Korean currently has two: TOPIK (exam, 6 levels, 2 papers) and the 국립국어원
등급 (difficulty, 3 grades). They were arrived at independently, so showing both
is useful — where they disagree, that's signal.

Worth knowing: **frequency rank and exam level disagree badly.** 안녕 is rank
5,018 and 냉장고 is 2,987, both beginner vocabulary. Testing densely from rank 1
therefore walks past a lot of exam vocabulary — at a frontier of 1,200, only
53% of curriculum level 1 has been asked. The levels page reports reach
alongside coverage rather than letting a percentage of a small sample stand in
for knowledge.

## Regenerating the level data

```
node scripts/parse-curriculum-levels.mjs   # curriculum TSV -> data/korean_levels.json
npm run data:static                        # joins levels into public/korean.json
```

`data/korean_curriculum_raw.tsv` was extracted from the published xlsx
(국립국어원 report 932, "어휘, 문법 등급 목록"), one row per graded word with
whitespace collapsed so every row is a single line.

## Regenerating the word data

```
npm run data:parse       # raw NIKL TSV  -> data/korean_words.json
node scripts/join-glosses.mjs data/korean_words.json <kengdic.tsv> data/korean_words_glossed.json
npm run data:build       # + curated overrides -> data/korean_seed.json
npm run data:levels      # curriculum TSV -> data/korean_levels.json
npm run data:categories  # category TSV   -> data/korean_categories.json
npm run data:static      # joins all three -> public/korean.json (guest mode)
npm run db:seed          # -> Supabase (needs SUPABASE_SERVICE_ROLE_KEY in .env.local)
```

`data:static` needs the two join files, so run `data:levels` and
`data:categories` before it on a fresh clone.

`data/korean_seed.json` still carries the swapped level key names, because
rebuilding it needs kengdic and that isn't in the repo. Nothing reads those
keys directly — `scripts/levels.mjs` accepts either spelling — so the file is
correct in substance and only its key names are legacy. A future rebuild via
`data:parse` writes the honest names (`nikl_grade`, `topik_tier`).
