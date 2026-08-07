import type { Framework } from "./types";

/**
 * TOPIK — 한국어능력시험. Six levels across two papers since the 2014 reform.
 *
 * The exam itself has never published a per-level vocabulary list. What it
 * publishes is a two-tier list, which is why the branch that preceded this one
 * could only report TOPIK I against TOPIK II. The levels here come instead
 * from 국립국어원's standard curriculum, which grades 10,635 words 1급–6급 and
 * was designed against TOPIK's own level descriptors. So a level here means
 * "what a syllabus aiming at this TOPIK level teaches" — sound enough to name
 * a level, not the exam board speaking.
 */
export const TOPIK: Framework = {
  id: "topik",
  name: "TOPIK",
  fullName: "한국어능력시험 · Test of Proficiency in Korean",
  kind: "exam",
  source:
    "국제 통용 한국어 표준 교육과정 적용 연구 (4단계), 국립국어원 2017 — 10,635 words graded 1급–6급",
  caveat:
    "Levels come from the standard curriculum, not from TOPIK itself — the exam publishes no per-level word list. The exam also tests listening, reading and writing; vocabulary is the floor under those, not a substitute.",
  levels: [
    { index: 1, label: "Level 1", cefr: "A1" },
    { index: 2, label: "Level 2", cefr: "A2" },
    { index: 3, label: "Level 3", cefr: "B1" },
    { index: 4, label: "Level 4", cefr: "B2" },
    { index: 5, label: "Level 5", cefr: "C1" },
    { index: 6, label: "Level 6", cefr: "C2" },
  ],
  groups: [
    {
      id: "I",
      label: "TOPIK I",
      levels: [1, 2],
      blurb: "The beginner paper. Listening and reading only, no writing.",
    },
    {
      id: "II",
      label: "TOPIK II",
      levels: [3, 4, 5, 6],
      blurb:
        "One paper across four levels — your score decides which you're awarded.",
    },
  ],
  // The 2015 two-tier exam list covers words the curriculum never graded, so it
  // still places them in a paper even when no level is known.
  useTierFallback: true,
};

/**
 * 국립국어원's graded learner vocabulary — a panel's judgement of difficulty,
 * made independently of any exam. Worth showing beside TOPIK precisely because
 * it was arrived at differently: where the two disagree, that's a signal.
 */
export const NIKL: Framework = {
  id: "nikl",
  name: "국립국어원 등급",
  fullName: "한국어 학습용 어휘 목록 — graded learner vocabulary",
  kind: "difficulty",
  source: "한국어 학습용 어휘 목록 (조남호, 국립국어원 2003) — 5,965 words graded A/B/C",
  caveat:
    "A difficulty grading, not an exam. It says how hard a word was judged to be, which is not a prediction of any test result.",
  levels: [
    { index: 1, label: "A · 초급 · beginner", cefr: null },
    { index: 2, label: "B · 중급 · intermediate", cefr: null },
    { index: 3, label: "C · 고급 · advanced", cefr: null },
  ],
  groups: [],
  useTierFallback: false,
};

export const KOREAN_FRAMEWORKS: Framework[] = [TOPIK, NIKL];
