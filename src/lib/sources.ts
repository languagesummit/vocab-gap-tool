/**
 * Where every piece of language data comes from, and how each number on the
 * site is produced.
 *
 * Kept as data, per language, for two reasons. Attribution is a licence
 * condition for most of these — 공공누리 grants use in exchange for stating the
 * source, so this file is part of what makes the app's use permitted. And a
 * tool that tells someone what they know owes them the ability to check how it
 * decided: anyone who wants to go and read the source list should be able to
 * find it from the page, not from the repository.
 *
 * The second language added here will have an entirely different set. Nothing
 * about Korean should leak into the shape.
 */

export type Source = {
  title: string;
  /** Who produced it and when, in their own naming. */
  attribution: string;
  /** What this app takes from it, specifically. */
  provides: string;
  licence: string;
  href?: string;
  /** Set where the terms have not been read at source. */
  unverified?: boolean;
};

/**
 * Work done here rather than taken from anywhere. Separated from the sources
 * because presenting editorial judgement as though it were sourced would be
 * the most misleading thing on the page — these are the parts with no
 * authority behind them but this project's own.
 */
export type OwnWork = {
  title: string;
  detail: string;
};

/** How a figure shown in the app is arrived at, and what it does not mean. */
export type Method = {
  question: string;
  answer: string;
};

export type LanguageSources = {
  code: string;
  name: string;
  sources: Source[];
  ownWork: OwnWork[];
};

const KOREAN: LanguageSources = {
  code: "ko",
  name: "Korean",
  sources: [
    {
      title: "kengdic",
      attribution: "Joe Speigle, maintained by garfieldnate",
      provides:
        "The English meaning shown for most words. Roughly 4,900 of the 5,897 entries still carry a gloss joined from kengdic; the rest have been rewritten for this project.",
      licence: "MPL 2.0 (dual-licensed MPL 2.0 / LGPL 2.0+)",
      href: "https://github.com/garfieldnate/kengdic",
    },
    {
      title: "한국어 학습용 어휘 목록",
      attribution: "조남호, 국립국어원 (2003). 5,965 words graded A/B/C.",
      provides:
        "The 초급 / 중급 / 고급 difficulty grades, which are a panel's judgement of how hard a word is rather than an exam's.",
      licence: "공공누리 제1유형 (출처표시)",
      href: "https://www.korean.go.kr/front/etcData/etcDataView.do?mn_id=46&etc_seq=71",
    },
    {
      title: "국제 통용 한국어 표준 교육과정 적용 연구 (4단계) — 어휘",
      attribution: "국립국어원 (2017). 10,635 words graded 1급–6급.",
      provides:
        "TOPIK levels 1 to 6, and the CEFR equivalents shown beside them. TOPIK itself publishes no per-level vocabulary list, so a level here means what a curriculum aiming at that level teaches.",
      licence: "공공누리 제1유형 (출처표시)",
      href: "https://www.korean.go.kr/front/reportData/reportDataView.do?mn_id=45&report_seq=932",
    },
    {
      title: "국제 통용 한국어 표준 교육과정 적용 연구 (4단계) — 문법",
      attribution:
        "국립국어원 (2017). 336 grammar points graded 1급–6급, in the 문법 sheet of the same workbook as the vocabulary above.",
      provides:
        "The grammar inventory — 조사, 연결어미, 종결어미 and set expressions, including -잖아, -자마자, -거든, -을 텐데.",
      licence: "공공누리 제1유형 (출처표시)",
      href: "https://www.korean.go.kr/front/reportData/reportDataView.do?mn_id=45&report_seq=932",
    },
    {
      title: "한국어 교육 어휘 내용 개발 (4단계)",
      attribution:
        "국립국어원 (2015). 12,019 words, of which 6,898 carry a semantic category.",
      provides:
        "The subject categories — 색깔, 동물류, 신체 부위 and 136 others — that the weak-spots page is built on.",
      licence: "공공누리 제1유형 (출처표시)",
      href: "https://www.korean.go.kr/front/reportData/reportDataView.do?mn_id=207&report_seq=882",
    },
    {
      title: "TOPIK 어휘 목록",
      attribution: "한국어능력시험 (2015).",
      provides:
        "The TOPIK I / TOPIK II tier, which places words the graded curriculum doesn't cover.",
      licence: "공공누리 assumed — terms not read at source",
      unverified: true,
    },
    {
      title: "Tatoeba",
      attribution:
        "The Tatoeba Project. 15,868 Korean sentences contributed by speakers.",
      provides:
        "The corpus the Korean lemmatiser was measured against — 81.9% of 69,464 running words resolve to a dictionary form. Also the intended source of example sentences for grammar testing.",
      licence: "CC BY 2.0 FR",
      href: "https://tatoeba.org/",
    },
    {
      title: "combined_korean_vocabulary_list",
      attribution: "julienshim. Merges the two government lists into one TSV.",
      provides: "The frequency-ranked list this app ingested.",
      licence:
        "No licence stated; the underlying data is the government lists above",
      href: "https://github.com/julienshim/combined_korean_vocabulary_list",
    },
  ],
  ownWork: [
    {
      title: "Rewritten English meanings",
      detail:
        "1,024 entries have had their English rewritten here, because the automatic dictionary join produced meanings that were merged, over-long, or identical across senses of the same word. Written with AI assistance and checked against a mechanical audit — no fault a rule can detect remains, which is not the same as verified accuracy. Nobody who reads Korean has reviewed them.",
    },
    {
      title: "Grammar patterns for bound words",
      detail:
        "65 bound words are shown as the construction they appear in — -(으)ㄹ 수 있다 rather than a bare 수 — with the meaning written to match the pattern. These forms and meanings were composed for this project with AI assistance, not taken from any source, and have not been reviewed by a Korean speaker.",
    },
    {
      title: "English names for the subject categories",
      detail:
        "All 14 categories and 139 subcategories are labelled in Korean at source. The English beside them was written for this project with AI assistance so the gap report is readable by someone still learning the language, and is a translation of a category name rather than anything the source states.",
    },
    {
      title: "The Korean lemmatiser",
      detail:
        "Rule-based and written for this project — no model and no third-party analyser. It generates the surface forms each dictionary word can take and matches running text against them, handling the irregular verbs, particle stacking and contractions. Its accuracy is measured rather than asserted: see the Tatoeba figure above.",
    },
  ],
};

