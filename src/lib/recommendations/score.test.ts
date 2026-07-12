import { describe, expect, it } from "vitest";
import {
  compareScored,
  hasHighCapacityProfile,
  hasLowCapacityProfile,
  passesPlanScoreGate,
  scoreRecommendation,
} from "@/lib/recommendations/score";
import type { RecommendationRow, ScoredRecommendation, UserProfile } from "@/lib/recommendations/types";

function baseProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    primaryPersona: "resilient_performer",
    secondaryPersona: "self_regulated_planner",
    primaryPersonaAlias: "steadfast_bear",
    secondaryPersonaAlias: "steady_elephant",
    fitTier: "classic",
    blendRatio: 1.5,
    blendStrength: "tendencies",
    oceanTags: [],
    goals: [],
    barriers: [],
    context: [],
    exclusions: ["exclude_none"],
    oceanCategoryTags: [],
    goalPreferenceBridge: false,
    computedAgeYears: null,
    isMinor: false,
    isElderly65: false,
    ...overrides,
  };
}

function row(partial: Partial<RecommendationRow> & Pick<RecommendationRow, "id">): RecommendationRow {
  return {
    pillar: "Physical Activity",
    category: "strength",
    type: "do",
    text: "Train consistently",
    personaFit: ["steadfast_bear", "steady_elephant"],
    contextFit: [],
    goalFit: [],
    barrierFit: [],
    excludeIf: [],
    strength: "core",
    oceanCategoryTags: [],
    oceanTraitTags: [],
    oceanFit: [],
    effortLevel: "low",
    personaContext: {},
    ...partial,
  };
}

function scored(
  partial: Partial<RecommendationRow> & Pick<RecommendationRow, "id">,
  profile: UserProfile,
): ScoredRecommendation {
  const r = row(partial);
  return { ...r, score: scoreRecommendation(r, profile), excluded: false };
}

describe("PDA §14 effort fit", () => {
  it("awards low-effort bonus for low-capacity profiles", () => {
    const profile = baseProfile({
      context: ["time_under_15_min"],
    });
    const low = scoreRecommendation(row({ id: "A", effortLevel: "low" }), profile);
    const high = scoreRecommendation(row({ id: "B", effortLevel: "high" }), profile);
    expect(low.effort).toBe(5);
    expect(high.effort).toBe(0);
  });

  it("awards high-effort bonus for high-capacity profiles", () => {
    const profile = baseProfile({
      context: ["fitness_consistent", "time_45_plus_min"],
    });
    expect(hasHighCapacityProfile(profile)).toBe(true);
    const high = scoreRecommendation(row({ id: "A", effortLevel: "high" }), profile);
    const low = scoreRecommendation(row({ id: "B", effortLevel: "low" }), profile);
    expect(high.effort).toBe(5);
    expect(low.effort).toBe(0);
  });

  it("does not treat stressed users as high capacity", () => {
    const profile = baseProfile({
      context: ["fitness_advanced", "stress_high"],
    });
    expect(hasLowCapacityProfile(profile)).toBe(true);
    expect(hasHighCapacityProfile(profile)).toBe(false);
  });
});

describe("PDA §21.3 conditional plan gate", () => {
  it("blocks travel conditional recs without travel context", () => {
    const travel = scored(
      {
        id: "NUT024",
        pillar: "Nutrition",
        category: "travel_work_nutrition",
        strength: "conditional",
        contextFit: ["work_travel_heavy", "time_under_15_min"],
        score: {
          persona: 25,
          barriers: 12,
          goals: 16,
          context: 3,
          ocean: 4,
          effort: 5,
          strength: 0,
          total: 65,
          primaryPersonaMatch: true,
          secondaryPersonaMatch: false,
          allPersonasMatch: false,
          matchedBarriers: ["barrier_lack_of_time"],
          matchedGoals: ["goal_energy"],
          matchedContext: ["time_under_15_min"],
          matchedOcean: ["C_low"],
        },
      },
      baseProfile({ context: ["time_under_15_min"] }),
    );
    expect(passesPlanScoreGate(travel)).toBe(false);
  });
});

describe("PDA §15 tie-breakers", () => {
  it("prefers secondary persona match after primary (tie-breaker #5)", () => {
    const profile = baseProfile();
    const a = scored(
      { id: "A", personaFit: ["steadfast_bear"], effortLevel: "medium" },
      profile,
    );
    const b = scored(
      { id: "B", personaFit: ["steadfast_bear", "steady_elephant"], effortLevel: "medium" },
      profile,
    );
    b.score.total = a.score.total;
    b.score.matchedBarriers = [...a.score.matchedBarriers];
    b.score.matchedOcean = [...a.score.matchedOcean];
    expect(compareScored(a, b, { profile })).toBeGreaterThan(0);
  });
});
