/**
 * The grammar patterns that bound words actually live in.
 *
 * A real problem found by testing: 수 was marked unknown by someone who uses
 * -(으)ㄹ 수 있다 daily, and auxiliary 있다 by someone fluent in -고 있다. Both
 * answers were honest. Neither word exists in a learner's head as a standalone
 * item — 수 on its own means nothing usable, and the gloss "possibility" is a
 * dictionary abstraction over a construction.
 *
 * So asking "do you know 수" measures the wrong thing. It tests whether someone
 * has studied Korean grammar *terminology*, not whether they can use the
 * language. Someone who reads 할 수 있다 without pausing knows this word by any
 * standard that matters.
 *
 * The fix is to ask the question people can actually answer: show the pattern.
 * Only for entries that are genuinely bound — ordinary words keep their bare
 * lemma, because for those the bare word *is* the question.
 *
 * Counters (개, 명, 번) are deliberately given a numeral rather than a rule:
 * 한 개 is how anyone meets that word, and "-개" alone is as unhelpful as 수.
 */

export type Pattern = {
  /** How the word is actually met. */
  form: string;
  /**
   * Counters carry their meaning split from their number, because the number
   * must not be a clue. Asked "한 개" against answers "item, piece" / "minute"
   * / "of that amount", the numeral gives it away — only one option is even
   * countable that way. So every option for a counter is rendered with the
   * same number, and the counter itself becomes the question.
   */
  unit?: string;
  /** The English number to put in front of every option. */
  count?: string;
  /**
   * What the *pattern* means, which is not what the bare word means. Asking
   * "-(으)ㄹ 수 있다" and answering "possibility" would be incoherent: the
   * dictionary gloss describes the bound noun in the abstract, while the
   * pattern means "can". Null keeps the word's own gloss, which is right for
   * counters — 한 개 really does mean "item, piece".
   */
  means: string | null;
};

