import { DEFAULT_PERSONA_CENTROIDS } from "@/lib/scoring/persona-defaults";
import { PERSONA_KEYS, TRAIT_KEYS, type PersonaAnalysis, type PersonaKey, type TraitKey } from "@/lib/scoring/persona-types";

const NEUTRAL_TRAIT = 4;

export function defaultTraitAverages(): Record<TraitKey, number> {
  return {
    openness: NEUTRAL_TRAIT,
    conscientiousness: NEUTRAL_TRAIT,
    extraversion: NEUTRAL_TRAIT,
    agreeableness: NEUTRAL_TRAIT,
    neuroticism: NEUTRAL_TRAIT,
  };
}

export function isPersonaKey(value: unknown): value is PersonaKey {
  return typeof value === "string" && (PERSONA_KEYS as readonly string[]).includes(value);
}

/** True when stored persona JSON is missing fields from newer scoring (v7). */
export function personaNeedsRecompute(persona: unknown): boolean {
  if (!persona || typeof persona !== "object") return true;
  const p = persona as Partial<PersonaAnalysis>;
  if (!isPersonaKey(p.primaryPersona)) return true;
  const ta = p.traitAverages;
  if (!ta || typeof ta !== "object") return true;
  return TRAIT_KEYS.some((k) => typeof ta[k] !== "number" || !Number.isFinite(ta[k]));
}

export function resolveTraitAverages(persona: Partial<PersonaAnalysis> | null | undefined): Record<TraitKey, number> {
  const out = defaultTraitAverages();
  const ta = persona?.traitAverages;
  if (!ta || typeof ta !== "object") return out;
  for (const k of TRAIT_KEYS) {
    const v = ta[k];
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

export function resolvePrimaryPersonaKey(persona: Partial<PersonaAnalysis> | null | undefined): PersonaKey {
  if (isPersonaKey(persona?.primaryPersona)) return persona.primaryPersona;
  return "self_regulated_planner";
}

export function resolvePrimaryCentroidVector(persona: Partial<PersonaAnalysis>): Record<TraitKey, number> {
  const key = resolvePrimaryPersonaKey(persona);
  const fallback = DEFAULT_PERSONA_CENTROIDS[key];
  const deviations = persona.traitDeviations;
  if (!deviations?.length) return fallback;

  const out = { ...fallback };
  for (const d of deviations) {
    if (d?.trait && typeof d.centroidScore === "number") {
      out[d.trait] = d.centroidScore;
    }
  }
  return out;
}
