import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import type { IntegratedPlanSynthesis, PlanOutput, UserProfile } from "@/lib/recommendations/types";
import {
  LAYER1_PSYCHOLOGICAL_CRITERIA,
  LAYER3_ENVIRONMENTAL_QUESTION,
  layer2CriterionForBarrier,
} from "@/lib/coach-guide/coach-guide-validation-config";
import { PERSONA_COACH_PROFILE, secondaryInteractionPattern } from "@/lib/coach-guide/persona-content";
import { PERSONA_DISPLAY, DEFAULT_PERSONA_CENTROIDS } from "@/lib/scoring/persona-defaults";
import { fitTierLabel } from "@/lib/scoring/persona-fit";
import {
  buildTraitProfileRows,
  coachGuideTraitLabel,
  formatTraitScore,
} from "@/lib/scoring/trait-level";
import type { PersonaAnalysis, TraitKey } from "@/lib/scoring/persona-types";
import { personaLabel } from "@/lib/results/persona-display";

export type CoachGuideTraitDeviation = {
  trait: string;
  userScore: number;
  centroidScore: number;
  deviationValue: number;
  direction: "higher" | "lower";
};

export type CoachGuidePage2PromptJson = {
  personaDescription?: string;
  secondaryInfluence?: string;
  traitDeviationNarratives?: { trait: string; narrative: string }[];
  motivates?: string[];
  drains?: string[];
};

export type CoachGuidePage3PromptJson = {
  validationCheck?: [string, string, string] | string[];
  pivotTriggers?: string[];
};

export const COACH_GUIDE_SYSTEM_PROMPT = `You are writing sections of the Pausibl Coach Guide — a private coaching brief for wellness coaches.
Use behavioral language only. Never reference OCEAN, assessments, or reports.
Use the client's first name — never "the client" or "this person".
No motivational fluff. Short, directive, coach-to-coach tone.
Return valid JSON only.`;

function formatGoal(goals: string[]): string {
  if (!goals.length) return "General wellness";
  return goals[0].replace(/^goal_/, "").replace(/_/g, " ");
}

function formatBarrier(barriers: string[]): string {
  if (!barriers.length) return "Not specified";
  return barriers[0].replace(/^barrier_/, "").replace(/_/g, " ");
}

export function collectTraitDeviations(
  persona: PersonaAnalysis,
  primaryKey: UserProfile["primaryPersona"],
): CoachGuideTraitDeviation[] {
  const centroid = DEFAULT_PERSONA_CENTROIDS[primaryKey];
  const rows = buildTraitProfileRows(persona.traitAverages, centroid);
  return rows
    .filter((row) => row.isDeviation)
    .slice(0, 3)
    .map((row) => ({
      trait: coachGuideTraitLabel(row.trait),
      userScore: row.score,
      centroidScore: centroid[row.trait],
      deviationValue: row.deviation,
      direction: row.deviation >= 0 ? "higher" : "lower",
    }));
}

function traitScoreSummary(persona: PersonaAnalysis): string {
  const traits: TraitKey[] = [
    "openness",
    "conscientiousness",
    "extraversion",
    "agreeableness",
    "neuroticism",
  ];
  return traits
    .map((t) => `${coachGuideTraitLabel(t)}: ${formatTraitScore(persona.traitAverages[t] ?? 0)}`)
    .join("; ");
}

export function buildCoachGuidePage2Prompt(args: {
  profile: UserProfile;
  persona: PersonaAnalysis;
  firstName: string;
}): string {
  const { profile, persona, firstName } = args;
  const primaryKey = profile.primaryPersona;
  const secondaryKey = profile.secondaryPersona;
  const coachProfile = PERSONA_COACH_PROFILE[primaryKey];
  const primaryLabel = PERSONA_DISPLAY[primaryKey]?.label ?? personaLabel(primaryKey);
  const secondaryLabel = PERSONA_DISPLAY[secondaryKey]?.label ?? personaLabel(secondaryKey);
  const secondaryPct = Math.round(persona.personaPercentages?.[secondaryKey] ?? 0);
  const goal = formatGoal(profile.goals);
  const barrier = formatBarrier(profile.barriers);
  const interaction = secondaryInteractionPattern(secondaryKey);
  const deviations = collectTraitDeviations(persona, primaryKey);

  return `Generate Page 2 personalized coach brief sections for ${firstName}.

CONTEXT:
- Primary persona: ${primaryLabel} (${primaryKey})
- Secondary persona: ${secondaryLabel} (${secondaryPct}%)
- Secondary interaction pattern: ${interaction}
- Fit tier: ${fitTierLabel(persona.fitTier)}
- Primary goal: ${goal}
- Top barrier: ${barrier}
- Trait scores: ${traitScoreSummary(persona)}
- Persona operating style: ${coachProfile.operatingStyle}
- Natural strength: ${coachProfile.naturalStrength}
- Primary risk: ${coachProfile.primaryRisk}
- Best setup: ${coachProfile.bestSetup}
${deviations.length ? `- Trait deviations: ${JSON.stringify(deviations)}` : "- Trait deviations: none"}

TASKS (6 prompts combined):

1. personaDescription — Exactly 2 sentences.
   Sentence 1: How ${firstName} naturally approaches wellness (from operating style).
   Sentence 2: What this means for their ${goal} goal given ${barrier} as main barrier.

2. secondaryInfluence — Exactly 2 sentences.
   Intro: "${firstName} is primarily a ${primaryLabel} with ${secondaryLabel} influence (${secondaryPct}%)."
   Then one behavioral sentence on how secondary modifies primary (use ${interaction} pattern).

3. traitDeviationNarratives — ${deviations.length ? `One sentence per deviation (${deviations.length} total). Practical coaching implication for ${firstName}.` : "Return empty array."}

4. motivates — 2-3 short bullets. Realistic drivers from natural strength, traits, and goal.

5. drains — 2-3 short bullets. Coaching red lines from primary risk, barrier, and traits.

OUTPUT JSON:
{
  "personaDescription": "string",
  "secondaryInfluence": "string",
  "traitDeviationNarratives": [{"trait": "Curiosity", "narrative": "string"}],
  "motivates": ["string"],
  "drains": ["string"]
}`;
}

