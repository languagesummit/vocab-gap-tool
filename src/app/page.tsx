export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8 dark:bg-black">
      <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50">
        Vocab Tracker
      </h1>
      <p className="max-w-md text-center text-lg text-zinc-600 dark:text-zinc-400">
        Test and track your vocabulary knowledge by word frequency, one word at
        a time.
      </p>
      <p className="text-sm text-zinc-400 dark:text-zinc-500">
        Deployment pipeline live — auth coming next.
      </p>
    </main>
  );
}
