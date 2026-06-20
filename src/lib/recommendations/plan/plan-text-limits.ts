/** Character limits for Page 10 AI synthesis (Section 8.2). */

export const PLAN_TEXT_LIMITS = {
  plan_subtitle: 120,
  goal_framing: 100,
  phase_intent_user: 200,
  readiness_signal_user: 150,
  plan_note: 120,
} as const;

function truncateAtSentence(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;

  const slice = trimmed.slice(0, maxLength);
  const lastSentence = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  if (lastSentence > maxLength * 0.5) {
    return slice.slice(0, lastSentence + 1).trim();
  }

  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.6) {
    return `${slice.slice(0, lastSpace).trim()}.`;
  }

  return `${slice.trim()}.`;
}

export function enforcePlanTextLimit(field: keyof typeof PLAN_TEXT_LIMITS, text: string): string {
  return truncateAtSentence(text, PLAN_TEXT_LIMITS[field]);
}

export function enforceIntegratedPlanLimits(content: {
  plan_subtitle: string;
  goal_framing: string;
  phases: { phase_number: number; phase_intent_user: string; readiness_signal_user: string }[];
  plan_notes: string[];
}): typeof content {
  return {
    plan_subtitle: enforcePlanTextLimit("plan_subtitle", content.plan_subtitle),
    goal_framing: enforcePlanTextLimit("goal_framing", content.goal_framing),
    phases: content.phases.map((phase) => ({
      ...phase,
      phase_intent_user: enforcePlanTextLimit("phase_intent_user", phase.phase_intent_user),
      readiness_signal_user: enforcePlanTextLimit("readiness_signal_user", phase.readiness_signal_user),
    })),
    plan_notes: content.plan_notes.map((note) => enforcePlanTextLimit("plan_note", note)),
  };
}
