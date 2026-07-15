import { describe, expect, it } from "vitest";
import {
  isIntactPlanFragment,
  truncatePlanLine,
} from "@/lib/recommendations/plan/plan-text-limits";

describe("truncatePlanLine", () => {
  it("does not cut mid-parenthetical when a soft overflow keeps the line intact", () => {
    const text =
      "Tonight, pick one calming activity (reading, stretching, or a short breath sequence) and repeat it.";
    const out = truncatePlanLine(text, 90);
    expect(out.includes("(") ? out.includes(")") : true).toBe(true);
    expect(isIntactPlanFragment(out)).toBe(true);
    expect(out.endsWith("stretching")).toBe(false);
  });

  it("prefers a clause break over a dangling connector", () => {
    const text =
      "When stress spikes, try one of these: 5 slow breaths (in for 4, out for 6) or a short walk.";
    const out = truncatePlanLine(text, 70);
    expect(isIntactPlanFragment(out)).toBe(true);
    expect(/\b(with|and|or|the|a)\s*$/i.test(out)).toBe(false);
  });
});
