import type { PersonaKey } from "@/lib/scoring/persona-types";
import type { RecommendationConfig } from "@/lib/recommendations/firestore-config-types";

export const SCORING_CONFIG_DOC = "scoring_config/active";
export const PERSONA_CATALOG_DOC = "persona_catalog/active";
export const REPORT_TEMPLATES_DOC = "report_templates/active";

export type ScoringConfigDoc = {
  version: string;
  likertMin: number;
  likertMax: number;
  traitDeviationThreshold: number;
  fitTierBands: { classic: number; core: number; leaning: number; exploring: number };
  blendRatioBands: { pure: number; tendencies: number };
  updatedAt?: string;
};

export type PersonaCatalogEntry = {
  label: string;
  archetype: string;
  summary: string;
  bullets: string[];
  animalName: string;
  emoji: string;
  imagePath: string;
};

export type PersonaCatalogDoc = {
  version: string;
  personas: Record<PersonaKey, PersonaCatalogEntry>;
  updatedAt?: string;
};

export type ReportTemplatesDoc = {
  version: string;
  reportVersionLabel: string;
  slideLabels: Record<string, string>;
  geminiFitTierTone: Record<string, string>;
  geminiBlendRules: Record<string, string>;
  pillarLabels: Record<string, string>;
  updatedAt?: string;
};

export type RecommendationConfigAdminView = RecommendationConfig & {
  recommendationCount?: number;
  tagRuleCount?: number;
  updatedAt?: string;
};
