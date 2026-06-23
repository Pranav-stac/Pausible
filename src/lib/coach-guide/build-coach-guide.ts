import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import type { IntegratedPlanSynthesis, PlanOutput, UserProfile } from "@/lib/recommendations/types";
import { deriveCoachMatrixFromPlan, summarizePlanPhasePillars } from "@/lib/coach-guide/derive-matrix-from-plan";
import { PERSONA_COACH_PROFILE, secondaryInteractionPattern } from "@/lib/coach-guide/persona-content";
import type { CoachGuideDocument, CoachGuideTraitRow } from "@/lib/coach-guide/types";
import { PERSONA_DISPLAY, DEFAULT_PERSONA_CENTROIDS } from "@/lib/scoring/persona-defaults";
import { fitTierLabel } from "@/lib/scoring/persona-fit";
import {
  LAYER1_PSYCHOLOGICAL_CRITERIA,
  LAYER3_ENVIRONMENTAL_QUESTION,
  layer2CriterionForBarrier,
} from "@/lib/coach-guide/coach-guide-validation-config";
import {
  buildTraitProfileRows,
  coachGuideTraitLabel,
  formatTraitScore,
  traitCentroidDescriptor,
} from "@/lib/scoring/trait-level";
import type { PersonaAnalysis } from "@/lib/scoring/persona-types";
import { personaLabel } from "@/lib/results/persona-display";
import { resolveParticipantFirstName } from "@/lib/results/resolve-participant-name";

function coachGuideClientName(input?: BuildProfileInput): string {
  return resolveParticipantFirstName({
    participantName: input?.participantName,
    ownerEmail: null,
    answers: input?.answers,
    fallback: "Client",
  });
}

function formatGoal(goals: string[]): string {
  if (!goals.length) return "General wellness";
  return goals[0].replace(/^goal_/, "").replace(/_/g, " ");
}

function formatBarrier(barriers: string[]): string {
  if (!barriers.length) return "Not specified";
  return barriers[0].replace(/^barrier_/, "").replace(/_/g, " ");
}

function buildTraitRows(persona: PersonaAnalysis, primaryKey: UserProfile["primaryPersona"]): CoachGuideTraitRow[] {
  const centroid = DEFAULT_PERSONA_CENTROIDS[primaryKey];
  const rows = buildTraitProfileRows(persona.traitAverages, centroid);

  return rows.map((row) => {
    const descriptor = traitCentroidDescriptor(row.score, centroid[row.trait]);

    return {
      trait: coachGuideTraitLabel(row.trait),
      // Coach guide: always vs-pattern (Higher / Typical / Lower) — never Cay Low/Medium/High.
      level: descriptor,
      deviation: row.isDeviation ? `${row.deviation >= 0 ? "+" : ""}${row.deviation.toFixed(1)}` : null,
      meaning: row.isDeviation
        ? `${coachGuideTraitLabel(row.trait)} is ${descriptor.toLowerCase()} for this pattern (score ${formatTraitScore(row.score)} vs typical ${formatTraitScore(centroid[row.trait])}).`
        : null,
    };
  });
}

function buildPersonaDescription(
  name: string,
  profile: PersonaCoachProfile,
  goal: string,
  barrier: string,
): string {
  return `${name} is ${profile.operatingStyle.toLowerCase()}, preferring setups that feel ${profile.bestSetup.toLowerCase()}. For their ${goal} goal, progress depends on plans that account for ${barrier} — ${profile.naturalStrength.toLowerCase()} is the lever, while ${profile.primaryRisk.toLowerCase()} is the main risk.`;
}

function buildSecondaryInfluence(
  name: string,
  primaryLabel: string,
  secondaryLabel: string,
  secondaryPct: number,
  secondaryKey: UserProfile["secondaryPersona"],
): string {
  const pattern = secondaryInteractionPattern(secondaryKey);
  const intro = `${name} is primarily a ${primaryLabel} with ${secondaryLabel} influence (${secondaryPct}%).`;
  if (pattern === "caution") {
    return `${intro} This adds a self-protective layer — slower to commit, but more likely to stick once the plan feels safe and simple.`;
  }
  if (pattern === "social") {
    return `${intro} This adds occasional social or novelty needs even when the primary pattern is more private or structured.`;
  }
  if (pattern === "structure") {
    return `${intro} This adds extra discipline and routine-seeking beyond what the primary pattern alone suggests.`;
  }
  return `${intro} The secondary influence is present but modest.`;
}

type PersonaCoachProfile = typeof PERSONA_COACH_PROFILE[UserProfile["primaryPersona"]];

function defaultMotivators(profile: PersonaCoachProfile): string[] {
  return [
    `Visible proof of progress through ${profile.naturalStrength.toLowerCase()}`,
    `Clear, written rules they can follow independently`,
    `Setups that match: ${profile.bestSetup.toLowerCase()}`,
  ];
}

function defaultDrains(profile: PersonaCoachProfile): string[] {
  return [
    `Environments that trigger ${profile.primaryRisk.toLowerCase()}`,
    "Open-ended plans without specific targets",
    "Public accountability or comparison settings",
  ];
}

