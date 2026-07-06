import type { RecommendationRow, UserProfile } from "@/lib/recommendations/types";

const MEALS_BY_OTHERS_KEEP = new Set(["NUT037", "NUT038", "NUT039", "NUT040", "NUT005", "NUT025"]);

const MEAL_PREP_CATEGORIES = new Set([
  "meal_planning",
  "food_environment",
  "nutrition_foundations",
  "travel_work_nutrition",
]);

const FAT_LOSS_TEXT = /\b(deficit|calorie|calories|weight loss|fat loss|lean out|body composition)\b/i;
const CAFFEINE_TEXT = /\bcaffeine\b/i;

/** PDA v1.2 DR15 — suppress high-effort progression for elderly band (55+ proxy). */
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
  return rows.filter((row) => !(row.effortLevel === "high" && progressionCategories.has(row.category)));
}

/** PDA v1.2 §38.2 DR19–DR22 — context eligibility after master Exclude If filter. */
export function applyContextSelectionSuppression(
  rows: RecommendationRow[],
  profile: UserProfile,
): RecommendationRow[] {
  const ctx = new Set(profile.context);
  const goals = new Set(profile.goals);

  const caffeineNone = ctx.has("caffeine_none");
  const mealsByOthers = ctx.has("meal_control_prepared_by_others");
  const fatLossGoal = goals.has("goal_fat_loss");
  const fitActive =
    (ctx.has("fitness_consistent") || ctx.has("fitness_advanced")) &&
    (ctx.has("activity_moderate") || ctx.has("activity_very_active"));

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

    if (fitActive) {
      if (row.category === "walking_daily_activity" && row.id !== "FIT042") {
        return false;
      }
    }

    return true;
  });
}

/** DR18 — fat-loss goal with safety flags: suppress deficit recs even when goal selected. */
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
