import type { UserProfile } from "@/lib/recommendations/types";
import type { PersonaKey } from "@/lib/scoring/persona-types";

/** PDA §21.10 — questionnaire tag → override class mapping. */
export const BARRIER_OVERRIDE_TAGS = {
  lack_of_time: ["barrier_lack_of_time"],
  poor_sleep: ["barrier_poor_sleep"],
  emotional_eating: ["barrier_emotional_eating_cravings", "barrier_emotional_eating"],
  inconsistency: ["barrier_lack_of_consistency", "barrier_inconsistency"],
  starting_difficulty: ["barrier_starting_difficulty", "barrier_low_activation_energy"],
  perfectionism: ["barrier_perfectionism"],
  overwhelm: ["barrier_overwhelm_from_complexity", "barrier_overwhelm"],
} as const;

export type BarrierOverrideKey = keyof typeof BARRIER_OVERRIDE_TAGS;

export function hasPerfectionismPattern(profile: UserProfile): boolean {
  const highNPersonas: PersonaKey[] = ["brittle_avoidant", "stress_sensitive"];
  return highNPersonas.includes(profile.primaryPersona);
}

export function hasBarrierOverride(profile: UserProfile, key: BarrierOverrideKey): boolean {
  if (key === "perfectionism") {
    return (
      profile.barriers.some((b) => (BARRIER_OVERRIDE_TAGS.perfectionism as readonly string[]).includes(b)) ||
      hasPerfectionismPattern(profile)
    );
  }
  const tags = BARRIER_OVERRIDE_TAGS[key] as readonly string[];
  return profile.barriers.some((b) => tags.includes(b));
}
