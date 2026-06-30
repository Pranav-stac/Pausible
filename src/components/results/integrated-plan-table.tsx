"use client";

import type { ReactNode } from "react";
import type { IntegratedPlanSynthesis, PlanOutput, PillarName } from "@/lib/recommendations/types";
import { formatPhaseWeekLabel } from "@/lib/recommendations/plan/plan-phase-display";
import {
  INTEGRATED_PLAN_BUILT_NARRATIVE_TITLE,
  INTEGRATED_PLAN_GUIDING_PRINCIPLES,
  INTEGRATED_PLAN_GUIDING_PRINCIPLES_TITLE,
} from "@/lib/recommendations/plan/plan-guiding-principles";

type PhaseTheme = {
  accent: string;
  bg: string;
  rhythmLabel: string;
};

const PHASE_THEMES: Record<number, PhaseTheme> = {
  1: {
    accent: "#3474B4",
    bg: "rgba(52, 116, 180, 0.07)",
    rhythmLabel: "rgba(52, 116, 180, 0.65)",
  },
  2: {
    accent: "#4CAF50",
    bg: "rgba(76, 175, 80, 0.07)",
    rhythmLabel: "rgba(76, 175, 80, 0.65)",
  },
  3: {
    accent: "#9C27B0",
    bg: "rgba(156, 39, 176, 0.07)",
    rhythmLabel: "rgba(156, 39, 176, 0.65)",
  },
  4: {
    accent: "#5E35B1",
    bg: "rgba(94, 53, 177, 0.07)",
    rhythmLabel: "rgba(94, 53, 177, 0.65)",
  },
};

const DEFAULT_THEME = PHASE_THEMES[3]!;

const PLAN_SECTION_ROWS = [
  { key: "anchor", label: "Anchor Habit" },
  { key: "daily", label: "Daily Rhythm" },
  { key: "weekly", label: "Weekly Rhythm" },
  { key: "advance", label: "Ready to Advance When" },
] as const;

function phaseTheme(phaseNumber: number): PhaseTheme {
  return PHASE_THEMES[phaseNumber] ?? DEFAULT_THEME;
}

function PlanVerticalRail({ label }: { label: string }) {
  return (
    <div
      className="flex w-[4.5rem] shrink-0 items-center justify-center border-r border-slate-200/80 bg-slate-50 px-1 py-4"
      aria-label={label}
    >
      <span
        className="text-[7px] font-bold uppercase leading-tight tracking-[0.08em] text-slate-500"
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        {label}
      </span>
    </div>
  );
}

const PILLAR_ICON_COLORS: Record<PillarName, string> = {
  Nutrition: "#10b981",
  "Physical Activity": "#3b82f6",
  "Sleep & Recovery": "#8b5cf6",
  "Mental Wellness": "#f59e0b",
};

function PhasePillarIndicators({ distribution }: { distribution: Record<PillarName, number> }) {
  const entries = (Object.entries(distribution) as [PillarName, number][]).filter(([, n]) => n > 0);
  if (!entries.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {entries.map(([pillar, count]) => (
        <span
          key={pillar}
          className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-semibold text-slate-600 ring-1 ring-slate-200"
          title={pillar}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: PILLAR_ICON_COLORS[pillar] }}
            aria-hidden
          />
          {count}
        </span>
      ))}
    </div>
  );
}

function PlanPhaseHeader({
  phaseNumber,
  weekLabel,
  name,
  intent,
  muted,
  startHere,
  pillarDistribution,
}: {
  phaseNumber: number;
  weekLabel: string;
  name: string;
  intent: string;
  muted?: boolean;
  startHere?: boolean;
  pillarDistribution?: Record<PillarName, number>;
}) {
  const theme = phaseTheme(phaseNumber);

  return (
    <div
      className={`min-w-0 px-4 py-5 ${muted ? "opacity-55" : ""}`}
      style={{
        backgroundColor: theme.bg,
        borderTop: `3px solid ${theme.accent}`,
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.06em]"
          style={{ color: theme.accent }}
        >
          Phase {phaseNumber} · {weekLabel}
        </p>
        {startHere ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-800">
            Start here
          </span>
        ) : null}
      </div>
      <h3 className="mt-2 text-lg font-bold leading-tight text-slate-900">{name}</h3>
      <p className="mt-2 text-sm italic leading-relaxed text-slate-600">{intent}</p>
      {pillarDistribution ? <PhasePillarIndicators distribution={pillarDistribution} /> : null}
    </div>
  );
}

function PlanColumnSectionLabel({
  children,
  color,
}: {
  children: string;
  color: string;
}) {
  return (
    <p
      className="text-[11px] font-bold uppercase tracking-[0.06em]"
      style={{ color }}
    >
      {children}
    </p>
  );
}

