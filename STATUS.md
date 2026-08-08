# Status

## What this project is for

Settled 2026-08-07, and it reframes the roadmap:

**This is not exam prep.** The point is to build an accurate map of your actual
lexicon, and then to find material you can genuinely read. Finding TOPIK study
material was never the hard part; knowing which words you really have is.

**The frequency list is a measuring stick, not a curriculum.** "How does my
Korean compare against a frequency list" is an interesting question and a good
way to run an exhaustive census. It is not a claim that you should learn words
in that order, and real reading doesn't work that way.

**The interesting gaps are semantic, not positional.** Vocabulary picked up
through conversation comes out lumpy — strong on daily life, blank on colours,
animals, and other basic concrete pockets. Those holes aren't at any frequency
rank, so only a meaning-based tagging can find them. This is the core feature,
not a nice-to-have.

**TOPIK stays in.** It's data, and it can always come out later. The readiness
worry below is still worth acting on, but it isn't a reason to remove the view.

## Pick up here

### From the first real self-test (2026-08-08)

Done this round:

- **Intro screen before any testing.** The honesty rule is the headline and is
  stated first: if you would be guessing at all, press "I don't know", because a
  lucky guess recorded as known corrupts every number afterwards including the
  study list. Plus: go fast, commonest words first, not knowing a common word is
  fine, expect words you *thought* you knew, and how undo works.
- **Scoped goals.** Testing no longer means all 5,897 words or nothing. Choose
  300 words (~15 min), TOPIK 1 (795), TOPIK 2 (1,850), TOPIK 4, or everything,
  each showing what's left and a rough time. Changeable from the pause screen.
- **Test from a text.** `/read` now offers "Test me on these N words", which
  sets the goal to exactly the unknown words of that article and drops you into
  a session. This is the loop that makes the tool useful before the census is
  finished.
- **"← Back" is now "← Undo last"**, with a tooltip saying it takes back the
  last answer and re-asks the word.
- **Naming**: "Exam levels" → "TOPIK coverage", "What you're missing" → "My weak
  spots", "Browse & export" → "Word list & Anki", "Can I read this?" → "Score a
  text". On `/gaps`, "By meaning" → "By subject" and "By part of speech" → "By
  word type", **with word type now the default** — "I'm getting auxiliaries
  wrong" is the more immediately useful cut, and it verifies as the weakest.
- **English beside every Korean category**, wherever it appears: 동식물 "animals
  & plants", 개념 "abstract concepts", 인간 "people & the body". A gap report you
  can't read defeats its own purpose.
- Trimmed the wordiest copy on `/gaps`.

Round two:

- **All 139 subcategories now carry English**, not just the 14 majors, and the
  gloss sits as subtext *underneath* the Korean rather than trailing after it.
  This tool is for people learning Korean; a gap report saying you are weak at
  용모 helps nobody who is still learning what 용모 means.
- **Test any slice.** `/words` filtered to a category, subject, word type, TOPIK
  level or search now offers "Test me on these N words" — untested ones only,
  with a time estimate. Pull up 동물류, see all 32, test the 26 you've never been
  asked. Same mechanism as the from-a-text loop.
- **TOPIK 3** added to the goal list.

Round three — Anki deck building:

- **Decks are built from several slices, not one filter.** Filter, "Add these N
  words", change the filters, add again. Colours + animals + jobs + the slow
  ones come out as a single deck. Overlap is deduplicated, so a word in two
  slices exports once; verified on a 4-slice build that 401 raw became 396
  unique with zero duplicate fronts in the file.
- **Filter by recall speed.** "Slow — worth drilling" selects known words that
  took a long time. They count as known and still break reading, which makes
  them exactly the flashcard pile, and they were previously unreachable.
