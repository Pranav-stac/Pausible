/**
 * PDA §10.2 — CQ full-form tags → runtime short forms for prompts + selection logic.
 * Scoring continues to use CQ/Master canonical (long-form) tags.
 */

export type RuntimeShortForms = {
  meal_control: "self" | "others_prepare" | "eat_out" | "mixed" | null;
  caffeine: "none" | "morning" | "daytime" | "evening" | null;
  fitness_level: "beginner" | "restarting" | "intermediate" | "consistent" | null;
  activity_level: "sedentary" | "light" | "moderate" | "very_active" | null;
};

/** Canonical CQ → short-form map (PDA §10.2). Unknown tags pass through unchanged. */
export const CQ_TO_SHORT_FORM: Record<string, string> = {
  meal_control_self_prepared: "self",
  meal_control_prepared_by_others: "others_prepare",
  meal_control_frequent_eating_out: "eat_out",
  meal_control_mixed: "mixed",
  caffeine_none: "none",
  caffeine_morning: "morning",
  caffeine_daytime: "daytime",
  caffeine_evening: "evening",
  fitness_beginner: "beginner",
  fitness_restarting: "restarting",
  fitness_intermediate: "intermediate",
  fitness_consistent: "consistent",
  // PDA §10.2 note — “advanced” never emitted; treat as consistent.
  fitness_advanced: "consistent",
  activity_sedentary: "sedentary",
  activity_light: "light",
  activity_lightly_active: "light",
  activity_moderate: "moderate",
  activity_very_active: "very_active",
};

export function normalizeCqTagToShortForm(tag: string): string {
  return CQ_TO_SHORT_FORM[tag] ?? tag;
}

function firstMatch(
  tags: Iterable<string>,
  candidates: Array<{ cq: string; short: RuntimeShortForms[keyof RuntimeShortForms] }>,
): RuntimeShortForms[keyof RuntimeShortForms] {
  const set = tags instanceof Set ? tags : new Set(tags);
  for (const c of candidates) {
    if (set.has(c.cq)) return c.short;
  }
  return null;
}

/** Resolve §10.2 short forms from a profile's CQ/context tags. */
export function resolveRuntimeShortForms(context: string[]): RuntimeShortForms {
  const set = new Set(context);
  return {
    meal_control: firstMatch(set, [
      { cq: "meal_control_prepared_by_others", short: "others_prepare" },
      { cq: "meal_control_frequent_eating_out", short: "eat_out" },
      { cq: "meal_control_mixed", short: "mixed" },
      { cq: "meal_control_self_prepared", short: "self" },
    ]) as RuntimeShortForms["meal_control"],
    caffeine: firstMatch(set, [
      { cq: "caffeine_none", short: "none" },
      { cq: "caffeine_evening", short: "evening" },
      { cq: "caffeine_daytime", short: "daytime" },
      { cq: "caffeine_morning", short: "morning" },
    ]) as RuntimeShortForms["caffeine"],
    fitness_level: firstMatch(set, [
      { cq: "fitness_consistent", short: "consistent" },
      { cq: "fitness_advanced", short: "consistent" },
      { cq: "fitness_structured", short: "consistent" },
      { cq: "fitness_intermediate", short: "intermediate" },
      { cq: "fitness_restarting", short: "restarting" },
      { cq: "fitness_returning", short: "restarting" },
      { cq: "fitness_beginner", short: "beginner" },
    ]) as RuntimeShortForms["fitness_level"],
    activity_level: firstMatch(set, [
      { cq: "activity_very_active", short: "very_active" },
      { cq: "activity_moderate", short: "moderate" },
      { cq: "activity_light", short: "light" },
      { cq: "activity_lightly_active", short: "light" },
      { cq: "activity_sedentary", short: "sedentary" },
    ]) as RuntimeShortForms["activity_level"],
  };
}
