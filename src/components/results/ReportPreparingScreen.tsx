"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { REPORT_BUILDING_STAGE_MS, REPORT_BUILDING_STAGES } from "@/lib/results/report-building-stages";

type Props = {
  title?: string;
  subtitle?: string;
  error?: string | null;
  onBack?: () => void;
};

export function ReportPreparingScreen({
  title = "Building your wellness report",
  subtitle = "We’ll show your full report as soon as everything is ready.",
  error = null,
  onBack,
}: Props) {
  const [stageIndex, setStageIndex] = useState(0);
  const stage = REPORT_BUILDING_STAGES[stageIndex] ?? REPORT_BUILDING_STAGES[0];
  const progressPct = Math.round(((stageIndex + 1) / REPORT_BUILDING_STAGES.length) * 100);

  useEffect(() => {
    const timers = REPORT_BUILDING_STAGES.slice(1).map((_, i) =>
      window.setTimeout(() => setStageIndex(i + 1), (i + 1) * REPORT_BUILDING_STAGE_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f8fa] scheme-light">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute -right-16 top-32 h-80 w-80 rounded-full bg-emerald-200/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-violet-200/20 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="rounded-lg outline-offset-4" aria-label="Pausible home">
            <BrandLogo heightClass="h-7 sm:h-8" withWordmark wordmarkClassName="text-base sm:text-lg" />
          </Link>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              ← Back
            </button>
          ) : (
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Wellness report
            </span>
          )}
        </div>
      </header>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-5xl flex-col items-center justify-center px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12">
          <div
            className={`relative overflow-hidden rounded-[2rem] border border-white/80 bg-linear-to-br ${stage.bg} p-5 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.22)] ring-1 ${stage.ring} sm:p-7`}
          >
            <div
              className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-emerald-500 to-sky-500 opacity-90 transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
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
                    stroke="url(#reportPreparingProgress)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${(progressPct / 100) * 150.8} 150.8`}
                    className="transition-all duration-700 ease-out"
                  />
                  <defs>
                    <linearGradient id="reportPreparingProgress" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#0ea5e9" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 grid place-items-center text-xs font-bold tabular-nums text-slate-800">
                  {progressPct}%
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
                <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
              </div>
            </div>

            <ul className="space-y-3">
              {REPORT_BUILDING_STAGES.map((item, i) => {
                const done = i < stageIndex;
                const active = i === stageIndex;
                return (
                  <li
                    key={item.label}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-500 ${
                      active
                        ? "border-slate-200 bg-white shadow-[0_12px_32px_-24px_rgba(15,23,42,0.18)] ring-1 ring-slate-100"
                        : done
                          ? "border-emerald-200/80 bg-emerald-50/50"
                          : "border-transparent bg-white/40 opacity-50"
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${
                        done
                          ? "bg-emerald-500 text-white"
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
                          active ? "text-slate-950" : done ? "text-emerald-900" : "text-slate-600"
                        }`}
                      >
                        {item.label}
                      </span>
                      {active ? (
                        <span className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <span className="inline-flex gap-1">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:0ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500 [animation-delay:300ms]" />
                          </span>
                          In progress
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>

            {error ? (
              <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
