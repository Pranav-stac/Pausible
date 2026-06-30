import { isPiSeries } from "@/lib/recommendations/action-pool";
import type { RecommendationRow } from "@/lib/recommendations/types";
import type { BlendStrength } from "@/lib/scoring/persona-types";

function contextForAlias(row: RecommendationRow, alias: string): string | null {
  const key = alias.trim().toLowerCase();
  const hit = row.personaContext?.[key]?.trim();
  return hit || null;
}

/** User-facing text for a recommendation, preferring persona-specific context over engine text (§17). */
export function resolvePersonaContextText(
  row: RecommendationRow,
  personaAlias: string,
  secondaryAlias?: string | null,
  secondaryBlendPct?: number,
  blendStrength?: BlendStrength | null,
  options?: { topScoring?: boolean },
): string {
  const fromPrimary = contextForAlias(row, personaAlias);
  const fromSecondary =
    secondaryAlias && (typeof secondaryBlendPct !== "number" || secondaryBlendPct > 15)
      ? contextForAlias(row, secondaryAlias)
      : null;

  const dualStrongInfluence =
    blendStrength === "strong_influence" &&
    options?.topScoring === true &&
    fromPrimary &&
    fromSecondary &&
    fromPrimary !== fromSecondary;

  if (dualStrongInfluence) {
    return `${fromPrimary} ${fromSecondary}`;
  }

  if (fromPrimary) return fromPrimary;

  if (fromSecondary) return fromSecondary;

  if (isPiSeries(row)) {
    return "Your pattern insight is being prepared for this section.";
  }

  return row.text.trim();
}
