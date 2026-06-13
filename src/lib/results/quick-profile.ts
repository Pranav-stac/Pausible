import { PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import {
  resolvePrimaryCentroidVector,
  resolvePrimaryPersonaKey,
  resolveTraitAverages,
} from "@/lib/scoring/normalize-persona";
import type { PersonaAnalysis, PersonaKey, TraitKey } from "@/lib/scoring/persona-types";
import { TRAIT_LABELS } from "@/lib/scoring/persona-types";

const WELLNESS_STYLE: Record<PersonaKey, string> = {
  self_regulated_planner: "Structured & Self-Regulated",
  social_motivator: "Social & Energizing",
  stress_sensitive: "Careful & Responsive",
  curious_explorer: "Curious & Experimental",
  resilient_performer: "Disciplined & Resilient",
  brittle_avoidant: "Protective & Gradual",
};

const MOTIVATION_DRIVER: Record<PersonaKey, string> = {
  self_regulated_planner: "Internal discipline and planning",
  social_motivator: "Social energy and accountability",
  stress_sensitive: "Safety and low-pressure progress",
  curious_explorer: "Novelty and learning",
  resilient_performer: "Grit and self-reliance",
  brittle_avoidant: "Low-friction wins and gentle pacing",
};

export type QuickProfilePanel = {
  wellnessStyle: string;
  energyPattern: string;
  motivationDriver: string;
  riskFactor: string;
  bestEnvironment: string;
  personaPercentage: number;
  archetype: string;
};

function energyPattern(extraversion: number, centroidE: number): string {
  const diff = extraversion - centroidE;
  if (diff > 1) return "High-energy and socially fueled";
  if (diff < -1) return "Quiet-paced and internally fueled";
  return "Steady-paced";
}

function bestEnvironment(extraversion: number, neuroticism: number, centroidE: number, centroidN: number): string {
  const highN = neuroticism > centroidN + 0.5;
  const lowE = extraversion < centroidE - 0.5;
  if (highN && lowE) return "Quiet, low-pressure settings";
  if (extraversion > centroidE + 1) return "Social, energetic environments";
  if (neuroticism < centroidN - 0.5) return "Structured, predictable routines";
  return "Balanced structure with flexibility";
}

export function buildQuickProfile(
  persona: PersonaAnalysis,
  topBarrierLabel?: string,
): QuickProfilePanel {
  const key = resolvePrimaryPersonaKey(persona);
  const traits = resolveTraitAverages(persona);
  const centroid = resolvePrimaryCentroidVector(persona);

  const display = PERSONA_DISPLAY[key];
  const pct = persona.personaPercentages?.[key] ?? 0;

  return {
    wellnessStyle: WELLNESS_STYLE[key],
    energyPattern: energyPattern(traits.extraversion, centroid.extraversion),
    motivationDriver: MOTIVATION_DRIVER[key],
    riskFactor: topBarrierLabel ?? "Inconsistency under pressure",
    bestEnvironment: bestEnvironment(
      traits.extraversion,
      traits.neuroticism,
      centroid.extraversion,
      centroid.neuroticism,
    ),
    personaPercentage: Math.round(pct),
    archetype: display?.archetype ?? key.replace(/_/g, " "),
  };
}

export function friendlyTraitLabel(trait: TraitKey): string {
  const map: Record<TraitKey, string> = {
    openness: "Openness to new approaches",
    conscientiousness: "Discipline",
    extraversion: "Social Energy",
    agreeableness: "Cooperation",
    neuroticism: "Stress Sensitivity",
  };
  return map[trait] ?? TRAIT_LABELS[trait];
}
