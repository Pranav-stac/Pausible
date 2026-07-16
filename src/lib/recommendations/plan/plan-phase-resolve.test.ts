import { describe, expect, it } from "vitest";
import {
  adjustPhase1DurationWeeks,
  resolvePhases,
  steadyElephantGoalsNeedPhase3,
} from "@/lib/recommendations/plan/plan-phase-resolve";
import { PERSONA_PHASE_CONFIG } from "@/lib/recommendations/plan/phase-config";
import type { UserProfile } from "@/lib/recommendations/types";

function profile(
  primaryPersona: UserProfile["primaryPersona"],
  overrides: Partial<UserProfile> = {},
): UserProfile {
  return {
    primaryPersona,
    secondaryPersona: "curious_explorer",
    primaryPersonaAlias: "steady_elephant",
    secondaryPersonaAlias: "curious_fox",
    fitTier: "classic",
    blendRatio: 2.2,
    blendStrength: "pure",
    oceanTags: [],
    goals: [],
    barriers: [],
    context: [],
    exclusions: ["exclude_none"],
    oceanCategoryTags: [],
    goalPreferenceBridge: false,
    computedAgeYears: null,
    isMinor: false,
    isElderly65: false,
    secondaryBlendPct: null,
    ...overrides,
  };
}

describe("PDA §21.1 phase counts", () => {
  it("matches persona matrix phase counts at base tier", () => {
    expect(PERSONA_PHASE_CONFIG.brittle_avoidant.phases).toHaveLength(4);
    expect(PERSONA_PHASE_CONFIG.stress_sensitive.phases).toHaveLength(3);
    expect(PERSONA_PHASE_CONFIG.curious_explorer.phases).toHaveLength(3);
    expect(PERSONA_PHASE_CONFIG.social_motivator.phases).toHaveLength(3);
    expect(PERSONA_PHASE_CONFIG.resilient_performer.phases).toHaveLength(2);
    expect(PERSONA_PHASE_CONFIG.self_regulated_planner.phases).toHaveLength(2);
  });

  it("uses canonical Watchful Deer Phase 1 name", () => {
    expect(PERSONA_PHASE_CONFIG.stress_sensitive.phases[0]?.name).toBe("Build the Floor");
  });
});

describe("PDA §21.2.6 Steady Elephant optional Phase 3", () => {
  it("includes optimization phase for muscle-gain goals", () => {
    const p = profile("self_regulated_planner", {
      primaryPersonaAlias: "steady_elephant",
      goals: ["goal_strength"],
    });
    expect(steadyElephantGoalsNeedPhase3(p)).toBe(true);
    const phases = resolvePhases(p, "classic");
    expect(phases).toHaveLength(3);
    expect(phases[2]?.name).toBe("Optimize Your System");
  });

  it("omits optimization phase for routine-only goals", () => {
    const p = profile("self_regulated_planner", {
      primaryPersonaAlias: "steady_elephant",
      goals: ["goal_consistency", "goal_stress_reduction"],
    });
    expect(steadyElephantGoalsNeedPhase3(p)).toBe(false);
    expect(resolvePhases(p, "classic")).toHaveLength(2);
  });
});

describe("PDA §21.8 fit-tier phase adjustments", () => {
  it("adds 1 week to Phase 1 for Core tier", () => {
    expect(adjustPhase1DurationWeeks("2 weeks", "core")).toBe("Approximately 3 weeks");
  });

  it("adds 2 weeks to Phase 1 for Exploring tier", () => {
    expect(adjustPhase1DurationWeeks("2 weeks", "exploring")).toBe("Approximately 4 weeks");
  });

  it("adds stabilisation phase for Exploring Bear (max 4)", () => {
    const p = profile("resilient_performer", {
      primaryPersonaAlias: "steadfast_bear",
      fitTier: "exploring",
    });
    const phases = resolvePhases(p, "exploring");
    expect(phases).toHaveLength(3);
    expect(phases[2]?.name).toBe("Settle In");
  });

  it("does not exceed 4 phases for Shielded Turtle when Exploring", () => {
    const p = profile("brittle_avoidant", {
      primaryPersonaAlias: "shielded_turtle",
      fitTier: "exploring",
    });
    expect(resolvePhases(p, "exploring")).toHaveLength(4);
  });
});