/** Pattern by word key (`lemma#sense`). */
export const PATTERNS: Record<string, Pattern> = {
  // Auxiliaries — meaningless alone, instantly recognisable in construction.
  "있다#1": { form: "-고 있다", means: "to be doing (right now)" },
  "하다#2": { form: "명사 + 하다", means: "to do (makes a noun a verb)" },
  "않다#1": { form: "-지 않다", means: "to not do" },
  "보다#2": { form: "-아/어 보다", means: "to try doing" },
  "주다#1": { form: "-아/어 주다", means: "to do for someone" },
  "못하다#1": { form: "-지 못하다", means: "to be unable to" },
  "오다#2": { form: "-아/어 오다", means: "to have been doing up to now" },
  "싶다#1": { form: "-고 싶다", means: "to want to" },
  "버리다#1": { form: "-아/어 버리다", means: "to do completely" },
  "가다#2": { form: "-아/어 가다", means: "to keep on doing" },
  "놓다#1": { form: "-아/어 놓다", means: "to do in advance" },
  "말다#1": { form: "-지 말다", means: "don't do" },
  "내다#2": { form: "-아/어 내다", means: "to manage to do" },
  "나다#2": { form: "-아/어 나다", means: "to finish doing" },
  "두다#2": { form: "-아/어 두다", means: "to do and leave it" },
  "듯하다#1": { form: "-(으)ㄴ/는 듯하다", means: "to seem like" },
  "만하다#1": { form: "-(으)ㄹ 만하다", means: "to be worth doing" },
  "나가다#2": { form: "-아/어 나가다", means: "to go on doing" },
  "가지다#2": { form: "-아/어 가지고", means: "having done, and then" },

  "드리다#1": { form: "-아/어 드리다", means: "to do for someone (humble)" },
  "달다#1": { form: "-아/어 달라고 하다", means: "to ask someone to do it" },
  "계시다#2": { form: "-고 계시다", means: "to be doing (honorific)" },
  "아니하다#1": { form: "-지 아니하다", means: "to not do (formal)" },
  "들다#3": { form: "-아/어 들다", means: "to set about doing" },
  "척하다#1": { form: "-(으)ㄴ/는 척하다", means: "to pretend to" },
  "갖다#2": { form: "-아/어 갖고", means: "having done, and then" },
  "뻔하다#2": { form: "-(으)ㄹ 뻔하다", means: "to have nearly done" },
  "듯싶다#1": { form: "-(으)ㄴ/는 듯싶다", means: "to seem like" },
  "먹다#2": { form: "-아/어 먹다", means: "to do completely" },
  "체하다#1": { form: "-(으)ㄴ/는 체하다", means: "to pretend to" },
  "싶어지다#1": { form: "-고 싶어지다", means: "to come to want to" },
  "죽다#2": { form: "-아/어 죽다", means: "to be dying of (intensely)" },
  "치우다#2": { form: "-아/어 치우다", means: "to finish it off" },

  // Bound nouns that only appear inside a frame.
  "수#1": { form: "-(으)ㄹ 수 있다 / 없다", means: "can / cannot" },
  "것#1": { form: "-는 것", means: "the act of, the thing that" },
  "거#1": { form: "-는 거", means: "the thing that" },
  "때문#1": { form: "- 때문에", means: "because of" },
  "데#1": { form: "-는 데", means: "in doing, at the point of" },
  "중#1": { form: "- 중에", means: "during, in the middle of" },
  "뿐#1": { form: "-(으)ㄹ 뿐", means: "only, merely" },
  "채#1": { form: "-(으)ㄴ 채로", means: "still in that state" },
  "줄#1": { form: "-(으)ㄹ 줄 알다 / 모르다", means: "to know how to" },
  "듯#1": { form: "-(으)ㄴ/는 듯", means: "as if, like" },
  "적#1": { form: "-(으)ㄴ 적이 있다", means: "to have ever done" },
  "바#1": { form: "-(으)ㄴ 바", means: "the thing which" },
  "만큼#1": { form: "-(으)ㄹ 만큼", means: "as much as" },
  "대로#1": { form: "-(으)ㄴ 대로", means: "just as, according to" },
  "지#1": { form: "-(으)ㄴ 지", means: "since (time elapsed)" },
  "터#1": { form: "-(으)ㄹ 터이다", means: "intend to, be about to" },

  // Counters and units — met with a number, never bare.
  "년#1": { form: "삼 년", means: null, unit: "years", count: "three" },
  "일#2": { form: "삼 일", means: null, unit: "days", count: "three" },
  "명#1": { form: "두 명", means: null, unit: "people", count: "two" },
  "개#1": { form: "세 개", means: null, unit: "items, pieces", count: "three" },
  "번#1": { form: "세 번", means: null, unit: "times", count: "three" },
  "원#1": { form: "천 원", means: null, unit: "won", count: "a thousand" },
  "시#1": { form: "세 시", means: null, unit: "o'clock", count: "three" },
  "분#1": { form: "십 분", means: null, unit: "minutes", count: "ten" },
  "살#1": { form: "스무 살", means: null, unit: "years old", count: "twenty" },
  "달#1": { form: "두 달", means: null, unit: "months", count: "two" },
  "가지#1": { form: "몇 가지", means: null, unit: "kinds, sorts", count: "a few" },
  "퍼센트#1": { form: "십 퍼센트", means: null, unit: "percent", count: "ten" },
  "년대#1": { form: "구십 년대", means: "the nineties (decade)" },
  "씨#1": { form: "마이클 씨", means: "Mr./Ms." },
  "분#2": { form: "세 분", means: null, unit: "people (honorific)", count: "three" },
  "대#1": { form: "삼십 대", means: "age bracket, one's thirties" },
};

export function patternFor(key: string): Pattern | null {
  return PATTERNS[key] ?? null;
}

/** The answer a pattern should be tested against, falling back to the gloss. */
export function patternMeaning(key: string, gloss: string): string {
  const p = PATTERNS[key];
  if (!p) return gloss;
  if (p.unit && p.count) return `${p.count} ${p.unit}`;
  return p.means ?? gloss;
}

/** Counters, keyed for building distractors that share the same number. */
export function counterUnits(): Array<{ key: string; unit: string }> {
  return Object.entries(PATTERNS)
    .filter(([, p]) => p.unit)
    .map(([key, p]) => ({ key, unit: p.unit as string }));
}

export function counterCount(key: string): string | null {
  return PATTERNS[key]?.count ?? null;
}

/**
 * Parts of speech that are bound by definition. A 보조용언 attaches to a main
 * verb through a connective ending and a 의존명사 needs a modifier in front of
 * it — neither ever stands alone, so the bare lemma is never the right prompt.
 *
 * Where no curated pattern exists the word is still *marked* as bound rather
 * than given an invented one. Counters are the reason: 마리 takes a native
 * numeral (한 마리) and 개월 a Sino-Korean one (삼 개월), and guessing wrong
 * would teach bad Korean to someone with no way to notice.
 */
const BOUND_POS = new Set(["auxiliary", "bound noun"]);

export function isBoundPos(pos: string | null): boolean {
  return pos !== null && BOUND_POS.has(pos);
}

/**
 * Whether an entry is grammar rather than vocabulary. Used to say so on screen,
 * because "you didn't know 수" and "you didn't know 사과" are not the same kind
 * of result and shouldn't read as though they were.
 */
export function isGrammar(key: string): boolean {
  return key in PATTERNS;
}
