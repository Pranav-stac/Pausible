import type { RecommendationRow, UserProfile } from "@/lib/recommendations/types";
import { resolveRuntimeShortForms } from "@/lib/recommendations/tag-normalization";

const MEALS_BY_OTHERS_KEEP = new Set([
  "NUT037",
  "NUT038",
  "NUT039",
  "NUT040",
  "NUT005",
  "NUT025",
  "NUT046",
]);

const EAT_OUT_KEEP = new Set([
  "NUT032",
  "NUT033",
  "NUT015",
  "NUT003",
  "NUT007",
  "NUT005",
  "NUT025",
  "NUT029",
]);

const MEAL_PREP_CATEGORIES = new Set([
  "meal_planning",
  "food_environment",
  "nutrition_foundations",
  "travel_work_nutrition",
]);

const FAT_LOSS_TEXT = /\b(deficit|calorie|calories|weight loss|fat loss|lean out|body composition)\b/i;
const CAFFEINE_TEXT = /\bcaffeine\b/i;
const COOKING_TEXT = /\b(cook(ing)?|meal prep|kitchen)\b/i;

const RECOVERY_NOURISHMENT_IDS = new Set(["NUT042"]);
const BEGINNER_ENTRY_REC_IDS = new Set(["FIT001", "FIT008", "FIT044"]);
const RECOVERY_CONTEXT_EXCLUSIONS = new Set([
  "exclude_pregnancy_postpartum",
  "exclude_injury",
  "exclude_medical_condition",
  "exclude_severe_fatigue",
  "exclude_persistent_pain",
]);

/** PDA §38.2 DR17 — suppress high-effort progression for elderly (age ≥65). */
export function applyElderlyEffortSuppression(
  rows: RecommendationRow[],
  profile: UserProfile,
): RecommendationRow[] {
  if (!profile.isElderly65) return rows;
  const progressionCategories = new Set([
    "strength_training",
    "workout_progression",
    "cardio_endurance",
  ]);
  return rows.filter((row) => !(row.effortLevel >= 4 && progressionCategories.has(row.category)));
}

/** PDA §38.2 DR21–DR24 — context eligibility after master Exclude If filter. */
export function applyContextSelectionSuppression(
  rows: RecommendationRow[],
  profile: UserProfile,
): RecommendationRow[] {
  const ctx = new Set(profile.context);
  const goals = new Set(profile.goals);
  // PDA §10.2 — selection logic conditions use runtime short forms.
  const short = resolveRuntimeShortForms(profile.context);

  const caffeineNone = short.caffeine === "none" || ctx.has("caffeine_none");
  const mealsByOthers =
    short.meal_control === "others_prepare" || ctx.has("meal_control_prepared_by_others");
  const eatsOut =
    short.meal_control === "eat_out" || ctx.has("meal_control_frequent_eating_out");
  const travelHeavy = ctx.has("work_travel_heavy");
  const fatLossGoal = goals.has("goal_fat_loss");
  const fitActive =
    (short.fitness_level === "consistent" ||
      ctx.has("fitness_consistent") ||
      ctx.has("fitness_advanced")) &&
    (short.activity_level === "moderate" ||
      short.activity_level === "very_active" ||
      ctx.has("activity_moderate") ||
      ctx.has("activity_very_active"));

  return rows.filter((row) => {
    if (caffeineNone) {
      if (row.category === "caffeine_stimulants_sleep") return false;
      if (CAFFEINE_TEXT.test(row.text)) return false;
    }

    if (!fatLossGoal) {
      if (row.category === "restriction_dieting") return false;
      if (FAT_LOSS_TEXT.test(row.text)) return false;
    }

    if (mealsByOthers) {
      if (MEAL_PREP_CATEGORIES.has(row.category) && !MEALS_BY_OTHERS_KEEP.has(row.id)) {
        return false;
      }
    }

    if (eatsOut) {
      if (MEAL_PREP_CATEGORIES.has(row.category) && !EAT_OUT_KEEP.has(row.id)) {
        return false;
      }
      if (COOKING_TEXT.test(row.text) && !EAT_OUT_KEEP.has(row.id)) {
        return false;
      }
    }

    if (!travelHeavy) {
      if (row.category === "travel_work_nutrition" || row.category === "travel_work_fitness") {
        return false;
      }
      if (row.category === "shift_work_travel_sleep" && /\btravel\b/i.test(row.text)) {
        return false;
      }
    }

    const hasRecoveryContext =
      profile.goals.includes("goal_sleep_recovery") ||
      profile.goals.includes("goal_better_recovery") ||
      profile.exclusions.some((e) => RECOVERY_CONTEXT_EXCLUSIONS.has(e));
    if (!hasRecoveryContext && RECOVERY_NOURISHMENT_IDS.has(row.id)) {
      return false;
    }

    if (fitActive) {
      if (row.category === "walking_daily_activity" && row.id !== "FIT042") {
        return false;
      }
    }

    const fitAdvanced =
      short.fitness_level === "consistent" && short.activity_level === "very_active"
        ? true
        : ctx.has("fitness_advanced") ||
          ctx.has("fitness_structured") ||
          (ctx.has("fitness_consistent") && ctx.has("activity_very_active"));
    if (fitAdvanced && BEGINNER_ENTRY_REC_IDS.has(row.id)) {
      return false;
    }

    if (ctx.has("support_self_directed") && row.id === "FIT032") {
      return false;
    }

    return true;
  });
}

/** PDA §38.2 DR20 — fat-loss goal with safety flags: suppress deficit recs even when goal selected. */
export function applyGoalSafetyOverride(rows: RecommendationRow[], profile: UserProfile): RecommendationRow[] {
  const goals = new Set(profile.goals);
  if (!goals.has("goal_fat_loss")) return rows;

  const restricted =
    profile.exclusions.includes("exclude_pregnancy_postpartum") ||
    profile.exclusions.includes("exclude_medical_condition") ||
    profile.exclusions.includes("exclude_doctor_advised_restriction") ||
    profile.context.includes("age_under_18");

  if (!restricted) return rows;

  return rows.filter((row) => {
    if (row.category === "restriction_dieting") return false;
    if (FAT_LOSS_TEXT.test(row.text)) return false;
    return true;
  });
}
