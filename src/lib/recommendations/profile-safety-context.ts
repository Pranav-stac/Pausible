import type { UserProfile } from "@/lib/recommendations/types";
import { resolveRuntimeShortForms } from "@/lib/recommendations/tag-normalization";

const RESTRICTION_FLAGS = new Set([
  "exclude_medical_condition",
  "exclude_doctor_advised_restriction",
  "exclude_pregnancy_postpartum",
  "exclude_injury",
  "exclude_severe_fatigue",
  "exclude_persistent_pain",
]);

const ACTIVITY_PREF_PREFIX = "activity_pref_";

/** Derived safety/context flags for PDA v1.2 §38–§39. */
export type ProfileSafetyContext = {
  restrictionFlags: string[];
  needsPhysicalDisclaimer: boolean;
  needsNutritionDisclaimer: boolean;
  /** Proxy for age ≥ 65 when only band data exists (55+ band). */
  isElderly: boolean;
  isMinor: boolean;
  isNonWorker: boolean;
  isShiftWorker: boolean;
  caffeineNone: boolean;
  mealsByOthers: boolean;
  eatsOutFrequently: boolean;
  fatLossGoal: boolean;
  activityPrefs: string[];
  fitActive: boolean;
  hasConsistencyBarrier: boolean;
  hasStartingBarrier: boolean;
};

export function buildProfileSafetyContext(profile: UserProfile): ProfileSafetyContext {
  const ctx = new Set(profile.context);
  // PDA §10.2 — prefer runtime short forms for selection/prompt conditions.
  const short = resolveRuntimeShortForms(profile.context);
  const restrictions = profile.exclusions.filter(
    (e) => e !== "exclude_none" && RESTRICTION_FLAGS.has(e),
  );

  const isElderly = profile.isElderly65;
  const isMinor = profile.isMinor || ctx.has("age_under_18");

  return {
    restrictionFlags: restrictions,
    needsPhysicalDisclaimer: restrictions.length > 0 || isElderly,
    needsNutritionDisclaimer:
      restrictions.some((r) =>
        [
          "exclude_medical_condition",
          "exclude_doctor_advised_restriction",
          "exclude_pregnancy_postpartum",
        ].includes(r),
      ),
    isElderly,
    isMinor,
    isNonWorker:
      isMinor ||
      ctx.has("lifestyle_caregiving") ||
      ctx.has("lifestyle_student") ||
      ctx.has("lifestyle_not_working"),
    isShiftWorker: ctx.has("work_shift_based"),
    caffeineNone: short.caffeine === "none" || ctx.has("caffeine_none"),
    mealsByOthers:
      short.meal_control === "others_prepare" || ctx.has("meal_control_prepared_by_others"),
    eatsOutFrequently:
      short.meal_control === "eat_out" || ctx.has("meal_control_frequent_eating_out"),
    fatLossGoal: profile.goals.includes("goal_fat_loss"),
    activityPrefs: profile.context.filter((t) => t.startsWith(ACTIVITY_PREF_PREFIX)),
    fitActive:
      (short.fitness_level === "consistent" ||
        ctx.has("fitness_consistent") ||
        ctx.has("fitness_advanced")) &&
      (short.activity_level === "moderate" ||
        short.activity_level === "very_active" ||
        ctx.has("activity_moderate") ||
        ctx.has("activity_very_active")),
    hasConsistencyBarrier: profile.barriers.some((b) =>
      ["barrier_lack_of_consistency", "barrier_low_motivation"].includes(b),
    ),
    hasStartingBarrier: profile.barriers.some((b) =>
      ["barrier_starting_difficulty", "barrier_low_activation_energy"].includes(b),
    ),
  };
}
