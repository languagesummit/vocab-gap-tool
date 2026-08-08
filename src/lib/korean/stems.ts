/**
 * Generating the surface stems a dictionary form can appear as.
 *
 * Analysing arbitrary Korean into lemmas is hard. But the question this tool
 * asks is narrower — *is this token one of the 5,897 words on our list* — and
 * that inverts the problem into something tractable: take each known lemma,
 * generate the stem shapes it can surface as, and match tokens against those.
 * Generation is deterministic and bounded; full analysis is neither.
 *
 * Three stem shapes cover the overwhelming majority of conjugation:
 *
 *   1. the **plain stem** — 먹다 → 먹, taking endings that begin with a vowel
 *      or a linking 으 (먹으니, 먹는다)
 *   2. the **fused stem**, where 아/어 merges into the stem — 오다 → 와,
 *      하다 → 해, 쓰다 → 써 (와요, 해서, 썼다)
 *   3. the **past stem**, the fused stem carrying ㅆ — 왔, 했, 썼, 먹었
 *
 * Irregular verbs alter the stem before any of that happens, so their variants
 * are generated first and then run through the same fusion.
 */

import {
  decompose,
  finalOf,
  INITIALS,
  medialOf,
  syllableFrom,
  takesA,
  withFinal,
} from "./hangul";

/**
 * Verbs whose stems look irregular but conjugate regularly. Korean spelling
 * gives no way to tell 걷다 "walk" (ㄷ irregular → 걸어) from 걷다 "gather up"
 * (regular → 걷어), so irregularity cannot be derived from the written form
 * and a list is unavoidable. These are the common regular ones that would
 * otherwise be mis-flagged.
 */
const REGULAR_DESPITE_SHAPE = new Set([
  "받다", "믿다", "묻다", "닫다", "얻다", "쏟다", "뜯다",
  "잡다", "좁다", "씹다", "입다", "업다", "접다", "뽑다", "집다",
  "웃다", "벗다", "씻다", "빗다", "솟다",
  "따르다", "치르다", "들르다", "다다르다",
]);

/** Stems ending in 르 that behave regularly rather than doubling to ㄹㄹ. */
const RE_REGULAR = new Set(["따르", "치르", "들르", "다다르", "우르"]);

/**
 * Fuses 아/어 onto a stem, which is where most of Korean's surface variety
 * comes from. Returns null when nothing fuses.
 */
export function fuse(stem: string): string | null {
  if (!stem) return null;

  const final = finalOf(stem);
  const vowel = medialOf(stem);
  const head = stem.slice(0, -1);
  const a = takesA(stem);

  // 하 + 여 → 해. Irregular, extremely common, and worth special-casing.
  if (stem.endsWith("하")) return head + "해";

  // A stem that already ends in a consonant just takes 아/어 as a new syllable.
  if (final) return stem + (a ? "아" : "어");

  // ㅡ drops out entirely: 쓰 + 어 → 써, 아프 + 아 → 아파. Harmony is decided
  // by the syllable *before* the ㅡ, since ㅡ itself is neutral.
  if (vowel === "ㅡ") {
    if (!head) return withVowel(stem, "ㅓ");
    const harmonised = takesA(head) ? "ㅏ" : "ㅓ";
    return withVowel(stem, harmonised);
  }

  const merged: Record<string, string> = {
    "ㅏ": "ㅏ", // 가 + 아 → 가
    "ㅓ": "ㅓ", // 서 + 어 → 서
    "ㅐ": "ㅐ", // 내 + 어 → 내
    "ㅔ": "ㅔ", // 세 + 어 → 세
    "ㅗ": "ㅘ", // 오 + 아 → 와
    "ㅜ": "ㅝ", // 주 + 어 → 줘
    "ㅣ": "ㅕ", // 기 + 어 → 겨
    "ㅚ": "ㅙ", // 되 + 어 → 돼
    "ㅟ": "ㅟ", // 쉬 + 어 → 쉬어 in practice; leave the stem be
    "ㅡ": "ㅓ",
  };

  const result = merged[vowel];
  if (!result) return null;
  return withVowel(stem, result);
}

