import { describe, expect, it } from "vitest";
import { isRecommendationSuppressedForProfile } from "@/lib/recommendations/filter";
import { dedupePlanPhaseItems, runPlanQaChecks } from "@/lib/recommendations/plan/qa-plan-checks";
import { mapQaFailuresToSections } from "@/lib/recommendations/qa-regen";
import { runQaSynthesisChecks } from "@/lib/recommendations/qa-synthesis-checks";
import type {
  PlanOutput,
  RecommendationRow,
  UserProfile,
} from "@/lib/recommendations/types";

function baseProfile(over: Partial<UserProfile> = {}): UserProfile {
  return {
    primaryPersona: "self_regulated_planner",
    secondaryPersona: "curious_explorer",
    primaryPersonaAlias: "steady_elephant",
    secondaryPersonaAlias: "curious_fox",
    fitTier: "classic",
    blendRatio: 1.5,
    blendStrength: "tendencies",
    oceanTags: [],
    goals: ["goal_energy"],
    barriers: [],
    context: ["caffeine_none", "fitness_beginner", "activity_light"],
    exclusions: ["exclude_none"],
    oceanCategoryTags: [],
    goalPreferenceBridge: false,
    computedAgeYears: 30,
    isMinor: false,
    isElderly65: false,
    secondaryBlendPct: null,
    ...over,
  };
}

function stubRow(partial: Partial<RecommendationRow> & { id: string }): RecommendationRow {
  return {
    id: partial.id,
    pillar: partial.pillar ?? "Nutrition",
    type: partial.type ?? "do",
    text: partial.text ?? "Sample recommendation text for testing.",
    category: partial.category ?? "general",
    strength: partial.strength ?? "supporting",
    personaFit: partial.personaFit ?? ["all_personas"],
    barrierFit: partial.barrierFit ?? [],
    goalFit: partial.goalFit ?? [],
    contextFit: partial.contextFit ?? [],
    oceanFit: partial.oceanFit ?? [],
    oceanTraitTags: partial.oceanTraitTags ?? [],
    oceanCategoryTags: partial.oceanCategoryTags ?? [],
    excludeIf: partial.excludeIf ?? ["exclude_none"],
    effortLevel: partial.effortLevel ?? 2,
    recommendationRole: partial.recommendationRole ?? "standard",
    scopeClassification: partial.scopeClassification ?? "behavior",
    userFacingBoundary: partial.userFacingBoundary ?? "",
    notes: partial.notes ?? "",
    personaContext: partial.personaContext ?? {},
    ...partial,
  };
}

describe("§39 EXCLUSION QA", () => {
  it("fails when a caffeine-suppressed rec is still sourced", () => {
    const profile = baseProfile();
    const caffeine = stubRow({
      id: "SLP999",
      pillar: "Sleep & Recovery",
      category: "caffeine_stimulants_sleep",
      text: "Cut afternoon caffeine to protect sleep.",
    });
    expect(isRecommendationSuppressedForProfile(caffeine, profile)).toBe(true);

    const qa = runQaSynthesisChecks(
      profile,
      {
        pillarPlans: {
          Nutrition: {
            pillar: "Nutrition",
            focusArea: "Steady meals",
            focusReason: "Keep energy even.",
            focusId: null,
            dos: [],
            donts: [],
            sourceIds: [],
          },
          "Physical Activity": {
            pillar: "Physical Activity",
            focusArea: "Move gently",
            focusReason: "Build a floor.",
            focusId: null,
            dos: [{ action: "Walk after lunch", why: "Easy start" }],
            donts: [],
            sourceIds: [],
          },
          "Sleep & Recovery": {
            pillar: "Sleep & Recovery",
            focusArea: "Protect sleep",
            focusReason: "Rest matters.",
            focusId: null,
            dos: [{ action: "Cut afternoon caffeine to protect sleep.", why: "Stimulants linger" }],
            donts: [],
            sourceIds: ["SLP999"],
          },
          "Mental Wellness": {
            pillar: "Mental Wellness",
            focusArea: "Calm",
            focusReason: "Notice stress early.",
            focusId: null,
            dos: [],
            donts: [],
            sourceIds: [],
          },
        },
        primaryPattern: {
          personaNarrative: "You build systems that hold when life gets busy. ".repeat(8),
          behaviouralBoxes: [],
          traitDeviations: [],
        },
        opportunityCards: [],
      },
      [caffeine],
    );

    expect(qa.failures.some((f) => f.startsWith("qa_exclusion:"))).toBe(true);
  });

  it("maps exclusion failures to pillars + priorities", () => {
    const sections = mapQaFailuresToSections(["qa_exclusion: suppressed rec SLP999 appears"]);
    expect(sections).toContain("Physical Activity");
    expect(sections).toContain("priorities");
  });
});

