import type {
  PillarName,
  RecommendationRow,
  RecommendationStrength,
  RecommendationType,
} from "@/lib/recommendations/types";

export const RECOMMENDATION_CONFIG_DOC_PATH = "recommendation_config/active";

export type TagMappingRule = {
  questionId: string;
  question: string;
  responseType: string;
  responseValue: string;
  tagCategory: "Context Fit" | "Goal Fit" | "Barrier Fit" | "Exclude If" | string;
  tag: string;
};

export type WellnessFieldKind = "single" | "multi" | "likert_scale";

/** Maps app wellness answers (`wc_*`) to recommendation tags. */
export type WellnessFieldConfig = {
  /** Full answer key, e.g. `wc_age_range`. */
  answerKey: string;
  kind: WellnessFieldKind;
  /** Normalized option label → tag or tags (goals/barriers/context). */
  optionTags?: Record<string, string | string[]>;
  /** Inclusive likert bands (e.g. stress 1–7). */
  likertBands?: { min: number; max: number; tag: string }[];
  /** When true, also push matching tags into barriers (e.g. poor sleep). */
  inferBarrierTags?: string[];
};

export type DerivedExclusionRule = {
  id: string;
  exclusionTag: string;
  anyContext?: string[];
  anyBarriers?: string[];
  /** Matches if primary OR secondary persona alias is listed. */
  personaAliases?: string[];
};

export type RecommendationConfig = {
  version: string;
  masterVersion: string;
  recommendations: RecommendationRow[];
  tagMappingRules: TagMappingRule[];
  wellnessFields: WellnessFieldConfig[];
  derivedExclusionRules: DerivedExclusionRule[];
  /** Normalized health answer (no/yes/prefer not to say) → exclusion tags. */
  healthExclusionByAnswer: Record<string, string[]>;
};

export type RecommendationConfigFirestoreDoc = RecommendationConfig & {
  recommendationCount: number;
  tagRuleCount: number;
  updatedAt?: string;
};

export type RawRecommendationRow = {
  id: string;
  pillar: string;
  category: string;
  type: string;
  text: string;
  personaFit: string[];
  contextFit: string[];
  goalFit: string[];
  barrierFit: string[];
  excludeIf: string[];
  strength: string;
  oceanTraitTags?: string[];
  oceanCategoryTags?: string[];
  oceanFit?: string[];
  /** 1–5 preferred; legacy "low"|"medium"|"high" accepted. */
  effortLevel?: number | string;
  notes: string;
  personaContext?: Partial<Record<string, string>>;
  scopeClassification?: string;
  userFacingBoundary?: string;
  recommendationRole?: string;
};

const PILLARS: PillarName[] = ["Nutrition", "Physical Activity", "Sleep & Recovery", "Mental Wellness"];
const STRENGTHS: RecommendationStrength[] = ["core", "supporting", "optional", "conditional"];
const TYPES: RecommendationType[] = [
  "do",
  "dont",
  "first_action",
  "mindset_shift",
  "environment_change",
  "recovery_rule",
  "coach_note",
  "safety_guidance",
  "blind_spot",
  "pattern_prediction",
  "success_condition",
  "strength_insight",
];

function normalizeEffortLevel(raw: number | string | undefined): 1 | 2 | 3 | 4 | 5 {
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 1 && raw <= 5) {
    return raw as 1 | 2 | 3 | 4 | 5;
  }
  const s = String(raw ?? "3").trim().toLowerCase();
  const asNum = Number(s);
  if (Number.isInteger(asNum) && asNum >= 1 && asNum <= 5) return asNum as 1 | 2 | 3 | 4 | 5;
  if (s === "low") return 2;
  if (s === "medium") return 3;
  if (s === "high") return 4;
  return 3;
}

export function normalizeRecommendationRow(raw: RawRecommendationRow): RecommendationRow {
  const pillar =
    PILLARS.find((p) => p.toLowerCase() === raw.pillar.trim().toLowerCase()) ?? "Mental Wellness";
  const strength = STRENGTHS.includes(raw.strength as RecommendationStrength)
    ? (raw.strength as RecommendationStrength)
    : "supporting";
  const typeNorm = raw.type.trim().toLowerCase().replace(/\s+/g, "_");
  const type = TYPES.includes(typeNorm as RecommendationType) ? (typeNorm as RecommendationType) : "do";

  const oceanTraitTags = raw.oceanTraitTags?.length
    ? raw.oceanTraitTags
    : (raw.oceanFit ?? []);

  const roleRaw = (raw.recommendationRole ?? "").trim().toLowerCase().replace(/\s+/g, "_");

  return {
    id: raw.id.trim(),
    pillar,
    category: raw.category.trim(),
    type,
    text: raw.text.trim(),
    personaFit: raw.personaFit ?? [],
    contextFit: raw.contextFit ?? [],
    goalFit: raw.goalFit ?? [],
    barrierFit: raw.barrierFit ?? [],
    excludeIf: raw.excludeIf ?? [],
    strength,
    oceanTraitTags,
    oceanCategoryTags: raw.oceanCategoryTags ?? [],
    oceanFit: oceanTraitTags,
    effortLevel: normalizeEffortLevel(raw.effortLevel),
    notes: raw.notes?.trim() ?? "",
    personaContext: raw.personaContext ?? {},
    scopeClassification: (raw.scopeClassification ?? "").trim().toLowerCase().replace(/\s+/g, "_"),
    userFacingBoundary: (raw.userFacingBoundary ?? "").trim().toLowerCase().replace(/\s+/g, "_"),
    recommendationRole: roleRaw || "standard",
  };
}

export function parseRecommendationConfigDoc(data: Record<string, unknown> | undefined): RecommendationConfig | null {
  if (!data?.recommendations || !Array.isArray(data.recommendations)) return null;

  const recommendations = (data.recommendations as RawRecommendationRow[]).map(normalizeRecommendationRow);
  const tagMappingRules = (data.tagMappingRules as TagMappingRule[]) ?? [];
  const wellnessFields = (data.wellnessFields as WellnessFieldConfig[]) ?? [];
  const derivedExclusionRules = (data.derivedExclusionRules as DerivedExclusionRule[]) ?? [];
  const healthExclusionByAnswer =
    (data.healthExclusionByAnswer as Record<string, string[]>) ?? {};

  return {
    version: String(data.version ?? "1"),
    masterVersion: String(data.masterVersion ?? "v1.20"),
    recommendations,
    tagMappingRules,
    wellnessFields,
    derivedExclusionRules,
    healthExclusionByAnswer,
  };
}
