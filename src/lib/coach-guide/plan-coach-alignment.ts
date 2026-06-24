import { formatPhaseWeekLabel } from "@/lib/recommendations/plan/plan-phase-display";
import { isSelfTalkOrMantra } from "@/lib/recommendations/plan/plan-rhythm-cadence";
import type { IntegratedPlanSynthesis, PlanOutput } from "@/lib/recommendations/types";

/** Client plan bullets for coaches — what the client is doing, separate from persona coaching principles. */
export function buildPlanAlignmentNotes(
  planOutput: PlanOutput,
  integratedPlan: IntegratedPlanSynthesis,
): string[] {
  const phaseCopy = new Map(integratedPlan.phases.map((p) => [p.phase_number, p]));

  return planOutput.phases.map((phase, index) => {
    const copy = phaseCopy.get(phase.phase_number);
    const weekLabel = formatPhaseWeekLabel(planOutput.phases, index);
    const anchor = (copy?.anchor_habit_user ?? phase.anchor_habit.text).trim();
    const anchorNote = isSelfTalkOrMantra(anchor)
      ? `review anchor — should be a concrete action, not self-talk`
      : anchor;

    return `Phase ${phase.phase_number} (${weekLabel}, ${phase.name}): anchor — ${anchorNote}`;
  });
}