function formatPlanSummaryForCoach(
  planOutput: PlanOutput,
  integratedPlan: IntegratedPlanSynthesis,
): string {
  return planOutput.phases
    .map((phase) => {
      const copy = integratedPlan.phases.find((p) => p.phase_number === phase.phase_number);
      const anchor = copy?.anchor_habit_user ?? phase.anchor_habit.text;
      const daily = (copy?.daily_rhythm_user ?? phase.daily_rhythm.map((d) => d.text)).join("; ");
      const weekly = (copy?.weekly_rhythm_user ?? phase.weekly_rhythm.map((w) => w.text)).join("; ");
      return `Phase ${phase.phase_number} (${phase.name}): anchor [${phase.anchor_habit.pillar}] ${anchor}; daily: ${daily || "—"}; weekly: ${weekly || "—"}`;
    })
    .join("\n");
}

export function buildCoachGuidePage3Prompt(args: {
  profile: UserProfile;
  persona: PersonaAnalysis;
  firstName: string;
  input?: BuildProfileInput;
  planOutput?: PlanOutput | null;
  integratedPlan?: IntegratedPlanSynthesis | null;
}): string {
  const { profile, persona, firstName, planOutput, integratedPlan } = args;
  const primaryKey = profile.primaryPersona;
  const coachProfile = PERSONA_COACH_PROFILE[primaryKey];
  const primaryLabel = PERSONA_DISPLAY[primaryKey]?.label ?? personaLabel(primaryKey);
  const goal = formatGoal(profile.goals);
  const barrier = formatBarrier(profile.barriers);
  const layer1 = LAYER1_PSYCHOLOGICAL_CRITERIA[primaryKey];
  const layer2 = layer2CriterionForBarrier(profile.barriers[0] ?? barrier);
  const layer3 = LAYER3_ENVIRONMENTAL_QUESTION.replace("{first_name}", firstName);
  const signals = coachProfile.riskSignals.map((r) => r.signal).join("; ");
  const planBlock =
    planOutput && integratedPlan
      ? `\nCLIENT INTEGRATED PLAN (coaching matrix is derived from this — pivot triggers must reference these actions, not generic advice):\n${formatPlanSummaryForCoach(planOutput, integratedPlan)}\n`
      : "";

  return `Generate Page 3 validation and pivot sections for ${firstName}.

CONTEXT:
- Primary persona: ${primaryLabel}
- Primary goal: ${goal}
- Top barrier: ${barrier}
- Layer 1 criterion (${primaryLabel}): ${layer1}
- Layer 2 criterion (${barrier}): ${layer2}
- Layer 3 universal: ${layer3}
- Blind spot coach response: ${coachProfile.blindSpotCoachResponse}
- Warning signals: ${signals}
${planBlock}
TASKS:

1. validationCheck — Exactly 3 strings (one per layer):
   - "Psychologically Appropriate: Does this feel [persona adjectives] for ${firstName}?"
   - "Behaviorally Realistic: Can ${firstName} do this given [barrier constraint]?"
   - "Environmentally Executable: ${layer3}"

2. pivotTriggers — Exactly 4 directive sentences:
   - One actionable trigger per warning signal (3 total), tied to the client's actual plan actions when plan is provided
   - 4th universal: "If 2+ plan elements are missed for 1+ week: simplify the plan before adding anything."

OUTPUT JSON:
{
  "validationCheck": ["string", "string", "string"],
  "pivotTriggers": ["string", "string", "string", "string"]
}`;
}
