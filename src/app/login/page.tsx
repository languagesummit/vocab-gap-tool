import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white p-8 dark:bg-black">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-black dark:text-zinc-50">
          Sign in
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          No password needed — we&apos;ll email you a sign-in link.
        </p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
