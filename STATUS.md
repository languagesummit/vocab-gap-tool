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

## Data worth knowing about

Every one of the 5,897 entries carries a `topik_level` (A/B/C) from the source
list, and 4,459 carry a NIKL level (초급/중급). These came in with the original
ingest and were being kept as provenance in `notes` — nothing read them until
now.

The important thing they reveal: **TOPIK level and frequency rank disagree a
lot.** Testing densely from rank 1 upward does not walk the TOPIK levels in
order.

| TOPIK level | words | rank range (median) |
|---|---|---|
| A | 960 | 1 – 5,895 (1,050) |
| B | 2,081 | 18 – 5,897 (2,301) |
| C | 2,856 | 69 – 5,896 (3,770) |

Share of each level covered, by how far the frequency frontier has been tested:

| frontier | A | B | C |
|---|---|---|---|
| 1,000 | 49% | 18% | 5% |
| 2,000 | 68% | 41% | 17% |
| 3,000 | 78% | 66% | 31% |
| 4,000 | 84% | 77% | 56% |

Clearing the first thousand ranks leaves half the beginner list still unasked.

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
