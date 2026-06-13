import type { RecommendationRow } from "@/lib/recommendations/types";

/** User-facing text for a recommendation, preferring persona-specific context over engine text. */
export function resolvePersonaContextText(
  row: RecommendationRow,
  personaAlias: string,
): string {
  const alias = personaAlias.trim().toLowerCase();
  const fromContext = row.personaContext?.[alias]?.trim();
  if (fromContext) return fromContext;
  return row.text.trim();
}
