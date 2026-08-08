# Gloss curation — how to continue

A **gloss** is the short English meaning shown on an answer button. Past rank
200 the glosses came from an automated kengdic join, which concatenated every
sense of a lemma into one string and copied it onto each entry. 문 read
`Door; adjective of 물다 to bite`; 듯하다 was glossed `듯하다`. Neither is
answerable, so they are being rewritten one sense at a time.

This file exists so a session that starts cold can carry on without
rediscovering the conventions.

## State

Run the audit for the live number — never trust a figure written here:

```
node scripts/audit-glosses.mjs
```

At last commit: **0 faults across all 5,897 entries.** 1,024 are now
hand-curated, up from 200; the rest passed on their own once the automated
capitalisation fault was fixed by rule.

Zero faults is not the same as zero errors. The audit checks what a rule can
check — Korean left in the English field, a word restated as its own meaning,
over-length, piled-up senses, two senses sharing an answer. It cannot tell
whether a gloss is *right*. See "Trust and verification" below.

## The loop

1. Dump the next band with its source signals (collocation and hanja are what
   decide the sense — not whichever dictionary line came first):

   ```
   node scripts/audit-glosses.mjs --queue
   node -e "
   const q=require('./data/gloss-work-queue.json');
   const g=require('./data/korean_words_glossed.json');
   const src=Object.fromEntries(g.map(x=>[x.frequency_rank,x]));
   for(const w of q.filter(w=>w.rank<=2000)){
     const s=src[w.rank]||{}; const n=s.notes||{};
     console.log(w.rank+'\t'+w.lemma+(n.hanja?' 漢'+n.hanja:'')+(n.collocation?' ~'+n.collocation:'')+'\t['+w.pos+']\t'+w.gloss.slice(0,95));
   }"
   ```

2. Write `data/gloss-patch.json` — `{ "_comment": "...", "glosses": { "<rank>":
   { "gloss", "semantic_category", "concreteness" } } }`.

3. Merge, rebuild, re-audit:

   ```
   node scripts/merge-curated.mjs
   node scripts/build-seed-data.mjs
   node scripts/build-static-wordlist.mjs
   node scripts/audit-glosses.mjs
   ```

4. Commit. The count must fall; if it doesn't, the batch didn't land.

Batches are keyed by rank and later ones win, so a correction is just another
batch. **Running in parallel:** give each session its own patch filename and
have one session own the merge, otherwise every session collides on
`korean_curated_glosses.json`. Cross-band duplicate glosses can't be seen by
either session and are caught by the audit afterwards.

## What a good gloss is

- **One sense only.** The entry is a sense, not a word. 배 is three entries:
  `를 타다` → boat, `신체의 일부` → belly, 漢倍 `두 배` → times.
- **Under ~45 characters.** It is read under a five-second timer.
- **No Korean in the English field.**
- **Never identical to another sense of the same lemma** — that makes one
  question with two right answers.
- **Consistent with the part of speech.** An `auxiliary` entry gets the
  auxiliary meaning: 두다 at rank 326 is "to do in advance and leave it",
  not "to place".
- **Lowercase**, except nationalities, months, weekdays, faiths, titles,
  acronyms, and the pronoun "I". The build enforces this; don't hand-case.
- Verbs and adjectives read as `to …`, matching the curated top 200.

`semantic_category` is drawn from the set already in use: grammar, quantity,
time, people, place, action, state, motion, quality, perception, society,
abstract, cognition, communication, body, money, social, family, activity,
education, work, food, emotion, nature. `concreteness` is one of function,
abstract, concrete.

## Trust and verification

The hanja is the strongest signal for homographs — 군 漢軍 is the military,
not the county 郡 the dictionary offered. The collocation resolves the rest.
Where neither exists, the choice is weaker and should be marked for review.

An early sample of 178 was checked against its source candidates: 134 shared
vocabulary with a dictionary candidate, 37 diverged (mostly because the
dictionary was describing a different homograph), 4 had no source at all.
That check has not been repeated across the full 1,024 — **the accuracy of
these glosses has not been independently verified by anyone who reads
Korean.** That is the outstanding risk on this work, not the fault count.

Entries known to read awkwardly even where the sense is right:

| rank | word | gloss | problem |
|---|---|---|---|
| 7 | 하다 | turns a noun into a verb | a description, not a translation — may stand out as the odd option |
| 831 | 달다 | asking someone to do it for you | correct but clumsy as a button label |
| 502 | 가지다 | having done, and then | same problem; `-어 가지고` resists a short gloss |
| 399 | 고개 | head, as in turning or bowing it | wordy; "neck, head" may be cleaner |

Some words resist glossing entirely. 어쩌다 at 725 was reworded twice and is
still unsatisfying, because no one-line English equivalent exists. Those are
arguments for the planned cloze mode (pick which of two Korean words fits a
sentence), not for a better gloss.

Verification worth building, in order of value: a flag button during testing,
so a wrong gloss gets caught at the moment it bites; then a review page
showing gloss, part of speech, hanja, collocation and the original dictionary
line side by side. A second Claude session can proofread for consistency and
length but shares the same blind spots on sense selection, so it is a
proofreader rather than an authority.
