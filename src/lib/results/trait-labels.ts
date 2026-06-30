import type { TraitKey } from "@/lib/scoring/persona-types";

/** PDA §4.2 — canonical user-facing OCEAN labels. */
export const USER_FACING_TRAIT_LABELS: Record<TraitKey, string> = {
  openness: "Openness",
  conscientiousness: "Discipline",
  extraversion: "Social Energy",
  agreeableness: "Agreeableness",
  neuroticism: "Stress Sensitivity",
};

/** Comma-separated list for marketing / feature copy. */
export const USER_FACING_TRAIT_LIST =
  "Openness, Discipline, Social Energy, Agreeableness, and Stress Sensitivity";

/** Assessment question-bank trait titles (engine) → §4.2 labels. */
export const TRAIT_TITLE_USER_LABELS: Record<string, string> = {
  Openness: "Openness",
  Conscientiousness: "Discipline",
  Extraversion: "Social Energy",
  Agreeableness: "Agreeableness",
  Neuroticism: "Stress Sensitivity",
};

export function userFacingTraitTitle(traitTitle: string): string {
  return TRAIT_TITLE_USER_LABELS[traitTitle] ?? traitTitle;
}

export function userFacingTraitLabel(trait: TraitKey): string {
  return USER_FACING_TRAIT_LABELS[trait];
}

/** Radar axis lines — PDA §4.2 user-facing labels (multi-line for compact charts). */
export function radarAxisLines(trait: TraitKey): string[] {
  return USER_FACING_TRAIT_LABELS[trait].split(" ");
}

/** Single-line radar axis label when space allows. */
export function radarAxisLabel(trait: TraitKey): string {
  return USER_FACING_TRAIT_LABELS[trait];
}

const SUMMARY_REPLACEMENTS: [RegExp, string][] = [
  [/\bconscientiousness\b/gi, "Discipline"],
  [/\bextraversion\b/gi, "Social Energy"],
  [/\bneuroticism\b/gi, "Stress Sensitivity"],
  [/\bhigh conscientiousness\b/gi, "High Discipline"],
  [/\blow neuroticism\b/gi, "low Stress Sensitivity"],
  [/\bhigh neuroticism\b/gi, "high Stress Sensitivity"],
  [/\blow extraversion\b/gi, "low Social Energy"],
  [/\bhigh extraversion\b/gi, "high Social Energy"],
  [/\bhigh openness\b/gi, "High Openness"],
  [/\blow openness\b/gi, "low Openness"],
  [/\bhigh agreeableness\b/gi, "High Agreeableness"],
  [/\blow agreeableness\b/gi, "low Agreeableness"],
];

/** Restate persona archetype / cover copy with user-facing trait names (§20.1). */
export function sanitizePersonaSummaryText(text: string): string {
  let out = text;
  for (const [pattern, replacement] of SUMMARY_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
