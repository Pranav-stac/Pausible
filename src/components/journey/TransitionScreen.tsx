"use client";

import Link from "next/link";

export function TransitionScreen({ attemptId }: { attemptId: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-slate-50 to-sky-50/50 px-5 scheme-light">
      <div className="max-w-md text-center">
        <p className="text-4xl" aria-hidden>
          ✓
        </p>
        <h1 className="mt-6 text-2xl font-black text-slate-950">Personality assessment complete</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Now a few quick questions about your current situation — stress, sleep, goals, and barriers. This takes about
          2–3 minutes.
        </p>
        <Link
          href={`/wellness-context/${encodeURIComponent(attemptId)}`}
          className="mt-10 inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-10 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Continue
        </Link>
      </div>
    </main>
  );
}
