import {
  A12_BARRIER,
  A12_CONTEXT,
  A12_GOAL,
  A12_OCEAN,
  A12_PERSONA,
  A12_PERSONA_PRIMARY_BY_FIT_TIER,
  A12_STRENGTH_POINTS,
  A12_STRENGTH_RANK,
} from "@/lib/recommendations/scoring-constants";
import type {
  RecommendationRow,
  RecommendationStrength,
  ScoreBreakdown,
  ScoredRecommendation,
  UserProfile,
} from "@/lib/recommendations/types";

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

  const primaryBonus = A12_PERSONA_PRIMARY_BY_FIT_TIER[profile.fitTier] ?? 25;

  let persona = 0;
  if (primaryMatch) persona += primaryBonus;
  if (secondaryMatch) persona += A12_PERSONA.secondary;
  if (allMatch) persona += A12_PERSONA.allPersonas;
  persona = Math.min(A12_PERSONA.cap, persona);

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
    return matchedContextCount > 0 ? 0 : A12_STRENGTH_POINTS.conditional;
  }
  return A12_STRENGTH_POINTS[strength] ?? 0;
}

export function scoreRecommendation(
  row: RecommendationRow,
  profile: UserProfile,
): ScoreBreakdown {
  const { persona, primaryMatch, secondaryMatch, allMatch } = personaPoints(row, profile);

  const matchedBarriers = intersect(row.barrierFit, profile.barriers);
  const matchedGoals = intersect(row.goalFit, profile.goals);
  const matchedContext = intersect(row.contextFit, profile.context);
  const matchedOcean = intersect(row.oceanFit ?? [], profile.oceanTags);

  const barriers = cappedSum(A12_BARRIER.perMatch, matchedBarriers.length, A12_BARRIER.cap);
  const goals = cappedSum(A12_GOAL.perMatch, matchedGoals.length, A12_GOAL.cap);
  const context = cappedSum(A12_CONTEXT.perMatch, matchedContext.length, A12_CONTEXT.cap);
  const ocean = cappedSum(A12_OCEAN.perMatch, matchedOcean.length, A12_OCEAN.cap);

  const strength = strengthComponent(row.strength, matchedContext.length);

  const total = persona + barriers + goals + context + ocean + strength;

  return {
    persona,
    barriers,
    goals,
    context,
    ocean,
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

export function scoreAll(
  rows: RecommendationRow[],
  profile: UserProfile,
): ScoredRecommendation[] {
  return rows
    .map((row) => ({
      ...row,
      score: scoreRecommendation(row, profile),
      excluded: false as const,
    }))
    .sort(compareScored);
}

/** A12 §7 tie-breakers after total score. */
export function compareScored(a: ScoredRecommendation, b: ScoredRecommendation): number {
  const sa = a.score;
  const sb = b.score;
  if (sb.total !== sa.total) return sb.total - sa.total;

  const rankA = A12_STRENGTH_RANK[a.strength] ?? 0;
  const rankB = A12_STRENGTH_RANK[b.strength] ?? 0;
  if (rankB !== rankA) return rankB - rankA;

  if (sb.matchedBarriers.length !== sa.matchedBarriers.length) {
    return sb.matchedBarriers.length - sa.matchedBarriers.length;
  }

  const primaryA = sa.primaryPersonaMatch ? 1 : 0;
  const primaryB = sb.primaryPersonaMatch ? 1 : 0;
  if (primaryB !== primaryA) return primaryB - primaryA;

  return a.id.localeCompare(b.id);
}
