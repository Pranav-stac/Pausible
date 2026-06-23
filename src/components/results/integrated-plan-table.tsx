"use client";

import type { ReactNode } from "react";
import type { IntegratedPlanSynthesis, PlanOutput } from "@/lib/recommendations/types";
import { INTEGRATED_PLAN_GUIDING_PRINCIPLES } from "@/lib/recommendations/plan/plan-guiding-principles";
import { splitPlanLine } from "@/lib/results/plan-line-format";

const PLAN_PHASE_STYLES: Record<number, { header: string }> = {
  1: { header: "bg-sky-600 text-white" },
  2: { header: "bg-emerald-600 text-white" },
  3: { header: "bg-violet-600 text-white" },
};

function PlanVerticalRail({ label }: { label: string }) {
  return (
    <div
      className="flex w-8 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-50 py-3"
      aria-label={label}
    >
      <span
        className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500"
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        {label}
      </span>
    </div>
  );
}

function PlanTableSectionRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex border-b border-slate-200 last:border-b-0">
      <PlanVerticalRail label={label} />
      <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-slate-200">{children}</div>
    </div>
  );
}

function PlanPhaseCell({ children }: { children: ReactNode }) {
  return <div className="p-2.5">{children}</div>;
}

function PlanRhythmBullet({ text }: { text: string }) {
  const { headline, subheadline } = splitPlanLine(text);
  if (!headline) return null;
  return (
    <li className="space-y-0.5">
      <p className="text-[10px] leading-snug text-slate-800">
        <span className="text-slate-400">→ </span>
        <span className="font-bold">{headline}</span>
      </p>
      {subheadline ? (
        <p className="pl-3 text-[9px] leading-snug text-slate-500">{subheadline}</p>
      ) : null}
    </li>
  );
}

export function IntegratedPlanGuidingPrinciples({ className = "mb-4" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 ${className}`}>
      <ul className="space-y-1">
        {INTEGRATED_PLAN_GUIDING_PRINCIPLES.slice(0, 4).map((principle) => (
          <li key={principle} className="flex gap-2 text-[11px] leading-snug text-slate-700">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-500" aria-hidden />
            {principle}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Shared phased plan table — same data on wellness report slide 9 and coach guide. */
export function IntegratedPlanTable({
  planOutput,
  integratedPlan,
}: {
  planOutput: PlanOutput;
  integratedPlan: IntegratedPlanSynthesis;
}) {
  const phaseCopy = new Map(integratedPlan.phases.map((p) => [p.phase_number, p]));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex border-b border-slate-200">
        <div className="w-8 shrink-0 border-r border-slate-200 bg-slate-50" aria-hidden />
        <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-slate-200">
          {planOutput.phases.map((phase) => {
            const styles = PLAN_PHASE_STYLES[phase.phase_number] ?? PLAN_PHASE_STYLES[3];
            return (
              <div key={phase.phase_number} className={`px-2.5 py-2 ${styles.header}`}>
                <p className="text-[9px] font-bold uppercase tracking-wide">
                  Phase {phase.phase_number} · {phase.approx_duration_weeks}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        <div className="w-8 shrink-0 border-r border-slate-200 bg-slate-50" aria-hidden />
        <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-slate-200">
          {planOutput.phases.map((phase) => {
            const copy = phaseCopy.get(phase.phase_number);
            const intent = copy?.phase_intent_user ?? phase.intent;
            return (
              <PlanPhaseCell key={phase.phase_number}>
                <p className="text-xs font-bold leading-snug text-slate-900">{phase.name}</p>
                <p className="mt-1 text-[10px] italic leading-snug text-slate-600">{intent}</p>
              </PlanPhaseCell>
            );
          })}
        </div>
      </div>

      <PlanTableSectionRow label="Anchor">
        {planOutput.phases.map((phase) => {
          const copy = phaseCopy.get(phase.phase_number);
          const anchorText = copy?.anchor_habit_user ?? phase.anchor_habit.text;
          const anchor = splitPlanLine(anchorText);
          return (
            <PlanPhaseCell key={phase.phase_number}>
              <p className="text-[10px] font-bold leading-snug text-slate-900">{anchor.headline}</p>
              {anchor.subheadline ? (
                <p className="mt-0.5 text-[10px] leading-snug text-slate-600">{anchor.subheadline}</p>
              ) : null}
            </PlanPhaseCell>
          );
        })}
      </PlanTableSectionRow>

      <PlanTableSectionRow label="Daily">
        {planOutput.phases.map((phase) => {
          const copy = phaseCopy.get(phase.phase_number);
          const dailyLines =
            copy?.daily_rhythm_user?.length
              ? copy.daily_rhythm_user
              : phase.daily_rhythm.slice(0, 3).map((item) => item.text);
          return (
            <PlanPhaseCell key={phase.phase_number}>
              {dailyLines.length > 0 ? (
                <ul className="space-y-1.5">
                  {dailyLines.map((text, i) => (
                    <PlanRhythmBullet key={`${phase.phase_number}-daily-${i}`} text={text} />
                  ))}
                </ul>
              ) : (
                <p className="text-[10px] text-slate-400">—</p>
              )}
            </PlanPhaseCell>
          );
        })}
      </PlanTableSectionRow>

      <PlanTableSectionRow label="Weekly">
        {planOutput.phases.map((phase) => {
          const copy = phaseCopy.get(phase.phase_number);
          const weeklyLines =
            copy?.weekly_rhythm_user?.length
              ? copy.weekly_rhythm_user
              : phase.weekly_rhythm.slice(0, 3).map((item) => item.text);
          return (
            <PlanPhaseCell key={phase.phase_number}>
              {weeklyLines.length > 0 ? (
                <ul className="space-y-1.5">
                  {weeklyLines.map((text, i) => (
                    <PlanRhythmBullet key={`${phase.phase_number}-weekly-${i}`} text={text} />
                  ))}
                </ul>
              ) : (
                <p className="text-[10px] text-slate-400">—</p>
              )}
            </PlanPhaseCell>
          );
        })}
      </PlanTableSectionRow>

      <PlanTableSectionRow label="Advance">
        {planOutput.phases.map((phase) => {
          const copy = phaseCopy.get(phase.phase_number);
          const readiness = copy?.readiness_signal_user ?? phase.readiness_signal.description;
          return (
            <PlanPhaseCell key={phase.phase_number}>
              <p className="text-[10px] italic leading-snug text-slate-600">{readiness}</p>
            </PlanPhaseCell>
          );
        })}
      </PlanTableSectionRow>
    </div>
  );
}