/** Replaces the vowel of a string's last syllable, keeping initial and final. */
function withVowel(text: string, vowel: string): string {
  const last = text.slice(-1);
  const initial = initialJamoOf(last);
  if (!initial) return text;
  return text.slice(0, -1) + syllableFrom(initial, vowel, finalOf(last));
}

function initialJamoOf(ch: string): string {
  const s = decompose(ch);
  return s ? INITIALS[s.initial] : "";
}

/**
 * The stem shapes a predicate lemma can surface as, before endings attach.
 *
 * Irregulars are applied first, then fusion, so 듣다 yields 듣 (듣고), 들 (들으니)
 * and 들어 / 들었 from the altered stem.
 */
export function predicateStems(lemma: string): string[] {
  if (!lemma.endsWith("다")) return [];
  const base = lemma.slice(0, -1);
  if (!base) return [];

  const regular = REGULAR_DESPITE_SHAPE.has(lemma);
  const stems = new Set<string>([base]);

  // Stems that irregular alternation can produce, each fused separately below.
  const altered = new Set<string>([base]);
  const final = finalOf(base);

  if (!regular) {
    // ㄷ → ㄹ before a vowel: 듣다 → 들어, 걷다 → 걸어
    if (final === "ㄷ") altered.add(withFinal(base, "ㄹ"));

    // ㅂ → 우/오: 돕다 → 도와, 춥다 → 추워. The ㅂ drops and a rounded vowel
    // takes its place, so the fused form is built directly rather than by
    // running the stripped stem through `fuse`.
    if (final === "ㅂ") {
      const stripped = withFinal(base, "");
      altered.add(stripped);
      stems.add(stripped + "우");
      stems.add(stripped + (takesA(base) ? "와" : "워"));
      stems.add(withFinal(stripped + (takesA(base) ? "와" : "워"), "ㅆ"));
    }

    // ㅅ drops before a vowel, but the vowels then sit side by side rather
    // than fusing: 낫다 → 나아 (not 나), 짓다 → 지어. So the fused form is built
    // here directly; running it through `fuse` would contract it wrongly.
    if (final === "ㅅ") {
      const stripped = withFinal(base, "");
      stems.add(stripped);
      const open = stripped + (takesA(base) ? "아" : "어");
      stems.add(open);
      stems.add(withFinal(open, "ㅆ"));
    }

    // 르 doubles the ㄹ: 모르다 → 몰라, 부르다 → 불러
    if (base.endsWith("르") && !RE_REGULAR.has(base)) {
      const head = base.slice(0, -1);
      if (head) {
        const doubled = withFinal(head, "ㄹ") + (takesA(head) ? "라" : "러");
        stems.add(doubled);
        stems.add(withFinal(doubled, "ㅆ"));
      }
    }

    // ㄹ drops before ㄴ/ㅂ/ㅅ: 살다 → 사니, 삽니다, 사세요. It goes into the
    // altered set rather than straight into `stems` so that the honorific and
    // fused forms below are generated from it too — otherwise 사세요 resolves
    // to 사다 and 살다 is never even a candidate.
    if (final === "ㄹ") altered.add(withFinal(base, ""));

    // ㅎ drops in adjectives: 그렇다 → 그래, 빨갛다 → 빨개
    if (final === "ㅎ" && base.length > 1) {
      const stripped = withFinal(base, "");
      const fusedH = withVowel(stripped, takesA(base) ? "ㅐ" : "ㅐ");
      stems.add(stripped);
      stems.add(fusedH);
      stems.add(withFinal(fusedH, "ㅆ"));
    }
  }

  for (const variant of altered) {
    stems.add(variant);
    const f = fuse(variant);
    if (f) {
      stems.add(f);
      stems.add(withFinal(f, "ㅆ")); // past tense: 와 → 왔, 먹어 → 먹었
    }
  }

  // Honorific 시 attaches to the plain stem and then conjugates itself, which
  // is common enough in real text that missing it would look like a bug.
  for (const variant of [...altered]) {
    stems.add(variant + "시");
    stems.add(variant + "세");
    stems.add(variant + "셨");
  }

  return [...stems].filter(Boolean);
}
