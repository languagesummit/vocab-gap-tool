/**
 * Where the holes are, by meaning.
 *
 * Frequency order says what to learn next in the abstract; it says nothing
 * about the shape of what you already have. Someone who picked up Korean
 * through conversation can be fluent about work and weather and still not know
 * the word for "purple" — the gap isn't at some frequency rank, it's in a
 * pocket of meaning, and only a semantic tagging can find it.
 *
 * Two different kinds of hole, kept apart because the fix differs:
 *
 *   - **Missed** — asked, and you didn't know it. A genuine gap in knowledge.
 *   - **Unasked** — never put to you. Not a gap in you, a gap in the testing,
 *     and the honest response is to go and test it rather than to conclude
 *     anything.
 *
 * A category that is 90% unasked tells you nothing yet, and sorting it above a
 * category you demonstrably failed would send you off studying the wrong thing.
 * So weakness is ranked on what was actually asked, and reach is reported
 * beside it rather than folded into it.
 */

import type { Word } from "./words";
import type { Progress } from "./progress";
import { pct, type Split } from "./analysis";

export type CategoryNode = Split & {
  label: string;
  /** Words asked and not known — the study list for this pocket of meaning. */
  missed: Word[];
  /** Words never put to you. Test these before drawing conclusions. */
  unasked: Word[];
};

export type MajorCategory = CategoryNode & {
  subs: CategoryNode[];
};

export type Pocket = CategoryNode & { major: string };

/**
 * A way of cutting the vocabulary up. Meaning and part of speech answer
 * genuinely different questions and neither substitutes for the other, so they
 * stay separate cuts rather than being folded into one score.
 *
 * The nesting is what makes the pair earn its keep: part of speech nested
 * under meaning asks "which pockets am I thin on"; meaning nested under part of
 * speech asks "am I weak on adjectives, and about what". Same words, different
 * question.
 *
 * Part of speech also covers all 5,897 words where the semantic tagging reaches
 * 3,151 — verbs especially are mostly untagged — so it is the more complete of
 * the two even though it is the blunter.
 */
export type Dimension = {
  id: string;
  label: string;
  blurb: string;
  major: (word: Word) => string | null;
  sub: (word: Word) => string | null;
  /** Explains what falls outside this cut, and why that's expected. */
  untaggedNote: string;
};

/** Subgroup label for words the nested cut doesn't reach. Never ranked. */
export const UNTAGGED = "(no meaning tag)";

/**
 * English for the 14 major categories. The source labels them in Korean, which
 * is precisely backwards for a tool whose users are learning the language —
 * 인간 as a heading tells a beginner nothing, and being unable to read your own
 * gap report defeats the point. Shown alongside the Korean rather than instead
 * of it, since the Korean is what the source says and worth learning.
 */
export const CATEGORY_EN: Record<string, string> = {
  "인간": "people & the body",
  "개념": "abstract concepts",
  "사회생활": "social life",
  "삶": "life & health",
  "식생활": "food & eating",
  "교육": "education",
  "주생활": "home & housing",
  "경제생활": "money & work",
  "자연": "nature & weather",
  "정치와 행정": "politics & government",
  "동식물": "animals & plants",
  "의생활": "clothing",
  "문화": "arts & culture",
  "종교": "religion",
};


/**
 * English for the 139 subcategories. Same reasoning as the majors, and more
 * pressing: these are the labels a gap actually lands on — being told you are
 * weak at 용모 helps nobody who is still learning what 용모 means.
 */
