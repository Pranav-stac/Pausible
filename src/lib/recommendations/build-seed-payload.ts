import { WELLNESS_CONTEXT_PREFIX } from "@/data/wellness-context-questionnaire";
import masterRowsJson from "@/data/recommendations/master-rows.json";
import tagMappingRulesJson from "@/data/recommendations/tag-mapping-rules.json";
import type {
  DerivedExclusionRule,
  RawRecommendationRow,
  RecommendationConfig,
  TagMappingRule,
  WellnessFieldConfig,
} from "@/lib/recommendations/firestore-config-types";
import { normalizeRecommendationRow } from "@/lib/recommendations/firestore-config-types";

const w = (id: string) => `${WELLNESS_CONTEXT_PREFIX}${id}`;

/** Wellness questionnaire option labels → tags (stored in Firestore, not CSV). */
function buildWellnessFields(): WellnessFieldConfig[] {
  const opt = (map: Record<string, string | string[]>) => map;

  return [
    {
      answerKey: w("age_range"),
      kind: "single",
      optionTags: opt({
        "under 18": "age_under_18",
        "18-24": "age_18_24",
        "25-34": "age_25_34",
        "35-44": "age_35_44",
        "45-54": "age_45_54",
        "55+": "age_55_plus",
      }),
    },
    {
      answerKey: w("stress_level"),
      kind: "likert_scale",
      likertBands: [
        { min: 1, max: 2, tag: "stress_low" },
        { min: 3, max: 5, tag: "stress_moderate" },
        { min: 6, max: 7, tag: "stress_high" },
      ],
    },
    {
      answerKey: w("work_lifestyle"),
      kind: "single",
      optionTags: opt({
        "desk-based / office work": "work_desk_based",
        "hybrid work": "work_hybrid",
        "remote work": "work_remote",
        "shift-based work": "work_shift_based",
        "physically demanding work": "work_physically_demanding",
        "travel-heavy work": "work_travel_heavy",
        "homemaker / caregiving responsibilities": "lifestyle_caregiving",
        student: "lifestyle_student",
        "currently not working": "lifestyle_not_working",
      }),
    },
    {
      answerKey: w("wellness_time"),
      kind: "single",
      optionTags: opt({
        "less than 10 minutes": "time_under_10_min",
        "10-20 minutes": "time_10_20_min",
        "20-30 minutes": "time_20_30_min",
        "30-45 minutes": "time_30_45_min",
        "45-60 minutes": "time_45_60_min",
        "more than 60 minutes": "time_over_60_min",
      }),
    },
    {
      answerKey: w("fitness_level"),
      kind: "single",
      optionTags: opt({
        "beginner — i rarely exercise": "fitness_beginner",
        "restarting — i used to exercise but stopped": "fitness_restarting",
        "intermediate — i exercise occasionally": "fitness_intermediate",
        "consistent — i train regularly": "fitness_consistent",
        "advanced — i follow structured fitness programs": "fitness_advanced",
      }),
    },
    {
      answerKey: w("daily_activity"),
      kind: "single",
      optionTags: opt({
        "mostly sedentary — sitting for most of the day with little movement (under 4,000 steps/day)":
          "activity_sedentary",
        "lightly active — some movement during the day (4,000-7,000 steps/day)": "activity_light",
        "moderately active — regular movement and occasional exercise (7,000-10,000 steps/day or 2-4 workouts/week)":
          "activity_moderate",
        "very active — frequent movement or regular training (10,000+ steps/day or 5+ workouts/week)":
          "activity_very_active",
      }),
    },
    {
      answerKey: w("sleep_quality"),
      kind: "single",
      inferBarrierTags: ["barrier_poor_sleep"],
      optionTags: opt({
        "very poor — frequently interrupted sleep or waking exhausted": "sleep_quality_very_poor",
        "poor — sleep is inconsistent and often leaves you tired": "sleep_quality_poor",
        "average — sleep is manageable but not consistently refreshing": "sleep_quality_average",
        "good — most nights feel restful with decent recovery": "sleep_quality_good",
        "excellent — consistently deep, restful sleep with strong recovery": "sleep_quality_excellent",
      }),
    },
    {
      answerKey: w("sleep_hours"),
      kind: "single",
      optionTags: opt({
        "less than 5 hours": "sleep_under_5_hours",
        "5-6 hours": "sleep_5_6_hours",
        "6-7 hours": "sleep_6_7_hours",
        "7-8 hours": "sleep_7_8_hours",
        "more than 8 hours": "sleep_over_8_hours",
      }),
    },
    {
      answerKey: w("workout_environment"),
      kind: "single",
      optionTags: opt({
        "at home": "environment_home",
        gym: "environment_gym",
        outdoors: "environment_outdoors",
        "group classes": "environment_group_classes",
        "with a personal trainer": "environment_personal_trainer",
        "no preference": "environment_no_preference",
      }),
    },
    {
      answerKey: w("food_pattern"),
      kind: "single",
      optionTags: opt({
        vegetarian: "food_vegetarian",
        vegan: "food_vegan",
        eggetarian: "food_eggetarian",
        "non-vegetarian": "food_non_vegetarian",
        pescatarian: "food_pescatarian",
        "no specific preference": "food_no_preference",
        "religious/cultural dietary restrictions": "food_religious_cultural_restrictions",
      }),
    },
    {
      answerKey: w("meal_control"),
      kind: "single",
      optionTags: opt({
        "i prepare most of my meals": "meal_control_self_prepared",
        "someone else prepares most of my meals": "meal_control_prepared_by_others",
        "i frequently eat outside / order food": "meal_control_frequent_eating_out",
        "mixed / depends on the day": "meal_control_mixed",
        "i mostly rely on office/cafeteria food": "meal_control_office_cafeteria",
      }),
    },
    {
      answerKey: w("support_system"),
      kind: "single",
      optionTags: opt({
        "strong support from friends/family": "support_strong",
        "some support": "support_some",
        "neutral environment": "support_neutral",
        "unsupportive environment": "support_unsupportive",
        "i prefer doing things on my own": "support_self_directed",
      }),
    },
    {
      answerKey: w("wellness_goals"),
      kind: "multi",
      optionTags: opt({
        "fat loss": "goal_fat_loss",
        "muscle gain": "goal_muscle_gain",
        "improve strength": "goal_strength",
        "better energy levels": "goal_energy",
        "improve sleep": "goal_sleep_improvement",
        "reduce stress": "goal_stress_reduction",
        "improve flexibility/mobility": "goal_flexibility_mobility",
        "build consistency and discipline": "goal_consistency_discipline",
        "improve overall health": "goal_overall_health",
        "improve confidence/appearance": "goal_body_confidence",
        "return to fitness after a long break": "goal_return_to_fitness",
      }),
    },
    {
      answerKey: w("biggest_barrier"),
      kind: "single",
      optionTags: opt({
        "lack of time": "barrier_lack_of_time",
        "lack of consistency": "barrier_lack_of_consistency",
        "work stress": "barrier_work_stress",
        "poor sleep": "barrier_poor_sleep",
        "low motivation": "barrier_low_motivation",
        "emotional eating / cravings": "barrier_emotional_eating_cravings",
        "gym anxiety": "barrier_gym_anxiety",
        "lack of knowledge": "barrier_lack_of_knowledge",
        "travel and schedule disruptions": "barrier_travel_schedule_disruption",
        "family responsibilities": "barrier_family_responsibilities",
        "injury or physical discomfort": "barrier_injury_discomfort",
      }),
    },
    {
      answerKey: w("health_restrictions"),
      kind: "single",
    },
  ];
}

