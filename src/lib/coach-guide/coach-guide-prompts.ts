import type { CoachGuidePillarMatrix } from "@/lib/coach-guide/types";
import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import type { IntegratedPlanSynthesis, PlanOutput, PillarName, UserProfile } from "@/lib/recommendations/types";
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

export type CoachGuideMatrixPromptJson = {
  pillarMatrix?: CoachGuidePillarMatrix;
};

const COACH_PILLARS: PillarName[] = [
  "Physical Activity",
  "Nutrition",
  "Sleep & Recovery",
  "Mental Wellness",
];

export const COACH_GUIDE_SYSTEM_PROMPT = `You are writing sections of the Pausibl Coach Guide — a private coaching brief for wellness coaches.
Use behavioral language only. Never reference OCEAN, assessments, or reports.
Use the client's first name — never "the client" or "this person".
No motivational fluff. Short, directive, coach-to-coach tone.
The reader is already the coach — write direct imperatives (Keep, Set, Add, Protect). Do not start sentences with "Coach".
Return valid JSON only.`;

import {
  formatBarrier,
  formatGoalsPhrase,
} from "@/lib/coach-guide/format-profile-context";

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
  const goalsPhrase = formatGoalsPhrase(profile.goals);
  const barrier = formatBarrier(profile.barriers);
  const interaction = secondaryInteractionPattern(secondaryKey);
  const deviations = collectTraitDeviations(persona, primaryKey);

  return `Generate Page 2 personalized coach brief sections for ${firstName}.

CONTEXT:
- Primary persona: ${primaryLabel} (${primaryKey})
- Secondary persona: ${secondaryLabel} (${secondaryPct}%)
- Secondary interaction pattern: ${interaction}
- Fit tier: ${fitTierLabel(persona.fitTier)}
- Goals: ${goalsPhrase}
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
   Sentence 2: What this means for their ${goalsPhrase} goal(s) given ${barrier} as main barrier.

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
  "traitDeviationNarratives": [{"trait": "Openness", "narrative": "string"}],
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

function formatPlanByPillar(
  planOutput: PlanOutput,
  integratedPlan: IntegratedPlanSynthesis,
): string {
  const buckets: Record<PillarName, string[]> = {
    Nutrition: [],
    "Physical Activity": [],
    "Sleep & Recovery": [],
    "Mental Wellness": [],
  };

  for (const phase of planOutput.phases) {
    const copy = integratedPlan.phases.find((p) => p.phase_number === phase.phase_number);
    const anchor = copy?.anchor_habit_user ?? phase.anchor_habit.text;
    buckets[phase.anchor_habit.pillar].push(
      `Phase ${phase.phase_number} anchor: ${anchor}`,
    );
    phase.daily_rhythm.forEach((item, i) => {
      const text = copy?.daily_rhythm_user?.[i] ?? item.text;
      buckets[item.pillar].push(`Phase ${phase.phase_number} daily: ${text}`);
    });
    phase.weekly_rhythm.forEach((item, i) => {
      const text = copy?.weekly_rhythm_user?.[i] ?? item.text;
      buckets[item.pillar].push(`Phase ${phase.phase_number} weekly: ${text}`);
    });
    const readiness = copy?.readiness_signal_user ?? phase.readiness_signal.description;
    buckets[phase.anchor_habit.pillar].push(
      `Phase ${phase.phase_number} advance when: ${readiness}`,
    );
  }

  return COACH_PILLARS.map((pillar) => {
    const lines = buckets[pillar];
    return `${pillar}:\n${lines.length ? lines.map((l) => `  - ${l}`).join("\n") : "  - (no plan items this pillar)"}`;
  }).join("\n\n");
}

function formatPersonaMatrixReference(matrix: CoachGuidePillarMatrix): string {
  const rows = ["structure", "environment", "progression", "recoveryProtocol"] as const;
  return rows
    .map((row) => {
      const label = row === "recoveryProtocol" ? "Recovery" : row.charAt(0).toUpperCase() + row.slice(1);
      const cells = COACH_PILLARS.map((p) => `  ${p}: ${matrix[row][p] ?? ""}`).join("\n");
      return `${label}:\n${cells}`;
    })
    .join("\n\n");
}

export function buildCoachGuideMatrixPrompt(args: {
  profile: UserProfile;
  persona: PersonaAnalysis;
  firstName: string;
  planOutput: PlanOutput;
  integratedPlan: IntegratedPlanSynthesis;
}): string {
  const { profile, persona, firstName, planOutput, integratedPlan } = args;
  const primaryKey = profile.primaryPersona;
  const coachProfile = PERSONA_COACH_PROFILE[primaryKey];
  const primaryLabel = PERSONA_DISPLAY[primaryKey]?.label ?? personaLabel(primaryKey);
  const goalsPhrase = formatGoalsPhrase(profile.goals);
  const barrier = formatBarrier(profile.barriers);
  const personaMatrix = formatPersonaMatrixReference(coachProfile.pillarMatrix);
  const planByPillar = formatPlanByPillar(planOutput, integratedPlan);
  const phasedSummary = formatPlanSummaryForCoach(planOutput, integratedPlan);

  return `Generate the coaching matrix for ${firstName}'s coach guide.

