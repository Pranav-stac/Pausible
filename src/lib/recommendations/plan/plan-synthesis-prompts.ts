import type { OpportunityCard, PlanOutput, UserProfile } from "@/lib/recommendations/types";
import { PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import { fitTierLabel } from "@/lib/scoring/persona-fit";

export const PLAN_PAGE_SYSTEM_PROMPT = `You are a wellness plan writer for Pausibl. You write warm, clear, personalised plan descriptions that make the user feel understood and motivated.

Rules:
- Never use OCEAN trait names (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism). Use user-facing names: Openness, Discipline, Social Energy, Agreeableness, Stress Sensitivity.
- For plan_subtitle, goal_framing, and phase copy: never use persona animal names (Turtle, Deer, Fox, Wolf, Bear, Elephant). Describe the pattern without naming the animal.
- For plan_built_narrative ONLY: persona pattern names (e.g. Watchful Deer, Shielded Turtle) ARE allowed.
- Never use engine terminology (activation energy, fit score, blend ratio, pillar distribution, readiness signal).
- Never use motivational clichés ("crush your goals", "unleash your potential", "transform your life").
- Write in second person ("you", "your").
- Keep plan_subtitle, goal_framing, and phase sections to 1–2 sentences maximum.
- plan_built_narrative must be one flowing paragraph (4–6 sentences), not bullets.
- If the user's stated goals imply intensity or timelines misaligned with their behavioural pattern, acknowledge the goal positively and frame the plan as building toward it in stages. Never reject or label a goal as unrealistic.

Return valid JSON only.`;

function formatGoalsList(goals: string[]): string {
  if (!goals.length) return "General wellness";
  return goals.map((g) => g.replace(/^goal_/, "").replace(/_/g, " ")).join(", ");
}

function formatBarriersList(barriers: string[]): string {
  if (!barriers.length) return "None specified";
  return barriers.map((b) => b.replace(/^barrier_/, "").replace(/_/g, " ")).join(", ");
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
        `Priority ${i + 1} (${c.pillar}): headline="${c.headline}", first step="${c.startThisWeek}"`,
    )
    .join("\n");

  const phaseDetails = planOutput.phases
    .map(
      (phase) => `Phase ${phase.phase_number}: ${phase.name}
Duration: ${phase.approx_duration_weeks}
Intent (engine): ${phase.intent}
Anchor habit: ${phase.anchor_habit.text}
Readiness signal (engine): ${phase.readiness_signal.description}`,
    )
    .join("\n\n");

  return `Generate plan page content for the following user:

Persona: ${personaDisplay}
Fit tier: ${fitTierLabel(planOutput.fit_tier)}${fitScore != null ? `\nFit score: ${Math.round(fitScore)}/100` : ""}
Secondary persona: ${secondaryDisplay} (${blendPct}%)
Goals: ${formatGoalsList(profile.goals)}
Barriers: ${formatBarriersList(profile.barriers)}
Progression style: ${planOutput.progression_style}
High-impact priorities:
${priorityLines || "None provided"}

Phase details:
${phaseDetails}

Generation notes: ${planOutput.generation_notes}

Generate:
1. plan_subtitle: One sentence describing the overall plan tone and structure.
2. goal_framing: One sentence connecting the plan to the user's primary goal.
3. For each phase:
   a. phase_intent_user: 1–2 sentence user-facing description (rewrite the engine intent in warm, clear language).
   b. readiness_signal_user: 1 sentence translating the readiness signal into what the user will feel/experience.
4. plan_built_narrative: ONE cohesive paragraph (4–6 sentences, max 550 characters). Explain how this plan was built. Must include:
   - Generated from Wellness Intelligence assessment
   - Primary pattern name + fit score/tier
   - Secondary pattern influence if blend > 0
   - 1–2 behavioural observations (no OCEAN jargon; e.g. self-awareness, sensitivity to overwhelm)
   - How top barrier and goals shaped phasing
   - Gradual phasing philosophy (what their pattern can absorb)
   - Name 2–3 specific priority actions from the High-impact priorities input
   Write as flowing prose — NOT bullet points. Persona animal names allowed here only.

Return as JSON with keys: plan_subtitle, goal_framing, phases (array with phase_number, phase_intent_user, readiness_signal_user), plan_built_narrative.`;
}

export type IntegratedPlanPromptJson = {
  plan_subtitle?: string;
  goal_framing?: string;
  phases?: { phase_number: number; phase_intent_user?: string; readiness_signal_user?: string }[];
  plan_built_narrative?: string;
  /** @deprecated */
  plan_notes?: string[];
};
