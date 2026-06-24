import type { OpportunityCard, PlanOutput, UserProfile } from "@/lib/recommendations/types";
import { formatPhaseWeekLabel } from "@/lib/recommendations/plan/plan-phase-display";
import { PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import { fitTierLabel } from "@/lib/scoring/persona-fit";

export const PLAN_PAGE_SYSTEM_PROMPT = `You are a wellness plan writer for Pausibl. Write like a concise coach — direct, specific, and actionable. Every line should tell the user exactly what to do.

VOICE (match the approved sample):
- Short imperative actions: "Do any 10-minute workout on 3 fixed days this week."
- Phase intents: 1–2 plain sentences. No fluff. Example: "Establish the minimum viable routine. Nothing ambitious — just proof that consistency is possible."
- Readiness lines start with "When …" Example: "When 3 sessions/week feels like a default, not a decision."
- Daily rhythm = things done most days. Weekly rhythm = a few times per week or weekly setup.
- Include specifics when the engine item has them (minutes, days, times).

RULES:
- Write in second person ("you", "your").
- plan_subtitle: ONE complete sentence, max 140 characters. Name the primary persona pattern only (e.g. Watchful Deer). Do NOT mention secondary patterns here — put those in plan_built_narrative. Example: "A phased approach that builds your wellness routine layer by layer — shaped by your Watchful Deer personality."
- plan_built_narrative: ONE paragraph, 4–6 sentences. Persona pattern names ARE allowed here. Must mention Wellness Intelligence assessment, fit score/tier, secondary pattern if blend > 0, main barrier, goals, gradual phasing, and 2–3 priority actions by name.
- Never use OCEAN trait names. Use: Openness, Discipline, Social Energy, Agreeableness, Stress Sensitivity.
- Never use engine jargon (activation energy, readiness signal, pillar distribution, fit tier as a label, blend ratio).
- Never use motivational clichés ("crush your goals", "transform your life").
- Do NOT invent new advice. Distill ONLY from the engine items provided for each phase. Move mis-bucketed items to the correct rhythm list.
- If goals imply intensity misaligned with the pattern, acknowledge the goal and frame the plan as building toward it in stages. Never call a goal unrealistic.

Return valid JSON only.`;

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
   - phase_intent_user: max 2 short sentences, plain language.
   - readiness_signal_user: one sentence starting with "When". Must reflect THIS phase's anchor habit and daily/weekly rhythm above — do not invent advance criteria that are not in the plan.
   - anchor_habit_user: ONE concrete physical action (meal, walk, workout, sleep, protein) — max 90 chars. Never self-talk, mantras, or "say to yourself" scripts. Recovery/self-talk belongs in daily or weekly rhythm, not anchor.
   - daily_rhythm_user: exactly 2–3 imperative lines, max 85 chars each.
   - weekly_rhythm_user: exactly 2–3 imperative lines, max 85 chars each.
4. plan_built_narrative — one paragraph (4–6 sentences, max 600 chars). Flowing prose under "How This Plan Was Built". Name persona patterns, fit score/tier, barrier, goals, gradual phasing, and 2–3 priority actions.

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