export const SUBCATEGORY_EN: Record<string, string> = {
  "가사 행위": "housework",
  "가족 행사": "family occasions",
  "감각": "the senses",
  "감정": "emotions",
  "건물 종류": "types of building",
  "경제 산물": "goods & produce",
  "경제 상태": "economic conditions",
  "경제 수단": "money & payment",
  "경제 행위": "buying & selling",
  "경제 행위 장소": "shops & markets",
  "경제 행위 주체": "buyers & sellers",
  "곡류": "grains",
  "곤충류": "insects",
  "공공 기관": "public institutions",
  "과일": "fruit",
  "교수 학습 주체": "teachers & students",
  "교수 학습 행위": "teaching & studying",
  "교육 기관": "schools & colleges",
  "교통 이용 장소": "stations & stops",
  "교통 이용 행위": "travelling & commuting",
  "교통수단": "transport",
  "기상 및 기후": "weather & climate",
  "능력": "ability",
  "대중문화": "popular culture",
  "동물 소리": "animal sounds",
  "동물류": "animals",
  "동물의 부분": "animal body parts",
  "동식물 행위": "what animals & plants do",
  "말": "speech & words",
  "맛": "taste & flavour",
  "매체": "media",
  "모양": "shape",
  "모자, 신발, 장신구": "hats, shoes & accessories",
  "무기": "weapons",
  "문학": "literature",
  "문화 활동": "cultural activities",
  "문화 활동 주체": "artists & performers",
  "문화생활 장소": "cultural venues",
  "미술": "visual art",
  "미용 행위": "grooming & beauty",
  "밝기": "brightness",
  "병과 증상": "illness & symptoms",
  "빈도": "frequency",
  "사람의 종류": "kinds of person",
  "사법 및 치안 주체": "police & courts",
  "사법 및 치안 행위": "law & policing",
  "사회 생활 상태": "social conditions",
  "사회 행사": "social occasions",
  "사회 활동": "social activity",
  "삶의 상태": "states of life",
  "삶의 행위": "life events",
  "색깔": "colours",
  "생리 현상": "bodily functions",
  "생활용품": "household goods",
  "성격": "personality",
  "성질": "qualities",
  "세는 말": "counters",
  "소리": "sound",
  "소통 수단": "means of communication",
  "속도": "speed",
  "수": "numbers",
  "순서": "order & sequence",
  "시간": "time",
  "식물류": "plants",
  "식물의 부분": "parts of plants",
  "식사 및 조리 행위": "eating & cooking",
  "식생활 관련 장소": "restaurants & cafes",
  "식재료": "ingredients",
  "신앙 대상": "objects of worship",
  "신체 내부 구성": "internal organs",
  "신체 변화": "bodily changes",
  "신체 부위": "body parts",
  "신체 행위": "bodily actions",
  "신체에 가하는 행위": "actions done to the body",
  "약품류": "medicines",
  "양": "quantity",
  "언어 행위": "speaking & language use",
  "여가 도구": "leisure equipment",
  "여가 시설": "leisure facilities",
  "여가 활동": "leisure activities",
  "예술": "the arts",
  "온도": "temperature",
  "옷 종류": "types of clothing",
  "옷감": "fabric",
  "옷의 부분": "parts of clothing",
  "용모": "appearance",
  "위치 및 방향": "position & direction",
  "음료": "drinks",
  "음식": "food",
  "음악": "music",
  "의문": "question words",
  "의복 착용 상태": "how clothes are worn",
  "의복 착용 행위": "getting dressed",
  "의생활 관련 장소": "clothes shops",
  "인간관계": "relationships",
  "인지 행위": "thinking & knowing",
  "인칭": "pronouns & person",
  "일상 행위": "daily activities",
  "자원": "resources",
  "재해": "disasters",
  "전공과 교과목": "subjects & majors",
  "전통문화": "traditional culture",
  "접속": "connecting words",
  "정도": "degree",
  "정치 및 치안 상태": "political & security conditions",
  "정치 및 행정 주체": "politicians & officials",
  "정치 및 행정 행위": "politics & administration",
  "조리 도구": "cooking utensils",
  "종교 유형": "religions",
  "종교 행위": "religious practice",
  "종교 활동 도구": "religious objects",
  "종교 활동 장소": "places of worship",
  "종교어": "religious terms",
  "종교인": "religious figures",
  "주거 상태": "housing conditions",
  "주거 지역": "residential areas",
  "주거 행위": "living & housekeeping",
  "주거 형태": "types of housing",
  "주택 구성": "parts of a house",
  "지시": "this & that words",
  "지역": "regions",
  "지표면 사물": "features of the land",
  "지형": "terrain",
  "직업": "occupations",
  "직위": "job titles",
  "직장": "workplace",
  "직장 생활": "working life",
  "채소": "vegetables",
  "천체": "sun, moon & stars",
  "체력 상태": "physical condition",
  "치료 시설": "hospitals & clinics",
  "치료 행위": "treatment & care",
  "친족 관계": "family relations",
  "태도": "attitude",
  "통신 행위": "communicating",
  "학교 시설": "school facilities",
  "학문 용어": "academic terms",
  "학문 행위": "academic work",
  "학습 관련 사물": "school supplies",
};

/**
 * English for a label, wherever it appears. Deliberately not scoped to one
 * dimension: the Korean categories show up as *sub*groups under the
 * part-of-speech cut too, and leaving those unglossed reproduces exactly the
 * problem this solves. Parts of speech are already English and simply miss.
 */
export function englishFor(label: string): string | null {
  return CATEGORY_EN[label] ?? SUBCATEGORY_EN[label] ?? null;
}

export const DIMENSIONS: Dimension[] = [
  {
    id: "pos",
    label: "By word type",
    blurb:
      "Whether the shape of a word predicts whether you know it — nouns against verbs against adjectives, and what each is about.",
    major: (w) => w.pos,
    sub: (w) => w.category,
    untaggedNote: "carry no part-of-speech tag.",
  },
  {
    id: "meaning",
    label: "By subject",
    blurb:
      "Colours, animals, the body, food. Holes here sit at no particular frequency rank, which is why rank-ordered testing can't find them.",
    major: (w) => w.category,
    sub: (w) => w.sub,
    untaggedNote:
      "carry no subject tag. Most are grammar and function words — 것, 하다, -은 — which belong to no subject you could have a hole in. Verbs are also thinly tagged at source.",
  },
];

