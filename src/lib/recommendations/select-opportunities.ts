import { isActionPlanPoolRow, resolvedText } from "@/lib/recommendations/action-pool";
import { clusterRecommendations } from "@/lib/recommendations/cluster";
import { PDA_CLUSTER_TOP_ROWS_FOR_AVG } from "@/lib/recommendations/scoring-constants";
import type {
  OpportunityCard,
  PillarActionPlan,
  PillarName,
  ScoredRecommendation,
  UserProfile,
} from "@/lib/recommendations/types";

const PILLARS: PillarName[] = ["Nutrition", "Physical Activity", "Sleep & Recovery", "Mental Wellness"];
const MIN_CLUSTER_SCORE = 20;
const MIN_PRIORITIES = 3;
const MAX_PRIORITIES = 4;

function pillarClusterScore(
  ranked: ScoredRecommendation[],
  pillar: PillarName,
  profile: UserProfile,
): number {
  const clusters = clusterRecommendations(ranked, profile);
  const pillarClusters = clusters.filter((c) => c.rows.some((r) => r.pillar === pillar));
  if (pillarClusters.length) return pillarClusters[0]!.clusterScore;

  const pool = ranked.filter((r) => r.pillar === pillar && isActionPlanPoolRow(r));
  const top = pool.slice(0, PDA_CLUSTER_TOP_ROWS_FOR_AVG);
  if (!top.length) return 0;
  return top.reduce((sum, row) => sum + row.score.total, 0) / top.length;
}

function topDoFromPlan(
  plan: PillarActionPlan,
  ranked: ScoredRecommendation[],
): ScoredRecommendation | null {
  for (const item of plan.dos) {
    const row = ranked.find((r) => r.id === item.id);
    if (row && (row.type === "do" || row.type === "first_action")) return row;
  }
  return (
    ranked.find(
      (r) =>
        r.pillar === plan.pillar &&
        isActionPlanPoolRow(r) &&
        (r.type === "do" || r.type === "first_action") &&
        plan.sourceIds.includes(r.id),
    ) ?? null
  );
}

function impactLevel(score: number): "High" | "Very High" {
  return score > 80 ? "Very High" : "High";
}

/** Page 8 — High-Impact Priorities (PDA §20.8). */
export function selectHighImpactPriorities(
  ranked: ScoredRecommendation[],
  profile: UserProfile,
  pillarPlans: Record<PillarName, PillarActionPlan>,
): OpportunityCard[] {
  const entries = PILLARS.map((pillar) => {
    const plan = pillarPlans[pillar];
    const clusterScore = pillarClusterScore(ranked, pillar, profile);
    const topDo = topDoFromPlan(plan, ranked);
    return { pillar, clusterScore, topDo, plan };
  })
    .filter((entry) => entry.topDo != null)
    .sort((a, b) => b.clusterScore - a.clusterScore);

  const aboveThreshold = entries.filter((entry) => entry.clusterScore >= MIN_CLUSTER_SCORE);
  const selected = (aboveThreshold.length >= MIN_PRIORITIES ? aboveThreshold : entries).slice(0, MAX_PRIORITIES);

  return selected.map((entry, index) => {
    const row = entry.topDo!;
    return {
      id: row.id,
      pillar: entry.pillar,
      category: row.category,
      score: row.score.total,
      clusterScore: entry.clusterScore,
      rank: index + 1,
      impactLevel: impactLevel(entry.clusterScore),
      personaContextText: resolvedText(row, profile),
      headline: "",
      whyItMatters: "",
      startThisWeek: "",
      sourceIds: [row.id],
    };
  });
}

/** @deprecated Use selectHighImpactPriorities — kept for legacy callers. */
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

  return selected.map((row, index) => ({
    id: row.id,
    pillar: row.pillar,
    category: row.category,
    score: row.score.total,
    clusterScore: row.score.total,
    rank: index + 1,
    impactLevel: impactLevel(row.score.total),
    personaContextText: resolvedText(row, profile),
    headline: "",
    whyItMatters: "",
    startThisWeek: "",
    sourceIds: [row.id],
  }));
}
