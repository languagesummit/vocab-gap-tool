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
5. ✅ Curate glosses beyond rank 200. All 5,897 entries pass
   `scripts/audit-glosses.mjs`; 1,024 are hand-curated, up from 200. Note
   that a clean audit means no rule-detectable fault, not verified accuracy —
   nobody who reads Korean has checked these yet. See
   [GLOSSING.md](GLOSSING.md).
6. ✅ Results page: known-count as a range, breakdown by frequency band and
   part of speech, missed/timed-out word lists, recall speed.
7. ✅ Exam-level reporting (`/levels`): tested vocabulary against TOPIK levels
   1–6 and 국립국어원's graded learner list. See below.
8. ✅ Semantic gap analysis (`/gaps`), by meaning and by part of speech —
   the category × status breakdown, with categories ingested from 한국어 교육
   어휘 내용 개발 (국립국어원 2015) rather than only the hand-curated ones.
9. ✅ Coverage engine — rule-based Korean lemmatiser (`src/lib/korean/`), no
   model and no network. 81.9% of Tatoeba tokens resolve, 35/35 conjugation
   spot checks pass. The shared spine both content features need.
10. ✅ Comprehensible-input scorer (`/read`): paste text → % known, words to
    learn ranked by frequency *within that text*, unresolved tokens shown so
    the denominator stays visible. **Carries the validity caveat below** — the
    number is only as sound as what 2-choice recognition proves.
11. ✅ Browse, filter and export (`/words`): any slice of the list, commonest
    first, exported to Anki as TSV.
12. Grammar as a second track (see "Grammar counts separately" below). Cloze mode — pick which of two Korean words fits a sentence. Tests usage
    rather than recognition, and is the only way to test words that resist a
    one-line gloss (어쩌다). Needs one example sentence per entry, generated at
    build time. Route to it from the recall bands: automatic → done, effortful
    or timed-out → confirm by cloze. Also the most direct answer to the
    recognition-overstates-coverage question below.
13. Reading library, each text pre-scored against your lexicon. Licensing is
    researched and settled — see STATUS.md. 공유마당 offers 200 public-domain
    short stories with no conditions, but they predate the 1933 orthography
    reform and read as colonial-era literary Korean; 공공누리 제1유형 content
    (korea.kr) is contemporary and reusable with attribution, which fits a
    learner far better. Then YouTube discovery by transcript coverage — the
    official API only returns captions for videos you own, and plain fetches
    return 429 from datacenter IPs, so transcript access needs a decision.
14. Image-based MCQ for concrete nouns (after sourcing decision).

## Grammar counts separately, and is never a decision

Settled 2026-08-08. Korean grammar matters more to comprehension than any
individual word does, so the tool has to measure it — but it must not be folded
into the vocabulary count.

- **Two figures, never summed.** A level reads "TOPIK 3 — vocabulary 78%,
  grammar 40%". Both gradings come from the same standard curriculum at the
  same 1급–6급 grain, so the pairing is native to the data rather than inferred.
  A single blended number would hide the commonest shape in Korean learning,
  which is solid vocabulary against weak grammar.
- **Not a user choice.** 336 grammar items against 5,897 words is about 5% of
  the work, so a goal simply contains both: "TOPIK 1 — 795 words and 45 grammar
  points." Adding a decision here buys nothing and costs everyone a fork.
- **Grammar first within a goal, not last.** It is short, so it finishes early
  and the signal arrives when it can still change what you study. Keeping it
  contiguous rather than interleaved also means one switch of test modality
  instead of hundreds.
- **No self-rating step.** Asking someone to estimate their level before testing
  anchors them to a guess and buys nothing the 300-word sample doesn't already
  give, measured rather than declared.

**Grammar must be tested by cloze, not translation.** The source carries no
English meanings at all — the column that looked like one holds Korean function
labels (대조, 의도, 나열), and testing against those would ask whether someone
knows grammatical terminology, which is the exact mistake already fixed for 수
and auxiliary 있다. Writing 336 English glosses by hand would be a confident
guess a learner cannot check.

Cloze avoids inventing anything, because real sentences exist: 203 of the 336
forms appear in the Tatoeba corpus and 158 have five or more sentences,
including -잖아 (39), -거든 (19), -을 텐데 (15) and -자마자 (7). The matching
behind those counts is crude substring search, so it is reliable for
distinctive multi-syllable endings and optimistic for short ones like 만 and 은
that occur inside ordinary words. Expect roughly half the list to be testable
this way, and the rest to need another source.

## Frequency order versus level order

