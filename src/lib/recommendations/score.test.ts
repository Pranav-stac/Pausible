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
    secondaryBlendPct: null,
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
    effortLevel: 2,
    notes: "",
    personaContext: {},
    scopeClassification: "behavior_core",
    userFacingBoundary: "behavioral_guidance",
    recommendationRole: "standard",
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
    // Steadfast Bear Phase-1 AE cap is 4 — effort 2 fits; effort 5 exceeds (−15) and gets no low bonus.
    const low = scoreRecommendation(row({ id: "A", effortLevel: 2 }), profile);
    const high = scoreRecommendation(row({ id: "B", effortLevel: 5 }), profile);
    expect(low.effort).toBe(5);
    expect(high.effort).toBe(-15);
  });

  it("awards high-effort bonus for high-capacity profiles within Phase-1 cap", () => {
    const profile = baseProfile({
      context: ["fitness_consistent", "time_45_plus_min"],
    });
    expect(hasHighCapacityProfile(profile)).toBe(true);
    // Bear Phase-1 cap = 4 → effort 4 gets +5 without exceeds-capacity penalty.
    const high = scoreRecommendation(row({ id: "A", effortLevel: 4 }), profile);
    const low = scoreRecommendation(row({ id: "B", effortLevel: 2 }), profile);
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
      },
      baseProfile({ context: ["time_under_15_min"] }),
    );
    // Override matched context to simulate scoring without travel tag match.
    travel.score.matchedContext = ["time_under_15_min"];
    travel.score.total = 65;
    expect(passesPlanScoreGate(travel)).toBe(false);
  });
});

describe("PDA §15 tie-breakers", () => {
  it("prefers secondary persona match after primary (tie-breaker #5)", () => {
    const profile = baseProfile();
    const a = scored(
      { id: "A", personaFit: ["steadfast_bear"], effortLevel: 3 },
      profile,
    );
    const b = scored(
      { id: "B", personaFit: ["steadfast_bear", "steady_elephant"], effortLevel: 3 },
      profile,
    );
    b.score.total = a.score.total;
    b.score.matchedBarriers = [...a.score.matchedBarriers];
    b.score.matchedOcean = [...a.score.matchedOcean];
    expect(compareScored(a, b, { profile })).toBeGreaterThan(0);
  });
});
