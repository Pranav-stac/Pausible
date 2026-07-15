/**
 * Tag vocabulary migration / expansion.
 * - Legacy → CQ/Master v1.20 canonical (one-to-one aliases)
 * - Legacy master tags → current Master Fit columns (expand)
 *
 * Master v1.20 keys Goal/Barrier/Context Fit on CQ-canonical tags
 * (e.g. goal_sleep_recovery, goal_strength, barrier_self_consciousness).
 */

/** One-to-one renames (replace). */
const TAG_ALIASES: Record<string, string> = {
  location_home: "environment_home",
  location_gym: "environment_gym",
  location_outdoors: "environment_outdoors",
  restriction_pregnancy_postpartum: "exclude_pregnancy_postpartum",
  restriction_medical: "exclude_medical_condition",
  restriction_injury: "exclude_injury",
  meal_control_others_prepare: "meal_control_prepared_by_others",
  meal_control_others: "meal_control_prepared_by_others",
  work_homemaker_caregiver: "lifestyle_caregiving",
  work_homemaker: "lifestyle_caregiving",
  activity_pref_dancing: "activity_pref_dance",
  activity_pref_weights: "activity_pref_strength",
  activity_pref_hiit: "activity_pref_cardio",
  barrier_emotional_eating: "barrier_stress_emotional_eating",
  barrier_emotional_eating_cravings: "barrier_stress_emotional_eating",
  barrier_gym_anxiety: "barrier_self_consciousness",
  barrier_injury_discomfort: "barrier_physical_limitation",
  barrier_travel_schedule_disruption: "barrier_unpredictable_schedule",
  barrier_starting_difficulty: "barrier_lack_of_consistency",
  barrier_low_activation_energy: "barrier_lack_of_consistency",
  barrier_low_motivation: "barrier_lack_of_consistency",
  goal_energy_vitality: "goal_energy",
  goal_sleep_improvement: "goal_sleep_recovery",
  goal_better_recovery: "goal_sleep_recovery",
  goal_muscle_gain: "goal_strength",
  goal_consistency_discipline: "goal_consistency",
  goal_sustainable_routines: "goal_consistency",
  goal_sustainable_routine: "goal_consistency",
  social_preference_solo: "support_self_directed",
  social_preference_group: "social_preference_high",
  fitness_advanced: "fitness_consistent",
  fitness_structured: "fitness_consistent",
};

/**
 * Keep the mapped tag and also add related Fit-column tags so scoring matches.
 */
const TAG_EXPAND: Record<string, string[]> = {
  // Master only uses under_30 / 30_45 for time Fit — map longer bands toward nearest Fit tags.
  time_45_60_min: ["time_30_45_min"],
  time_over_60_min: ["time_30_45_min"],
  time_under_15_min: ["time_under_30_min"],
  time_15_30_min: ["time_under_30_min", "time_30_45_min"],
  activity_cat_strength: ["activity_pref_strength"],
  activity_cat_cardio: ["activity_pref_cardio"],
  activity_cat_mindbody: ["activity_pref_yoga"],
};

function migrateTag(tag: string): string {
  return TAG_ALIASES[tag] ?? tag;
}

function expandList(tags: string[]): string[] {
  const out: string[] = [];
  const push = (t: string) => {
    if (!out.includes(t)) out.push(t);
  };
  for (const tag of tags) {
    const mapped = migrateTag(tag);
    push(mapped);
    for (const extra of TAG_EXPAND[mapped] ?? TAG_EXPAND[tag] ?? []) {
      push(extra);
    }
  }
  return out;
}

/** Apply to profile tag arrays after wellness field resolution. */
export function migrateProfileTags(profile: {
  context: string[];
  goals: string[];
  barriers: string[];
  exclusions: string[];
}): void {
  profile.context = expandList(profile.context);
  profile.goals = expandList(profile.goals);
  profile.barriers = expandList(profile.barriers);
  profile.exclusions = expandList(profile.exclusions);
}
