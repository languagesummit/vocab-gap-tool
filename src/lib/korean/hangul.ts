/**
 * Syllable-level Hangul arithmetic.
 *
 * Korean conjugation is not string concatenation. 오다 + 아요 is 와요, not
 * 오아요 — the ending fuses into the stem's final syllable and changes its
 * vowel. 듣다 becomes 들어요, changing a consonant that isn't at the edge of the
 * word. None of that is expressible by appending suffixes, so the lemmatiser
 * needs to take syllables apart and put them back together.
 *
 * A modern Hangul syllable is a single code point built from three slots:
 *
 *   U+AC00 + (initial × 21 + medial) × 28 + final
 *
 * with 19 initials (초성), 21 medials (중성) and 28 finals (종성, the first of
 * which means "no final consonant").
 */

const BASE = 0xac00;
const LAST = 0xd7a3;
const MEDIALS = 21;
const FINALS = 28;

/** 초성 — the leading consonant slot. */
export const INITIALS = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

/** 중성 — the vowel slot. */
export const MEDIALS_LIST = [
  "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ",
  "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ",
];

/** 종성 — the trailing consonant slot. Index 0 is "none". */
export const FINALS_LIST = [
  "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ",
  "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

export type Syllable = {
  /** Index into INITIALS. */
  initial: number;
  /** Index into MEDIALS_LIST. */
  medial: number;
  /** Index into FINALS_LIST; 0 means no final consonant. */
  final: number;
};

export function isHangulSyllable(ch: string): boolean {
  const code = ch.codePointAt(0);
  return code !== undefined && code >= BASE && code <= LAST;
}

/** True for any Korean character, including bare jamo and compatibility forms. */
export function isKorean(ch: string): boolean {
  const code = ch.codePointAt(0);
  if (code === undefined) return false;
  return (
    (code >= BASE && code <= LAST) || // 가-힣
    (code >= 0x1100 && code <= 0x11ff) || // conjoining jamo
    (code >= 0x3130 && code <= 0x318f) // compatibility jamo
  );
}

export function decompose(ch: string): Syllable | null {
  const code = ch.codePointAt(0);
  if (code === undefined || code < BASE || code > LAST) return null;
  const offset = code - BASE;
  return {
    initial: Math.floor(offset / (MEDIALS * FINALS)),
    medial: Math.floor(offset / FINALS) % MEDIALS,
    final: offset % FINALS,
  };
}

export function compose(s: Syllable): string {
  return String.fromCodePoint(
    BASE + (s.initial * MEDIALS + s.medial) * FINALS + s.final
  );
}

/** The final consonant of a string's last syllable, as a jamo ("" if none). */
export function finalOf(text: string): string {
  const last = decompose(text.slice(-1));
  return last ? FINALS_LIST[last.final] : "";
}

/** Replaces the final consonant of the last syllable. `""` removes it. */
export function withFinal(text: string, jamo: string): string {
  const last = decompose(text.slice(-1));
  if (!last) return text;
  const index = FINALS_LIST.indexOf(jamo);
  if (index < 0) return text;
  return text.slice(0, -1) + compose({ ...last, final: index });
}

/** The vowel of a string's last syllable, as a jamo ("" if not a syllable). */
export function medialOf(text: string): string {
  const last = decompose(text.slice(-1));
  return last ? MEDIALS_LIST[last.medial] : "";
}

/**
 * Whether a stem takes 아 or 어 when an ending fuses onto it — 양성모음
 * harmony. ㅏ and ㅗ take 아; everything else takes 어. Historically ㅑ and ㅛ
 * pattern with them, though they are vanishingly rare as stem vowels.
 */
export function takesA(stem: string): boolean {
  const vowel = medialOf(stem);
  return vowel === "ㅏ" || vowel === "ㅗ" || vowel === "ㅑ" || vowel === "ㅛ";
}

/**
 * Attaches a jamo as the initial of a new syllable — used to realise endings
 * that begin with a bare consonant, like the -ㄴ데 of 하는데 or the -ㄹ까 of
 * 갈까, which have no vowel of their own and must ride on the stem.
 */
export function syllableFrom(initial: string, medial: string, final = ""): string {
  const i = INITIALS.indexOf(initial);
  const m = MEDIALS_LIST.indexOf(medial);
  const f = FINALS_LIST.indexOf(final);
  if (i < 0 || m < 0 || f < 0) return "";
  return compose({ initial: i, medial: m, final: f });
}
