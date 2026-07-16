import { describe, expect, it } from "vitest";
import { applyMmrOrdering, mmrSimilarity, MMR_LAMBDA } from "@/lib/recommendations/mmr";
import { PDA_MAX_SCORE } from "@/lib/recommendations/scoring-constants";
import type { ScoredRecommendation } from "@/lib/recommendations/types";

function stub(partial: Partial<ScoredRecommendation> & { id: string; scoreTotal: number }): ScoredRecommendation {
  return {
    id: partial.id,
    pillar: partial.pillar ?? "Physical Activity",
    category: partial.category ?? "walking_daily_activity",
    type: "do",
    text: "x",
    personaFit: ["all_personas"],
    contextFit: [],
    goalFit: [],
    barrierFit: partial.barrierFit ?? [],
    excludeIf: [],
    strength: "core",
    oceanTraitTags: partial.oceanTraitTags ?? [],
    oceanCategoryTags: [],
    oceanFit: [],
    effortLevel: 2,
    notes: "",
    personaContext: {},
    scopeClassification: "behavior_core",
    userFacingBoundary: "behavioral_guidance",
    recommendationRole: "standard",
    score: {
      total: partial.scoreTotal,
      persona: 0,
      barriers: 0,
      goals: 0,
      context: 0,
      ocean: 0,
      effort: 0,
      strength: 0,
      primaryPersonaMatch: false,
      secondaryPersonaMatch: false,
      allPersonasMatch: true,
      matchedBarriers: [],
      matchedGoals: [],
      matchedContext: [],
      matchedOcean: [],
    },
    excluded: false,
  };
}

describe("MMR (PDA §15 / B4)", () => {
  it("uses λ = 0.7", () => {
    expect(MMR_LAMBDA).toBe(0.7);
  });

  it("normalises against PDA_MAX_SCORE ≈ 158", () => {
    expect(PDA_MAX_SCORE).toBe(158);
  });

  it("ranks a high-score unique theme ahead of a similar duplicate", () => {
    const a = stub({
      id: "A",
      scoreTotal: 100,
      category: "walking_daily_activity",
      barrierFit: ["barrier_lack_of_time"],
      oceanTraitTags: ["C_high"],
    });
    const b = stub({
      id: "B",
      scoreTotal: 99,
      category: "walking_daily_activity",
      barrierFit: ["barrier_lack_of_time"],
      oceanTraitTags: ["C_high"],
    });
    const c = stub({
      id: "C",
      scoreTotal: 80,
      category: "strength_training",
      barrierFit: ["barrier_lack_of_consistency"],
      oceanTraitTags: ["O_high"],
    });

    expect(mmrSimilarity(a, b)).toBe(1);
    expect(mmrSimilarity(a, c)).toBeLessThan(1);

    const ordered = applyMmrOrdering([a, b, c]);
    expect(ordered[0]?.id).toBe("A");
    // After picking A, B is similar so C (diverse) should beat B despite lower raw score.
    expect(ordered[1]?.id).toBe("C");
    expect(ordered[2]?.id).toBe("B");
  });
});