function buildDeterministicValidationCheck(
  name: string,
  primaryKey: UserProfile["primaryPersona"],
  barrierSlug: string,
): [string, string, string] {
  const layer1 = LAYER1_PSYCHOLOGICAL_CRITERIA[primaryKey];
  const layer2 = layer2CriterionForBarrier(barrierSlug);
  const layer3 = LAYER3_ENVIRONMENTAL_QUESTION.replace("{first_name}", name);
  return [
    `Psychologically Appropriate: Does this feel ${layer1.toLowerCase().replace(/\.$/, "")} for ${name}?`,
    `Behaviorally Realistic: Can ${name} do this given ${layer2.charAt(0).toLowerCase()}${layer2.slice(1)}`,
    `Environmentally Executable: ${layer3}`,
  ];
}

export function buildCoachGuideDocumentDeterministic(args: {
  profile: UserProfile;
  persona: PersonaAnalysis;
  input?: BuildProfileInput;
  reportId: string;
  planOutput?: PlanOutput | null;
  integratedPlan?: IntegratedPlanSynthesis | null;
}): CoachGuideDocument {
  const { profile, persona, input, reportId, planOutput, integratedPlan } = args;
  const name = coachGuideClientName(input);
  const primaryKey = profile.primaryPersona;
  const secondaryKey = profile.secondaryPersona;
  const coachProfile = PERSONA_COACH_PROFILE[primaryKey];
  const primaryLabel = PERSONA_DISPLAY[primaryKey]?.label ?? personaLabel(primaryKey);
  const secondaryLabel = PERSONA_DISPLAY[secondaryKey]?.label ?? personaLabel(secondaryKey);
  const secondaryPct = Math.round(persona.personaPercentages?.[secondaryKey] ?? 0);
  const goal = formatGoal(profile.goals);
  const barrier = formatBarrier(profile.barriers);

  const validationCheck = buildDeterministicValidationCheck(
    name,
    primaryKey,
    profile.barriers[0] ?? barrier,
  );

  const pivotTriggers = coachProfile.riskSignals.map((r) => {
    if (r.signal.includes("silence")) return `Check in privately and activate the pre-written restart protocol immediately.`;
    if (r.signal.includes("over-compliance")) return `Reduce plan complexity. Reframe rest as part of the system, not failure.`;
    if (r.signal.includes("start over")) return `Hold the current plan. Simplify one element. Show proof of what already worked.`;
    return `Address ${r.signal.toLowerCase()} before adding anything new.`;
  });
  pivotTriggers.push("If 2+ plan elements are missed for 1+ week: simplify the plan before adding anything.");

  const personaMatrix = coachProfile.pillarMatrix;
  const pillarMatrix =
    planOutput && integratedPlan
      ? deriveCoachMatrixFromPlan(planOutput, integratedPlan, personaMatrix)
      : personaMatrix;

  return {
    clientName: name,
    reportId,
    reportDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    personaTitle: persona.personaTitle,
    fitScore: Math.round(persona.fitScore),
    fitTier: persona.fitTier,
    primaryPersona: primaryKey,
    primaryPersonaLabel: primaryLabel,
    secondaryPersonaLabel: secondaryLabel,
    secondaryPct,
    introduction: {
      personaSummary: `${coachProfile.operatingStyle} · ${coachProfile.naturalStrength}`,
      personaDescription: buildPersonaDescription(name, coachProfile, goal, barrier),
      secondaryInfluence: buildSecondaryInfluence(name, primaryLabel, secondaryLabel, secondaryPct, secondaryKey),
      traits: buildTraitRows(persona, primaryKey),
      primaryGoal: goal,
      topBarrier: barrier,
      motivates: defaultMotivators(coachProfile),
      drains: defaultDrains(coachProfile),
      blindSpot: coachProfile.blindSpot,
      blindSpotCoachResponse: coachProfile.blindSpotCoachResponse,
      riskSignals: coachProfile.riskSignals,
    },
    guidingPrinciples: {
      pillarMatrix,
      validationCheck,
      monitoringSignals: coachProfile.riskSignals.map((r) => r.signal),
      pivotTriggers,
      reviewCadence: [
        { period: "Weeks 1–2", action: `Verify restart protocol is written. Check environment fit. ${coachProfile.reviewNote}` },
        { period: "Weeks 3–4", action: "Is the structure holding? If adherence is strong, reinforce — do not add complexity. If dropping off, simplify before extended-pause patterns activate." },
        { period: "Week 6+", action: "Full plan review. Assess whether the setup still fits. Adjust, never overhaul." },
      ],
    },
    closing: {
      fiveWordSummary: coachProfile.fiveWordSummary,
    },
    planPhaseSummary:
      planOutput && integratedPlan ? summarizePlanPhasePillars(planOutput) : undefined,
    matrixSyncedFromPlan: Boolean(planOutput && integratedPlan),
    clientIntegratedPlan:
      planOutput && integratedPlan
        ? { planOutput, synthesis: integratedPlan }
        : null,
    synthesized: false,
  };
}

/** Deterministic display-logic only — use synthesizeCoachGuideDocument for AI sections. */
export const buildCoachGuideDocument = buildCoachGuideDocumentDeterministic;

export function coachGuideCoverLine(doc: CoachGuideDocument): string {
  return `${fitTierLabel(doc.fitTier)} ${doc.primaryPersonaLabel} with ${doc.secondaryPersonaLabel} tendencies`;
}
