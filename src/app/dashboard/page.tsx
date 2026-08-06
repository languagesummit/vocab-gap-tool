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

      <div className="flex flex-col items-center justify-center gap-3 p-16 text-center">
        <h2 className="text-2xl font-semibold text-black dark:text-zinc-50">
          You&apos;re signed in 🎉
        </h2>
        <p className="max-w-md text-zinc-600 dark:text-zinc-400">
          This is the app shell. Next up: the Korean word list and per-word
          testing.
        </p>
      </div>
    </main>
  );
}