- Every axis is now exportable: status (didn't know / timed out / never asked),
  recall speed, subject, word type, TOPIK level, free-text search — and the
  unknown words of a scored text, via a button on `/read`.
- The basket lives in localStorage, so it survives navigating away and back.

Round four — grammar patterns asked as patterns:

Found by real self-testing, and it was a validity bug rather than a data one.
수 was marked unknown by someone who uses -(으)ㄹ 수 있다 daily; auxiliary 있다
by someone fluent in -고 있다. Both answers were honest. Neither word exists as
a standalone item in a learner's head — 수 alone means nothing usable, and its
gloss "possibility" is a dictionary abstraction over a construction. The old
prompt made it worse by showing the hint "auxiliary", which is the part of
speech, not a clue.

So asking "do you know 수" tested whether someone had studied Korean grammar
*terminology*, not whether they could use the language.

51 bound entries now show the construction instead: `-(으)ㄹ 수 있다 / 없다`,
`-고 있다`, `-아/어 보다`, `-지 않다`. Counters get a numeral — `한 개`, `두 명` —
because that is how anyone meets them. The answer moved with the question: the
correct option for `-(으)ㄹ 수 있다` is now "can / cannot", not "possibility",
since asking about the pattern and answering about the bare noun would be
incoherent. Verified across all 51 that both the form and its answer render.

`/results` offers to re-ask any of these that were answered under the old
prompt, because those answers judged a different question.

Ordinary words are untouched — for them the bare lemma *is* the question.

Still open:

- **`/read` has no sample text**, so it opens on an empty box.
- **The pattern list stops at rank ~700.** 163 bound entries exist in total;
  the 51 curated are the frequent ones. The rest still show bare.
- **A built-in flashcard reviewer** is the eventual goal; Anki export is the
  stopgap.
- **Commercial framing.** If this ever competes with LingQ, the difference to
  lead with is that LingQ counts word *forms* — Korean inflection inflates its
  numbers badly, which is why it felt useless — while this is lemma-based and
  measures by testing rather than by self-declaration. It can also name words
  you have never encountered, which LingQ structurally cannot.

Branch `claude/korean-topik-features-fqcli1`, pushed. Working tree clean, lint
and build pass. No PR opened.

**`/words` — browse, filter, export.** Any slice of the list (category, subject,
part of speech, TOPIK level, status, free-text search), always ordered
commonest-first, with status and recall confidence per word. Frequency stays
the ordering inside every slice because that's what "learn the most useful
animals first" means; the filters decide *which* words, not what order.

Anki export sends whatever is currently filtered, as TSV with Anki's own import
directives in the header, either direction (Korean→English or English→Korean).
Category, subject, part of speech, level, rank band, status and recall speed all
travel as tags, so a deck can be re-sliced after import. Verified end-to-end:
the file Anki receives has correct column counts and matches the on-screen
selection exactly.

**The lemmatiser and `/read` — "can I read this?"** Paste Korean, get the share
you already know, the words you'd need ranked by how often they appear in *that*
text, and an explicit list of what couldn't be recognised.

Rule-based and deterministic — no model, no network, nothing leaves the browser.
It works by generate-and-match rather than analysis: every lemma's surface stems
are generated once into an index (16,058 forms from 5,897 words) and tokens are
matched against that. Handles ㄷ/ㅂ/ㅅ/르/ㄹ/ㅎ irregulars, 아/어 fusion, past
tense, honorifics, particle stacking, plural 들, contractions (난, 그걸, 제가)
and linking consonants (갑니다, 할까요).

Measured, not assumed: **35/35 spot checks**, and **81.9% of 69,464 tokens**
across the 15,868-sentence Tatoeba corpus resolve to a lemma. The bulk of the
remainder is proper nouns — 톰, 메리, 프랑스어, 보스턴 — which a 5,897-word
frequency list correctly does not contain.

Three bugs worth remembering, all caught by measuring rather than reading:

- `fuse()` prepended the stem head to a result that already contained it, so
  every multi-syllable vowel-final verb generated nonsense (기다리 → 기다기다려).
  Invisible on one-syllable stems, which is why the spot checks passed at first.
- A blunt string replace stripped `"니다"` out of the linking table as well as
  the endings list, silently breaking every -ㅂ니다 form.
- Ambiguous tokens were resolved by whichever path matched first, turning
  갈 거예요 ("will go") into 갈다 ("to plough"). Both readings are now computed
  and the more frequent wins.

Scores are reported over tokens that *resolved*, with unresolved ones shown
separately, so the denominator is visible. Untested words count against the
score deliberately — assuming in the user's favour would inflate every number.

**Not built, asked for: sample articles on `/read`.** The page opens on an empty
textarea, which shows a new user nothing. The fix is a few 공공누리 제1유형
articles shipped as committed data with a "try one of these" picker — that tier
permits redistribution with attribution, unlike commercial news.

Started and stopped to merge instead, with one finding worth keeping:
`https://www.korea.kr/rss/policy.xml` returns **404** — that feed path is wrong
or retired, so the right endpoint still has to be found. Committed samples are
the better first move anyway: no fetch to fail, no server route, works offline,
and the licence obligation is discharged once at commit time rather than per
request. Live fetching is the follow-on, and needs a server route since CORS
blocks the browser from reading another origin.

**Next up, and asked for explicitly: improve the testing experience itself.**
Underspecified so far — worth pinning down what specifically grates before
rebuilding anything. Candidates visible in the code: the timer default, the
distractor quality (drawn from ±400 ranks and part-of-speech matched — worth
re-checking now the glosses are curated, since the old ambiguity may be gone),
and the fact that testing
only ever walks frequency order, so you can't say "just test me on colours"
even though the app now knows which words those are.

**Attribution is done, with one gap.** Audited every source the pipeline uses;
see `NOTICE.md` for the full table and `/credits` for the user-facing version.
The finding that mattered: **kengdic is copyleft** — dual MPL 2.0 / LGPL 2.0+,
and roughly 5,700 of the 5,897 glosses derive from it. We take MPL 2.0. It is
file-scoped, so the app is unaffected, but `data/korean_seed.json` and
`public/korean.json` stay under MPL and their source form must stay available
under it — fine while this repo is public, a problem the day it isn't. All
국립국어원 material is 공공누리 제1유형, verified on the source pages: commercial
use and modification allowed, attribution required, which `/credits` now gives.

Outstanding: the **TOPIK 2015 vocabulary list** reached us via the combined
GitHub repo rather than from 한국어능력시험 directly, so its terms were never
read at source. Treated as attribution-required. Confirm before any public
launch. None of this has been reviewed by anyone qualified.

**Still open:** the levels page says "your vocabulary holds up through Level N",
which is a prediction about an exam that also tests grammar, listening and
writing. Passing TOPIK I is not a matter of knowing 1,200 words. Leaning toward
cutting the verdict and keeping the measurement — the per-level coverage, reach
and never-asked lists are all defensible; only the verdict line isn't. Context:
the owner has sat TOPIK II twice, never TOPIK I, and reckons the honest advice
is to take a practice test.

**Not started:** extending the word list so TOPIK levels 5–6 are testable at all
(they hold 304 and 124 words); sample articles on `/read`; cloze mode, which is
also the cheapest test of whether recognition overstates coverage.

**Capping the gaps feature:** 2,746 words still carry no meaning tag. That is a
limit of the NIKL category source, not of the glossing — the source tags 6,898
of its own 12,019 entries and nothing joins to the rest.

Running notes on where the project actually stands, kept because work happens
across several machines and sessions. `PLAN.md` holds the design decisions and
the roadmap; this file holds the current state and anything half-finished.

Last updated: 2026-08-08.

## Where the code is

Merged 2026-08-08: this branch and `main` are reconciled, carrying both the
glossing pass and the levels / gaps / lemmatiser work. The overlap was three
files — `PLAN.md` and `scripts/build-static-wordlist.mjs` merged by hand and by
git respectively, and `public/korean.json` regenerated from the merged pipeline
rather than resolved line by line, being generated output.

Historic note, from before that merge:

- Next.js app, Supabase auth (magic link; Google behind a flag), Vercel deploy.
- Korean word list ingested — 5,897 sense-level entries from the NIKL/TOPIK
  frequency list.
- Per-word test UI: translation MCQ, configurable timer, 2–4 choices,
  keyboard 1–4 and space, undo, pausable sessions, works on a phone.
- Guest mode: progress in `localStorage`, JSON export/import, no account.
- Results page: known/unsure/unknown split, frequency bands, part of speech,
  and known words split by recall speed.

## Glossing: done, and it landed on main

Resolved 2026-08-08. The other machine's work was redone rather than recovered,
and `main` now carries 1,024 hand-curated entries with all 5,897 passing
`scripts/audit-glosses.mjs`. Every defect this branch measured is gone:

| | before | after |
|---|---|---|
| senses of one lemma sharing a gloss | 520 entries / 220 lemmas | **0** |
| glosses over 60 characters | 267 | **0** |
| glosses carrying raw HTML | 4 | **0** |

새 now reads "new" / "a bird" / "an interval, the gap between" at its three
ranks instead of the same mashed string three times, so those words are
honestly testable for the first time.

Worth carrying forward from `GLOSSING.md`: a clean audit means no
rule-detectable fault, **not** verified accuracy — nobody who reads Korean has
checked them yet.

## Historical: how the glossing pass went missing

A session on another machine was working on **phase 5 — curating glosses beyond
rank 200**. None of that work is on the remote: GitHub has only `main`, and
`main` has no glossing commits after `81a895d`. That machine died mid-session,
so the work is presumed to be sitting uncommitted in its working tree.

Current state of the data as committed:

| | entries |
|---|---|
| curated (ranks 1–200, hand-checked) | 200 |
| flagged `needs_review` (auto-joined from kengdic) | 5,697 |

### What the glossing actually has to fix, in priority order

Measured 2026-08-07 against the live word list, so the work can be aimed rather
than done rank by rank:

| problem | entries | why it matters |
|---|---|---|
| senses of one lemma sharing an identical gloss | **520** (220 lemmas) | **actively broken.** 새 sits at ranks 456, 1,035 and 2,827 — "new", "bird", "interval" — and all three read "An interval; A bird; New". Same question, same answer, three times: the test cannot be passed or failed honestly, and the answers it records are noise. |
| glosses listing 2+ meanings joined with `;` | 968 (16%) | the reader has to pick which meaning is meant, which is a second task on top of recall |
| glosses over 60 characters | 267 | not readable inside a 5s timer, so they measure reading speed rather than knowledge |
| glosses carrying raw HTML (`<br>`, `<i>`) | 4 | **fixed** — `cleanGloss` now strips markup |

The 520 collisions are the ones to do first. They are the only category that
produces *wrong data* rather than merely hard questions, and until they're
fixed any self-testing over those words records answers that mean nothing.
Everything else degrades the experience without corrupting the result.

`/words` filtered to `Never asked` plus a category is a reasonable working
queue for this, since it lists exactly the untested words of a slice in
frequency order.

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

**`/gaps` — where the holes are, by meaning.** Semantic tagging ingested from
한국어 교육 어휘 내용 개발 (국립국어원 2015): 14 major categories over 139
subcategories, taking category coverage from **200 words to 3,151**. Includes
색깔 (30), 동물류 (32), 과일 (13), 채소 (18), 신체 부위 (72) — the concrete
pockets conversational learners tend to miss.

The hand-curated English tags on the top 200 are deliberately *not* used as a
fallback. Two taxonomies in one column would make "which category am I weakest
in" a meaningless comparison, and what they mostly covered was function words,
which have no semantic pocket to be missing from.

Two design points that took a correction to get right:

- **Missed and unasked are kept apart.** Asked-and-failed is a gap in you;
  never-asked is a gap in the testing and says nothing yet.
- **Confidence follows the absolute number asked, not the fraction.** The first
  cut ranked on what share of a category had been seen, which buried the real
  finding — none of 6 animal words known — beneath noise like one of 3. Ranking
  now needs 5 words asked (`MIN_ASKED`); the share-of-category test survives
  separately as `isWellSampled`, for whether you can generalise from it.

A cross-cutting "thinnest pockets" list ranks subcategories across all majors,
so a small hole inside a big category is findable — 색깔 sits among twenty-odd
siblings inside 개념 and would otherwise need you to already suspect it.

**Meaning and part of speech are kept as two separate cuts**, both with the same
rigour, because they answer different questions and neither substitutes for the
other. They're also nested opposite ways round, which is what makes the pair
worth having: part of speech under meaning asks "which subjects am I thin on";
meaning under part of speech asks "am I weak on adjectives, and about what".

Part of speech is the more complete of the two — it covers all 5,897 words
where the semantic tagging reaches 3,151, verbs being thinly tagged at source
(399 of 1,345). It was previously the weaker view, a plain percentage bar on
the results page with no missed/unasked split at all.

**Bars have a basis toggle** — share of *what you were asked*, or share of
*every word that exists* — on `/gaps`, `/levels` and `/results`, via the shared
`src/components/split-bar.tsx`. Both are honest and they answer different
questions, but against all 5,897 words everything renders as a sliver on an
empty track, which reads as hopeless and flattens the difference between doing
well and doing badly. Defaults to the asked basis; the raw counts stay on
screen either way so nothing has to be inferred from the bar alone. Measured on
a simulated profile the same bar reads 86% against asked and 29% against all.

## Sourcing readable Korean text (researched, nothing built)

For the "find things you can actually read" half. Licensing checked 2026-08-07.

**Public domain literature — available, poor fit.** Korea's term is life + 70,
but the 2013 extension is *not* retroactive, so the line is clean: authors who
died on or before **1962-12-31** are public domain; 1963 onward isn't free until
2034+. That window is the colonial-era canon — 김소월 (d. 1934), 이상 (d. 1937),
김유정 (d. 1937), 현진건 (d. 1943), 윤동주 (d. 1945), 이광수 / 채만식 / 정지용
(d. 1950).

[공유마당](https://gongu.copyright.or.kr/) (한국저작권위원회) already publishes
**200 expired literary short stories** free with no conditions, and has an API
with instant key issuance — so the collection work is done.

The catch is real though. The 1933 한글맞춤법통일안 is the orthographic dividing
line: earlier texts use 연철 (sound-based) spelling — 자피다 for 잡히다 — plus
different spacing. The PD window sits right at that boundary. Two problems
follow: a modernised edition is a *new editorial work with its own copyright*,
so "the original is PD" doesn't make a clean modern text free; and 1930s
literary register is close to the opposite of useful input for a learner whose
strength is daily conversation.

**News — mostly closed, with one open door.** Commercial outlets (연합뉴스, the
dailies) are fully copyrighted; no path. But **공공누리 제1유형** (Korea Open
Government License Type 1) permits commercial use *and* modification with
attribution only, and [korea.kr / 정책브리핑](https://www.korea.kr/) publishes
news-style articles under it. Contemporary, standard-register, current-topic
Korean that is legally reusable — a better fit than the PD fiction.

Licence obligations differ and shouldn't be mixed carelessly: 공유마당 expired
works carry none; KOGL Type 1 requires attribution; 위키문헌 (Wikisource) is
CC BY-SA, which is share-alike and stickier.

**Tatoeba — the best fit found so far, and verified.** 15,868 Korean sentences
under CC BY 2.0 FR, median 15 characters, 15,517 of them under 40, with English
translations alongside. Downloaded and counted directly from
`downloads.tatoeba.org/exports/per_language/kor/`. Natural modern Korean written
by speakers, at sentence rather than story length — which also makes it the
right first target for the scorer, since a lemmatiser's mistakes stay visible in
a 15-character sentence instead of being buried in a page.

**Folk tales — the stories are free, the retellings are not.** 흥부와 놀부,
콩쥐팥쥐 and the rest are traditional and anonymous, so no one holds copyright in
the *story*. Every modern written retelling is nonetheless a new work with its
own copyright — the same trap as modernised spelling editions. What's usable is
either a public-domain-era transcription or a 공공누리-licensed retelling.
[위키문헌's 공유마당 list](https://ko.wikisource.org/wiki/위키문헌:공유마당에_등록된_문서_목록)
carries several hundred already-transcribed works including classical narratives
and folk tales.

Unconfirmed lead: 국립어린이청소년도서관 publishes 한국전래동화 through
data.go.kr under 공공누리 제1유형, but the advertised fields (title, author,
publisher, year) read like bibliographic metadata rather than story text, and
the portal returned 503 when checked. Verify before relying on it.

**On generating text instead.** Fits the architecture — `PLAN.md` already locks
zero runtime LLM calls, with generation happening at build time and committed as
data. The risk isn't disclosure, it's that a learner cannot detect the errors:
wrong particles, unnatural collocations, off register, all learned as if
correct. The mitigation that makes it defensible is to constrain generation to
words already tested as known and then *mechanically verify* the output stays in
that set — "is every word in range" is machine-checkable in a way "is this
natural Korean" is not, and it's the same technique the plan already specifies
for pre-generated definitions. Still second choice behind real sources.

### Scoring text the user brings, and scanning news

**Pasted text raises no copyright question** — the user already holds their copy
and the tool answers a question about it rather than redistributing it. Guest
mode being entirely client-side makes this stronger than "probably fine": the
text need never reach a server at all, so there is no retention question to
answer. A URL is a different posture, since CORS means a server route has to do
the fetching and therefore makes a copy — transient and for analysis, but not
the same clean position.

**YouTube is blocked from datacenter IPs.** Checked from this container: a plain
watch-page request returned **HTTP 429 on the first try**. (Routed through a
proxy here, so suggestive rather than conclusive, but it matches the known
behaviour and Vercel would sit in the same position.) Paste-first with URL as
best-effort remains the shape.

Second, less obvious problem: Korean auto-captions are ASR output with no
punctuation, no sentence boundaries and misrecognitions. That degrades a
coverage score *invisibly* — the number looks as authoritative as a real one.
Detect auto-generated versus manual tracks and say which was used.

**Prioritising nouns and verbs** is right in principle — function words dominate
by token count, but comprehension failures are dominated by content words, and
with solid grammar the word that unlocks a sentence is nearly always a noun or
verb. It barely narrows anything though: nouns (3,403) and verbs (1,345) are 81%
of the list. The sharper version is to rank unknown words by their frequency *in
the specific text*, using part of speech only as a tie-breaker. Testable against
Tatoeba once the lemmatiser exists.

**News: attribution is not a licence.** 공공누리 Type 1 asks for attribution
because the licence grants use in exchange for it; ordinary copyright does not
work that way, and citing a source grants nothing. So hosting commercial
articles is out however carefully they are credited.

The design that works instead — and is better anyway — is to **store the
fingerprint, not the article**: fetch, reduce to a bag of lemmas with counts,
store that, discard the text. The client scores the fingerprint against local
progress and the UI shows headline, source, an outbound link, coverage and the
words you'd need. Nothing is redistributed, since an unordered count vector
cannot reconstruct the piece; storage is tiny; scoring stays client-side and
personal. It works for *any* source, including ones that could never be hosted,
with 공공누리 content as the tier where full text can also be shown. This is what
makes "scan for new stuff continuously" viable.

Licensing here is reasoned from principles, not verified by anyone qualified —
worth confirming before this goes public.

**Sequencing.** Hosting text is the easy part; what makes it this tool rather
than a library is scoring it against the user's lexicon, and that still needs
the Korean lemmatizer (list is lemma-based 먹다, real text is inflected
먹었어요). So the cheaper first move has no licensing surface at all — paste
text or a URL and score it. A hosted library becomes a convenience layer once
scoring is proven, with 공공누리 content as the first shelf rather than the PD
fiction.

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
