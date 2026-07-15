import masterRowsJson from "@/data/recommendations/master-rows.json";
import tagMappingRulesJson from "@/data/recommendations/tag-mapping-rules.json";
import { buildWellnessFieldsFromTagMapping } from "@/lib/recommendations/build-wellness-fields";
import type {
  DerivedExclusionRule,
  RawRecommendationRow,
  RecommendationConfig,
  TagMappingRule,
} from "@/lib/recommendations/firestore-config-types";
import { normalizeRecommendationRow } from "@/lib/recommendations/firestore-config-types";

/**
 * Safety / context exclusion rules wired into `derivedExclusionRules`.
 * Aligns with Contextual Tags v1.5 DR01–DR07 suppressions (DR08+ handled elsewhere).
 */
function buildDerivedRules(): DerivedExclusionRule[] {
  return [
    {
      id: "DR01",
      exclusionTag: "exclude_poor_sleep_high_intensity",
      anyContext: ["sleep_quality_poor", "sleep_quality_very_poor"],
    },
    {
      id: "DR02",
      exclusionTag: "exclude_beginner_advanced_training",
      anyContext: ["fitness_beginner", "fitness_restarting"],
    },
    { id: "DR03", exclusionTag: "exclude_high_stress_extreme_diet", anyContext: ["stress_high"] },
    {
      id: "DR04",
      exclusionTag: "exclude_high_anxiety_overtracking",
      personaAliases: ["watchful_deer"],
    },
    {
      id: "DR05",
      exclusionTag: "exclude_travel_heavy_rigid_routine",
      anyContext: ["work_travel_heavy"],
    },
    {
      id: "DR06",
      exclusionTag: "exclude_low_time_long_workouts",
      // v1.5 tag + master-compat alias
      anyContext: ["time_under_30_min", "time_under_15_min"],
    },
    {
      id: "DR07",
      exclusionTag: "exclude_emotional_eating_extreme_restriction",
      anyBarriers: [
        "barrier_stress_emotional_eating",
        "barrier_emotional_eating_cravings",
        "barrier_emotional_eating",
      ],
    },
  ];
}

/** Payload written to Firestore `recommendation_config/active`. */
export function buildRecommendationSeedPayload(): RecommendationConfig {
  const rawRows = masterRowsJson as RawRecommendationRow[];
  const recommendations = rawRows.map(normalizeRecommendationRow);
  const tagMappingRules = tagMappingRulesJson as TagMappingRule[];

  return {
    version: "4",
    masterVersion: "v1.20",
    recommendations,
    tagMappingRules,
    wellnessFields: buildWellnessFieldsFromTagMapping(tagMappingRules),
    derivedExclusionRules: buildDerivedRules(),
    healthExclusionByAnswer: {},
  };
}
