import type { ScoringConfigDoc } from "@/lib/admin/platform-config-types";
import { DEFAULT_SCORING_CONFIG } from "@/lib/admin/platform-config-defaults";
import { PERSONA_ANIMAL } from "@/lib/scoring/persona-defaults";
import type {
  BlendStrength,
  FitTier,
  PersonaCentroidTable,
  PersonaKey,
  TraitDeviation,
  TraitKey,
} from "@/lib/scoring/persona-types";
import { PERSONA_KEYS, TRAIT_KEYS } from "@/lib/scoring/persona-types";

export type { BlendStrength, FitTier, TraitDeviation };

export type ScoringFormulaBands = Pick<
  ScoringConfigDoc,
  "fitTierBands" | "blendRatioBands" | "traitDeviationThreshold"
>;

const DEFAULT_BANDS: ScoringFormulaBands = {
  fitTierBands: DEFAULT_SCORING_CONFIG.fitTierBands,
  blendRatioBands: DEFAULT_SCORING_CONFIG.blendRatioBands,
  traitDeviationThreshold: DEFAULT_SCORING_CONFIG.traitDeviationThreshold,
};

function euclideanDistance(
  a: Record<TraitKey, number>,
  b: Record<TraitKey, number>,
): number {
  let sumSq = 0;
  for (const trait of TRAIT_KEYS) {
    const diff = (a[trait] ?? 0) - (b[trait] ?? 0);
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq);
}

/** PDA §9 — max inter-centroid distance (Pack Wolf ↔ Shielded Turtle) with §8.1 centroids. */
export const PDA_MAX_INTER_CENTROID_DISTANCE = 7.1099;

/** Largest Euclidean distance between any two persona centroids (§8.1 / §9). */
export function computeMaxInterCentroidDistance(centroids: PersonaCentroidTable): number {
  let max = 0;
  for (let i = 0; i < PERSONA_KEYS.length; i++) {
    for (let j = i + 1; j < PERSONA_KEYS.length; j++) {
      const d = euclideanDistance(centroids[PERSONA_KEYS[i]], centroids[PERSONA_KEYS[j]]);
      if (d > max) max = d;
    }
  }
  return max;
}

/** fit_score = (1 - user_distance / max_inter_centroid_distance) * 100, clamped 0–100 */
export function computeFitScore(primaryDistance: number, maxInterCentroidDistance: number): number {
  if (maxInterCentroidDistance <= 0) return 0;
  const raw = (1 - primaryDistance / maxInterCentroidDistance) * 100;
  return Math.min(100, Math.max(0, raw));
}

/** Map legacy tier keys from stored attempts / old Firestore config. */
export function normalizeFitTier(tier: string | undefined | null): FitTier {
  if (tier === "adaptive") return "leaning";
  if (tier === "emerging") return "exploring";
  if (tier === "classic" || tier === "core" || tier === "leaning" || tier === "exploring") return tier;
  return "classic";
}

export function computeFitTier(fitScore: number, bands = DEFAULT_BANDS.fitTierBands): FitTier {
  if (fitScore >= bands.classic) return "classic";
  if (fitScore >= bands.core) return "core";
  if (fitScore >= bands.leaning) return "leaning";
  return "exploring";
}

export function fitTierLabel(tier: FitTier | string): string {
  const normalized = normalizeFitTier(tier);
  const labels: Record<FitTier, string> = {
    classic: "Classic",
    core: "Core",
    leaning: "Leaning",
    exploring: "Exploring",
  };
  return labels[normalized];
}

/** blend_ratio = secondary_distance / primary_distance */
export function computeBlendRatio(primaryDistance: number, secondaryDistance: number): number {
  if (primaryDistance <= 0) return Infinity;
  return secondaryDistance / primaryDistance;
}

export function computeBlendStrength(blendRatio: number, bands = DEFAULT_BANDS.blendRatioBands): BlendStrength {
  if (blendRatio > bands.pure) return "pure";
  if (blendRatio >= bands.tendencies) return "tendencies";
  return "strong_influence";
}

export function blendStrengthLabel(strength: BlendStrength): string {
  const labels: Record<BlendStrength, string> = {
    pure: "Pure",
    tendencies: "Tendencies",
    strong_influence: "Strong Influence",
  };
  return labels[strength];
}

export function computePersonaTitle(
  primaryPersona: PersonaKey,
  secondaryPersona: PersonaKey,
  fitTier: FitTier,
  blendStrength: BlendStrength,
): string {
  const primaryName = PERSONA_ANIMAL[primaryPersona].name;
  const tier = fitTierLabel(fitTier);
  const base = `${tier} ${primaryName}`;

  if (blendStrength === "pure" || primaryPersona === secondaryPersona) {
    return base;
  }

  const secondaryName = PERSONA_ANIMAL[secondaryPersona].name;
  if (blendStrength === "tendencies") {
    return `${base} with ${secondaryName} tendencies`;
  }
  return `${base} with strong ${secondaryName} influence`;
}

export function topTwoPersonasByDistance(
  distances: Record<PersonaKey, number>,
): { primary: PersonaKey; secondary: PersonaKey } {
  const ranked = [...PERSONA_KEYS].sort((a, b) => (distances[a] ?? Infinity) - (distances[b] ?? Infinity));
  return {
    primary: ranked[0] ?? PERSONA_KEYS[0],
    secondary: ranked[1] ?? PERSONA_KEYS[1],
  };
}

/** Traits where user deviates > threshold from primary persona centroid. */
export function computeTraitDeviations(
  traitAverages: Record<TraitKey, number>,
  centroid: Record<TraitKey, number>,
  threshold = DEFAULT_BANDS.traitDeviationThreshold,
): TraitDeviation[] {
  const out: TraitDeviation[] = [];
  for (const trait of TRAIT_KEYS) {
    const userScore = traitAverages[trait] ?? 0;
    const centroidScore = centroid[trait] ?? 0;
    const deviation = userScore - centroidScore;
    if (Math.abs(deviation) > threshold) {
      out.push({
        trait,
        userScore,
        centroidScore,
        deviation,
        direction: deviation > 0 ? "above" : "below",
      });
    }
  }
  return out.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));
}