export const LANGUAGE_SOURCES: LanguageSources[] = [KOREAN];

/**
 * How the numbers are produced. Language-independent, because the reasoning is
 * about the method rather than about Korean.
 */
export const METHOD: Method[] = [
  {
    question: "What does “known” mean here?",
    answer:
      "You picked the right meaning from several, inside the time limit, without saying you were guessing. It is recognition — the weakest of the things “knowing a word” can mean, and the fastest to measure across thousands of words. It does not show you could produce the word, or recognise it inside a sentence.",
  },
  {
    question: "Why is speed recorded?",
    answer:
      "A word you reach instantly costs nothing when reading; one you have to dig for still interrupts you, even though both count as known. Response times are adjusted for how much answer text was on screen, so a long definition is not counted against you. A word asked twice records no time, because having already seen it makes a fast second answer mean something different.",
  },
  {
    question: "Why do untested words count against a text's score?",
    answer:
      "Because the tool only claims what it has actually asked. Assuming you know the untested ones would inflate every figure on the site, and the inflation would be largest exactly where the data is thinnest.",
  },
  {
    question: "How exact are the level percentages?",
    answer:
      "Testing runs from the commonest word outward, so everything below your frontier is a census rather than a sample — those counts are exact for the range covered. Coverage is reported alongside how much of a level has actually been asked, because 90% of a 5% sample is not a level.",
  },
  {
    question: "What is inferred rather than measured?",
    answer:
      "TOPIK levels come from a curriculum built against the exam's descriptors, not from the exam board, which publishes no per-level word list. Vocabulary is also only part of what TOPIK tests — nothing here predicts a result. The comprehension thresholds of 95–98% come from reading research conducted largely in English, and whether they transfer to an agglutinative language is genuinely open.",
  },
  {
    question: "Does the app call a language model?",
    answer:
      "No — not while you use it and not at build time. The word list, levels, subject categories and grammar inventory are all published data, and the lemmatiser is rule-based, so the same text always produces the same answer and nothing you type is sent anywhere.",
  },
  {
    question: "Was any of the content written by AI?",
    answer:
      "Yes, and it is worth separating from the above. The published data is not — it comes from the sources listed. But the editorial work built on top of it was produced with AI assistance: the rewritten English meanings, the grammar patterns for bound words, and the English names given to the subject categories. Those carry no authority beyond this project, and no Korean speaker has reviewed them. Where something is sourced it is cited; where it is not, it is listed under what was written here.",
  },
];
