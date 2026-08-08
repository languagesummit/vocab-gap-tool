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

At last commit: **694 entries left, all at rank 1001+. Ranks 1–1000 report
zero faults.** The user tests from rank 1 upward and was at rank 78, so
nothing outstanding is in their path yet.

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

Glosses written so far were checked against their source candidates: 134 of
178 shared vocabulary with a dictionary candidate, 37 diverged (mostly
because the dictionary was describing a different homograph), 4 had no source
at all. Entries known to be shaky:

| rank | word | gloss | problem |
|---|---|---|---|
| 725 | 어쩌다 | to do what about it | tagged verb, but the common 어쩌다 is the adverb "by chance" |
| 7 | 하다 | turns a noun into a verb | a description, not a translation — may stand out as the odd option |
| 831 | 달다 | asking someone to do it for you | correct but clumsy as a button label |
| 502 | 가지다 | having done, and then | same problem; `-어 가지고` resists a short gloss |
| 399 | 고개 | head, as in turning or bowing it | wordy; "neck, head" may be cleaner |

Some words resist glossing entirely — 어쩌다 is the clear case. Those are
arguments for the planned cloze mode (pick which of two Korean words fits a
sentence), not for a better gloss.
