import { describe, expect, it } from "vitest";
import { buildUserProfile, computeGoalPreferenceBridge, type BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import { buildRecommendationSeedPayload } from "@/lib/recommendations/build-seed-payload";

describe("wellness legacy option aliases", () => {
  it("maps v1.3 fitness labels to canonical tags", () => {
    const config = buildRecommendationSeedPayload();
    const profile = buildUserProfile(
      {
        answers: {
          wc_fitness_level: "Beginner — I rarely exercise",
          wc_stress_level: "High",
        },
        scores: null,
      },
      config,
    );
    expect(profile.context).toContain("fitness_beginner");
    expect(profile.context).toContain("stress_high");
    expect(profile.barriers).toContain("barrier_work_stress");
  });
});

describe("PDA §21.14 DR13 goal-preference bridge", () => {
  it("surfaces bridge when strength goal lacks resistance preference", () => {
    expect(
      computeGoalPreferenceBridge(["goal_strength"], ["activity_pref_yoga"]),
    ).toBe(true);
  });

  it("does not bridge when resistance preference is present", () => {
    expect(
      computeGoalPreferenceBridge(["goal_strength"], ["activity_pref_strength"]),
    ).toBe(false);
  });

  it("does not bridge for non-strength goals", () => {
    expect(
      computeGoalPreferenceBridge(["goal_energy"], ["activity_pref_yoga"]),
    ).toBe(false);
  });
});
