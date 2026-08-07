# vocab-gap-tool

A multi-language tool that exhaustively tests your vocabulary against
frequency-ranked word lists — building a complete, accurate map of which words
you know, starting from the most common word and working up.

Words are tested one at a time (shortest possible proof of knowledge), tracked
as **known / unsure / unknown**, with sense-level entries for words with
multiple meanings and lemma-based lists so conjugations never count as
separate words. The known-word list powers gap analysis by semantic category
and a comprehensible-input scorer for finding texts in your 95–98% sweet spot.

It also places what you know against a language's **proficiency frameworks**,
where a graded list exists — for Korean, TOPIK levels 1–6 and 국립국어원's
difficulty grades: how much of each level you can actually prove, and which
words the frequency-first test order hasn't shown you yet. Frameworks are data
files, so adding JLPT or HSK is a matter of sourcing a graded list rather than
writing code.

**Stack**: Next.js (App Router, TypeScript, Tailwind) · Supabase (passwordless
auth + Postgres) · Vercel.

See [PLAN.md](PLAN.md) for the full roadmap and locked design decisions.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + publishable key
npm run dev
```
