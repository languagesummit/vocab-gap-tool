# Status

## Pick up here

Session paused 2026-08-07. Branch `claude/korean-topik-features-fqcli1`, pushed,
two commits past `main`. No PR opened. Working tree clean, lint and build pass.

**Open decision, and the important one: the levels page makes a readiness claim
it can't support.** It says "your vocabulary holds up through Level N", and
that's a prediction about an exam that also tests grammar, listening and
writing — not something a word count can settle. Passing TOPIK I is not a
matter of knowing 1,200 words, and a learner who knows 1,200 words may well
not pass. The counter-consideration is that 1,200 words is genuinely a lot and
the number shouldn't be made to feel like nothing.

There's a second edge to the same problem: everybody knows 안녕. It counts as
Korean you know, and it is also nearly worthless as evidence about a test you
won't meet it on. Coverage of the language and readiness for an exam are
different questions, and right now one is standing in for the other.

Options when picking this back up:

1. **Cut the verdict, keep the measurement.** Drop `clearedThrough()` and the
   "holds up through Level N" line; keep per-level coverage, reach, and the
   never-asked lists. The page becomes "here is what you know, by level" and
   claims nothing about sitting the exam. Smallest change, and closest to what
   the data actually supports.
2. **Keep a verdict but weaken it** to something like "level N vocabulary is
   not what's holding you back", which is a claim about a floor rather than a
   prediction.
3. **Leave as is** and lean on the caveat card already on the page.

Leaning 1. Worth knowing for context: the owner has sat TOPIK II twice and
never TOPIK I, and reckons the honest advice is to just take a practice test.

**Also open, none started:** Anki/TSV export of a level's never-asked words
(data is already computed and listed per level); the 12,000-word semantic
category ingest; the Korean lemmatizer that gates the comprehensible-input
scorer; extending the word list so levels 5–6 are testable at all.

**Still stranded:** the gloss curation on the other machine — see below.

Running notes on where the project actually stands, kept because work happens
across several machines and sessions. `PLAN.md` holds the design decisions and
the roadmap; this file holds the current state and anything half-finished.

Last updated: 2026-08-07, from a phone session.

## Where the code is

`main` is at `98239af` — "Split known words by how readily they came back",
committed 2026-08-07 13:03. That is also the only branch on the remote.

Everything through build phase 4 in `PLAN.md` is done and pushed:

- Next.js app, Supabase auth (magic link; Google behind a flag), Vercel deploy.
- Korean word list ingested — 5,897 sense-level entries from the NIKL/TOPIK
  frequency list.
- Per-word test UI: translation MCQ, configurable timer, 2–4 choices,
  keyboard 1–4 and space, undo, pausable sessions, works on a phone.
- Guest mode: progress in `localStorage`, JSON export/import, no account.
- Results page: known/unsure/unknown split, frequency bands, part of speech,
  and known words split by recall speed.

## Known gap: the glossing pass is unaccounted for

A session on another machine was working on **phase 5 — curating glosses beyond
rank 200**. None of that work is on the remote: GitHub has only `main`, and
`main` has no glossing commits after `81a895d`. That machine died mid-session,
so the work is presumed to be sitting uncommitted in its working tree.

Current state of the data as committed:

| | entries |
|---|---|
| curated (ranks 1–200, hand-checked) | 200 |
| flagged `needs_review` (auto-joined from kengdic) | 5,697 |

So if that machine comes back, **check `git status` and `git stash list` there
before anything else** — the diff to look for is in `data/korean_curated_glosses.json`
(hand-written overrides, keyed by dense frequency rank) and possibly
`data/korean_seed.json` / `public/korean.json` as rebuilt outputs. Those are
generated, so the curated-glosses file is the one that matters; the other two
can be regenerated with `npm run data:build && node scripts/build-static-wordlist.mjs`.

Nothing in this session touched glossing, to avoid creating a conflicting
second version of the same work.

## The level columns were mislabelled

Every entry carries two proficiency gradings that came in with the original
ingest and sat unread in `notes`. **The source TSV's header names them the
wrong way round**, which is worth knowing before touching them:

- The column called `topik_level` holds **A/B/C = 960/2,081/2,856**. That is
  국립국어원's 한국어 학습용 어휘 목록 (조남호, 2003), published as
  982/2,111/2,872 — A=초급, B=중급, C=고급. Ours run slightly short because
  the parser drops rows with no frequency rank.
- The column called `nikl_level` holds **초급/중급 = 1,734/2,725, no 고급, 1,438
  blank**. That is the 2015 TOPIK list: TOPIK I (exam levels 1–2) and TOPIK II
  (levels 3–6). Two tiers is the right shape — the 2014 reform merged
  초급/중급/고급 into two papers.

So A/B/C was never TOPIK. `scripts/levels.mjs` decodes both by value rather
than by name and is the only place that needs to know this.

