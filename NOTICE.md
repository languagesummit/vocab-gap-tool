# Notices and attribution

Everything the app ships that came from someone else, what its licence is, and
what that licence asks of us. Kept complete rather than convenient — if a source
is used anywhere in the data pipeline it belongs here, whether or not its
contribution is currently visible on screen.

The user-facing version of this lives at `/credits`.

## Summary

| Source | Contributes | Licence | What we owe |
|---|---|---|---|
| [kengdic](https://github.com/garfieldnate/kengdic) | English glosses for ~5,700 entries | **MPL 2.0** or LGPL 2.0+ (dual; we take MPL 2.0) | Notice, and source form available under MPL — see below |
| 국립국어원 한국어 학습용 어휘 목록 (조남호, 2003) | A/B/C difficulty grades | 공공누리 제1유형 | Attribution |
| 국립국어원 국제 통용 한국어 표준 교육과정 적용 연구 4단계 (2017) | TOPIK levels 1–6 | 공공누리 제1유형 | Attribution |
| 국립국어원 한국어 교육 어휘 내용 개발 4단계 (2015) | Semantic categories (대범주/소범주) | 공공누리 제1유형 | Attribution |
| TOPIK 어휘 목록 (한국어능력시험, 2015) | TOPIK I / II tier | Believed 공공누리; **not yet confirmed** | Attribution, pending confirmation |
| 국립국어원 국제 통용 한국어 표준 교육과정 4단계 — 문법 sheet (2017) | 336 grammar points graded 1급–6급 | 공공누리 제1유형 | Attribution |
| [Tatoeba](https://tatoeba.org/) | 15,868 Korean sentences — the corpus the lemmatiser is measured against | CC BY 2.0 FR | Attribution |
| [combined_korean_vocabulary_list](https://github.com/julienshim/combined_korean_vocabulary_list) | The merged NIKL + TOPIK TSV we ingested | No licence file | Credited as the intermediate; the underlying data is the two government lists above |

## Not sourced — written for this project

Listed apart because presenting editorial work as published data would be the
most misleading thing here. The rewritten English meanings, the grammar patterns
for bound words, and the English names given to the subject categories were all
produced for this project with AI assistance. They carry no authority beyond it
and no Korean speaker has reviewed them. The lemmatiser is likewise written
here, rule-based, with its accuracy measured against Tatoeba rather than
asserted.

## kengdic and MPL 2.0 — the one with real obligations

The glosses in `data/korean_seed.json` and `public/korean.json` are derived from
kengdic, which is dual-licensed MPL 2.0 or LGPL 2.0+. We take **MPL 2.0**, being
far the better fit for data; LGPL is written for linked libraries.

What that means in practice:

- **It does not spread to the application.** MPL 2.0 is file-level copyleft.
  §3.3 explicitly allows Covered Software to be combined into a Larger Work
  under other terms. The Next.js app, the analysis code and the UI are all
  unaffected — only the kengdic-derived data files are Covered Software.
- **The derived data files stay under MPL 2.0**, and their source form must
  remain available under it. This repository being public satisfies that; if it
  ever goes private, the gloss data has to be published separately.
- **Notices must be retained.** JSON has no comment syntax, so per MPL 2.0
  Exhibit A the notice lives in this file and in `LICENSES/MPL-2.0.txt`, which
  is where a recipient would look.

Files currently covered: `data/korean_seed.json` and `public/korean.json`, in
respect of their `gloss` fields only.

As hand-curated glosses replace the automatic join, the kengdic-derived share
shrinks — 200 of 5,897 entries are hand-written today. It does not reach zero
until every `needs_review` row has been rewritten, and the obligation stands
until then.

## 공공누리 제1유형 (Korea Open Government License, Type 1)

All 국립국어원 material used here is published under 공공누리 제1유형, verified on
the source pages. Type 1 permits commercial use and modification, and asks only
that the source be stated. No share-alike, no restriction on our own licensing.

Attribution is given at `/credits` and in the table above.

## Not yet confirmed

The TOPIK 2015 vocabulary list reached us through the combined repository rather
than directly from 한국어능력시험, so its terms have not been read at source.
Treated as attribution-required. **Confirm before any public launch.**

Nothing here has been reviewed by anyone qualified to give legal advice.
