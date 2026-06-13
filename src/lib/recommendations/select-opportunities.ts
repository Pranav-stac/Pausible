import { isActionPlanPoolRow, resolvedText } from "@/lib/recommendations/action-pool";
import type { OpportunityCard, ScoredRecommendation, UserProfile } from "@/lib/recommendations/types";

function impactLevel(score: number): "High" | "Very High" {
  return score > 120 ? "Very High" : "High";
}

/** Slide 6: top 3 cross-pillar opportunities (Content Logic Guide §9). */
export function selectHighImpactOpportunities(
  ranked: ScoredRecommendation[],
  profile: UserProfile,
): OpportunityCard[] {
  const pool = ranked.filter(
    (r) =>
      isActionPlanPoolRow(r) &&
      (r.strength === "core" || r.strength === "supporting") &&
      (r.type === "do" || r.type === "first_action"),
  );

  const selected: ScoredRecommendation[] = [];
  const usedPillars = new Set<string>();

  for (const row of pool) {
    if (usedPillars.has(row.pillar)) continue;
    selected.push(row);
    usedPillars.add(row.pillar);
    if (selected.length >= 3) break;
  }

  return selected.map((row) => ({
    id: row.id,
    pillar: row.pillar,
    category: row.category,
    score: row.score.total,
    impactLevel: impactLevel(row.score.total),
    personaContextText: resolvedText(row, profile),
    headline: "",
    whyItMatters: "",
    sourceIds: [row.id],
  }));
}