This is coach-to-coach guidance: HOW to coach each pillar using THIS client's exact integrated plan — not a copy of the client plan table.

CONTEXT:
- Client: ${firstName}
- Primary persona: ${primaryLabel} (${primaryKey})
- Fit tier: ${fitTierLabel(persona.fitTier)}
- Goals: ${goalsPhrase}
- Top barrier: ${barrier}
- Operating style: ${coachProfile.operatingStyle}
- Natural strength: ${coachProfile.naturalStrength}
- Primary risk: ${coachProfile.primaryRisk}
- Best setup: ${coachProfile.bestSetup}

PERSONA COACHING PRINCIPLES (guardrails — stay aligned, do not contradict):
${personaMatrix}

CLIENT INTEGRATED PLAN — EXACT DATA (you MUST reference real actions from here):
Phased summary:
${phasedSummary}

By pillar:
${planByPillar}

TASK — pillarMatrix (4 rows × 4 pillars):
For each cell write 1–2 short imperative sentences — direct coaching notes for the reader (they are the coach).
- structure: routine/anchor for this pillar — their phase anchors and daily items
- environment: setup and context — environment actions from the plan
- progression: when and how to advance load — weekly rhythm and later phases
- recoveryProtocol: handle misses — backup/recovery actions and readiness cues

VOICE (critical):
- Do NOT start cells with "Coach" or "Coach the". The audience is the coach; write as briefing notes.
- Vary sentence openings across the 16 cells. Good starters: Keep, Start with, Set, Pre-stock, Add, Protect, Hold, Test, If ${firstName} misses, After a bad night, Only advance when, Give, Use, Build, Reset to.
- Prefer row-appropriate verbs: structure → Keep/Start with/Anchor; environment → Set/Pre-stock/Protect; progression → Add/Test/Only advance when; recovery → If ${firstName} misses/Contain/Reset/Next session.
- Use ${firstName}'s name in recovery cells when natural — not in every cell.

RULES:
1. Every cell must cite or clearly reflect THIS client's plan actions for that pillar when plan items exist.
2. Stay within ${primaryLabel} coaching principles (private, low-pressure, etc. as applicable).
3. Do NOT paste client copy verbatim — translate into brief coach notes (e.g. "Keep the Phase 1 protein meal as the anchor; one food rule at a time.").
4. If a pillar has few plan items, combine persona principle + the items that exist.
5. Max 220 characters per cell. No fluff. No repeated opening word across a row.

OUTPUT JSON:
{
  "pillarMatrix": {
    "structure": {
      "Physical Activity": "string",
      "Nutrition": "string",
      "Sleep & Recovery": "string",
      "Mental Wellness": "string"
    },
    "environment": { ...same keys... },
    "progression": { ...same keys... },
    "recoveryProtocol": { ...same keys... }
  }
}`;
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
  const goalsPhrase = formatGoalsPhrase(profile.goals);
  const barrier = formatBarrier(profile.barriers);
  const layer1 = LAYER1_PSYCHOLOGICAL_CRITERIA[primaryKey];
  const layer2 = layer2CriterionForBarrier(profile.barriers[0] ?? barrier);
  const layer3 = LAYER3_ENVIRONMENTAL_QUESTION.replace("{first_name}", firstName);
  const signals = coachProfile.riskSignals.map((r) => r.signal).join("; ");
  const planBlock =
    planOutput && integratedPlan
      ? `\nCLIENT INTEGRATED PLAN (pivot triggers must reference these actions):\n${formatPlanSummaryForCoach(planOutput, integratedPlan)}\n`
      : "";

  return `Generate Page 3 validation and pivot sections for ${firstName}.

CONTEXT:
- Primary persona: ${primaryLabel}
- Goals: ${goalsPhrase}
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
