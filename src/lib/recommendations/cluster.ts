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

function mainBarrierForCluster(rows: ScoredRecommendation[], profile: UserProfile): string | null {
  for (const b of profile.barriers) {
    if (rows.some((r) => r.barrierFit.includes(b))) return b;
  }
  return profile.barriers[0] ?? null;
}

/** Tertiary clustering key — OCEAN category tag alignment (col L), §16. */
function oceanAlignmentForCluster(rows: ScoredRecommendation[], profile: UserProfile): string | null {
  const userTags = profile.oceanCategoryTags;
  if (!userTags.length) return null;

  const tagHits = new Map<string, number>();
  for (const row of rows) {
    const tags = row.oceanCategoryTags.length ? row.oceanCategoryTags : [];
    for (const tag of intersect(tags, userTags)) {
      tagHits.set(tag, (tagHits.get(tag) ?? 0) + 1);
    }
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [tag, count] of tagHits) {
    if (count > bestCount) {
      best = tag;
      bestCount = count;
    }
  }
  return best;
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

  const byCategory = new Map<string, ScoredRecommendation[]>();
  for (const row of pool) {
    const list = byCategory.get(row.category) ?? [];
    list.push(row);
    byCategory.set(row.category, list);
  }

  const clusters: RecommendationCluster[] = [];
  for (const [category, rows] of byCategory) {
    const barrier = mainBarrierForCluster(rows, profile);
    const oceanAlignment = oceanAlignmentForCluster(rows, profile);
    const key = `${category}::${barrier ?? "none"}::${oceanAlignment ?? "none"}`;
    clusters.push({
      key,
      category,
      mainBarrier: barrier,
      oceanAlignment,
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
