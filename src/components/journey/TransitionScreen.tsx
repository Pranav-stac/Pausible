"use client";

import Link from "next/link";

import {
  APP_BODY,
  APP_HEADING_MD,
  APP_PAGE_BG_SOFT,
  CTA_PRIMARY_CLASS,
} from "@/components/marketing/marketing-brand";

export function TransitionScreen({ attemptId }: { attemptId: string }) {
  return (
    <main className={`flex ${APP_PAGE_BG_SOFT} min-h-screen items-center justify-center px-5`}>
      <div className="max-w-md text-center">
        <div
          className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-linear-to-br from-[#00C9C8] to-[#2D82FF] text-2xl font-bold text-white shadow-[0_8px_24px_-6px_rgba(45,130,255,0.45)]"
          aria-hidden
        >
          ✓
        </div>
        <h1 className={`mt-6 ${APP_HEADING_MD}`}>Personality assessment complete</h1>
        <p className={`mt-4 ${APP_BODY}`}>
          Now a few quick questions about your current situation — stress, sleep, goals, and barriers. This takes about
          2–3 minutes.
        </p>
        <Link
          href={`/wellness-context/${encodeURIComponent(attemptId)}`}
          className={`mt-10 ${CTA_PRIMARY_CLASS}`}
        >
          Continue
        </Link>
      </div>
    </main>
  );
}
