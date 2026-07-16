import { describe, expect, it } from "vitest";
import {
  normalizeCqTagToShortForm,
  resolveRuntimeShortForms,
} from "@/lib/recommendations/tag-normalization";

describe("tag-normalization §10.2", () => {
  it("maps CQ meal/caffeine/fitness/activity tags to short forms", () => {
    expect(normalizeCqTagToShortForm("meal_control_prepared_by_others")).toBe("others_prepare");
    expect(normalizeCqTagToShortForm("fitness_consistent")).toBe("consistent");
    expect(normalizeCqTagToShortForm("fitness_advanced")).toBe("consistent");
    expect(normalizeCqTagToShortForm("goal_fat_loss")).toBe("goal_fat_loss");
  });

  it("resolves runtime short forms from context tags", () => {
    const forms = resolveRuntimeShortForms([
      "meal_control_prepared_by_others",
      "caffeine_none",
      "fitness_consistent",
      "activity_moderate",
    ]);
    expect(forms).toEqual({
      meal_control: "others_prepare",
      caffeine: "none",
      fitness_level: "consistent",
      activity_level: "moderate",
    });
  });
});
