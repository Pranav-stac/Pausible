/** PLAN_PAGE user prompt (§20.9). System prompt: `buildSystemPrompt()` from gemini-section-prompts (§18.1), wired in synthesize-plan-page.ts. */

import type { OpportunityCard, PlanOutput, UserProfile } from "@/lib/recommendations/types";
import { formatPhaseWeekLabel } from "@/lib/recommendations/plan/plan-phase-display";
import { PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import { fitTierLabel } from "@/lib/scoring/persona-fit";

export { buildSystemPrompt } from "@/lib/recommendations/gemini-section-prompts";

function formatGoalsList(goals: string[]): string {
  if (!goals.length) return "General wellness";
  return goals.map((g) => g.replace(/^goal_/, "").replace(/_/g, " ")).join(", ");
}

function formatBarriersList(barriers: string[]): string {
  if (!barriers.length) return "None specified";
  return barriers.map((b) => b.replace(/^barrier_/, "").replace(/_/g, " ")).join(", ");
}

function formatRhythmList(items: { text: string }[]): string {
  if (!items.length) return "  (none)";
  return items.map((item) => `  - ${item.text}`).join("\n");
}

export function buildIntegratedPlanPrompt(
  planOutput: PlanOutput,
  profile: UserProfile,
  secondaryBlendPct?: number,
  priorityCards: OpportunityCard[] = [],
  fitScore?: number,
): string {
  const personaDisplay = PERSONA_DISPLAY[profile.primaryPersona]?.label ?? profile.primaryPersona;
  const secondaryDisplay = profile.secondaryPersona
    ? (PERSONA_DISPLAY[profile.secondaryPersona]?.label ?? profile.secondaryPersona)
    : "None";
  const blendPct = secondaryBlendPct ?? (profile.blendStrength === "pure" ? 0 : 17);
  const priorityLines = priorityCards
    .slice(0, 3)
    .map(
      (c, i) =>
        `Priority ${i + 1} (${c.pillar}): "${c.headline}" — first step: "${c.startThisWeek}"`,
    )
    .join("\n");

  const phaseDetails = planOutput.phases
    .map((phase, index) => {
      const weekLabel = formatPhaseWeekLabel(planOutput.phases, index);
      return `Phase ${phase.phase_number}: ${phase.name} (${weekLabel})
Duration estimate: ${phase.approx_duration_weeks}
Intent (engine): ${phase.intent}
Anchor habit (engine): ${phase.anchor_habit.text}
Daily rhythm (engine):
${formatRhythmList(phase.daily_rhythm)}
Weekly rhythm (engine):
${formatRhythmList(phase.weekly_rhythm)}
Ready to advance when (engine): ${phase.readiness_signal.description}`;
    })
    .join("\n\n");

  return `Generate integrated plan page copy for this user.

Persona: ${personaDisplay}
Fit tier: ${fitTierLabel(planOutput.fit_tier)}${fitScore != null ? ` (${Math.round(fitScore)}/100)` : ""}
Secondary persona: ${secondaryDisplay} (${blendPct}%)
Goals: ${formatGoalsList(profile.goals)}
Barriers: ${formatBarriersList(profile.barriers)}
Progression style: ${planOutput.progression_style}
Total duration: ${planOutput.total_duration_weeks} weeks · ${planOutput.total_phases} phases

High-impact priorities:
${priorityLines || "None provided"}

${phaseDetails}

Generation notes: ${planOutput.generation_notes}

STYLE REFERENCE (tone and length only — use THIS user's engine items, not these exact actions):
- Subtitle: "A phased approach that builds your wellness routine layer by layer — shaped by your Watchful Deer personality."
- Phase 1 intent: "Establish the minimum viable routine. Nothing ambitious — just proof that consistency is possible."
- Anchor: "Do any 10-minute workout on 3 fixed days this week."
- Daily: "Pick one calming bedtime activity and do it nightly." / "Eat at regular times, even on busy days."
- Weekly: "3 × 10-min home workouts (bodyweight basics)." / "Prep one backup meal before the week starts."
- Advance: "When 3 sessions/week feels like a default, not a decision."

Return JSON:
1. plan_subtitle — one sentence; may name ${personaDisplay}.
2. goal_framing — one short sentence tying the plan to the user's primary goal (may merge idea into subtitle if redundant).
3. phases[] — for each phase_number:
   - phase_intent_user: max 2 short sentences, plain language (warm rewrite of engine intent only).
   - readiness_signal_user: one sentence starting with "When". Must reflect THIS phase's anchor habit and daily/weekly rhythm above.
4. plan_built_narrative — one paragraph (4–6 sentences, max 600 chars). Flowing prose under "How This Plan Was Built". Name persona patterns, fit score/tier, barrier, goals, gradual phasing, and 2–3 priority actions.

Do NOT rewrite anchor_habit_user, daily_rhythm_user, or weekly_rhythm_user — those render verbatim from the engine.

GOAL–PERSONA MISALIGNMENT (apply when relevant):
"If the user's stated goals imply intensity or timelines that are misaligned with their behavioural
pattern, acknowledge the goal positively and frame the plan as building toward it in stages.
Example: 'Your goal of muscle gain is achievable with your pattern - your plan builds the foundation
first, so that when structured training begins in Phase 2, it sticks.' Never reject or label a goal
as unrealistic."

Keys: plan_subtitle, goal_framing, phases, plan_built_narrative.`;
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
  plan_built_narrative?: string;
  /** @deprecated */
  plan_notes?: string[];
};
