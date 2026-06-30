import {
  PDA_CLUSTER_TOP_ROWS_FOR_AVG,
  PDA_OPPORTUNITY_CLUSTER_COUNT,
  PDA_OPPORTUNITY_POOL_SIZE,
} from "@/lib/recommendations/scoring-constants";
import type { RecommendationCluster, ScoredRecommendation, UserProfile } from "@/lib/recommendations/types";

function intersect(a: string[], b: string[]): string[] {
  const set = new Set(b);
  return a.filter((x) => set.has(x));
}

/** Per-row barrier key for §16 secondary grouping. */
function barrierKeyForRow(row: ScoredRecommendation, profile: UserProfile): string {
  for (const b of profile.barriers) {
    if (row.barrierFit.includes(b)) return b;
  }
  return "none";
}

/** Per-row OCEAN col-L alignment for §16 tertiary grouping. */
function oceanKeyForRow(row: ScoredRecommendation, profile: UserProfile): string {
  const hits = intersect(row.oceanCategoryTags, profile.oceanCategoryTags);
  if (!hits.length) return "none";
  return hits.sort().join("+");
}

/** Average score of top N rows in cluster (§16). */
function clusterScoreFromRows(rows: ScoredRecommendation[]): number {
  const top = [...rows]
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, PDA_CLUSTER_TOP_ROWS_FOR_AVG);
  if (!top.length) return 0;
  return top.reduce((sum, r) => sum + r.score.total, 0) / top.length;
}

/**
 * Group top-scored rows by category (primary), shared barrier (secondary),
 * OCEAN category alignment (tertiary) — PDA §16.
 */
export function clusterRecommendations(
  ranked: ScoredRecommendation[],
  profile: UserProfile,
  options?: { poolSize?: number; excludeTypes?: Set<string> },
): RecommendationCluster[] {
  const excludeTypes = options?.excludeTypes ?? new Set(["safety_guidance", "coach_note"]);
  const poolSize = options?.poolSize ?? PDA_OPPORTUNITY_POOL_SIZE;

  const pool = ranked.filter((r) => !excludeTypes.has(r.type)).slice(0, poolSize);

  const groups = new Map<string, ScoredRecommendation[]>();
  for (const row of pool) {
    const barrier = barrierKeyForRow(row, profile);
    const ocean = oceanKeyForRow(row, profile);
    const key = `${row.category}::${barrier}::${ocean}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const clusters: RecommendationCluster[] = [];
  for (const [key, rows] of groups) {
    const [category, barrierPart, oceanPart] = key.split("::");
    clusters.push({
      key,
      category,
      mainBarrier: barrierPart === "none" ? null : barrierPart,
      oceanAlignment: oceanPart === "none" ? null : oceanPart,
      clusterScore: clusterScoreFromRows(rows),
      rows: [...rows].sort((a, b) => b.score.total - a.score.total),
    });
  }

  return clusters.sort((a, b) => b.clusterScore - a.clusterScore);
}

/** Pick top clusters; de-dupe same category + main barrier (§16). */
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
    if (selected.length >= PDA_OPPORTUNITY_CLUSTER_COUNT) break;
  }

  return selected;
}

/** @deprecated Use PDA_* constants */
export const A12_CLUSTER_TOP_ROWS_FOR_AVG = PDA_CLUSTER_TOP_ROWS_FOR_AVG;
export const A12_OPPORTUNITY_CLUSTER_COUNT = PDA_OPPORTUNITY_CLUSTER_COUNT;
export const A12_OPPORTUNITY_POOL_SIZE = PDA_OPPORTUNITY_POOL_SIZE;
