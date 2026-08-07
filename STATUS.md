# Status

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

`/levels` — tested vocabulary placed against both gradings: TOPIK I/II coverage
with honest known/unsure ranges, the finer crossed bands, how much of each tier
has never been asked, and the NIKL A/B/C view. Verified end-to-end against a
simulated 1,200-word progress file; tier counts sum to the seeded total and the
bands sum to 5,897.

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
