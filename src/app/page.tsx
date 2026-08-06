import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white p-8 dark:bg-black">
      <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50">
        Vocab Tracker
      </h1>
      <p className="max-w-md text-center text-lg text-zinc-600 dark:text-zinc-400">
        Test and track your vocabulary knowledge by word frequency, one word at
        a time.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-black px-6 py-3 font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
      >
        Sign in
      </Link>
    </main>
  );
}
