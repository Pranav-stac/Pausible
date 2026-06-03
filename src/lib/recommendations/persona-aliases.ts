import type { PersonaKey } from "@/lib/scoring/persona-types";

/** CSV persona nicknames (animal) ↔ internal PersonaKey. */
export const PERSONA_ALIAS_TO_KEY: Record<string, PersonaKey> = {
  steady_elephant: "self_regulated_planner",
  pack_wolf: "social_motivator",
  watchful_deer: "stress_sensitive",
  curious_fox: "curious_explorer",
  steadfast_bear: "resilient_performer",
  shielded_turtle: "brittle_avoidant",
};

export const PERSONA_KEY_TO_ALIAS: Record<PersonaKey, string> = {
  self_regulated_planner: "steady_elephant",
  social_motivator: "pack_wolf",
  stress_sensitive: "watchful_deer",
  curious_explorer: "curious_fox",
  resilient_performer: "steadfast_bear",
  brittle_avoidant: "shielded_turtle",
};

export function personaKeyToCsvAlias(key: PersonaKey | string | null | undefined): string {
  if (!key) return "";
  const k = key as PersonaKey;
  return PERSONA_KEY_TO_ALIAS[k] ?? String(key);
}

export function csvAliasToPersonaKey(alias: string): PersonaKey | null {
  const normalized = alias.trim().toLowerCase();
  if (normalized === "all_personas") return null;
  return PERSONA_ALIAS_TO_KEY[normalized] ?? null;
}
