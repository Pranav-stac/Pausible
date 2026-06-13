"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const STAGES = [
  "Analyzing your personality patterns…",
  "Identifying your blind spots…",
  "Matching recommendations to your profile…",
  "Building your personalized action plan…",
] as const;

export function ReportBuildingScreen({
  attemptId,
  nextPath,
}: {
  attemptId: string;
  nextPath?: string;
}) {
  const router = useRouter();
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const timers = STAGES.map((_, i) =>
      window.setTimeout(() => setStageIndex(i), i * 1400),
    );
    const done = window.setTimeout(() => {
      router.replace(nextPath ?? `/results/${encodeURIComponent(attemptId)}`);
    }, STAGES.length * 1400 + 800);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [attemptId, nextPath, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white scheme-dark">
      <div className="max-w-md text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        <h1 className="mt-8 text-xl font-bold">Building your wellness report</h1>
        <ul className="mt-8 space-y-3 text-left text-sm text-white/80">
          {STAGES.map((label, i) => (
            <li
              key={label}
              className={`flex items-center gap-3 transition-opacity ${i <= stageIndex ? "opacity-100" : "opacity-30"}`}
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  i < stageIndex ? "bg-emerald-500" : i === stageIndex ? "bg-white text-slate-950" : "bg-white/10"
                }`}
              >
                {i < stageIndex ? "✓" : i + 1}
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
