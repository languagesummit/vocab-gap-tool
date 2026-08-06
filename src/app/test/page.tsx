import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "../setup-notice";
import { Quiz, type Question } from "./quiz";

const BATCH_SIZE = 20;
const DISTRACTOR_POOL = 300;

export default async function TestPage() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: language } = await supabase
    .from("languages")
    .select("id, name")
    .eq("code", "ko")
    .single();

  if (!language) {
    return (
      <Shell>
        <p className="text-zinc-600 dark:text-zinc-400">
          No language is set up yet. Run the schema migration first.
        </p>
      </Shell>
    );
  }

  const { data: settings } = await supabase
    .from("user_language_settings")
    .select("frontier_rank, timer_ms")
    .eq("user_id", user.id)
    .eq("language_id", language.id)
    .maybeSingle();

  const frontier = settings?.frontier_rank ?? 0;
  const timerMs = settings?.timer_ms ?? 3000;

  // Testing runs densely from rank 1 upward, so the frontier alone says where
  // to pick up — no need to diff against everything already answered.
  const { data: words } = await supabase
    .from("words")
    .select("id, frequency_rank, lemma, gloss, part_of_speech")
    .eq("language_id", language.id)
    .gt("frequency_rank", frontier)
    .order("frequency_rank")
    .limit(BATCH_SIZE);

  if (!words || words.length === 0) {
    return (
      <Shell>
        <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Nothing left to test
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          {frontier > 0
            ? `You've cleared all ${frontier.toLocaleString()} ranks in the list.`
            : "The word list hasn't been seeded yet."}
        </p>
        <Link href="/dashboard" className="underline">
          Back to dashboard
        </Link>
      </Shell>
    );
  }

  // Wrong answers are drawn from words in a similar frequency range so they
  // stay plausible — a rank-12 word next to three obscure ones gives the
  // answer away without testing anything.
  const { data: pool } = await supabase
    .from("words")
    .select("gloss, part_of_speech")
    .eq("language_id", language.id)
    .lte("frequency_rank", frontier + 2000)
    .neq("gloss", "")
    .limit(DISTRACTOR_POOL);

  const questions: Question[] = words.map((word) => {
    const sameType = (pool ?? []).filter(
      (p) => p.part_of_speech === word.part_of_speech && p.gloss !== word.gloss
    );
    const anyType = (pool ?? []).filter((p) => p.gloss !== word.gloss);
    const source = sameType.length >= 8 ? sameType : anyType;

    const distractors: string[] = [];
    const seen = new Set([word.gloss]);
    for (const candidate of shuffle(source)) {
      if (distractors.length === 3) break;
      if (seen.has(candidate.gloss)) continue;
      seen.add(candidate.gloss);
      distractors.push(candidate.gloss);
    }

    return {
      wordId: word.id,
      rank: word.frequency_rank,
      lemma: word.lemma,
      answer: word.gloss,
      options: shuffle([word.gloss, ...distractors]),
    };
  });

  return (
    <Quiz
      languageId={language.id}
      questions={questions}
      timerMs={timerMs}
      startingRank={frontier}
    />
  );
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8 text-center dark:bg-black">
      {children}
    </main>
  );
}
