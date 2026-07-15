import { describe, expect, it } from "vitest";
import { applyContextSelectionSuppression } from "@/lib/recommendations/context-selection-suppression";
import type { RecommendationRow, UserProfile } from "@/lib/recommendations/types";

function row(partial: Partial<RecommendationRow> & Pick<RecommendationRow, "id">): RecommendationRow {
  return {
    pillar: "Physical Activity",
    category: "walking_daily_activity",
    type: "do",
    text: "Take a walk.",
    personaFit: ["all_personas"],
    contextFit: [],
    goalFit: [],
    barrierFit: [],
    excludeIf: [],
    strength: "core",
    oceanCategoryTags: [],
    oceanTraitTags: [],
    oceanFit: [],
    notes: "",
    effortLevel: 2,
    personaContext: {},
    scopeClassification: "behavior_core",
    userFacingBoundary: "behavioral_guidance",
    recommendationRole: "standard",
    ...partial,
  };
}

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    primaryPersona: "steadfast_bear",
    secondaryPersona: "watchful_deer",
    primaryPersonaAlias: "steadfast_bear",
    secondaryPersonaAlias: "watchful_deer",
    fitTier: "core",
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

describe("applyContextSelectionSuppression (DR19–DR22)", () => {
  it("DR19 removes caffeine recs when caffeine_none", () => {
    const rows = [
      row({ id: "SLP014", category: "caffeine_stimulants_sleep", text: "Cut caffeine after 2pm." }),
      row({ id: "FIT001" }),
    ];
    const out = applyContextSelectionSuppression(rows, profile({ context: ["caffeine_none"] }));
    expect(out.map((r) => r.id)).toEqual(["FIT001"]);
  });

  it("DR21 suppresses walking-primary for fit active users except FIT042", () => {
    const rows = [
      row({ id: "FIT004", category: "walking_daily_activity" }),
      row({ id: "FIT042", category: "walking_daily_activity", text: "Easy recovery walk." }),
    ];
    const out = applyContextSelectionSuppression(
      rows,
      profile({
        context: ["fitness_consistent", "activity_moderate"],
      }),
    );
    expect(out.map((r) => r.id)).toEqual(["FIT042"]);
  });

  it("DR22 suppresses deficit recs when fat loss is not a goal", () => {
    const rows = [
      row({
        id: "NUT001",
        pillar: "Nutrition",
        category: "restriction_dieting",
        text: "Create a modest calorie deficit.",
      }),
    ];
    expect(applyContextSelectionSuppression(rows, profile()).length).toBe(0);
  });

  it("DR22 meals-by-others keeps NUT046 on safe list", () => {
    const rows = [
      row({
        id: "NUT046",
        pillar: "Nutrition",
        category: "nutrition_foundations",
        text: "Choose the protein option when others prepare your meals.",
      }),
      row({
        id: "NUT099",
        pillar: "Nutrition",
        category: "meal_planning",
        text: "Cook three meal prep batches on Sunday.",
      }),
    ];
    const out = applyContextSelectionSuppression(
      rows,
      profile({ context: ["meal_control_prepared_by_others"] }),
    );
    expect(out.map((r) => r.id)).toEqual(["NUT046"]);
  });
});