function buildDerivedRules(): DerivedExclusionRule[] {
  return [
    {
      id: "DQ01",
      exclusionTag: "exclude_poor_sleep_high_intensity",
      anyContext: ["sleep_quality_poor", "sleep_quality_very_poor"],
    },
    {
      id: "DQ02",
      exclusionTag: "exclude_beginner_advanced_training",
      anyContext: ["fitness_beginner", "fitness_restarting"],
    },
    { id: "DQ03", exclusionTag: "exclude_high_stress_extreme_diet", anyContext: ["stress_high"] },
    {
      id: "DQ04",
      exclusionTag: "exclude_high_anxiety_overtracking",
      personaAliases: ["watchful_deer"],
    },
    {
      id: "DQ05",
      exclusionTag: "exclude_shift_work_strict_sleep_schedule",
      anyContext: ["work_shift_based"],
    },
    {
      id: "DQ06",
      exclusionTag: "exclude_travel_heavy_rigid_routine",
      anyContext: ["work_travel_heavy"],
    },
    {
      id: "DQ07",
      exclusionTag: "exclude_low_time_long_workouts",
      anyContext: ["time_under_10_min", "time_10_20_min"],
    },
    {
      id: "DQ08",
      exclusionTag: "exclude_emotional_eating_extreme_restriction",
      anyBarriers: ["barrier_emotional_eating_cravings"],
    },
  ];
}

/** Payload written to Firestore `recommendation_config/active`. */
export function buildRecommendationSeedPayload(): RecommendationConfig {
  const rawRows = masterRowsJson as RawRecommendationRow[];
  const recommendations = rawRows.map(normalizeRecommendationRow);
  const tagMappingRules = tagMappingRulesJson as TagMappingRule[];

  return {
    version: "1",
    masterVersion: "v1.8",
    recommendations,
    tagMappingRules,
    wellnessFields: buildWellnessFields(),
    derivedExclusionRules: buildDerivedRules(),
    healthExclusionByAnswer: {
      no: ["exclude_none"],
      yes: ["exclude_medical_condition", "exclude_injury", "exclude_doctor_advised_restriction"],
      "prefer not to say": ["exclude_prefer_not_to_say_health"],
    },
  };
}
