import { PDA_MAX_SCORE } from "@/lib/recommendations/scoring-constants";
import type { ScoredRecommendation } from "@/lib/recommendations/types";

/** PDA §15 — Maximal Marginal Relevance λ. */
export const MMR_LAMBDA = 0.7;

/**
 * Similarity by Category + Barrier + OCEAN tag overlap (PDA §15).
 * Sharing all three dimensions → 1.0; sharing none → 0.0.
 */
export function mmrSimilarity(a: ScoredRecommendation, b: ScoredRecommendation): number {
  let parts = 0;
  let hits = 0;
  parts += 1;
  if (a.category && a.category === b.category) hits += 1;

  const barriersA = new Set(a.barrierFit ?? []);
  const barriersB = new Set(b.barrierFit ?? []);
  parts += 1;
  if ([...barriersA].some((t) => barriersB.has(t))) hits += 1;

  const oceanA = new Set(a.oceanTraitTags ?? []);
  const oceanB = new Set(b.oceanTraitTags ?? []);
  parts += 1;
  if ([...oceanA].some((t) => oceanB.has(t))) hits += 1;

  return hits / parts;
}

/**
 * PDA §15 / B4 — greedy MMR ordering after score-based ranking.
 * normalised_relevance = score / max_possible_score (~158);
 * MMR = λ × norm − (1−λ) × max_similarity_to_selected.
 */
export function applyMmrOrdering(scored: ScoredRecommendation[]): ScoredRecommendation[] {
  if (scored.length <= 1) return scored;

  const remaining = [...scored];
  const selected: ScoredRecommendation[] = [];

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestMmr = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const row = remaining[i]!;
      const relevance = Math.max(0, row.score.total) / PDA_MAX_SCORE;
      const maxSim =
        selected.length === 0
          ? 0
          : Math.max(...selected.map((s) => mmrSimilarity(row, s)));
      const mmr = MMR_LAMBDA * relevance - (1 - MMR_LAMBDA) * maxSim;
      if (mmr > bestMmr) {
        bestMmr = mmr;
        bestIdx = i;
      }
    }
    selected.push(remaining.splice(bestIdx, 1)[0]!);
  }

  return selected;
}
