import { describe, expect, it } from "vitest";
import {
  failedRulesForSection,
  mapQaFailuresToSections,
  prependQaFailedRules,
} from "@/lib/recommendations/qa-regen";

describe("qa-regen §39", () => {
  it("maps failure strings to sections", () => {
    const sections = mapQaFailuresToSections([
      "qa_meals_by_others: cooking for meals-by-others",
      "qa_first_step: priority 1 too vague",
      "qa_persona_barrier: strength claim",
    ]);
    expect(sections).toContain("Nutrition");
    expect(sections).toContain("priorities");
    expect(sections).toContain("primary_pattern");
  });

  it("prepends failed rules to the user prompt", () => {
    const out = prependQaFailedRules("Compose the Key Actions.", [
      "qa_caffeine: caffeine mention for caffeine_none user",
    ]);
    expect(out).toMatch(/^QA REGENERATION/);
    expect(out).toContain("qa_caffeine");
    expect(out).toContain("Compose the Key Actions.");
  });

  it("filters rules for a section", () => {
    const rules = failedRulesForSection("Physical Activity", [
      "qa_disclaimer: missing",
      "qa_meals_by_others: cooking",
    ]);
    expect(rules).toEqual(["qa_disclaimer: missing"]);
  });
});
