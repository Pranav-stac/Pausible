import {
  A12_CLUSTER_TOP_ROWS_FOR_AVG,
  A12_OPPORTUNITY_CLUSTER_COUNT,
  A12_OPPORTUNITY_POOL_SIZE,
} from "@/lib/recommendations/scoring-constants";
import type { RecommendationCluster, ScoredRecommendation, UserProfile } from "@/lib/recommendations/types";

function mainBarrierForCluster(rows: ScoredRecommendation[], profile: UserProfile): string | null {
  for (const b of profile.barriers) {
    if (rows.some((r) => r.barrierFit.includes(b))) return b;
  }
  return profile.barriers[0] ?? null;
}

/** Average score of top N rows in cluster (A12 §9). */
function clusterScoreFromRows(rows: ScoredRecommendation[]): number {
  const top = [...rows].sort((a, b) => b.score.total - a.score.total).slice(0, A12_CLUSTER_TOP_ROWS_FOR_AVG);
  if (!top.length) return 0;
  return top.reduce((sum, r) => sum + r.score.total, 0) / top.length;
}

/**
 * Group top-scored rows by category + shared barrier (A12 §9).
 * Pool defaults to top 20 overall (§8 High-Impact Opportunities).
 */
export function clusterRecommendations(
  ranked: ScoredRecommendation[],
  profile: UserProfile,
  options?: { poolSize?: number; excludeTypes?: Set<string> },
): RecommendationCluster[] {
  const excludeTypes = options?.excludeTypes ?? new Set(["safety_guidance", "coach_note"]);
  const poolSize = options?.poolSize ?? A12_OPPORTUNITY_POOL_SIZE;

  const pool = ranked.filter((r) => !excludeTypes.has(r.type)).slice(0, poolSize);

  const byCategory = new Map<string, ScoredRecommendation[]>();
  for (const row of pool) {
    const list = byCategory.get(row.category) ?? [];
    list.push(row);
    byCategory.set(row.category, list);
  }

  const clusters: RecommendationCluster[] = [];
  for (const [category, rows] of byCategory) {
    const barrier = mainBarrierForCluster(rows, profile);
    const key = `${category}::${barrier ?? "none"}`;
    clusters.push({
      key,
      category,
      mainBarrier: barrier,
      clusterScore: clusterScoreFromRows(rows),
      rows: [...rows].sort((a, b) => b.score.total - a.score.total),
    });
  }

  return clusters.sort((a, b) => b.clusterScore - a.clusterScore);
}

/** Pick top clusters with de-duplication: same category + same main barrier (A12 §9). */
export function selectOpportunityClusters(
  ranked: ScoredRecommendation[],
  profile: UserProfile,
): RecommendationCluster[] {
  const clusters = clusterRecommendations(ranked, profile);
  const selected: RecommendationCluster[] = [];
  const seen = new Set<string>();

  for (const cluster of clusters) {
    const dedupeKey = `${cluster.category}::${cluster.mainBarrier ?? "none"}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    selected.push(cluster);
    if (selected.length >= A12_OPPORTUNITY_CLUSTER_COUNT) break;
  }

  return selected;
}
