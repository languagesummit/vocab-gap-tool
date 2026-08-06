"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Answer = {
  wordId: string;
  status: "known" | "unsure" | "unknown";
  responseMs: number | null;
  timedOut: boolean;
};

export async function saveSession(
  languageId: string,
  answers: Answer[],
  highestRank: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not signed in");

  if (answers.length > 0) {
    const { error: wordsError } = await supabase.from("user_words").upsert(
      answers.map((a) => ({
        user_id: user.id,
        word_id: a.wordId,
        status: a.status,
        determined_by: "translation_mc" as const,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "user_id,word_id" }
    );
    if (wordsError) throw new Error(wordsError.message);

    // Append-only log; keeps the full answer history for retesting and stats.
    const { error: eventsError } = await supabase.from("test_events").insert(
      answers.map((a) => ({
        user_id: user.id,
        word_id: a.wordId,
        test_kind: "translation_mc" as const,
        outcome: a.status,
        response_ms: a.responseMs,
        timed_out: a.timedOut,
      }))
    );
    if (eventsError) throw new Error(eventsError.message);
  }

  // The frontier only ever moves forward, so re-testing an earlier range
  // can't drag reported progress backwards.
  const { data: existing } = await supabase
    .from("user_language_settings")
    .select("frontier_rank")
    .eq("user_id", user.id)
    .eq("language_id", languageId)
    .maybeSingle();

  const frontier = Math.max(existing?.frontier_rank ?? 0, highestRank);

  const { error: settingsError } = await supabase
    .from("user_language_settings")
    .upsert(
      {
        user_id: user.id,
        language_id: languageId,
        frontier_rank: frontier,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,language_id" }
    );
  if (settingsError) throw new Error(settingsError.message);

  revalidatePath("/dashboard");
  revalidatePath("/test");
}
