import { describe, expect, it } from "vitest";
import { applySafetyDisclaimersToPillarPlan, PHYSICAL_DISCLAIMER_DEFAULT } from "@/lib/recommendations/safety-disclaimers";
import type { UserProfile } from "@/lib/recommendations/types";

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
    exclusions: ["exclude_medical_condition"],
    oceanCategoryTags: [],
    goalPreferenceBridge: false,
    computedAgeYears: null,
    isMinor: false,
    isElderly65: false,
    secondaryBlendPct: null,
    ...overrides,
  };
}

describe("applySafetyDisclaimersToPillarPlan", () => {
  it("prepends physical disclaimer when restrictions present", () => {
    const plan = {
      focusArea: "Move with intention",
      focusReason: "Build steady movement.",
      dos: [{ action: "Walk 10 minutes after lunch.", why: "Low friction start." }],
      donts: [],
      sourceIds: [],
    };
    const out = applySafetyDisclaimersToPillarPlan("Physical Activity", plan, profile());
    expect(out.dos[0]?.action).toContain(PHYSICAL_DISCLAIMER_DEFAULT);
  });
});
