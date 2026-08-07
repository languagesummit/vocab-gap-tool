import Link from "next/link";

export const metadata = {
  title: "Credits and licences",
};

type Source = {
  title: string;
  detail: string;
  contributes: string;
  licence: string;
  href?: string;
};

/**
 * Attribution is a licence condition here, not a courtesy — 공공누리 제1유형
 * grants use in exchange for stating the source, so this page is what makes
 * the app's use of that data permitted. Kept as data so nothing silently drops
 * out when the page is restyled.
 */
const SOURCES: Source[] = [
  {
    title: "kengdic",
    detail: "Joe Speigle's open Korean–English dictionary, maintained by garfieldnate.",
    contributes:
      "The English meaning shown for most words. Around 5,700 of the 5,897 entries still carry a gloss joined from kengdic; the rest have been rewritten by hand.",
    licence: "MPL 2.0 (dual-licensed MPL 2.0 / LGPL 2.0+)",
    href: "https://github.com/garfieldnate/kengdic",
  },
  {
    title: "한국어 학습용 어휘 목록",
    detail: "조남호, 국립국어원 (2003). 5,965 words graded A/B/C.",
    contributes: "The 초급 / 중급 / 고급 difficulty grades.",
    licence: "공공누리 제1유형 (출처표시)",
    href: "https://www.korean.go.kr/front/etcData/etcDataView.do?mn_id=46&etc_seq=71",
  },
  {
    title: "국제 통용 한국어 표준 교육과정 적용 연구 (4단계)",
    detail: "국립국어원 (2017). 10,635 words graded 1급–6급.",
    contributes: "TOPIK levels 1 to 6, and the CEFR alignment shown beside them.",
    licence: "공공누리 제1유형 (출처표시)",
    href: "https://www.korean.go.kr/front/reportData/reportDataView.do?mn_id=45&report_seq=932",
  },
  {
    title: "한국어 교육 어휘 내용 개발 (4단계)",
    detail: "국립국어원 (2015). 12,019 words, 6,898 carrying a semantic category.",
    contributes:
      "The meaning categories — 색깔, 동물류, 신체 부위 and the rest — that the gaps page is built on.",
    licence: "공공누리 제1유형 (출처표시)",
    href: "https://www.korean.go.kr/front/reportData/reportDataView.do?mn_id=207&report_seq=882",
  },
  {
    title: "TOPIK 어휘 목록",
    detail: "한국어능력시험 (2015).",
    contributes: "The TOPIK I / TOPIK II tier, which places words the graded curriculum doesn't cover.",
    licence: "공공누리, believed — terms not yet confirmed at source",
  },
  {
    title: "combined_korean_vocabulary_list",
    detail: "julienshim. Merges the two government lists above into one TSV.",
    contributes: "The frequency-ranked list this app ingested.",
    licence: "No licence stated; underlying data is the government lists above",
    href: "https://github.com/julienshim/combined_korean_vocabulary_list",
  },
];

export default function CreditsPage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col gap-6 bg-white px-6 py-12 dark:bg-black">
      <header>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← Home
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-black dark:text-zinc-50">
          Credits and licences
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Where the word list, the meanings, the levels and the categories came
          from
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          None of the language data here is ours. The frequency ranking, the
          English meanings, the difficulty grades, the exam levels and the
          meaning categories were each compiled by someone else and published
          under terms that permit this use. Several of those terms require the
          source to be stated, which is what this page is for.
        </p>
      </section>

      <div className="flex flex-col gap-3">
        {SOURCES.map((s) => (
          <section
            key={s.title}
            className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <h2 className="font-semibold text-black dark:text-zinc-50">
              {s.href ? (
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline decoration-zinc-300 underline-offset-2 hover:decoration-current dark:decoration-zinc-700"
                >
                  {s.title}
                </a>
              ) : (
                s.title
              )}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">{s.detail}</p>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              {s.contributes}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              <span className="text-zinc-400">Licence:</span> {s.licence}
            </p>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="font-semibold text-black dark:text-zinc-50">
          About the gloss data specifically
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          kengdic is copyleft, so the word-list files that carry its glosses stay
          under the Mozilla Public License 2.0 and their source form stays
          available under it. That applies to the data files, not to this
          application — MPL 2.0 is file-scoped and expressly allows covered files
          to sit inside a larger work under other terms.
        </p>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          The full text is in{" "}
          <span className="font-mono text-xs">LICENSES/MPL-2.0.txt</span> in the
          repository, alongside{" "}
          <span className="font-mono text-xs">NOTICE.md</span>, which records
          which files are covered.
        </p>
      </section>

      <p className="text-xs text-zinc-500">
        If you maintain any of these and something here is wrong or
        insufficient, that&apos;s worth fixing — please get in touch.
      </p>
    </main>
  );
}
