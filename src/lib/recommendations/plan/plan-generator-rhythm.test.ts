import { describe, expect, it } from "vitest";
import { generatePlanOutput } from "@/lib/recommendations/plan/plan-generator";
import type { RecommendationRow, ScoredRecommendation, UserProfile } from "@/lib/recommendations/types";
import type { ScoreBreakdown } from "@/lib/recommendations/types";

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    primaryPersona: "stress_sensitive",
    secondaryPersona: "curious_explorer",
    primaryPersonaAlias: "watchful_deer",
    secondaryPersonaAlias: "curious_fox",
    fitTier: "classic",
    blendRatio: 2.2,
    blendStrength: "pure",
    oceanTags: [],
    goals: ["goal_energy"],
    barriers: ["barrier_poor_sleep"],
    context: [],
    exclusions: ["exclude_none"],
    oceanCategoryTags: [],
    goalPreferenceBridge: false,
    ...overrides,
  };
}

function scoreStub(overrides: Partial<ScoreBreakdown> = {}): ScoreBreakdown {
  return {
    persona: 10,
    barriers: 5,
    goals: 5,
    context: 0,
    ocean: 0,
    effort: 0,
    strength: 0,
    total: 50,
    primaryPersonaMatch: true,
    secondaryPersonaMatch: false,
    allPersonasMatch: false,
    matchedBarriers: [],
    matchedGoals: [],
    matchedContext: [],
    matchedOcean: [],
    ...overrides,
  };
}

function mockRow(partial: Partial<RecommendationRow> & Pick<RecommendationRow, "id" | "text">): ScoredRecommendation {
  const row: RecommendationRow = {
    pillar: "Sleep & Recovery",
    category: "sleep_hygiene",
    type: "do",
    personaFit: ["watchful_deer"],
    contextFit: [],
    goalFit: ["goal_energy"],
    barrierFit: [],
    excludeIf: ["exclude_none"],
    strength: "core",
    oceanCategoryTags: [],
    oceanTraitTags: [],
    oceanFit: [],
    effortLevel: "medium",
    personaContext: {},
    notes: "",
    ...partial,
  };
  return { ...row, score: scoreStub(), excluded: false };
}