TOPIK's six levels **cannot** be scored from this data; the exam list stops at
two tiers. Crossing tier with grade splits TOPIK II into a lower and upper half
— the closest available to per-level detail, and labelled approximate in the UI.

`data/korean_seed.json` still has the legacy key names, deliberately: rebuilding
it needs kengdic, which isn't in the repo, and leaving it untouched keeps a
2.8 MB diff away from the file the other machine is most likely holding.

**Frequency rank and exam level disagree badly.** 안녕 is rank 5,018, 냉장고 is
2,987 — both beginner vocabulary. Share of each TOPIK tier reached, by frontier:

| frontier | TOPIK I | TOPIK II |
|---|---|---|
| 1,000 | 36% | 9% |
| 2,000 | 57% | 27% |
| 3,000 | 70% | 47% |
| 4,000 | 79% | 67% |

Clearing the first thousand ranks leaves nearly two thirds of TOPIK I unasked.
The levels page reports that gap rather than quoting a percentage of a small
sample as though it were knowledge.

## What this session added

**`/levels`** — tested vocabulary placed against whatever proficiency
frameworks a language has. Korean has two: TOPIK (6 levels, 2 papers) and the
국립국어원 등급 (3 difficulty grades).

**Real levels 1–6.** The two-tier TOPIK list can't separate a level-3 word from
a level-6 one, so the first cut of this page inferred a lower/upper split and
badged it `approx`. That's now replaced by 국제 통용 한국어 표준 교육과정
(국립국어원 2017) — 10,635 words graded 1급–6급, downloaded from the published
xlsx and committed as `data/korean_curriculum_raw.tsv`. It numbers homographs
the same way the frequency list does, so the join is sense-aware: **5,052 of
5,897 words carry a real level**, and the `approx` badge is gone.

**Frameworks are data.** `src/lib/frameworks/` holds the definitions; nothing in
the reporting code or the page knows what TOPIK is. Adding JLPT or HSK is a
definition file plus a level per word.

**Levels 5 and 6 are barely covered** — 304 and 124 words, because the
curriculum's advanced vocabulary is rarer than this 5,897-word list reaches.
The page reports *reach* (how much was asked) separately from *coverage* (how
much of that came back known) and refuses to grade a level sampled under 50%.
Extending the word list with the curriculum's advanced entries is the fix, and
isn't done.

Verified end-to-end against a simulated 1,200-word progress file: level totals
plus ungraded plus tier-only reconcile to exactly 5,897.

## Where the source data comes from

All published by 국립국어원 and downloadable without an account. Recorded here
because this session's container is ephemeral — anything not committed is gone
when it's reclaimed, and hunting these down again is the slow part.

| what | page | file |
|---|---|---|
| 6-level vocabulary, 10,635 words 1급–6급 — **committed** as `data/korean_curriculum_raw.tsv` | [report 932](https://www.korean.go.kr/front/reportData/reportDataView.do?mn_id=45&report_seq=932) | `157339df-1904-443a-b1a9-d6d34578ba93.xlsx` ("어휘, 문법 등급 목록") |
| 12,019 words with semantic categories (대범주/소범주) and 주제·기능 tags — **not committed**, downloaded and inspected only | [report 882](https://www.korean.go.kr/front/reportData/reportDataView.do?mn_id=207&report_seq=882) | `d893a36e-5103-4ba1-85ba-a516131440a8_0.xlsx` |
| A/B/C graded learner list (조남호 2003), already folded into the seed | [etc_seq 71](https://www.korean.go.kr/front/etcData/etcDataView.do?mn_id=46&etc_seq=71) | — |

Download pattern for the two xlsx files:
`https://www.korean.go.kr/common/download.do?file_path=reportData&c_file_name=<name>&o_file_name=x.xlsx`

The second one is the interesting unused one: it would take semantic category
coverage from 200 words to about 12,000, which is what the category gap
analysis in `PLAN.md` is currently starved of. Its own levels are only 3-tier,
so it adds nothing to the level work.

Licensing wasn't checked. 국립국어원 material is generally released under the
Korea Open Government License, which permits reuse with attribution, but
confirm the terms before this goes anywhere public.

## Regenerating the word data

```
npm run data:parse   # raw NIKL TSV  -> data/korean_words.json
node scripts/join-glosses.mjs data/korean_words.json <kengdic.tsv> data/korean_words_glossed.json
npm run data:build   # + curated overrides -> data/korean_seed.json
node scripts/build-static-wordlist.mjs   # -> public/korean.json (guest mode)
npm run db:seed      # -> Supabase (needs SUPABASE_SERVICE_ROLE_KEY in .env.local)
```

`kengdic.tsv` is not in the repo — it is a third-party dictionary dump fetched
separately, which is why `join-glosses.mjs` takes it as an argument.
