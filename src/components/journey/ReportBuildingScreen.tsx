"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppPageShell } from "@/components/AppPageShell";
import {
  APP_BODY,
  APP_HEADING_MD,
  APP_MUTED,
  BRAND_ACCENT_TEXT,
  FORM_CARD_CLASS,
} from "@/components/marketing/marketing-brand";
import { fetchAttempt } from "@/lib/data/attempt-service";
import { REPORT_BUILDING_STAGE_MS, REPORT_BUILDING_STAGES } from "@/lib/results/report-building-stages";

const STAGE_MS = REPORT_BUILDING_STAGE_MS;
const STAGES = REPORT_BUILDING_STAGES;
const MIN_DISPLAY_MS = 15000;
const MAX_WAIT_MS = 45000;

export function ReportBuildingScreen({
  attemptId,
  nextPath,
}: {
  attemptId: string;
  nextPath?: string;
}) {
  const router = useRouter();
  const [stageIndex, setStageIndex] = useState(0);
  const [prefetchError, setPrefetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let navigated = false;

    const stageTimers = STAGES.slice(1).map((_, i) =>
      window.setTimeout(() => {
        if (!cancelled) setStageIndex(i + 1);
      }, (i + 1) * STAGE_MS),
    );

    const go = () => {
      if (cancelled || navigated) return;
      navigated = true;
      router.replace(nextPath ?? `/results/${encodeURIComponent(attemptId)}`);
    };

    async function prefetchActionPlan() {
      try {
        const attempt = await fetchAttempt(attemptId);
        if (cancelled || !attempt) return;

        const res = await fetch("/api/recommendations/action-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: attempt.id,
            answers: attempt.answers,
            scores: attempt.scores ?? null,
          }),
        });

        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          if (!cancelled) setPrefetchError(json.error ?? "Could not pre-build your action plan.");
        }
      } catch {
        if (!cancelled) setPrefetchError("We’ll finish building your plan on the results page.");
      }
    }

    const hardTimeout = window.setTimeout(go, MAX_WAIT_MS);

    void (async () => {
      await Promise.all([prefetchActionPlan(), new Promise((r) => setTimeout(r, MIN_DISPLAY_MS))]);
      go();
    })();

    return () => {
      cancelled = true;
      stageTimers.forEach(clearTimeout);
      clearTimeout(hardTimeout);
    };
  }, [attemptId, nextPath, router]);

  const stage = STAGES[stageIndex];
  const progressPct = Math.round(((stageIndex + 1) / STAGES.length) * 100);

  return (
    <AppPageShell stepLabel="Step 3 · Report" contentClassName="!max-w-5xl">
      <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center py-6 sm:py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12">
          <div
            className={`relative overflow-hidden rounded-[2rem] border border-white/80 bg-linear-to-br ${stage.bg} p-5 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.22)] ring-1 ${stage.ring} sm:p-7`}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r opacity-90 transition-all duration-700 ease-out" style={{ width: `${progressPct}%` }} />
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.35rem] bg-white/70 shadow-inner">
              <Image
                key={stage.image}
                src={stage.image}
                alt=""
                fill
                priority
                className="object-cover transition-opacity duration-500"
                sizes="(max-width: 1024px) 100vw, 520px"
              />
            </div>
            <p className="mt-5 text-center text-xs font-medium text-slate-600 sm:text-sm">{stage.detail}</p>
          </div>

          <div className="flex flex-col">
            <div className="mb-6 flex items-center gap-4">
              <div className="relative h-14 w-14 shrink-0">
                <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56" aria-hidden>
                  <circle cx="28" cy="28" r="24" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    fill="none"
                    stroke="url(#reportProgress)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${(progressPct / 100) * 150.8} 150.8`}
                    className="transition-all duration-700 ease-out"
                  />
                  <defs>
                    <linearGradient id="reportProgress" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00C9C8" />
                      <stop offset="100%" stopColor="#2D82FF" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 grid place-items-center text-xs font-bold tabular-nums text-slate-800">
                  {progressPct}%
                </span>
              </div>
              <div>
                <h1 className={APP_HEADING_MD}>Building your wellness report</h1>
                <p className={`mt-1 ${APP_MUTED}`}>This usually takes about 15 seconds.</p>
              </div>
            </div>

            <ul className="space-y-3">
              {STAGES.map((item, i) => {
                const done = i < stageIndex;
                const active = i === stageIndex;
                return (
                  <li
                    key={item.label}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-500 ${
                      active
                        ? `${FORM_CARD_CLASS} !p-4`
                        : done
                          ? "border-[#00C9C8]/30 bg-[#F7F9FB]"
                          : "border-transparent bg-white/40 opacity-50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${
                        done
                          ? "bg-linear-to-br from-[#00C9C8] to-[#2D82FF] text-white"
                          : active
                            ? `bg-linear-to-br ${item.accent} text-white shadow-md`
                            : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-sm font-semibold leading-snug ${
                          active ? "text-[#0D1B2A]" : done ? BRAND_ACCENT_TEXT : "text-[#4D4D4D]"
                        }`}
                      >
                        {item.label}
                      </span>
                      {active ? (
                        <span className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <span className="inline-flex gap-1">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00C9C8] [animation-delay:0ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#2D82FF] [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00C9C8] [animation-delay:300ms]" />
                          </span>
                          In progress
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>

            {prefetchError ? (
              <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {prefetchError}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </AppPageShell>
  );
}
