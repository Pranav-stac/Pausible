import { describe, expect, it } from "vitest";
import { buildRecommendationSeedPayload } from "@/lib/recommendations/build-seed-payload";
import { scoreAll } from "@/lib/recommendations/score";
import { selectActionPlan } from "@/lib/recommendations/select-action-plan";
import type { UserProfile } from "@/lib/recommendations/types";

describe("Master v1.20 seed smoke", () => {
  it("loads 201 recs with Effort/Role/Scope and scores", () => {
    const seed = buildRecommendationSeedPayload();
    expect(seed.masterVersion).toBe("v1.20");
    expect(seed.recommendations).toHaveLength(201);
    const ids = new Set(seed.recommendations.map((r) => r.id));
    for (const id of ["SLP034", "NUT043", "FIT047", "MW040", "NUT046"]) {
      expect(ids.has(id)).toBe(true);
    }
    const sample = seed.recommendations[0]!;
    expect(sample.effortLevel).toBeGreaterThanOrEqual(1);
    expect(sample.effortLevel).toBeLessThanOrEqual(5);
    expect(sample.scopeClassification).toBeTruthy();
    expect(sample.recommendationRole).toBeTruthy();

    const profile: UserProfile = {
      primaryPersona: "brittle_avoidant",
      secondaryPersona: "self_regulated_planner",
      primaryPersonaAlias: "shielded_turtle",
      secondaryPersonaAlias: "steady_elephant",
      fitTier: "classic",
      blendRatio: 2.5,
      blendStrength: "pure",
      oceanTags: ["C_low", "N_high"],
      goals: ["goal_sleep_recovery", "goal_stress_reduction"],
      barriers: ["barrier_lack_of_consistency", "barrier_lack_of_time"],
      context: [
        "stress_high",
        "time_under_30_min",
        "fitness_beginner",
        "activity_sedentary",
        "environment_home",
      ],
      exclusions: ["exclude_none"],
      oceanCategoryTags: [],
      goalPreferenceBridge: false,
      computedAgeYears: 28,
      isMinor: false,
      isElderly65: false,
    secondaryBlendPct: null,
    };
    const ranked = scoreAll(seed.recommendations, profile);
    const plan = selectActionPlan(ranked, profile);
    expect(ranked.length).toBe(201);
    expect(plan.safetyCards).toBeDefined();
    expect(plan.pillarPlans["Sleep & Recovery"].dos.length).toBeGreaterThan(0);
  });
});