describe("§39 PHASES QA", () => {
  const emptyItem = { id: "X", text: "Unique action A", pillar: "Nutrition" as const };

  function miniPlan(over: Partial<PlanOutput> = {}): PlanOutput {
    return {
      plan_id: "test",
      persona: "self_regulated_planner",
      fit_tier: "classic",
      secondary_persona: null,
      total_phases: 2,
      total_duration_weeks: 5,
      total_duration_label: "Approximately 5 weeks",
      progression_style: "System-completion",
      generation_notes: "",
      show_all_phases: true,
      phases: [
        {
          phase_number: 1,
          name: "Lay the System",
          intent: "Present the full architecture with 2 anchors.",
          approx_duration_weeks: "2 weeks",
          anchor_habit: { id: "A1", text: "Set up meal timing tonight", pillar: "Nutrition" },
          daily_rhythm: [
            { id: "D1", text: "Prep tomorrow breakfast", pillar: "Nutrition" },
            { id: "D2", text: "10 minute evening stretch", pillar: "Physical Activity" },
            { id: "D3", text: "Lights down by 10pm", pillar: "Sleep & Recovery" },
            { id: "D4", text: "Two minute breathing reset", pillar: "Mental Wellness" },
          ],
          weekly_rhythm: [
            { id: "W1", text: "Review the week on Sunday", pillar: "Mental Wellness" },
            { id: "W2", text: "Longer walk on Saturday", pillar: "Physical Activity" },
            { id: "W3", text: "Batch-plan three lunches", pillar: "Nutrition" },
            { id: "W4", text: "Early bedtime twice", pillar: "Sleep & Recovery" },
          ],
          readiness_signal: {
            primary_type: "consistency",
            description: "When all systems are set up and running for 2 weeks.",
            secondary_type: "performance",
          },
          activation_energy_cap: 4,
          pillar_distribution: {
            Nutrition: 1,
            "Physical Activity": 1,
            "Sleep & Recovery": 1,
            "Mental Wellness": 1,
          },
        },
        {
          phase_number: 2,
          name: "Run the System",
          intent: "Maintain and refine with measured load.",
          approx_duration_weeks: "3 weeks",
          anchor_habit: { id: "A2", text: "Keep the same wake time", pillar: "Sleep & Recovery" },
          daily_rhythm: [
            { id: "D5", text: "Strength session alternate days", pillar: "Physical Activity" },
            { id: "D6", text: "Protein at lunch", pillar: "Nutrition" },
            { id: "D7", text: "Wind-down without screens", pillar: "Sleep & Recovery" },
            { id: "D8", text: "Note one win each night", pillar: "Mental Wellness" },
          ],
          weekly_rhythm: [
            { id: "W5", text: "Progressive overload check", pillar: "Physical Activity" },
            { id: "W6", text: "Grocery list for the week", pillar: "Nutrition" },
            { id: "W7", text: "Social recovery meal", pillar: "Mental Wellness" },
            { id: "W8", text: "Sleep duration review", pillar: "Sleep & Recovery" },
          ],
          readiness_signal: {
            primary_type: "performance",
            description: "When adjustments happen proactively, not reactively.",
            secondary_type: "consistency",
          },
          activation_energy_cap: 5,
          pillar_distribution: {
            Nutrition: 1,
            "Physical Activity": 1,
            "Sleep & Recovery": 1,
            "Mental Wellness": 1,
          },
        },
      ],
      ...over,
    };
  }

  it("flags verbatim repeats across phases", () => {
    const plan = miniPlan();
    plan.phases[1]!.daily_rhythm[0] = { ...emptyItem, text: "Prep tomorrow breakfast" };
    const qa = runPlanQaChecks(plan, baseProfile());
    expect(qa.failures.some((f) => /repeats verbatim/i.test(f))).toBe(true);
  });

  it("flags vague progression without a number", () => {
    const plan = miniPlan();
    plan.phases[1]!.intent = "Now add more and increase gradually until it sticks.";
    const qa = runPlanQaChecks(plan, baseProfile(), {
      plan_subtitle: "A measured system.",
      goal_framing: "",
      phases: plan.phases.map((p) => ({
        phase_number: p.phase_number,
        phase_intent_user: p.intent,
        readiness_signal_user: p.readiness_signal.description,
        anchor_habit_user: p.anchor_habit.text,
        daily_rhythm_user: p.daily_rhythm.map((r) => r.text),
        weekly_rhythm_user: p.weekly_rhythm.map((r) => r.text),
      })),
      plan_built_narrative: "",
      plan_notes: [],
      synthesized: true,
    });
    expect(qa.failures.some((f) => /vague progression/i.test(f))).toBe(true);
  });

  it("dedupes verbatim items across phases", () => {
    const plan = miniPlan();
    plan.phases[1]!.daily_rhythm[0] = {
      id: "DUP",
      text: "Prep tomorrow breakfast",
      pillar: "Nutrition",
    };
    const cleaned = dedupePlanPhaseItems(plan);
    expect(cleaned.phases[1]!.daily_rhythm.some((r) => r.text === "Prep tomorrow breakfast")).toBe(
      false,
    );
  });

  it("maps phases failures to plan_page", () => {
    expect(mapQaFailuresToSections(["qa_phases: vague progression"])).toContain("plan_page");
  });
});
