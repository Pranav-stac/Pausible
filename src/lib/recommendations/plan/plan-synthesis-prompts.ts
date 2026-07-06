/** PLAN_PAGE user prompt (§20.9). System prompt: `buildSystemPromptForProfile()` (§18.1). */

import type { OpportunityCard, PlanOutput, UserProfile } from "@/lib/recommendations/types";
import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import { formatPdaUserContextBlock, resolveFirstName } from "@/lib/recommendations/pda-v12-prompt-context";
import { formatPhaseWeekLabel } from "@/lib/recommendations/plan/plan-phase-display";
import { PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import { fitTierLabel } from "@/lib/scoring/persona-fit";

export { buildSystemPrompt, buildSystemPromptForProfile } from "@/lib/recommendations/gemini-section-prompts";

function formatRhythmList(items: { text: string }[]): string {
  if (!items.length) return "  (none)";
  return items.map((item) => `  - ${item.text}`).join("\n");
}

export function buildIntegratedPlanPrompt(
  planOutput: PlanOutput,
  profile: UserProfile,
  input?: BuildProfileInput | null,
  secondaryBlendPct?: number,
  priorityCards: OpportunityCard[] = [],
  fitScore?: number,
): string {
  const personaDisplay = PERSONA_DISPLAY[profile.primaryPersona]?.label ?? profile.primaryPersona;
  const firstName = resolveFirstName(input);

  const phaseDetails = planOutput.phases
    .map((phase, index) => {
      const weekLabel = formatPhaseWeekLabel(planOutput.phases, index);
      return `Phase ${phase.phase_number}: ${phase.name} (${weekLabel})
  approx_duration_weeks: ${phase.approx_duration_weeks}
  intent(engine): ${phase.intent}
  anchor_habit_text: ${phase.anchor_habit.text}
  daily_items:
${formatRhythmList(phase.daily_rhythm)}
  weekly_items:
${formatRhythmList(phase.weekly_rhythm)}
  readiness_signal(engine): ${phase.readiness_signal.description}`;
    })
    .join("\n\n");

  const userContext = formatPdaUserContextBlock(profile, input);

  return `PROMPT: PLAN_PAGE

Write the user-facing wording for ${firstName}'s integrated plan.

plan_output:
  total_phases: ${planOutput.total_phases}
  total_duration_weeks: ${planOutput.total_duration_weeks}
  progression_style: ${planOutput.progression_style}
  fit_tier: ${fitTierLabel(planOutput.fit_tier)}${fitScore != null ? ` (${Math.round(fitScore)}/100)` : ""}
  primary_persona: ${personaDisplay}
  generation_notes: ${planOutput.generation_notes}

per phase:
${phaseDetails}

${userContext}

Produce:
 - plan_subtitle (<=120 chars; may name the persona).
 - per phase: phase_intent_user (<=200 chars, warm rewrite of the engine intent) and
   readiness_signal_user (<=150 chars, 'You'll know you're ready when...').
 - plan_rationale ('How This Plan Was Built', 60-90 words; may reference persona name, fit tier, fit score).

Also include goal_framing (<=100 chars) — one short sentence tying the plan to the user's primary goal.

PHASE ANTI-THINNESS RULES (past plans were skeletal in Phase 2/3 - enforce):
 - Rewrite each phase's intent distinctly; NEVER reuse wording across phases.
 - When you reference progression, keep the CONCRETE NUMBERS from the supplied items (e.g., '10 to 20
   minutes', 'a second session'); never write vague progressions like 'add more' or 'increase gradually'.
 - Do not repeat a daily/weekly item verbatim across phases in your wording.
GOAL-PERSONA MISALIGNMENT: if goals imply intensity/speed misaligned with the pattern, acknowledge the
 goal positively and frame the plan as building toward it in stages; never call a goal unrealistic.
SAFETY: if restriction_flags non-empty OR age >= 65, plan_rationale must include a one-line reminder to
 get medical clearance before progressing; nourishment (not restriction) framing if pregnancy_postpartum.

Do NOT rewrite anchor habits or daily/weekly rhythm lines — those render verbatim from the engine.

FALLBACK: on invalid JSON or a blocked term, retry once; then render the phase cards with the engine
intent text as plain wording.

OUTPUT (strict JSON):
{
  "plan_subtitle": "string",
  "goal_framing": "string(<=100 chars)",
  "phases": [{"phase_number": int, "phase_intent_user": "string", "readiness_signal_user": "string"}],
  "plan_rationale": "string(60-90w)",
  "plan_built_narrative": "string(optional alias for plan_rationale)"
}`;
}

export type IntegratedPlanPromptJson = {
  plan_subtitle?: string;
  goal_framing?: string;
  phases?: {
    phase_number: number;
    phase_intent_user?: string;
    readiness_signal_user?: string;
    anchor_habit_user?: string;
    daily_rhythm_user?: string[];
    weekly_rhythm_user?: string[];
  }[];
  plan_rationale?: string;
  plan_built_narrative?: string;
  /** @deprecated */
  plan_notes?: string[];
};
