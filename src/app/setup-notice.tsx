export function SetupNotice() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        Not configured yet
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        This deployment is missing its Supabase credentials. Add{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-sm dark:bg-zinc-900">
          NEXT_PUBLIC_SUPABASE_URL
        </code>{" "}
        and{" "}
        <code className="rounded bg-zinc-100 px-1 py-0.5 text-sm dark:bg-zinc-900">
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </code>{" "}
        in the Vercel project&apos;s environment variables, then redeploy.
      </p>
    </main>
  );
}
