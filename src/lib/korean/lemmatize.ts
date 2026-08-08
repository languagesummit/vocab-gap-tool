/**
 * Reducing running Korean to the lemmas on our word list.
 *
 * Deliberately rule-based and deterministic. No model, no network, no runtime
 * LLM call — the same text always yields the same answer, which matters when
 * the output is "you know 94% of this" and a user is deciding what to read.
 *
 * The strategy is generate-and-match rather than analyse-and-lookup: every
 * lemma's possible surface stems are generated once (see `stems.ts`) into an
 * index, and each token is matched against that. This cannot analyse Korean in
 * general, and doesn't try. It answers one narrow question well — which of
 * *our* words is this token — and reports honestly when it can't.
 */

import type { Word } from "../local/words";
import { finalOf, isKorean, withFinal } from "./hangul";
import { predicateStems } from "./stems";

/** Parts of speech that conjugate. Everything else is matched as-is. */
const PREDICATE_POS = new Set(["verb", "adjective", "auxiliary"]);

/**
 * 조사 and copula forms that attach to a noun. Ordered longest-first at build
 * time so the longest particle wins — stripping 는 off 에서는 would leave a
 * noun that never existed.
 */
const PARTICLES = [
  "에서부터", "으로부터", "에게서는", "한테서는",
  "이라고는", "에게서", "한테서", "에게는", "한테는", "께서는", "이라는", "이라고",
  "으로는", "으로도", "에서는", "에서도", "에게도", "한테도", "까지도", "부터는",
  "으로써", "으로서", "이라도", "이나마", "이야말로", "이었어요", "이에요", "이었다",
  "입니다", "이었", "예요", "이다", "이야", "이란", "이라", "이나", "이랑", "이든",
  "에게", "한테", "께서", "에서", "부터", "까지", "마다", "조차", "밖에", "처럼",
  "보다", "만큼", "대로", "라고", "라는", "하고", "에는", "에도", "에만", "으로",
  "든지", "라도", "께", "에", "의", "와", "과", "로", "도", "만", "은", "는",
  "이", "가", "을", "를", "랑", "요", "야", "아", "여", "나", "든", "고",
].sort((a, b) => b.length - a.length);

/**
 * 어미 that can follow a generated stem. The stem shapes already absorb 아/어
 * fusion and past-tense ㅆ, so what remains here is comparatively shallow.
 *
 * A closed list rather than a wildcard: allowing any short remainder matched
 * far too much, turning unrelated tokens into false positives, and a coverage
 * number built on those is worse than one that admits a miss.
 */
const ENDINGS = new Set([
  "",
  "다", "요", "지", "죠", "고", "게", "서", "야", "라", "자", "니", "나", "네",
  "군", "는", "은", "을", "던", "며", "면", "어", "아", "여", "죠", "지요",
  "어요", "아요", "여요", "에요", "예요", "어서", "아서", "어도", "아도",
  "어라", "아라", "어야", "아야", "어야지", "아야지",
  "습니다", "읍니다", "습니까", "니까", "습니꺄",
  "는다", "는데", "은데", "는지", "은지", "을지", "는가", "은가",
  "지만", "으니", "으면", "으니까", "으려고", "려고", "으러", "러", "으며",
  "겠", "겠다", "겠어요", "겠습니다", "겠지", "겠네요", "겠어", "겠지만",
  "겠네", "겠구나", "겠군요",
  "었", "았", "였", "었다", "았다", "였다", "었어", "았어", "였어",
  "었어요", "았어요", "였어요", "었습니다", "았습니다", "였습니다",
  "었지만", "았지만", "었는데", "았는데", "었으면", "았으면",
  "세요", "으세요", "십시오", "으십시오", "십니다", "셨다", "셨어요",
  "을까", "을게", "을래", "을수", "ㄹ수",
  "기", "음", "기를", "기가", "기도", "기에", "는것", "은것",
  "도록", "거나", "면서", "으면서", "는군요", "군요", "네요", "구나", "는구나",
  "나요", "는데요", "은데요", "잖아", "잖아요", "던데", "더라",
  "고요", "구요", "고서", "다가", "다면", "라면", "으라면",
]);

const MAX_ENDING = 5;

/**
 * Endings with no vowel of their own, which land *inside* the stem's last
 * syllable rather than after it: 가 + ㅂ니다 → 갑니다, 하 + ㄹ까요 → 할까요.
 *
 * These are matched by pulling the consonant back off the syllable, not by
 * indexing 갑 and 할 as stems. Indexing them would be simpler and wrong — 갑,
 * 간, 갈 and 감 are all nouns in their own right, and since 가다 is far more
 * frequent it would win every time, quietly turning every 감 ("persimmon")
 * into "go". Constraining each consonant to the endings it can actually
 * introduce keeps that from happening.
 */
const LINKING: Record<string, string[]> = {
  "ㅂ": ["니다", "니까", "시다", "시오"],
  "ㄴ": ["", "다", "데", "데요", "지", "가", "가요", "다면"],
  "ㄹ": [
    "", "까", "까요", "게", "게요", "래", "래요", "수", "지", "지도", "때",
    "것", "거", "거예요", "테니까", "뿐",
  ],
};

/** Plural marker, which sits between a noun and its particle: 사람들이. */
const PLURAL = "들";

/**
 * Contractions, which fuse a pronoun or 것 with its particle into one syllable
 * and so cannot be reached by stripping suffixes: 나 + 는 is 난, 그것 + 을 is
 * 그걸. They are among the commonest tokens in casual Korean — 난 alone appears
 * 445 times in the Tatoeba corpus — so leaving them unresolved would understate
 * coverage exactly where a learner is most comfortable.
 */
