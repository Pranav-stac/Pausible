import { describe, expect, it } from "vitest";
import { applyLifestyleFraming } from "@/lib/recommendations/lifestyle-framing";
import type { UserProfile } from "@/lib/recommendations/types";

function nonWorkerProfile(): UserProfile {
  return {
    primaryPersona: "shielded_turtle",
    secondaryPersona: "watchful_deer",
    primaryPersonaAlias: "shielded_turtle",
    secondaryPersonaAlias: "watchful_deer",
    fitTier: "leaning",
    blendRatio: 2,
    blendStrength: "pure",
    oceanTags: [],
    goals: [],
    barriers: [],
    context: ["lifestyle_student"],
    exclusions: ["exclude_none"],
    oceanCategoryTags: [],
    goalPreferenceBridge: false,
    computedAgeYears: null,
    isMinor: false,
    isElderly65: false,
  };
}

describe("applyLifestyleFraming", () => {
  it("DR23 swaps work language for students", () => {
    const raw = "After your last work task, take a short walk.";
    const out = applyLifestyleFraming(raw, nonWorkerProfile());
    expect(out.toLowerCase()).not.toContain("work task");
    expect(out.toLowerCase()).toContain("main activities");
  });
});
