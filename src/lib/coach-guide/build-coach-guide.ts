import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import type { UserProfile } from "@/lib/recommendations/types";
import {
  PERSONA_COACH_PROFILE,
  secondaryInteractionPattern,
} from "@/lib/coach-guide/persona-content";
import type { CoachGuideDocument, CoachGuideTraitRow } from "@/lib/coach-guide/types";
import { PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import { fitTierLabel } from "@/lib/scoring/persona-fit";
import {
  buildTraitProfileRows,
  traitCentroidDescriptor,
  formatTraitScore,
} from "@/lib/scoring/trait-level";
import { DEFAULT_PERSONA_CENTROIDS } from "@/lib/scoring/persona-defaults";
import type { PersonaAnalysis } from "@/lib/scoring/persona-types";
import { personaLabel } from "@/lib/results/persona-display";

function firstName(input?: BuildProfileInput, fallback = "Client"): string {
  const fromAnswers =
    typeof input?.answers?.participant_display_name === "string"
      ? input.answers.participant_display_name.split(/\s+/)[0]
      : null;
  return fromAnswers?.trim() || fallback;
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
    const level =
      descriptor === "Higher than typical"
        ? "Higher than typical"
        : descriptor === "Lower than typical"
          ? "Lower than typical"
          : row.bandLabel;

    return {
      trait: row.label,
      level,
      deviation: row.isDeviation ? `${row.deviation >= 0 ? "+" : ""}${row.deviation.toFixed(1)}` : null,
      meaning: row.isDeviation
        ? `${row.label} is ${descriptor.toLowerCase()} for this pattern (score ${formatTraitScore(row.score)} vs typical ${formatTraitScore(centroid[row.trait])}).`
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

export function buildCoachGuideDocument(args: {
  profile: UserProfile;
  persona: PersonaAnalysis;
  input?: BuildProfileInput;
  reportId: string;
}): CoachGuideDocument {
  const { profile, persona, input, reportId } = args;
  const name = firstName(input);
  const primaryKey = profile.primaryPersona;
  const secondaryKey = profile.secondaryPersona;
  const coachProfile = PERSONA_COACH_PROFILE[primaryKey];
  const primaryLabel = PERSONA_DISPLAY[primaryKey]?.label ?? personaLabel(primaryKey);
  const secondaryLabel = PERSONA_DISPLAY[secondaryKey]?.label ?? personaLabel(secondaryKey);
  const secondaryPct = Math.round(persona.personaPercentages?.[secondaryKey] ?? 0);
  const goal = formatGoal(profile.goals);
  const barrier = formatBarrier(profile.barriers);

  const validationCheck: [string, string, string] = [
    `Psychologically Appropriate: Does this feel private, clearly defined, and low-pressure for ${name}?`,
    `Behaviorally Realistic: Can ${name} do this in under 20 minutes with no preparation needed?`,
    `Environmentally Executable: Does ${name} have the space, time, and access to do this in their real life?`,
  ];

  const pivotTriggers = coachProfile.riskSignals.map((r) => {
    if (r.signal.includes("silence")) return `Check in privately and activate the pre-written restart protocol immediately.`;
    if (r.signal.includes("over-compliance")) return `Reduce plan complexity. Reframe rest as part of the system, not failure.`;
    if (r.signal.includes("start over")) return `Hold the current plan. Simplify one element. Show proof of what already worked.`;
    return `Address ${r.signal.toLowerCase()} before adding anything new.`;
  });
  pivotTriggers.push("If 2+ plan elements are missed for 1+ week: simplify the plan before adding anything.");

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
      pillarMatrix: coachProfile.pillarMatrix,
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
    synthesized: false,
  };
}

export function coachGuideCoverLine(doc: CoachGuideDocument): string {
  return `${fitTierLabel(doc.fitTier)} ${doc.primaryPersonaLabel} with ${doc.secondaryPersonaLabel} tendencies`;
}