const CONTRACTIONS: Record<string, string> = {
  "난": "나", "날": "나", "내": "나",
  "넌": "너", "널": "너", "네": "너",
  "전": "저", "절": "저", "제": "저",
  "우린": "우리", "우릴": "우리", "저흰": "저희",
  "걘": "그것", "그건": "그것", "그걸": "그것", "그게": "그것",
  "이건": "이것", "이걸": "이것", "이게": "이것",
  "저건": "저것", "저걸": "저것", "저게": "저것",
  "건": "것", "걸": "것", "게": "것",
  "뭘": "무엇", "뭐": "무엇", "뭔": "무엇",
};

export type WordIndex = {
  /** Surface form -> the words that could produce it, most frequent first. */
  byStem: Map<string, Word[]>;
  /** Longest stem in the index, so matching knows where to start. */
  longest: number;
};

export function buildIndex(words: Word[]): WordIndex {
  const byStem = new Map<string, Word[]>();
  let longest = 0;

  const add = (surface: string, word: Word) => {
    if (!surface) return;
    let list = byStem.get(surface);
    if (!list) byStem.set(surface, (list = []));
    list.push(word);
    if (surface.length > longest) longest = surface.length;
  };

  for (const word of words) {
    const conjugates = word.pos !== null && PREDICATE_POS.has(word.pos);
    if (conjugates && word.lemma.endsWith("다")) {
      for (const stem of predicateStems(word.lemma)) add(stem, word);
      // The dictionary form itself appears in text too, in headings and lists.
      add(word.lemma, word);
    } else {
      add(word.lemma, word);
    }
  }

  // Commonest sense wins when a surface is ambiguous — 새 is far more often
  // "new" than "interval", and guessing the rarer one would be a worse default.
  for (const list of byStem.values()) list.sort((a, b) => a.rank - b.rank);

  return { byStem, longest };
}

export type TokenMatch = {
  /** The token as it appeared, minus punctuation. */
  token: string;
  /** The lemma it resolved to, or null when nothing matched. */
  word: Word | null;
};

/**
 * Splits text into candidate words. Korean writes 어절 separated by spaces, so
 * whitespace and punctuation are the only boundaries needed; anything with no
 * Korean in it is dropped rather than counted as an unknown word.
 */
export function tokenize(text: string): string[] {
  return text
    .split(/[\s]+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter((t) => t.length > 0 && [...t].some(isKorean));
}

/**
 * Resolves one token.
 *
 * Both readings are computed and the more frequent wins. 갈 is a stem of 갈다
 * "to plough" *and* 가다 + the adnominal ㄹ, and taking whichever matched first
 * silently turned "갈 거예요" — will go — into ploughing. Frequency is the only
 * signal available without parsing the sentence, and it is a good one: the
 * commoner word is the commoner reading.
 */
export function analyse(token: string, index: WordIndex): Word | null {
  const direct = surfaceAnalysis(token, index);
  const linked = linking(token, index);
  if (direct && linked) return direct.rank <= linked.rank ? direct : linked;
  return direct ?? linked;
}

/** Matching that treats the token as stem plus trailing particles or endings. */
function surfaceAnalysis(token: string, index: WordIndex): Word | null {
  const direct = index.byStem.get(token);
  if (direct) return direct[0];

  for (let cut = token.length; cut >= 1; cut--) {
    const expanded = CONTRACTIONS[token.slice(0, cut)];
    if (!expanded) continue;
    const contracted = index.byStem.get(expanded);
    if (!contracted) continue;
    const rest = token.slice(cut);
    if (rest === "" || PARTICLES.includes(rest)) return contracted[0];
  }

  const limit = Math.min(token.length, index.longest);
  for (let length = limit; length >= 1; length--) {
    const head = token.slice(0, length);
    const candidates = index.byStem.get(head);
    if (!candidates) continue;

    const rest = token.slice(length);
    if (rest.length > MAX_ENDING) continue;

    // A conjugating word takes an ending; anything else takes a particle.
    if (ENDINGS.has(rest)) return candidates[0];
    if (PARTICLES.includes(rest)) return candidates[0];

    // Particles stack — 집에서만, 저에게는 — so allow one more strip. The
    // plural 들 sits in the same slot, ahead of the particle: 사람들이.
    for (const particle of PARTICLES) {
      if (rest.endsWith(particle)) {
        const middle = rest.slice(0, rest.length - particle.length);
        if (
          PARTICLES.includes(middle) ||
          ENDINGS.has(middle) ||
          middle === PLURAL
        ) {
          return candidates[0];
        }
      }
    }

    if (rest === PLURAL) return candidates[0];
  }

  return null;
}

/**
 * Second pass for endings that fuse into the stem's final slot. Walks each
 * position, lifts a linking consonant off, and only accepts the match if what
 * follows is an ending that consonant can actually introduce.
 */
function linking(token: string, index: WordIndex): Word | null {
  const limit = Math.min(token.length, index.longest + 1);
  for (let length = limit; length >= 1; length--) {
    const head = token.slice(0, length);
    const consonant = finalOf(head);
    const allowed = LINKING[consonant];
    if (!allowed) continue;

    const stem = withFinal(head, "");
    const candidates = index.byStem.get(stem);
    if (!candidates) continue;

    const rest = token.slice(length);
    if (allowed.includes(rest)) return candidates[0];
  }
  return null;
}

export function lemmatize(text: string, index: WordIndex): TokenMatch[] {
  return tokenize(text).map((token) => ({
    token,
    word: analyse(token, index),
  }));
}
