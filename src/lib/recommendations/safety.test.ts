import { describe, expect, it } from "vitest";
import { isSafetyRowTriggered, selectSafetyCards } from "@/lib/recommendations/safety";
import type { RecommendationRow, ScoredRecommendation, UserProfile } from "@/lib/recommendations/types";

function baseProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    primaryPersona: "brittle_avoidant",
    secondaryPersona: "self_regulated_planner",
    primaryPersonaAlias: "shielded_turtle",
    secondaryPersonaAlias: "watchful_deer",
    fitTier: "classic",
    blendRatio: 2.5,
    blendStrength: "pure",
    oceanTags: [],
    goals: ["goal_stress_calm"],
    barriers: ["barrier_lack_of_time"],
    context: ["fitness_beginner", "gender_male", "age_25_34"],
    exclusions: ["exclude_none"],
    oceanCategoryTags: [],
    goalPreferenceBridge: false,
    computedAgeYears: 28,
    isMinor: false,
    isElderly65: false,
    ...overrides,
  };
}

function row(partial: Partial<RecommendationRow> & Pick<RecommendationRow, "id">): ScoredRecommendation {
  const base: RecommendationRow = {
    pillar: "Nutrition",
    category: "nutrition_safety_escalation",
    type: "safety_guidance",
    text: "Get professional guidance.",
    personaFit: ["all_personas"],
    contextFit: [],
    goalFit: ["goal_energy"],
    barrierFit: [],
    excludeIf: ["exclude_medical_condition"],
    strength: "conditional",
    oceanCategoryTags: [],
    oceanTraitTags: [],
    oceanFit: [],
    effortLevel: 1,
    notes: "",
    personaContext: {},
    scopeClassification: "safety_professional_referral",
    userFacingBoundary: "safety_sensitive",
    recommendationRole: "safety",
    ...partial,
  };
  return {
    ...base,
    score: {
      total: 10,
      goals: 0,
      barriers: 0,
      context: 0,
      ocean: 0,
      persona: 0,
      effort: 0,
      strength: 0,
      matchedGoals: [],
      matchedBarriers: [],
      matchedContext: [],
      matchedOcean: [],
    },
    excluded: false,
  };
}

describe("safety card triggers (§38.9)", () => {
  it("does not fire NUT029-style cards on healthy beginners via goal/all_personas alone", () => {
    const nut029 = row({
      id: "NUT029",
      contextFit: ["gender_female"],
      goalFit: ["goal_energy"],
    });
    expect(isSafetyRowTriggered(nut029, baseProfile())).toBe(false);
  });

  it("does not fire FIT023 on fitness_beginner without injury / medical flags", () => {
    const fit023 = row({
      id: "FIT023",
      pillar: "Physical Activity",
      contextFit: ["fitness_beginner", "fitness_restarting"],
      excludeIf: ["exclude_injury", "exclude_medical_condition"],
    });
    expect(isSafetyRowTriggered(fit023, baseProfile())).toBe(false);
  });

  it("fires when an active exclusion matches excludeIf", () => {
    const fit023 = row({
      id: "FIT023",
      pillar: "Physical Activity",
      contextFit: ["fitness_beginner"],
      excludeIf: ["exclude_injury"],
    });
    expect(isSafetyRowTriggered(fit023, baseProfile({ exclusions: ["exclude_injury"] }))).toBe(true);
  });

  it("selectSafetyCards returns empty for a clean beginner profile", () => {
    const cards = selectSafetyCards(
      [
        row({ id: "NUT029", contextFit: ["gender_female"], goalFit: ["goal_energy"] }),
        row({
          id: "FIT023",
          pillar: "Physical Activity",
          contextFit: ["fitness_beginner"],
          excludeIf: ["exclude_injury"],
        }),
      ],
      baseProfile(),
    );
    expect(cards).toEqual([]);
  });
});
