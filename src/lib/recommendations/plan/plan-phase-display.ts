import { parseDurationWeeks } from "@/lib/recommendations/plan/phase-config";
import { coercePlanText } from "@/lib/recommendations/plan/coerce-plan-field";
import { PLAN_TEXT_LIMITS, truncatePlanLine } from "@/lib/recommendations/plan/plan-text-limits";
import type { PlanPhaseOutput } from "@/lib/recommendations/types";
import { firstSentence } from "@/lib/results/plan-line-format";

/** Slide title: "8-Week" */
export function formatPlanDurationTitle(weeks: number): string {
  return `${weeks}-Week`;
}

/** Cumulative week band for a phase column header: "Weeks 1–3" */
export function formatPhaseWeekLabel(
  phases: Pick<PlanPhaseOutput, "approx_duration_weeks">[],
  phaseIndex: number,
): string {
  let start = 1;
  for (let i = 0; i < phaseIndex; i++) {
    start += parseDurationWeeks(phases[i]!.approx_duration_weeks);
  }
  const span = parseDurationWeeks(phases[phaseIndex]!.approx_duration_weeks);
  const end = start + span - 1;
  if (start === end) return `Week ${start}`;
  return `Weeks ${start}–${end}`;
}

/** One imperative action line — engine fallback when AI is unavailable. */
export function toPlanActionLine(
  text: string,
  maxChars: number = PLAN_TEXT_LIMITS.rhythm_line,
): string {
  const line = firstSentence(text.trim()).replace(/\s+/g, " ");
  return truncatePlanLine(line, maxChars);
}

export function formatReadinessLine(text: string | unknown): string {
  let trimmed = coercePlanText(text, "").trim();
  if (!trimmed) return "";
  // Engine often already says "You'll know you're ready when …" — avoid "When You'll know… when".
  trimmed = trimmed.replace(/^when\s+you'?ll know you'?re ready when\s+/i, "When ");
  trimmed = trimmed.replace(/^you'?ll know you'?re ready when\s+/i, "When ");
  if (/^when\b/i.test(trimmed)) {
    return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  }
  return `When ${trimmed.replace(/\.$/, "")}.`;
}
