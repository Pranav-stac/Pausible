import { describe, expect, it } from "vitest";
import { migrateProfileTags } from "@/lib/recommendations/tag-drift-migration";

describe("tag-drift-migration", () => {
  it("migrates deprecated tags to canonical vocabulary", () => {
    const profile = {
      context: ["location_home", "work_homemaker"],
      goals: ["goal_energy_vitality"],
      barriers: ["barrier_emotional_eating"],
      exclusions: ["restriction_injury"],
    };
    migrateProfileTags(profile);
    expect(profile.context).toContain("environment_home");
    expect(profile.context).toContain("lifestyle_caregiving");
    expect(profile.goals).toContain("goal_energy");
    expect(profile.barriers).toContain("barrier_emotional_eating_cravings");
    expect(profile.exclusions).toContain("exclude_injury");
    expect(profile.context).not.toContain("location_home");
  });
});
