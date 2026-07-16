import { isPiSeries } from "@/lib/recommendations/action-pool";
import { phase1ActivationEnergyCap } from "@/lib/recommendations/plan/activation-energy";
import { PERSONA_PHASE_CONFIG } from "@/lib/recommendations/plan/phase-config";
import { isSafetyScopedRow } from "@/lib/recommendations/safety";
import {
  PDA_BARRIER,
  PDA_CONTEXT,
  PDA_DUPLICATE_THEME_PENALTY,
  PDA_EFFORT,
  PDA_EFFORT_EXCEEDS_CAPACITY_PENALTY,
  PDA_GOAL,
  PDA_OCEAN,
  PDA_PERSONA,
  PDA_PERSONA_CONFLICT_PENALTY,
  PDA_PERSONA_PRIMARY_BY_FIT_TIER,
  PDA_PERSONA_SECONDARY_BY_BLEND,
  PDA_PLAN_SCORE_THRESHOLD,
  PDA_PREFERENCE_CONTRADICTION_PENALTY,
  PDA_RANK_PILLARS,
  PDA_SOCIAL_FOR_SOLO_PENALTY,
  PDA_STRENGTH_POINTS,
  PDA_STRENGTH_RANK,
  PDA_TRACKING_ANXIOUS_PENALTY,
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

/** Personas that conflict with Shielded Turtle / solo-avoidant patterns on high-E social recs. */
const HIGH_SOCIAL_PERSONA_ALIASES = new Set([
  "pack_wolf",
  "social_motivator",
  "curious_fox",
  "curious_explorer",
]);
const LOW_SOCIAL_PRIMARY = new Set(["shielded_turtle", "brittle_avoidant", "steadfast_bear", "resilient_performer"]);


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

/** §14 — low capacity favours low-effort recs; high-capacity profiles favour high-effort recs. */
export function hasLowCapacityProfile(profile: UserProfile): boolean {
  return (
    profile.barriers.includes("barrier_lack_of_consistency") ||
    profile.barriers.includes("barrier_lack_of_knowledge") ||
    profile.barriers.includes("barrier_low_activation_energy") ||
    profile.barriers.includes("barrier_overwhelm_from_complexity") ||
    profile.context.includes("stress_high") ||
    profile.context.includes("time_under_15_min") ||
    profile.context.includes("time_under_30_min")
  );
}

export function hasHighCapacityProfile(profile: UserProfile): boolean {
  if (hasLowCapacityProfile(profile)) return false;
  const disciplined =
    profile.context.includes("fitness_consistent") ||
    profile.context.includes("fitness_advanced") ||
    profile.context.includes("fitness_intermediate");
  const ampleTime =
    profile.context.includes("time_45_plus_min") ||
    profile.context.includes("time_30_45_min") ||
    profile.context.includes("time_45_60_min") ||
    profile.context.includes("time_over_60_min");
  return disciplined || ampleTime;
}

/** Effort Level 1–2 = low; 4–5 = high (PDA §14 effort fit). */
function effortFit(row: RecommendationRow, profile: UserProfile): number {
  const level = row.effortLevel ?? 3;
  if (level <= 2 && hasLowCapacityProfile(profile)) {
    return PDA_EFFORT.bonus;
  }
  if (level >= 4 && hasHighCapacityProfile(profile)) {
    return PDA_EFFORT.bonus;
  }
  return 0;
}

function effortExceedsCapacityPenalty(row: RecommendationRow, profile: UserProfile): number {
  const phase1Cap = phase1ActivationEnergyCap(profile.primaryPersona, PERSONA_PHASE_CONFIG);
  if ((row.effortLevel ?? 3) > phase1Cap) {
    return -PDA_EFFORT_EXCEEDS_CAPACITY_PENALTY;
  }
  return 0;
}

/** PDA §14 mismatch penalties (except duplicate theme — applied in scoreAll after pool exists). */
function mismatchPenalties(row: RecommendationRow, profile: UserProfile): number {
  let penalty = 0;
  const fit = row.personaFit.map((p) => p.toLowerCase());
  const primary = profile.primaryPersonaAlias.toLowerCase();

  // Persona conflict: high-social rec tagged only for pack/fox while primary is turtle/bear.
  if (
    LOW_SOCIAL_PRIMARY.has(primary) &&
    fit.some((p) => HIGH_SOCIAL_PERSONA_ALIASES.has(p)) &&
    !fit.includes(primary) &&
    !fit.includes("all_personas")
  ) {
    penalty -= PDA_PERSONA_CONFLICT_PENALTY;
  }

  // Preference contradiction: gym-based when user selected home (or reverse).
  const prefersHome =
    profile.context.includes("environment_home") || profile.context.includes("workout_home");
  const prefersGym =
    profile.context.includes("environment_gym") || profile.context.includes("workout_gym");
  const rowGym =
    row.contextFit.some((t) => /gym/.test(t)) || /\bgym\b/i.test(row.text);
  const rowHome =
    row.contextFit.some((t) => /home/.test(t)) || /\bat home\b/i.test(row.text);
  if ((prefersHome && rowGym && !rowHome) || (prefersGym && rowHome && !rowGym)) {
    penalty -= PDA_PREFERENCE_CONTRADICTION_PENALTY;
  }

  // Tracking-for-anxious: detailed monitoring + N high tag or high neuroticism signal.
  const nHigh =
    profile.oceanTags.includes("N_high") ||
    profile.primaryPersona === "brittle_avoidant" ||
    profile.primaryPersona === "stress_sensitive";
  const trackingHeavy =
    row.category.includes("track") ||
    /track|log daily|monitor|weigh.?in|calorie count/i.test(row.text);
  if (nHigh && trackingHeavy) {
    penalty -= PDA_TRACKING_ANXIOUS_PENALTY;
  }

  // Social-for-solo: group/partner for low E or solo preference.
  const soloPref =
    profile.context.includes("support_self_directed") ||
    profile.oceanTags.includes("E_low") ||
    profile.primaryPersona === "brittle_avoidant" ||
    profile.primaryPersona === "resilient_performer";
  const socialRec =
    row.contextFit.some((t) => /social|group|partner|buddy/.test(t)) ||
    /group|partner|buddy|class with others/i.test(row.text);
  if (soloPref && socialRec) {
    penalty -= PDA_SOCIAL_FOR_SOLO_PENALTY;
  }

  return penalty;
}

function duplicateThemeKey(row: RecommendationRow): string {
  const barrier = [...(row.barrierFit ?? [])].sort()[0] ?? "";
  return `${row.category}::${barrier}`;
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

  const travelAnchorTags = new Set(["work_travel_heavy", "barrier_travel_schedule_disruption"]);
  const travelCategories = new Set([
    "travel_work_nutrition",
    "travel_work_fitness",
    "shift_work_travel_sleep",
  ]);
  if (
    row.strength === "conditional" &&
    travelCategories.has(row.category) &&
    !row.score.matchedContext.some((t) => travelAnchorTags.has(t))
  ) {
    return false;
  }

  return true;
}

export function scoreRecommendation(row: RecommendationRow, profile: UserProfile): ScoreBreakdown {
  // PDA §40.5 — safety_professional_referral bypasses competitive scoring (trigger-selected only).
  if (isSafetyScopedRow(row) || (row.scopeClassification || "").toLowerCase() === "safety_professional_referral") {
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
  const effort = effortFit(row, profile) + effortExceedsCapacityPenalty(row, profile);
  // PDA §14 — conditional always −5 (eligibility is filtering; do not waive on context match).
  const strength = PDA_STRENGTH_POINTS[row.strength] ?? 0;
  const mismatch = mismatchPenalties(row, profile);

  const total = persona + barriers + goals + context + ocean + effort + strength + mismatch;

  return {
    persona,
    barriers,
    goals,
    context,
    ocean,
    effort: effort + mismatch,
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
    : a.score.matchedBarriers.includes("barrier_lack_of_consistency") ||
      a.score.matchedBarriers.includes("barrier_lack_of_knowledge") ||
      a.score.matchedBarriers.includes("barrier_low_activation_energy") ||
      a.score.matchedBarriers.includes("barrier_overwhelm_from_complexity") ||
      a.score.matchedContext.some(
        (t) => t === "stress_high" || t === "time_under_15_min" || t === "time_under_30_min",
      );
  if (lowCapacity && a.effortLevel !== b.effortLevel) {
    return (a.effortLevel ?? 3) - (b.effortLevel ?? 3);
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

  // PDA §14 duplicate theme −12: Category+Barrier duplicates beyond the first (by score).
  const byTheme = new Map<string, ScoredRecommendation[]>();
  for (const row of scored) {
    if (isPiSeries(row) || row.score.total === 0) continue;
    const key = duplicateThemeKey(row);
    const list = byTheme.get(key) ?? [];
    list.push(row);
    byTheme.set(key, list);
  }
  for (const list of byTheme.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => b.score.total - a.score.total);
    for (let i = 1; i < list.length; i++) {
      const row = list[i]!;
      row.score = {
        ...row.score,
        effort: row.score.effort - PDA_DUPLICATE_THEME_PENALTY,
        total: row.score.total - PDA_DUPLICATE_THEME_PENALTY,
      };
    }
  }

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
