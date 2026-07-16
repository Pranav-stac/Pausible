import type { ScoredRecommendation, UserProfile } from "@/lib/recommendations/types";

/** PDA §13 — variable recommendation count: base 20, complexity bonuses, cap 35. */
export const REC_COUNT_BASE = 20;
export const REC_COUNT_CAP = 35;

export type VariableRecCountBreakdown = {
  target: number;
  base: number;
  barrierBonus: number;
  blendBonus: number;
  contextBonus: number;
  safetyBonus: number;
};

/**
 * Count scales with profile complexity:
 * base = 20;
 * +3 if ≥3 barriers active;
 * +2 if secondary persona blend >25%;
 * +2 if ≥4 context-fit tags match;
 * +5 if safety recs triggered;
 * cap = 35.
 */
export function computeVariableRecCount(
  profile: UserProfile,
  opts?: {
    secondaryBlendPct?: number | null;
    /** Distinct context tags that matched at least one scored rec (col G). */
    matchedContextTagCount?: number;
    safetyTriggered?: boolean;
  },
): VariableRecCountBreakdown {
  const barrierBonus = profile.barriers.length >= 3 ? 3 : 0;
  const blendPct = opts?.secondaryBlendPct ?? null;
  const blendBonus =
    blendPct != null
      ? blendPct > 25
        ? 2
        : 0
      : profile.blendStrength === "strong_influence"
        ? 2
        : 0;
  const contextBonus = (opts?.matchedContextTagCount ?? 0) >= 4 ? 2 : 0;
  const safetyBonus = opts?.safetyTriggered ? 5 : 0;
  const raw = REC_COUNT_BASE + barrierBonus + blendBonus + contextBonus + safetyBonus;
  return {
    target: Math.min(REC_COUNT_CAP, raw),
    base: REC_COUNT_BASE,
    barrierBonus,
    blendBonus,
    contextBonus,
    safetyBonus,
  };
}

function countMatchedContextTags(ranked: ScoredRecommendation[]): number {
  const tags = new Set<string>();
  for (const row of ranked) {
    for (const t of row.score.matchedContext ?? []) tags.add(t);
  }
  return tags.size;
}

/** Expand selected IDs up to the PDA §13 target (never drop existing / safety / PI). */
export function expandSelectionToTargetCount(
  ranked: ScoredRecommendation[],
  selectedIds: string[],
  profile: UserProfile,
  opts?: {
    secondaryBlendPct?: number | null;
    safetyTriggered?: boolean;
  },
): { ids: string[]; target: number; expanded: number } {
  const matchedContextTagCount = countMatchedContextTags(ranked);
  const { target } = computeVariableRecCount(profile, {
    secondaryBlendPct: opts?.secondaryBlendPct,
    matchedContextTagCount,
    safetyTriggered: opts?.safetyTriggered,
  });

  const ids = [...selectedIds];
  const used = new Set(ids);
  if (ids.length >= target) {
    // Never trim below safety/PI — keep all force-included IDs even above cap for audit completeness.
    return { ids, target, expanded: 0 };
  }

  let expanded = 0;
  for (const row of ranked) {
    if (ids.length >= target) break;
    if (used.has(row.id)) continue;
    // Skip PI / safety-only rows — those are already force-included when triggered.
    if (row.type === "safety_guidance") continue;
    if (row.id.startsWith("PI")) continue;
    used.add(row.id);
    ids.push(row.id);
    expanded += 1;
  }

  return { ids, target, expanded };
}
