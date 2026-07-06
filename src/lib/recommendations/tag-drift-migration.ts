/** PDA v1.4 — migrate deprecated tag vocabulary to canonical master tags. */
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
  barrier_emotional_eating: "barrier_emotional_eating_cravings",
  goal_energy_vitality: "goal_energy",
  social_preference_solo: "support_self_directed",
  social_preference_group: "social_preference_high",
};

function migrateTag(tag: string): string {
  return TAG_ALIASES[tag] ?? tag;
}

function migrateList(tags: string[]): string[] {
  const out: string[] = [];
  for (const tag of tags) {
    const mapped = migrateTag(tag);
    if (!out.includes(mapped)) out.push(mapped);
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
  profile.context = migrateList(profile.context);
  profile.goals = migrateList(profile.goals);
  profile.barriers = migrateList(profile.barriers);
  profile.exclusions = migrateList(profile.exclusions);
}
