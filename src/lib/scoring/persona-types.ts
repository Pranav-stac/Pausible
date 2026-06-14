/** Six fitness behavioral personas (centroid keys). */
export const PERSONA_KEYS = [
  "self_regulated_planner",
  "social_motivator",
  "stress_sensitive",
  "curious_explorer",
  "resilient_performer",
  "brittle_avoidant",
] as const;

export type PersonaKey = (typeof PERSONA_KEYS)[number];

export const TRAIT_KEYS = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
] as const;

export type TraitKey = (typeof TRAIT_KEYS)[number];

export const TRAIT_LABELS: Record<TraitKey, string> = {
  openness: "Openness",
  conscientiousness: "Conscientiousness",
  extraversion: "Extraversion",
  agreeableness: "Agreeableness",
  neuroticism: "Neuroticism",
};

/** Centroid scores per trait for one persona (1–7 scale). */
export type PersonaCentroidVector = Record<TraitKey, number>;

/** Full centroid table: persona → trait averages. */
export type PersonaCentroidTable = Record<PersonaKey, PersonaCentroidVector>;

export type QuestionItemResponse = {
  questionId: string;
  facetId: string;
  trait: string;
  question: string;
  responseScore: number;
};

export type FitTier = "classic" | "core" | "adaptive" | "emerging";
export type BlendStrength = "pure" | "tendencies" | "strong_influence";

export type TraitDeviation = {
  trait: TraitKey;
  userScore: number;
  centroidScore: number;
  deviation: number;
  direction: "above" | "below";
};

export type PersonaAnalysis = {
  itemResponses: QuestionItemResponse[];
  facetAverages: Record<string, number>;
  traitAverages: Record<TraitKey, number>;
  /** Analytics tags per OCEAN trait (low / medium / high). */
  traitTags?: Record<TraitKey, string>;
  /** Analytics tags per facet category (keyed by facet ID, e.g. O-NC). */
  categoryTags?: Record<string, string>;
  /** Flat list of all trait + category tags for analytics export. */
  oceanTags?: string[];
  personaDistances: Record<PersonaKey, number>;
  personaSi: Record<PersonaKey, number>;
  personaPercentages: Record<PersonaKey, number>;
  primaryPersona: PersonaKey;
  secondaryPersona: PersonaKey;
  /** 0–100 match to primary persona centroid. */
  fitScore: number;
  fitTier: FitTier;
  blendRatio: number;
  blendStrength: BlendStrength;
  personaTitle: string;
  traitDeviations: TraitDeviation[];
  maxInterCentroidDistance: number;
  alpha: number;
  computedAt: string;
};

import type { ScoringFormulaBands } from "@/lib/scoring/persona-fit";

export type PersonaScoringConfig = {
  centroids: PersonaCentroidTable;
  alpha: number;
  formulaBands?: ScoringFormulaBands;
};