Measured 2026-08-08 against the 69,464 running words of the Tatoeba Korean
corpus, because the question is empirical rather than a matter of taste.

| set | words | text covered |
|---|---|---|
| TOPIK 1 | 795 | 51.9% |
| commonest 795 | 795 | 61.0% |
| TOPIK 1–2 | 1,850 | 65.6% |
| commonest 1,850 | 1,850 | 70.7% |
| TOPIK 1–4 | 4,624 | 76.2% |
| commonest 4,624 | 4,624 | 79.5% |

Level order costs about 9 points of coverage at TOPIK 1, narrowing to 3 by
TOPIK 4. Real, but not disqualifying.

**The disagreement is systematic.** TOPIK 1 carries 462 words frequency would
not reach for thousands of ranks — 편의점, 미용실, 갈비탕, 여덟, 아흔, 이십 —
everyday nouns and numbers, rare on a page and unavoidable in a day. It omits
462 common ones — 수 (r6), 않다 (r11), 등 (r18), 때문 (r31), 대하다 (r24) —
almost all grammar and abstract function words. The two orderings split along
the grammar-versus-concrete-noun axis.

**So neither is simply better, and the metric itself is biased.** Coverage of a
written corpus is the wrong yardstick for words like 편의점 and 여덟: Tatoeba is
crowd-sourced written sentences, so it understates everyday vocabulary and
overstates function words. Treat the 9 points as an upper bound on the real cost.

**Recommend by stage rather than defaulting for everyone.** A beginner should
take TOPIK 1: at 795 words the coverage difference matters less than finishing
something, and the words frequency skips are the ones they need first. Someone
further along should stay on frequency, where their remaining gaps actually are.
Both orderings cannot run at once — a level cannot be called complete until all
of its words are tested, and frequency order reaches the rarest of TOPIK 1
(이십, rank 5,892) only at the very end — so the picker explains what each buys
instead of pretending the choice is free.

## Frequency or corpus — and the ceiling that outranks the question

Measured 2026-08-08 over 69,464 running words of Tatoeba Korean.

| knowing the commonest | covers |
|---|---|
| 100 | 36.7% |
| 1,000 | 63.4% |
| 2,000 | 71.5% |
| 5,897 (all of it) | **81.9%** |

Setting aside names and places, which a reader handles without knowing them as
vocabulary, the realistic ceiling is about **86%**. Comfortable reading needs
95%.

**So the whole list cannot get anyone to comfortable reading, and the ordering
debate is second-order to that.** Frequency versus level versus subject changes
how fast you climb this curve, not where it stops. The last 3,900 words buy ten
percentage points.

This is also the answer to "why can't I read children's books after all this
work". Two things stack:

1. **The list is too small.** 5,897 lemmas is the common core, not a reading
   vocabulary. The research figure for unassisted reading is far higher.
2. **Frequency is always frequency *in some corpus*, and this one is adult
   written Korean** — news, academic prose, novels. Children's books carry
   onomatopoeia, animal and plant names and simple narrative verbs that a
   general corpus underweights, so the words blocking an elementary chapter book
   may sit past rank 4,000 or be absent entirely. Climbing the list may never
   reach them.

**What follows for the product.** The frequency census is the map; scoring a
specific text is the engine. One book needs a few hundred words rather than
thousands, and they are the ones that actually stand between the reader and it —
which is the corpus approach applied to a target of one, and it beats any global
ordering for a specific goal. `/read` now states the measured ceiling rather
than letting the list imply sufficiency.

**Unmeasured, and the most valuable thing to acquire next:** a Korean
children's-literature corpus. Everything above about children's books is
reasoning from the composition of the NIKL corpus, not from measurement, and it
should be checked before being relied on.

## Open questions

- **Does recognition testing overstate coverage?** The 95/98% comprehension
  thresholds may have been validated against a deeper level of word knowledge
  than 2-choice recognition. If so, the scorer in phase 10 reads optimistic
  and needs recalibrating before anything is built on it. Now that the scorer
  exists this is live rather than theoretical, and cloze mode (phase 12) is
  the cheapest way to find out: compare recognition-known against cloze-known
  on the same words.
- **Do the coverage thresholds transfer to Korean?** They come mostly from
  English research, where "word family" is a cleaner unit than in an
  agglutinative language.
- **L1 vs L2 study at intermediate level.** Working hypothesis: difficulty
  reading authentic Korean at TOPIK 4 is a coverage threshold effect, not a
  learning-style one — below the threshold, monolingual input isn't
  comprehensible enough to learn from. If true, this tool measures exactly
  the thing that answers the question, and the results page should report
  distance to the next threshold rather than a bare word count.

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
