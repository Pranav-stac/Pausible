/** Character limits for Page 10 AI synthesis (Section 8.2). */

import { coercePlanText } from "@/lib/recommendations/plan/coerce-plan-field";

export const PLAN_TEXT_LIMITS = {
  plan_subtitle: 120,
  goal_framing: 100,
  phase_intent_user: 200,
  readiness_signal_user: 150,
  anchor_habit_user: 90,
  rhythm_line: 100,
  plan_built_narrative: 720,
  plan_note: 120,
} as const;

const DANGLING_ENDINGS =
  /\b(when|with|and|or|the|a|an|to|for|if|as|but|so|by|at|in|on|of|from|into|about|after|before|during|while|until|unless|because|although|though|where|which|that|who|whom|whose|what|how|why|whether|either|neither|both|every|each|any|some|no|not|nor|yet|still|just|only|even|also|too|more|most|less|least|such|same|other|another|upon|count)\.$/i;

/** True when text ends cleanly — not mid-clause or on a dangling word. */
export function isCompleteSentence(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (!/[.!?]$/.test(trimmed)) return false;
  if (DANGLING_ENDINGS.test(trimmed)) return false;
  if (/\b(or|and)\s*$/i.test(trimmed.replace(/[.!?]$/, ""))) return false;
  return true;
}

function truncateAtSentence(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;

  const slice = trimmed.slice(0, maxLength);
  const lastSentence = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  if (lastSentence > maxLength * 0.5) {
    const cut = slice.slice(0, lastSentence + 1).trim();
    if (isCompleteSentence(cut)) return cut;
  }

  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.6) {
    const cut = `${slice.slice(0, lastSpace).trim()}.`;
    if (isCompleteSentence(cut)) return cut;
  }

  const forced = `${slice.trim()}.`;
  return isCompleteSentence(forced) ? forced : trimmed.slice(0, maxLength).trim();
}

/** Truncate action lines at clause boundaries so list items stay intact. */
export function truncatePlanLine(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;

  const slice = trimmed.slice(0, maxLength);
  const clauseBreaks = [
    slice.lastIndexOf(", or "),
    slice.lastIndexOf("; "),
    slice.lastIndexOf(" — "),
    slice.lastIndexOf(", "),
  ];
  for (const idx of clauseBreaks) {
    if (idx > maxLength * 0.45) {
      const cut = slice.slice(0, idx).trim();
      if (cut.length >= maxLength * 0.45) return cut;
    }
  }

  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.55) {
    return slice.slice(0, lastSpace).trim();
  }

  return slice.trim();
}

export function enforcePlanTextLimit(field: keyof typeof PLAN_TEXT_LIMITS, text: string | unknown): string {
  const normalized = coercePlanText(text, "");
  if (field === "rhythm_line") {
    return truncatePlanLine(normalized, PLAN_TEXT_LIMITS.rhythm_line);
  }
  return truncateAtSentence(normalized, PLAN_TEXT_LIMITS[field]);
}

function enforceRhythmLines(lines: string[]): string[] {
  return lines
    .map((line) => enforcePlanTextLimit("rhythm_line", line))
    .filter(Boolean)
    .slice(0, 3);
}

export function enforceIntegratedPlanLimits(content: {
  plan_subtitle: string;
  goal_framing: string;
  phases: {
    phase_number: number;
    phase_intent_user: string;
    readiness_signal_user: string;
    anchor_habit_user: string;
    daily_rhythm_user: string[];
    weekly_rhythm_user: string[];
  }[];
  plan_built_narrative: string;
  plan_notes: string[];
}): typeof content {
  return {
    plan_subtitle: enforcePlanTextLimit("plan_subtitle", content.plan_subtitle),
    goal_framing: enforcePlanTextLimit("goal_framing", content.goal_framing),
    phases: content.phases.map((phase) => ({
      ...phase,
      phase_intent_user: enforcePlanTextLimit("phase_intent_user", phase.phase_intent_user),
      readiness_signal_user: enforcePlanTextLimit("readiness_signal_user", phase.readiness_signal_user),
      anchor_habit_user: enforcePlanTextLimit("anchor_habit_user", phase.anchor_habit_user),
      daily_rhythm_user: enforceRhythmLines(phase.daily_rhythm_user),
      weekly_rhythm_user: enforceRhythmLines(phase.weekly_rhythm_user),
    })),
    plan_built_narrative: enforcePlanTextLimit("plan_built_narrative", content.plan_built_narrative),
    plan_notes: content.plan_notes.map((note) => enforcePlanTextLimit("plan_note", note)),
  };
}
