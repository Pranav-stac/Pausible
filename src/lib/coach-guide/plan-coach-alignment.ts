import { formatPhaseWeekLabel } from "@/lib/recommendations/plan/plan-phase-display";
import { isSelfTalkOrMantra } from "@/lib/recommendations/plan/plan-rhythm-cadence";
import type { IntegratedPlanSynthesis, PlanOutput } from "@/lib/recommendations/types";

function joinRhythmLines(lines: string[]): string {
  return lines.map((line) => line.trim()).filter(Boolean).join(" · ");
}

/** Client plan bullets for coaches — anchors plus daily/weekly rhythms per phase. */
export function buildPlanAlignmentNotes(
  planOutput: PlanOutput,
  integratedPlan: IntegratedPlanSynthesis,
): string[] {
  const phaseCopy = new Map(integratedPlan.phases.map((p) => [p.phase_number, p]));
  const notes: string[] = [];

  for (const [index, phase] of planOutput.phases.entries()) {
    const copy = phaseCopy.get(phase.phase_number);
    const weekLabel = formatPhaseWeekLabel(planOutput.phases, index);
    const anchor = (copy?.anchor_habit_user ?? phase.anchor_habit.text).trim();
    const anchorNote = isSelfTalkOrMantra(anchor)
      ? `review anchor — should be a concrete action, not self-talk`
      : anchor;

    notes.push(`Phase ${phase.phase_number} (${weekLabel}, ${phase.name}): anchor — ${anchorNote}`);

    const daily =
      copy?.daily_rhythm_user ??
      phase.daily_rhythm.slice(0, 3).map((item) => item.text);
    const weekly =
      copy?.weekly_rhythm_user ??
      phase.weekly_rhythm.slice(0, 3).map((item) => item.text);

    const dailyText = joinRhythmLines(daily);
    if (dailyText) {
      notes.push(`  Daily: ${dailyText}`);
    }

    const weeklyText = joinRhythmLines(weekly);
    if (weeklyText) {
      notes.push(`  Weekly: ${weeklyText}`);
    }
  }

  return notes;
}