export type GapAnalysis = {
  majors: MajorCategory[];
  /**
   * The weakest subcategories across every major, so a small hole in a big
   * category is findable. 색깔 sits inside 개념 among twenty-odd siblings —
   * without this you'd have to already suspect the gap to go looking for it,
   * which defeats the purpose.
   */
  weakest: Pocket[];
  /** Subcategories with too little asked to rank, largest first. */
  unexplored: Pocket[];
  /** Words carrying no semantic category — function words, mostly. */
  untagged: number;
  /** Total words that do carry one. */
  tagged: number;
};

const empty = (label: string): CategoryNode => ({
  label,
  known: 0,
  unsure: 0,
  unknown: 0,
  tested: 0,
  total: 0,
  missed: [],
  unasked: [],
});

function add(node: CategoryNode, progress: Progress, word: Word) {
  node.total += 1;
  const record = progress.words[word.key];
  if (!record) {
    node.unasked.push(word);
    return;
  }
  node[record.status] += 1;
  node.tested += 1;
  // "Unsure" means the clock beat you, which is not the same as not knowing —
  // but it's not proof either, so it belongs on the list to revisit.
  if (record.status !== "known") node.missed.push(word);
}

export function analyseGaps(
  progress: Progress,
  words: Word[],
  dimension: Dimension
): GapAnalysis {
  const majors = new Map<string, MajorCategory>();
  let untagged = 0;
  let tagged = 0;

  for (const word of words) {
    const majorLabel = dimension.major(word);
    if (!majorLabel) {
      untagged += 1;
      continue;
    }
    tagged += 1;

    if (!majors.has(majorLabel)) {
      majors.set(majorLabel, { ...empty(majorLabel), subs: [] });
    }
    const major = majors.get(majorLabel)!;
    add(major, progress, word);

    const subLabel = dimension.sub(word) ?? UNTAGGED;
    let sub = major.subs.find((s) => s.label === subLabel);
    if (!sub) {
      sub = empty(subLabel);
      major.subs.push(sub);
    }
    add(sub, progress, word);
  }

  const byRank = (a: Word, b: Word) => a.rank - b.rank;
  for (const major of majors.values()) {
    major.missed.sort(byRank);
    major.unasked.sort(byRank);
    for (const sub of major.subs) {
      sub.missed.sort(byRank);
      sub.unasked.sort(byRank);
    }
    major.subs.sort(compareWeakness);
  }

  // Words the nested cut doesn't reach are grouped so the totals still add up,
  // but never ranked: "untagged" is not a subject you can be weak at.
  const pockets: Pocket[] = [];
  for (const major of majors.values()) {
    for (const sub of major.subs) {
      if (sub.label !== UNTAGGED) pockets.push({ ...sub, major: major.label });
    }
  }

  return {
    majors: [...majors.values()].sort(compareWeakness),
    weakest: pockets
      .filter((p) => isRankable(p) && p.known < p.tested)
      .sort(compareWeakness)
      .slice(0, 10),
    // Biggest first: an unexplored pocket of forty words is worth more of your
    // time than one of three, and neither is evidence of a weakness yet.
    unexplored: pockets
      .filter((p) => !isRankable(p))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
    untagged,
    tagged,
  };
}

/**
 * Weakest first, judged only on what was asked. Categories with nothing asked
 * sink to the bottom: they're unknowns, not weaknesses, and putting them at the
 * top would be indistinguishable from having failed them.
 */
function compareWeakness(a: CategoryNode, b: CategoryNode): number {
  if (a.tested === 0 && b.tested === 0) return b.total - a.total;
  if (a.tested === 0) return 1;
  if (b.tested === 0) return -1;
  const aScore = a.known / a.tested;
  const bScore = b.known / b.tested;
  if (aScore !== bScore) return aScore - bScore;
  return b.total - a.total;
}

/** Share of the category that came back known, over what was asked. */
export function strength(node: CategoryNode): number | null {
  return node.tested === 0 ? null : pct(node.known, node.tested);
}

/** Share of the category that has been asked at all. */
export function reach(node: CategoryNode): number {
  return pct(node.tested, node.total);
}

/**
 * Two different questions, and conflating them hides exactly the finding this
 * page exists for.
 *
 * How much to trust a percentage depends on how many words were *asked*, not
 * on what fraction of the category that was: none of 6 animal words known is
 * strong evidence even though 6 is a fifth of the pocket, while one of 3 known
 * is noise even though 3 is all that was there. Ranking on the fraction put a
 * 3-word sample above a demonstrated hole.
 *
 * So `isRankable` gates comparison on the absolute count, and `isWellSampled`
 * separately asks whether enough of the category has been seen to generalise
 * from. Both get reported; neither stands in for the other.
 */
export const MIN_ASKED = 5;
export const ENOUGH_ASKED = 0.3;

export function isRankable(node: CategoryNode): boolean {
  return node.tested >= MIN_ASKED;
}

export function isWellSampled(node: CategoryNode): boolean {
  return node.total > 0 && node.tested / node.total >= ENOUGH_ASKED;
}
