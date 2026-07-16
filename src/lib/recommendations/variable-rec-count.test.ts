import { describe, expect, it } from "vitest";
import {
  computeVariableRecCount,
  REC_COUNT_BASE,
  REC_COUNT_CAP,
} from "@/lib/recommendations/variable-rec-count";
import type { UserProfile } from "@/lib/recommendations/types";

function profile(partial: Partial<UserProfile> = {}): UserProfile {
  return {
    primaryPersona: "self_regulated_planner",
    secondaryPersona: "curious_explorer",
    primaryPersonaAlias: "steady_elephant",
    secondaryPersonaAlias: "curious_fox",
    fitTier: "classic",
    blendRatio: 2.5,
    blendStrength: "pure",
    oceanTags: [],
    goals: ["goal_energy"],
    barriers: [],
    context: [],
    exclusions: ["exclude_none"],
    oceanCategoryTags: [],
    goalPreferenceBridge: false,
    computedAgeYears: 30,
    isMinor: false,
    isElderly65: false,
    ...partial,
  };
}

describe("variable-rec-count §13", () => {
  it("starts at base 20", () => {
    expect(computeVariableRecCount(profile()).target).toBe(REC_COUNT_BASE);
  });

  it("adds barrier, blend, context, and safety bonuses up to cap 35", () => {
    const result = computeVariableRecCount(
      profile({
        barriers: ["barrier_lack_of_time", "barrier_poor_sleep", "barrier_work_stress"],
        blendStrength: "strong_influence",
      }),
      { secondaryBlendPct: 30, matchedContextTagCount: 5, safetyTriggered: true },
    );
    // 20 + 3 + 2 + 2 + 5 = 32
    expect(result.target).toBe(32);
    expect(result.target).toBeLessThanOrEqual(REC_COUNT_CAP);
  });

  it("caps at 35", () => {
    const result = computeVariableRecCount(
      profile({
        barriers: ["a", "b", "c"],
        blendStrength: "strong_influence",
      }),
      { secondaryBlendPct: 40, matchedContextTagCount: 10, safetyTriggered: true },
    );
    expect(result.target).toBe(Math.min(35, 20 + 3 + 2 + 2 + 5));
  });
});