function PlanPhaseCell({
  phaseNumber,
  sectionLabel,
  labelColor,
  muted,
  children,
}: {
  phaseNumber: number;
  sectionLabel: string;
  labelColor: string;
  muted?: boolean;
  children: ReactNode;
}) {
  const theme = phaseTheme(phaseNumber);
  return (
    <div className={`min-w-0 px-4 py-4 ${muted ? "opacity-55" : ""}`} style={{ backgroundColor: theme.bg }}>
      <PlanColumnSectionLabel color={labelColor}>{sectionLabel}</PlanColumnSectionLabel>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function PlanRhythmList({ lines }: { lines: string[] }) {
  if (!lines.length) {
    return <p className="text-sm text-slate-400">—</p>;
  }
  return (
    <ul className="space-y-2">
      {lines.map((text, i) => {
        const line = text.trim();
        if (!line) return null;
        return (
          <li key={i} className="flex gap-1.5 text-sm leading-snug text-slate-600">
            <span className="shrink-0 text-slate-400" aria-hidden>
              →
            </span>
            <span>{line}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function IntegratedPlanGuidingPrinciples({ className = "mb-4" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-sky-200 bg-sky-50/70 px-3.5 py-3 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-sky-800">
        {INTEGRATED_PLAN_GUIDING_PRINCIPLES_TITLE}
      </p>
      <ul className="mt-2 space-y-1">
        {INTEGRATED_PLAN_GUIDING_PRINCIPLES.map((principle) => (
          <li key={principle} className="flex gap-2 text-[11px] leading-snug text-slate-700">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-500" aria-hidden />
            {principle}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function IntegratedPlanBuiltNarrative({
  narrative,
  className = "mt-4",
}: {
  narrative: string;
  className?: string;
}) {
  const text = narrative.trim();
  if (!text) return null;
  return (
    <div className={className}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
        {INTEGRATED_PLAN_BUILT_NARRATIVE_TITLE}
      </p>
      <p className="mt-1.5 text-[10px] leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}

/** Phased integrated plan — vertical section rails + colored phase columns (report + coach guide). */
export function IntegratedPlanTable({
  planOutput,
  integratedPlan,
}: {
  planOutput: PlanOutput;
  integratedPlan: IntegratedPlanSynthesis;
}) {
  const phaseCopy = new Map(integratedPlan.phases.map((p) => [p.phase_number, p]));
  const overwhelmSafe = planOutput.show_all_phases === false;
  const visiblePhases = planOutput.phases;
  const phaseCount = visiblePhases.length;
  const phaseGridStyle = { gridTemplateColumns: `repeat(${phaseCount}, minmax(0, 1fr))` };

  const phaseRows = visiblePhases.map((phase, index) => {
    const copy = phaseCopy.get(phase.phase_number);
    const weekLabel = formatPhaseWeekLabel(visiblePhases, index);
    const dailyLines =
      copy?.daily_rhythm_user?.length
        ? copy.daily_rhythm_user
        : phase.daily_rhythm.slice(0, 3).map((item) => item.text);
    const weeklyLines =
      copy?.weekly_rhythm_user?.length
        ? copy.weekly_rhythm_user
        : phase.weekly_rhythm.slice(0, 3).map((item) => item.text);

    return {
      phase,
      weekLabel,
      intent: copy?.phase_intent_user ?? phase.intent,
      anchorText: copy?.anchor_habit_user ?? phase.anchor_habit.text,
      dailyLines,
      weeklyLines,
      readiness: copy?.readiness_signal_user ?? phase.readiness_signal.description,
      muted: overwhelmSafe && phase.phase_number > 1,
      startHere: phase.phase_number === 1,
      pillarDistribution: phase.pillar_distribution,
    };
  });

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {overwhelmSafe ? (
        <p className="border-b border-amber-100 bg-amber-50/80 px-4 py-2 text-xs text-amber-900">
          Start with Phase 1 — later phases unlock as you build consistency (overwhelm-safe pacing).
        </p>
      ) : null}
      <div className="flex border-b border-slate-200/80">
        <div className="w-[4.5rem] shrink-0 border-r border-slate-200/80 bg-slate-50" aria-hidden />
        <div className="grid min-w-0 flex-1 divide-x divide-slate-200/80" style={phaseGridStyle}>
          {phaseRows.map((row) => (
            <PlanPhaseHeader
              key={row.phase.phase_number}
              phaseNumber={row.phase.phase_number}
              weekLabel={row.weekLabel}
              name={row.phase.name}
              intent={row.intent}
              muted={row.muted}
              startHere={row.startHere}
              pillarDistribution={row.pillarDistribution}
            />
          ))}
        </div>
      </div>

      {PLAN_SECTION_ROWS.map((section) => (
        <div key={section.key} className="flex border-b border-slate-200/80 last:border-b-0">
          <PlanVerticalRail label={section.label} />
          <div className="grid min-w-0 flex-1 divide-x divide-slate-200/80" style={phaseGridStyle}>
            {phaseRows.map((row) => {
              const theme = phaseTheme(row.phase.phase_number);
              const labelColor =
                section.key === "daily" || section.key === "weekly"
                  ? theme.rhythmLabel
                  : theme.accent;

              return (
                <PlanPhaseCell
                  key={`${row.phase.phase_number}-${section.key}`}
                  phaseNumber={row.phase.phase_number}
                  sectionLabel={section.label}
                  labelColor={labelColor}
                  muted={row.muted}
                >
                  {section.key === "anchor" ? (
                    <p className="text-sm font-bold leading-snug text-slate-900">{row.anchorText.trim()}</p>
                  ) : null}
                  {section.key === "daily" ? <PlanRhythmList lines={row.dailyLines} /> : null}
                  {section.key === "weekly" ? <PlanRhythmList lines={row.weeklyLines} /> : null}
                  {section.key === "advance" ? (
                    <p className="text-sm italic leading-relaxed text-slate-600">{row.readiness}</p>
                  ) : null}
                </PlanPhaseCell>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
