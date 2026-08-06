import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: language } = await supabase
    .from("languages")
    .select("id, name")
    .eq("code", "ko")
    .single();

  let frontier = 0;
  let total = 0;
  let known = 0;
  let unsure = 0;
  let unknown = 0;

  if (language) {
    const [settings, totalCount, knownCount, unsureCount, unknownCount] =
      await Promise.all([
        supabase
          .from("user_language_settings")
          .select("frontier_rank")
          .eq("user_id", user.id)
          .eq("language_id", language.id)
          .maybeSingle(),
        supabase
          .from("words")
          .select("id", { count: "exact", head: true })
          .eq("language_id", language.id),
        supabase
          .from("user_words")
          .select("word_id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "known"),
        supabase
          .from("user_words")
          .select("word_id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "unsure"),
        supabase
          .from("user_words")
          .select("word_id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "unknown"),
      ]);

    frontier = settings.data?.frontier_rank ?? 0;
    total = totalCount.count ?? 0;
    known = knownCount.count ?? 0;
    unsure = unsureCount.count ?? 0;
    unknown = unknownCount.count ?? 0;
  }

  const tested = known + unsure + unknown;
  const pct = total > 0 ? Math.round((frontier / total) * 100) : 0;

  return (
    <main className="min-h-screen bg-white dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h1 className="font-bold text-black dark:text-zinc-50">
          Vocab Tracker
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500">{user.email}</span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-black transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Korean
          </h2>
          <p className="mt-2 text-3xl font-semibold text-black dark:text-zinc-50">
            {frontier > 0
              ? `Cleared ranks 1–${frontier.toLocaleString()}`
              : "Not started"}
          </p>
          <p className="mt-1 text-zinc-500">
            {total > 0
              ? `${pct}% of ${total.toLocaleString()} words in the list`
              : "Word list not seeded yet"}
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
            <div
              className="h-full rounded-full bg-black dark:bg-zinc-50"
              style={{ width: `${pct}%` }}
            />
          </div>
        </section>

        <section className="grid grid-cols-3 gap-4">
          <Stat label="Known" value={known} tone="text-emerald-600" />
          <Stat label="Unsure" value={unsure} tone="text-amber-600" />
          <Stat label="Unknown" value={unknown} tone="text-red-600" />
        </section>

        <Link
          href="/test"
          className="rounded-lg bg-black px-6 py-4 text-center text-lg font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
        >
          {tested > 0 ? "Continue testing" : "Start testing"}
        </Link>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className={`text-2xl font-semibold ${tone}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-zinc-500">{label}</div>
    </div>
  );
}
