import { describe, expect, it } from "vitest";
import { computeGoalPreferenceBridge } from "@/lib/recommendations/build-user-profile";

describe("PDA §21.14 DR11 goal-preference bridge", () => {
  it("surfaces bridge when strength goal lacks resistance preference", () => {
    expect(
      computeGoalPreferenceBridge(["goal_muscle_gain"], ["activity_pref_yoga"]),
    ).toBe(true);
  });

  it("does not bridge when resistance preference is present", () => {
    expect(
      computeGoalPreferenceBridge(["goal_muscle_gain"], ["activity_pref_strength"]),
    ).toBe(false);
  });

  it("does not bridge for non-strength goals", () => {
    expect(
      computeGoalPreferenceBridge(["goal_energy"], ["activity_pref_yoga"]),
    ).toBe(false);
  });
});
