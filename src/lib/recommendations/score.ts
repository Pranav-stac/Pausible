import { isPiSeries } from "@/lib/recommendations/action-pool";
import {
  PDA_BARRIER,
  PDA_CONTEXT,
  PDA_EFFORT,
  PDA_GOAL,
  PDA_OCEAN,
  PDA_PERSONA,
  PDA_PERSONA_PRIMARY_BY_FIT_TIER,
  PDA_PERSONA_SECONDARY_BY_BLEND,
  PDA_PLAN_SCORE_THRESHOLD,
  PDA_RANK_PILLARS,
  PDA_STRENGTH_POINTS,
  PDA_STRENGTH_RANK,
} from "@/lib/recommendations/scoring-constants";
import type {
  PillarName,
  RecommendationRow,
  RecommendationStrength,
  ScoreBreakdown,
  ScoredRecommendation,
  UserProfile,
} from "@/lib/recommendations/types";
import type { BlendStrength } from "@/lib/scoring/persona-types";
import { normalizeFitTier } from "@/lib/scoring/persona-fit";

function intersect(a: string[], b: string[]): string[] {
  const set = new Set(b);
  return a.filter((x) => set.has(x));
}

function personaPoints(row: RecommendationRow, profile: UserProfile) {
  const fit = row.personaFit.map((p) => p.toLowerCase());
  const primary = profile.primaryPersonaAlias.toLowerCase();
  const secondary = profile.secondaryPersonaAlias.toLowerCase();

  const primaryMatch = fit.includes(primary);
  const secondaryMatch = fit.includes(secondary);
  const allMatch = fit.includes("all_personas");

  const primaryBonus = PDA_PERSONA_PRIMARY_BY_FIT_TIER[normalizeFitTier(profile.fitTier)] ?? 25;
  const blendKey = profile.blendStrength as BlendStrength;
  const secondaryBonus = PDA_PERSONA_SECONDARY_BY_BLEND[blendKey] ?? 8;

  let persona = 0;
  if (primaryMatch) persona += primaryBonus;
  if (secondaryMatch) persona += secondaryBonus;
  if (allMatch) persona += PDA_PERSONA.allPersonas;
  persona = Math.min(PDA_PERSONA.cap, persona);

  return { persona, primaryMatch, secondaryMatch, allMatch };
}

function cappedSum(perMatch: number, matches: number, cap: number): number {
  return Math.min(perMatch * matches, cap);
}

function strengthComponent(
  strength: RecommendationStrength,
  matchedContextCount: number,
): number {
  if (strength === "conditional") {
    return matchedContextCount > 0 ? 0 : PDA_STRENGTH_POINTS.conditional;
  }
  return PDA_STRENGTH_POINTS[strength] ?? 0;
}

/** §14 — low capacity favours low-effort recs; high-capacity profiles favour high-effort recs. */
export function hasLowCapacityProfile(profile: UserProfile): boolean {
  return (
    profile.barriers.includes("barrier_low_activation_energy") ||
    profile.barriers.includes("barrier_overwhelm_from_complexity") ||
    profile.context.includes("stress_high") ||
    profile.context.includes("time_under_15_min")
  );
}

export function hasHighCapacityProfile(profile: UserProfile): boolean {
  if (hasLowCapacityProfile(profile)) return false;
  const disciplined =
    profile.context.includes("fitness_consistent") ||
    profile.context.includes("fitness_advanced") ||
    profile.context.includes("fitness_intermediate");
  const ampleTime =
    profile.context.includes("time_45_plus_min") || profile.context.includes("time_30_45_min");
  return disciplined || ampleTime;
}

function effortFit(row: RecommendationRow, profile: UserProfile): number {
  if (row.effortLevel === "low" && hasLowCapacityProfile(profile)) {
    return PDA_EFFORT.bonus;
  }
  if (row.effortLevel === "high" && hasHighCapacityProfile(profile)) {
    return PDA_EFFORT.bonus;
  }
  return 0;
}

export type RankContext = {
  selectedCategories?: Set<string>;
  pillarAssignmentCounts?: Partial<Record<PillarName, number>>;
  profile?: UserProfile;
};

/** §21.3 Step 1 — positive scores only; drop unmatched conditional negatives. */
export function passesPlanScoreGate(row: ScoredRecommendation): boolean {
  if (row.score.total <= PDA_PLAN_SCORE_THRESHOLD) return false;
  if (row.strength === "conditional" && row.score.matchedContext.length === 0) return false;
  return true;
}

