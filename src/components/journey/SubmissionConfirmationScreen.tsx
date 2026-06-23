"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { fetchAttempt } from "@/lib/data/attempt-service";

const NEXT_STEPS = [
  "Analyze your personality patterns and behavioral tendencies",
  "Match recommendations to your goals, barriers, and lifestyle",
  "Build your personalized four-pillar action plan",
] as const;

export function SubmissionConfirmationScreen({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const afterPath =
    params.get("next") ?? `/after-assessment/${encodeURIComponent(attemptId)}?next=results`;
  const [checking, setChecking] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const attempt = await fetchAttempt(attemptId);
        if (cancelled) return;
        if (!attempt) {
          setLoadError("We could not find your assessment session. Please start again from the home page.");
          return;
        }
        if (!attempt.scores?.persona) {
          router.replace(`/wellness-context/${encodeURIComponent(attemptId)}`);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Could not load your session.");
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId, router]);

  const handleContinue = useCallback(() => {
    router.push(
      `/report-building/${encodeURIComponent(attemptId)}?next=${encodeURIComponent(afterPath)}`,
    );
  }, [afterPath, attemptId, router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] text-sm text-slate-500">
        Confirming your responses…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f8fa] px-5 text-center">
        <p className="text-sm text-red-700">{loadError}</p>
        <Link href="/" className="mt-6 text-sm font-semibold text-sky-700 hover:text-sky-900">
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] scheme-light">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute -right-16 top-32 h-80 w-80 rounded-full bg-sky-200/25 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="rounded-lg outline-offset-4" aria-label="Pausible home">
            <BrandLogo heightClass="h-7 sm:h-8" withWordmark wordmarkClassName="text-base sm:text-lg" />
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Step 2 complete
          </span>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-lg flex-col items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full rounded-[2rem] border border-white/80 bg-white p-8 text-center shadow-[0_28px_70px_-40px_rgba(15,23,42,0.18)] ring-1 ring-slate-100 sm:p-10">
          <div
            className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-linear-to-br from-emerald-500 to-teal-600 text-2xl font-bold text-white shadow-lg shadow-emerald-500/25"
            aria-hidden
          >
            ✓
          </div>

          <h1 className="mt-7 text-2xl font-black tracking-tight text-slate-950 sm:text-[1.75rem]">
            Your responses are saved
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Thank you for completing the wellness questionnaire. We&apos;ve recorded your answers and are ready to
            build your personalized intelligence report.
          </p>

          <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50/80 px-5 py-5 text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">What happens next</p>
            <ul className="mt-4 space-y-3">
              {NEXT_STEPS.map((step) => (
                <li key={step} className="flex items-start gap-3 text-sm leading-snug text-slate-700">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                    ✓
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className="mt-9 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-slate-950 px-10 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            Build my report
            <span className="ml-1.5" aria-hidden>
              →
            </span>
          </button>

          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            This usually takes about 15 seconds. Your answers are saved — you can close this tab and return anytime.
          </p>
        </div>
      </div>
    </main>
  );
}
