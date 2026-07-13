import { describe, expect, it } from "vitest";
import { buildWellnessFieldsFromTagMapping } from "@/lib/recommendations/build-wellness-fields";

describe("buildWellnessFieldsFromTagMapping", () => {
  it("maps CQ v1.5 stress high to stress_high tag", () => {
    const fields = buildWellnessFieldsFromTagMapping();
    const stress = fields.find((f) => f.answerKey === "wc_stress_level");
    expect(stress?.optionTags?.["high - often stressed"]).toBe("stress_high");
    expect(stress?.inferBarrierTags).toContain("barrier_work_stress");
  });

  it("maps v1.5 single-select strength goal", () => {
    const fields = buildWellnessFieldsFromTagMapping();
    const goals = fields.find((f) => f.answerKey === "wc_wellness_goals");
    expect(goals?.kind).toBe("single");
    expect(goals?.optionTags?.["build strength or muscle"]).toBe("goal_strength");
  });

  it("maps CQ08a activity detail tags", () => {
    const fields = buildWellnessFieldsFromTagMapping();
    const details = fields.find((f) => f.answerKey === "wc_preferred_activity_details");
    expect(details?.optionTags?.["running/jogging"]).toBe("activity_pref_running");
  });
});