export function scoreRecommendation(row: RecommendationRow, profile: UserProfile): ScoreBreakdown {
  if (isPiSeries(row)) {
    return {
      persona: 0,
      barriers: 0,
      goals: 0,
      context: 0,
      ocean: 0,
      effort: 0,
      strength: 0,
      total: 0,
      primaryPersonaMatch: false,
      secondaryPersonaMatch: false,
      allPersonasMatch: false,
      matchedBarriers: [],
      matchedGoals: [],
      matchedContext: [],
      matchedOcean: [],
    };
  }

  const { persona, primaryMatch, secondaryMatch, allMatch } = personaPoints(row, profile);

  const matchedBarriers = intersect(row.barrierFit, profile.barriers);
  const matchedGoals = intersect(row.goalFit, profile.goals);
  const matchedContext = intersect(row.contextFit, profile.context);
  const traitTags = row.oceanTraitTags.length ? row.oceanTraitTags : row.oceanFit;
  const matchedOcean = intersect(traitTags, profile.oceanTags);

  const barriers = cappedSum(PDA_BARRIER.perMatch, matchedBarriers.length, PDA_BARRIER.cap);
  const goals = cappedSum(PDA_GOAL.perMatch, matchedGoals.length, PDA_GOAL.cap);
  const context = cappedSum(PDA_CONTEXT.perMatch, matchedContext.length, PDA_CONTEXT.cap);
  const ocean = cappedSum(PDA_OCEAN.perMatch, matchedOcean.length, PDA_OCEAN.cap);
  const effort = effortFit(row, profile);
  const strength = strengthComponent(row.strength, matchedContext.length);

  const total = persona + barriers + goals + context + ocean + effort + strength;

  return {
    persona,
    barriers,
    goals,
    context,
    ocean,
    effort,
    strength,
    total,
    primaryPersonaMatch: primaryMatch,
    secondaryPersonaMatch: secondaryMatch,
    allPersonasMatch: allMatch,
    matchedBarriers,
    matchedGoals,
    matchedContext,
    matchedOcean,
  };
}

/** §15 tie-breakers after total score (within pillar). */
export function compareScored(
  a: ScoredRecommendation,
  b: ScoredRecommendation,
  ctx?: RankContext,
): number {
  const sa = a.score;
  const sb = b.score;
  if (sb.total !== sa.total) return sb.total - sa.total;

  const rankA = PDA_STRENGTH_RANK[a.strength] ?? 0;
  const rankB = PDA_STRENGTH_RANK[b.strength] ?? 0;
  if (rankB !== rankA) return rankB - rankA;

  if (sb.matchedBarriers.length !== sa.matchedBarriers.length) {
    return sb.matchedBarriers.length - sa.matchedBarriers.length;
  }

  if (sb.matchedOcean.length !== sa.matchedOcean.length) {
    return sb.matchedOcean.length - sa.matchedOcean.length;
  }

  const profileForCapacity = ctx?.profile;
  const lowCapacity = profileForCapacity
    ? hasLowCapacityProfile(profileForCapacity)
    : a.score.matchedBarriers.includes("barrier_low_activation_energy") ||
      a.score.matchedBarriers.includes("barrier_overwhelm_from_complexity") ||
      a.score.matchedContext.some((t) => t === "stress_high" || t === "time_under_15_min");
  if (lowCapacity && a.effortLevel !== b.effortLevel) {
    const order = { low: 0, medium: 1, high: 2 };
    return (order[a.effortLevel] ?? 1) - (order[b.effortLevel] ?? 1);
  }

  const primaryA = sa.primaryPersonaMatch ? 1 : 0;
  const primaryB = sb.primaryPersonaMatch ? 1 : 0;
  if (primaryB !== primaryA) return primaryB - primaryA;

  const secondaryA = sa.secondaryPersonaMatch ? 1 : 0;
  const secondaryB = sb.secondaryPersonaMatch ? 1 : 0;
  if (secondaryB !== secondaryA) return secondaryB - secondaryA;

  if (ctx?.selectedCategories) {
    const dupA = ctx.selectedCategories.has(a.category) ? 1 : 0;
    const dupB = ctx.selectedCategories.has(b.category) ? 1 : 0;
    if (dupA !== dupB) return dupA - dupB;
  }

  if (ctx?.pillarAssignmentCounts) {
    const countA = ctx.pillarAssignmentCounts[a.pillar] ?? 0;
    const countB = ctx.pillarAssignmentCounts[b.pillar] ?? 0;
    if (countA !== countB) return countA - countB;
  }

  return a.id.localeCompare(b.id);
}

/** §15 — sort descending within each pillar; PI rows appended (not competitively ranked). */
export function scoreAll(rows: RecommendationRow[], profile: UserProfile): ScoredRecommendation[] {
  const scored = rows.map((row) => ({
    ...row,
    score: scoreRecommendation(row, profile),
    excluded: false as const,
  }));

  const piRows = scored.filter((r) => isPiSeries(r)).sort((a, b) => a.id.localeCompare(b.id));
  const ranked: ScoredRecommendation[] = [];

  for (const pillar of PDA_RANK_PILLARS) {
    const pillarRows = scored
      .filter((r) => !isPiSeries(r) && r.pillar === pillar)
      .sort((a, b) => compareScored(a, b));
    ranked.push(...pillarRows);
  }

  const other = scored
    .filter((r) => !isPiSeries(r) && !PDA_RANK_PILLARS.includes(r.pillar as (typeof PDA_RANK_PILLARS)[number]))
    .sort((a, b) => compareScored(a, b));
  ranked.push(...other, ...piRows);

  return ranked;
}
