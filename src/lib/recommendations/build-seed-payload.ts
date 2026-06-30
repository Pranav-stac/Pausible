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

function opt(map: Record<string, string | string[]>): Record<string, string | string[]> {
  return map;
}

/** CQ v1.3 option labels → tags (PDA §10). */
function buildWellnessFields(): WellnessFieldConfig[] {
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
      answerKey: w("gender"),
      kind: "single",
      optionTags: opt({
        male: "gender_male",
        female: "gender_female",
        "non-binary": "gender_non_binary",
        "prefer not to say": "gender_prefer_not_to_say",
      }),
    },
    {
      answerKey: w("work_lifestyle"),
      kind: "multi",
      optionTags: opt({
        "desk-based / office work": "work_desk_based",
        "shift-based work": "work_shift_based",
        "physically demanding work": "work_physically_demanding",
        "travel-heavy work": "work_travel_heavy",
        "caregiving responsibilities": "lifestyle_caregiving",
        student: "lifestyle_student",
        "currently not working": "lifestyle_not_working",
      }),
    },
    {
      answerKey: w("stress_level"),
      kind: "single",
      optionTags: opt({
        low: "stress_low",
        moderate: "stress_moderate",
        high: "stress_high",
      }),
      inferBarrierTags: ["barrier_work_stress"],
    },
    {
      answerKey: w("wellness_time"),
      kind: "single",
      optionTags: opt({
        "under 15 minutes": "time_under_15_min",
        "15-30 minutes": "time_15_30_min",
        "30-45 minutes": "time_30_45_min",
        "45+ minutes": "time_45_plus_min",
      }),
    },
    {
      answerKey: w("fitness_level"),
      kind: "single",
      optionTags: opt({
        "beginner - i rarely exercise": "fitness_beginner",
        "restarting - i used to exercise but stopped": "fitness_restarting",
        "intermediate - i exercise occasionally": "fitness_intermediate",
        "consistent - i train regularly": "fitness_consistent",
        "advanced - i follow structured fitness programs": "fitness_advanced",
      }),
    },
    {
      answerKey: w("daily_activity"),
      kind: "single",
      optionTags: opt({
        "mostly sedentary": "activity_sedentary",
        "lightly active": "activity_light",
        "moderately active": "activity_moderate",
        "very active": "activity_very_active",
      }),
    },
    {
      answerKey: w("preferred_activities"),
      kind: "multi",
      optionTags: opt({
        walking: "activity_pref_walking",
        running: "activity_pref_running",
        "strength / resistance training": "activity_pref_strength",
        "cardio machines": "activity_pref_cardio",
        "yoga / mind-body": "activity_pref_yoga",
        sports: "activity_pref_sports",
        dance: "activity_pref_dance",
        swimming: "activity_pref_swimming",
        cycling: "activity_pref_cycling",
        "home follow-along workouts": "activity_pref_home_followalong",
        "open to anything": "activity_pref_open",
      }),
    },
    {
      answerKey: w("workout_environment"),
      kind: "single",
      optionTags: opt({
        "at home": "environment_home",
        gym: "environment_gym",
        outdoors: "environment_outdoors",
        "no preference": "environment_no_preference",
      }),
    },
    {
      answerKey: w("time_of_day"),
      kind: "single",
      optionTags: opt({
        morning: "time_of_day_morning",
        daytime: "time_of_day_daytime",
        evening: "time_of_day_evening",
        "late night": "time_of_day_latenight",
        "no preference": "time_of_day_no_preference",
      }),
    },
    {
      answerKey: w("sleep_quality"),
      kind: "single",
      inferBarrierTags: ["barrier_poor_sleep"],
      optionTags: opt({
        "very poor": "sleep_quality_very_poor",
        poor: "sleep_quality_poor",
        average: "sleep_quality_average",
        good: "sleep_quality_good",
        excellent: "sleep_quality_excellent",
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
      answerKey: w("caffeine_habit"),
      kind: "single",
      optionTags: opt({
        "none / rarely": "caffeine_none",
        "morning only": "caffeine_morning",
        "throughout the day": "caffeine_daytime",
        "evening or late day": "caffeine_evening",
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
      }),
    },
    {
      answerKey: w("meal_control"),
      kind: "single",
      optionTags: opt({
        "i prepare most of my meals": "meal_control_self_prepared",
        "prepared by others": "meal_control_prepared_by_others",
        "frequent eating out": "meal_control_frequent_eating_out",
        mixed: "meal_control_mixed",
      }),
    },
    {
      answerKey: w("wellness_goals"),
      kind: "multi",
      optionTags: opt({
        "build muscle / get stronger": ["goal_muscle_gain", "goal_strength"],
        "fat loss": "goal_fat_loss",
        "better energy levels": "goal_energy",
        "less stress / mental calm": ["goal_stress_reduction", "goal_mental_calm"],
        "build a consistent routine": ["goal_consistency_discipline", "goal_sustainable_routines"],
        "improve sleep": "goal_sleep_improvement",
        "improve flexibility / mobility": "goal_flexibility_mobility",
        "improve overall health": "goal_overall_health",
        "better recovery": "goal_better_recovery",
        "sustainable routines": "goal_sustainable_routines",
        "return to fitness after a break": "goal_return_to_fitness",
      }),
    },
    {
      answerKey: w("wellness_barriers"),
      kind: "multi",
      optionTags: opt({
        "hard to get started": ["barrier_starting_difficulty", "barrier_low_activation_energy"],
        "lack of consistency": "barrier_lack_of_consistency",
        "work stress": "barrier_work_stress",
        "poor sleep": "barrier_poor_sleep",
        "low motivation": "barrier_low_motivation",
        "emotional eating / cravings": "barrier_emotional_eating_cravings",
        "gym anxiety": "barrier_gym_anxiety",
        "lack of knowledge": "barrier_lack_of_knowledge",
        "travel / schedule disruptions": "barrier_travel_schedule_disruption",
        "family responsibilities": "barrier_family_responsibilities",
        "injury or physical discomfort": "barrier_injury_discomfort",
        "overwhelm from complexity": "barrier_overwhelm_from_complexity",
      }),
    },
    {
      answerKey: w("support_system"),
      kind: "single",
      optionTags: opt({
        "strong support": "support_strong",
        "some support": "support_some",
        neutral: "support_neutral",
        "unsupportive environment": "support_unsupportive",
      }),
    },
    {
      answerKey: w("solo_vs_social"),
      kind: "single",
      optionTags: opt({
        "i prefer self-directed activities": "support_self_directed",
        "a balance of solo and social": "social_balanced",
        "i prefer social / group activities": "social_preference_high",
      }),
    },
    {
      answerKey: w("health_flags"),
      kind: "multi",
      optionTags: opt({
        "none of these apply": "exclude_none",
        "medical condition affecting activity or nutrition": "exclude_medical_condition",
        injury: "exclude_injury",
        "pregnancy or postpartum": "exclude_pregnancy_postpartum",
        "doctor-advised restriction": "exclude_doctor_advised_restriction",
        "prefer not to say": "exclude_prefer_not_to_say_health",
        "severe fatigue": "exclude_severe_fatigue",
        "persistent pain": "exclude_persistent_pain",
      }),
    },
  ];
}

/** DR01–DR08 safety guardrails (PDA §12). */
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
      exclusionTag: "exclude_shift_work_strict_sleep_schedule",
      anyContext: ["work_shift_based"],
    },
    {
      id: "DR06",
      exclusionTag: "exclude_travel_heavy_rigid_routine",
      anyContext: ["work_travel_heavy"],
    },
    {
      id: "DR07",
      exclusionTag: "exclude_low_time_long_workouts",
      anyContext: ["time_under_15_min"],
    },
    {
      id: "DR08",
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
    version: "2",
    masterVersion: "v1.13",
    recommendations,
    tagMappingRules,
    wellnessFields: buildWellnessFields(),
    derivedExclusionRules: buildDerivedRules(),
    healthExclusionByAnswer: {},
  };
}
