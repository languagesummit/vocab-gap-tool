import Link from "next/link";
import { LANGUAGE_SOURCES, METHOD } from "@/lib/sources";

export const metadata = {
  title: "Sources and method",
};

export default function CreditsPage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col gap-6 bg-white px-6 py-12 dark:bg-black">
      <header>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          ← Home
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-black dark:text-zinc-50">
          Sources and method
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Where the data comes from, and how the numbers are worked out
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          None of the language data here is ours. The frequency ranking, the
          meanings, the difficulty grades, the exam levels, the subject
          categories and the grammar inventory were each compiled by someone
          else and published under terms that permit this use — several of which
          require the source to be stated, which is part of what this page is
          for.
        </p>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          The rest of it is so you can check the reasoning rather than take it
          on trust. Everything below is followable: the sources link to their
          publishers, and what was written here is listed separately from what
          was sourced.
        </p>
      </section>

      {LANGUAGE_SOURCES.map((lang) => (
        <div key={lang.code} className="flex flex-col gap-3">
          <h2 className="mt-2 text-xl font-semibold text-black dark:text-zinc-50">
            {lang.name}
          </h2>

          {lang.sources.map((s) => (
            <section
              key={s.title}
              className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <h3 className="font-semibold text-black dark:text-zinc-50">
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
              </h3>
              <p className="mt-1 text-sm text-zinc-500">{s.attribution}</p>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                {s.provides}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                <span className="text-zinc-400">Licence:</span> {s.licence}
                {s.unverified && (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    unverified
                  </span>
                )}
              </p>
            </section>
          ))}

          <h3 className="mt-4 font-semibold text-black dark:text-zinc-50">
            Written for this project, not sourced
          </h3>
          <p className="-mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            These carry no authority beyond this project. They are listed apart
            from the sources above because presenting our own editorial work as
            though it were published data would be the most misleading thing on
            this page.
          </p>
          {lang.ownWork.map((w) => (
            <section
              key={w.title}
              className="rounded-xl border border-dashed border-zinc-300 p-5 dark:border-zinc-700"
            >
              <h4 className="font-medium text-black dark:text-zinc-50">
                {w.title}
              </h4>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {w.detail}
              </p>
            </section>
          ))}
        </div>
      ))}

      <h2 className="mt-4 text-xl font-semibold text-black dark:text-zinc-50">
        How the numbers work
      </h2>
      <div className="flex flex-col gap-3">
        {METHOD.map((m) => (
          <section
            key={m.question}
            className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <h3 className="font-medium text-black dark:text-zinc-50">
              {m.question}
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {m.answer}
            </p>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="font-semibold text-black dark:text-zinc-50">
          About the gloss data specifically
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          kengdic is copyleft, so the word-list files carrying its meanings stay
          under the Mozilla Public License 2.0 and their source form stays
          available under it. That applies to the data files, not to this
          application — MPL 2.0 is file-scoped and expressly allows covered
          files to sit inside a larger work under other terms. Full text in{" "}
          <span className="font-mono text-xs">LICENSES/MPL-2.0.txt</span>,
          alongside <span className="font-mono text-xs">NOTICE.md</span>.
        </p>
      </section>

      <p className="text-xs text-zinc-500">
        If you maintain one of these sources and something here is wrong or
        insufficient, that&apos;s worth fixing — please get in touch.
      </p>
    </main>
  );
}
