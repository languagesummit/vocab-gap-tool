/**
 * Decodes the two proficiency gradings the source list carries.
 *
 * The raw TSV combines two different published lists, and its header labels
 * them the wrong way round — the column named `topik_level` holds the NIKL
 * grade and the one named `nikl_level` holds the TOPIK tier. The values make
 * this unambiguous:
 *
 *   - A/B/C, counting 960/2,081/2,856, is 국립국어원's 한국어 학습용 어휘 목록
 *     (조남호, 2003), whose published grades are 982/2,111/2,872 — A=초급,
 *     B=중급, C=고급. Ours run slightly short because the parser drops rows
 *     with no frequency rank (unranked affixes such as -가13).
 *   - 초급/중급, with no 고급 at all and 1,438 blanks, is the 2015 TOPIK list.
 *     TOPIK stopped grading vocabulary in three tiers when the 2014 reform
 *     merged 초급/중급/고급 into TOPIK I and TOPIK II, so two tiers plus
 *     "not on the list" is exactly the shape that list has.
 *
 * `data/korean_seed.json` was written before this was worked out and still
 * carries the swapped key names. Rebuilding it needs kengdic, which isn't in
 * the repo, so rather than rewrite 2.8 MB of generated data this reads either
 * spelling and returns the corrected pair. Anything parsed from here on gets
 * the honest names (`nikl_grade`, `topik_tier`) via parse-korean-list.mjs.
 */

/** NIKL 등급: beginner / intermediate / advanced. */
const NIKL_GRADES = new Set(["A", "B", "C"]);

/** TOPIK tiers, as the source spells them. */
const TOPIK_TIERS = new Set(["초급", "중급"]);

/**
 * Returns `{ niklGrade, topikTier }` for a seed row's `notes`, regardless of
 * which spelling of the keys it was written with. Values are sorted by shape
 * rather than by key name, so a file with the keys the right way round and one
 * with them swapped both decode correctly.
 */
export function decodeLevels(notes = {}) {
  const values = [
    notes.nikl_grade,
    notes.topik_tier,
    notes.nikl_level,
    notes.topik_level,
  ];

  let niklGrade = null;
  let topikTier = null;
  for (const value of values) {
    if (!value) continue;
    if (NIKL_GRADES.has(value)) niklGrade ??= value;
    else if (TOPIK_TIERS.has(value)) topikTier ??= value;
  }

  return { niklGrade, topikTier };
}

/** `초급` -> `I`, `중급` -> `II`, absent -> null (not on the TOPIK list). */
export function topikTierCode(tier) {
  if (tier === "초급") return "I";
  if (tier === "중급") return "II";
  return null;
}
