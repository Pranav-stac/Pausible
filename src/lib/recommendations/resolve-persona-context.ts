import type { RecommendationRow } from "@/lib/recommendations/types";

/** User-facing text for a recommendation, preferring persona-specific context over engine text. */
export function resolvePersonaContextText(
  row: RecommendationRow,
  personaAlias: string,
  secondaryAlias?: string | null,
  secondaryBlendPct?: number,
): string {
  const alias = personaAlias.trim().toLowerCase();
  const fromPrimary = row.personaContext?.[alias]?.trim();
  if (fromPrimary) return fromPrimary;

  if (typeof secondaryBlendPct === "number" && secondaryBlendPct > 15 && secondaryAlias) {
    const fromSecondary = row.personaContext?.[secondaryAlias.trim().toLowerCase()]?.trim();
    if (fromSecondary) return fromSecondary;
  }

  return row.text.trim();
}
