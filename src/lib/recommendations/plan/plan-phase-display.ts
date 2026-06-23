import { parseDurationWeeks } from "@/lib/recommendations/plan/phase-config";
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
export function toPlanActionLine(text: string, maxChars = 100): string {
  let line = firstSentence(text.trim()).replace(/\s+/g, " ");
  if (line.length > maxChars) {
    const cut = line.slice(0, maxChars);
    const lastSpace = cut.lastIndexOf(" ");
    line = lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut;
  }
  return line.trim();
}

export function formatReadinessLine(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (/^when\b/i.test(trimmed)) return trimmed;
  return `When ${trimmed.replace(/^[Ww]hen\s+/, "").replace(/\.$/, "")}.`;
}
