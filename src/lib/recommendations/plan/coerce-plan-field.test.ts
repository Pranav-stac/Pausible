import { describe, expect, it } from "vitest";
import { coerceOptionalPlanText, coercePlanText } from "@/lib/recommendations/plan/coerce-plan-field";

describe("coercePlanText", () => {
  it("returns strings unchanged (trimmed)", () => {
    expect(coercePlanText("  hello  ", "fallback")).toBe("hello");
  });

  it("joins string arrays from malformed LLM JSON", () => {
    expect(coercePlanText(["Build safety.", "Try small steps."], "fallback")).toBe(
      "Build safety. Try small steps.",
    );
  });

  it("reads nested text objects", () => {
    expect(coercePlanText({ text: "Establish your floor." }, "fallback")).toBe(
      "Establish your floor.",
    );
  });

  it("uses fallback for empty or invalid values", () => {
    expect(coercePlanText(null, "fallback")).toBe("fallback");
    expect(coercePlanText({}, "fallback")).toBe("fallback");
  });

  it("coerces optional text", () => {
    expect(coerceOptionalPlanText(["A phased plan."])).toBe("A phased plan.");
    expect(coerceOptionalPlanText("   ")).toBeUndefined();
  });
});
