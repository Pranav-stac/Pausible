import { describe, expect, it } from "vitest";
import { buildWellnessFieldsFromTagMapping } from "@/lib/recommendations/build-wellness-fields";

describe("buildWellnessFieldsFromTagMapping", () => {
  it("maps CQ v1.4 stress high to stress_high tag", () => {
    const fields = buildWellnessFieldsFromTagMapping();
    const stress = fields.find((f) => f.answerKey === "wc_stress_level");
    expect(stress?.optionTags?.["high - often stressed"]).toBe("stress_high");
    expect(stress?.inferBarrierTags).toContain("barrier_work_stress");
  });

  it("maps multi-tag muscle goal", () => {
    const fields = buildWellnessFieldsFromTagMapping();
    const goals = fields.find((f) => f.answerKey === "wc_wellness_goals");
    expect(goals?.optionTags?.["build muscle / get stronger"]).toEqual([
      "goal_muscle_gain",
      "goal_strength",
    ]);
  });
});
