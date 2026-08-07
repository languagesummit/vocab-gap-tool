/**
 * Proficiency frameworks — the shape of "how does what you know stack up
 * against this language's test".
 *
 * Nothing in the core knows what TOPIK is. A framework is data: a list of
 * levels, optionally gathered into groups (an exam that sets one paper across
 * several levels), plus the provenance and caveats needed to render it
 * honestly. Adding JLPT, HSK or DELE means adding a definition and a level per
 * word, not touching any of the code that reports on them.
 *
 * A language may have several — an exam grading and a difficulty grading
 * answer different questions and are worth showing side by side — or none, in
 * which case the app simply doesn't offer this view for that language.
 */

export type FrameworkLevel = {
  /** 1-based position. Matches the value stored per word in `Word.lv`. */
  index: number;
  label: string;
  /** Common European Framework equivalent, where one is conventionally drawn. */
  cefr: string | null;
};

/**
 * A set of levels assessed together. TOPIK sets two papers across its six
 * levels, so "am I ready to sit TOPIK II" is a different question from "am I
 * at level 5", and both are worth answering.
 */
export type FrameworkGroup = {
  id: string;
  label: string;
  levels: number[];
  blurb: string;
};

export type Framework = {
  /** Key used in `Word.lv`. */
  id: string;
  name: string;
  fullName: string;
  /**
   * An exam grading places you against a test someone else sets; a difficulty
   * grading is a linguist's judgement of how hard a word is. Keeping them
   * distinct stops the second from being read as a prediction about the first.
   */
  kind: "exam" | "difficulty";
  /** Shown verbatim as the citation. */
  source: string;
  /** What this framework cannot honestly claim. Rendered wherever it appears. */
  caveat: string | null;
  levels: FrameworkLevel[];
  groups: FrameworkGroup[];
  /**
   * Whether words carrying a coarse `tier` but no level should still count
   * toward their group. Lets a second, broader source place words the
   * level-graded source never listed.
   */
  useTierFallback: boolean;
};