describe("plan generator rhythm buckets", () => {
  it("fills Phase 1 daily and weekly when recommendations are sleep-heavy (daily cadence)", () => {
    const pool: ScoredRecommendation[] = [
      mockRow({
        id: "SLP-A",
        text: "Move your bedtime 15-30 minutes earlier for one week and notice how you feel.",
        type: "first_action",
        effortLevel: "low",
      }),
      mockRow({
        id: "SLP-B",
        text: "Tonight, pick one calming activity (reading, stretching, quiet music) and do it before bed for 7 nights in a row.",
        type: "first_action",
      }),
      mockRow({
        id: "SLP-C",
        text: "Charge your phone outside the bedroom so you are not tempted to scroll at night.",
        type: "environment_change",
        effortLevel: "low",
      }),
      mockRow({
        id: "SLP-D",
        text: "Dim the lights in your home 30-60 minutes before your target bedtime.",
        type: "environment_change",
        effortLevel: "low",
      }),
      mockRow({
        id: "SLP-E",
        text: "Use the same 20-30 minute wind-down sequence every night: dim lights, no screens, one calming activity.",
      }),
      mockRow({
        id: "FIT-W",
        pillar: "Physical Activity",
        category: "cardio",
        text: "Take a 10-20 minute brisk walk 3 times this week after a meal.",
        type: "do",
        personaFit: ["watchful_deer"],
        effortLevel: "low",
      }),
      mockRow({
        id: "SLP-F",
        text: "Stop caffeine at least 6-8 hours before your target bedtime.",
        type: "dont",
        effortLevel: "low",
      }),
      mockRow({
        id: "SLP-G",
        text: "Keep your bedroom cool, dark, and quiet every night this week.",
        type: "environment_change",
        effortLevel: "low",
      }),
      mockRow({
        id: "SLP-H",
        type: "first_action",
        effortLevel: "low",
        text: "Pick one night this week to try going to bed 20 minutes earlier than usual.",
      }),
      mockRow({
        id: "SLP-I",
        type: "environment_change",
        effortLevel: "low",
        text: "Lay out comfortable sleep clothes before you start your wind-down each night.",
      }),
    ];

    const plan = generatePlanOutput({ ranked: pool, profile: profile() });
    expect(plan).not.toBeNull();
    const phase1 = plan!.phases[0]!;
    expect(phase1.daily_rhythm.length).toBeGreaterThanOrEqual(3);
    expect(phase1.weekly_rhythm.length).toBeGreaterThanOrEqual(3);
  });

  it("fills Phase 1 daily and weekly for nutrition-anchored Bear plans", () => {
    const pool: ScoredRecommendation[] = [
      mockRow({
        id: "NUT002",
        pillar: "Nutrition",
        category: "nutrition_foundations",
        text: "Build each meal by putting protein on the plate first, then adding vegetables, then whatever carb or fat source is available.",
        type: "do",
        personaFit: ["steadfast_bear"],
        effortLevel: "medium",
      }),
      mockRow({
        id: "NUT001",
        pillar: "Nutrition",
        category: "nutrition_foundations",
        text: "Add one palm-sized portion of protein to one meal per day for the next 7 days.",
        type: "do",
        personaFit: ["steadfast_bear"],
        effortLevel: "low",
      }),
      mockRow({
        id: "NUT-ENV",
        pillar: "Nutrition",
        category: "nutrition_environment",
        text: "Keep washed fruit or cut vegetables visible on the counter for easy snacking each day.",
        type: "environment_change",
        effortLevel: "low",
        personaFit: ["steadfast_bear"],
      }),
      mockRow({
        id: "FIT001",
        pillar: "Physical Activity",
        category: "strength",
        text: "Train the same 3 exercises twice per week for the next 2 weeks.",
        type: "do",
        personaFit: ["steadfast_bear"],
        effortLevel: "medium",
      }),
      mockRow({
        id: "SLP001",
        text: "Pick a fixed wake-up time and stick to it 5 days this week.",
        type: "first_action",
        effortLevel: "low",
      }),
      mockRow({
        id: "MW001",
        pillar: "Mental Wellness",
        category: "stress",
        text: "Take 5 minutes each morning to write down one priority for the day.",
        type: "first_action",
        effortLevel: "low",
        personaFit: ["steadfast_bear"],
      }),
      mockRow({
        id: "NUT-W",
        pillar: "Nutrition",
        category: "nutrition_foundations",
        text: "Prep one batch of protein on Sunday to use in meals throughout the week.",
        type: "do",
        personaFit: ["steadfast_bear"],
        effortLevel: "low",
        strength: "supporting",
      }),
      mockRow({
        id: "NUT-C",
        pillar: "Nutrition",
        category: "nutrition_foundations",
        text: "Eat a serving of vegetables with lunch each day this week.",
        type: "do",
        personaFit: ["steadfast_bear"],
        effortLevel: "low",
      }),
      mockRow({
        id: "NUT-D",
        pillar: "Nutrition",
        category: "nutrition_environment",
        text: "Stock your pantry with one protein option you can prepare in under 10 minutes.",
        type: "environment_change",
        personaFit: ["steadfast_bear"],
        effortLevel: "low",
      }),
      mockRow({
        id: "FIT002",
        pillar: "Physical Activity",
        category: "cardio",
        text: "Walk for 15 minutes after dinner on 3 evenings this week.",
        type: "do",
        personaFit: ["steadfast_bear"],
        effortLevel: "low",
      }),
      mockRow({
        id: "SLP002",
        text: "Use the same wake-up time on weekdays this week.",
        type: "first_action",
        effortLevel: "low",
        personaFit: ["steadfast_bear"],
      }),
    ];

    const plan = generatePlanOutput({
      ranked: pool,
      profile: profile({
        primaryPersona: "resilient_performer",
        primaryPersonaAlias: "steadfast_bear",
        goals: ["goal_fat_loss"],
        barriers: [],
      }),
    });

    expect(plan).not.toBeNull();
    const phase1 = plan!.phases[0]!;
    expect(phase1.anchor_habit.text.length).toBeGreaterThan(0);
    expect(phase1.daily_rhythm.length).toBeGreaterThanOrEqual(4);
    expect(phase1.weekly_rhythm.length).toBeGreaterThanOrEqual(4);
  });

  it("fills daily and weekly when anchor is protein plate rule (NUT002 regression)", () => {
    const pool: ScoredRecommendation[] = [
      mockRow({
        id: "NUT002",
        pillar: "Nutrition",
        category: "nutrition_foundations",
        text: "Build each meal by putting protein on the plate first, then adding vegetables, then whatever carb or fat source is available.",
        type: "do",
        personaFit: ["steadfast_bear"],
        effortLevel: "medium",
      }),
      mockRow({
        id: "NUT001",
        pillar: "Nutrition",
        category: "nutrition_foundations",
        text: "Add one palm-sized portion of protein to one meal per day for the next 7 days.",
        type: "do",
        personaFit: ["steadfast_bear"],
        effortLevel: "low",
      }),
      mockRow({
        id: "NUT-ENV",
        pillar: "Nutrition",
        category: "nutrition_environment",
        text: "Keep washed fruit or cut vegetables visible on the counter for easy snacking each day.",
        type: "environment_change",
        effortLevel: "low",
        personaFit: ["steadfast_bear"],
      }),
      mockRow({
        id: "FIT001",
        pillar: "Physical Activity",
        category: "cardio",
        text: "Walk for 10 minutes on 3 days this week.",
        type: "do",
        personaFit: ["steadfast_bear"],
        effortLevel: "low",
      }),
      mockRow({
        id: "SLP001",
        text: "Use the same wake-up time on weekdays this week.",
        type: "first_action",
        effortLevel: "low",
        personaFit: ["steadfast_bear"],
      }),
      mockRow({
        id: "MW001",
        pillar: "Mental Wellness",
        category: "stress",
        text: "Take 5 minutes each morning to write down one priority for the day.",
        type: "first_action",
        effortLevel: "low",
        personaFit: ["steadfast_bear"],
      }),
      mockRow({
        id: "NUT003",
        pillar: "Nutrition",
        category: "nutrition_foundations",
        text: "Do not try to fix breakfast, lunch, dinner, and snacks all at once. Change one meal at a time.",
        type: "dont",
        personaFit: ["watchful_deer"],
        effortLevel: "low",
      }),
      mockRow({
        id: "NUT004",
        pillar: "Nutrition",
        category: "nutrition_foundations",
        text: "Keep one backup meal ready in the fridge for busy nights this week.",
        type: "do",
        personaFit: ["steadfast_bear"],
        effortLevel: "low",
        strength: "supporting",
      }),
      mockRow({
        id: "FIT002",
        pillar: "Physical Activity",
        category: "cardio",
        text: "Stretch for 5 minutes after waking on 4 mornings this week.",
        type: "first_action",
        personaFit: ["steadfast_bear"],
        effortLevel: "low",
      }),
    ];

    const plan = generatePlanOutput({
      ranked: pool,
      profile: profile({
        primaryPersona: "resilient_performer",
        primaryPersonaAlias: "steadfast_bear",
        goals: ["goal_fat_loss"],
        barriers: [],
      }),
    });

    const phase1 = plan!.phases[0]!;
    expect(phase1.anchor_habit.text).toContain("protein");
    expect(phase1.daily_rhythm.length).toBeGreaterThan(0);
    expect(phase1.weekly_rhythm.length).toBeGreaterThan(0);
  });
});
