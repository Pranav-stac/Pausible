import type { RecommendationType } from "@/lib/recommendations/types";
import type { PersonaKey } from "@/lib/scoring/persona-types";

export type ReadinessSignalType =
  | "consistency"
  | "emotional_comfort"
  | "recovery"
  | "social_embedding"
  | "performance"
  | "engagement";

export type PhaseDefinition = {
  name: string;
  intent: string;
  eligibleTypes: RecommendationType[];
  readinessDescription: string;
  primarySignal: ReadinessSignalType;
  secondarySignal: ReadinessSignalType;
  activationEnergyCap: number;
  durationWeeks: string;
};

export type PersonaPhaseConfig = {
  progressionStyle: string;
  maxPlanDurationWeeks: number;
  dailyItems: { min: number; max: number };
  weeklyItems: { min: number; max: number };
  phases: PhaseDefinition[];
  /** Steady Elephant may add optional Phase 3 when Exploring fit tier applies. */
  optionalThirdPhase?: PhaseDefinition;
};

export const PERSONA_PHASE_CONFIG: Record<PersonaKey, PersonaPhaseConfig> = {
  brittle_avoidant: {
    progressionStyle: "Ultra-gradual",
    maxPlanDurationWeeks: 12,
    dailyItems: { min: 2, max: 2 },
    weeklyItems: { min: 2, max: 2 },
    phases: [
      {
        name: "Create Safety",
        intent:
          "Environment setup only. No exercise, no diet changes. Just make the space feel manageable.",
        eligibleTypes: ["environment_change", "first_action"],
        readinessDescription: "When the environment changes feel normal, not effortful.",
        primarySignal: "emotional_comfort",
        secondarySignal: "consistency",
        activationEnergyCap: 1,
        durationWeeks: "3–4 weeks",
      },
      {
        name: "Try Without Pressure",
        intent: "Micro-movement and one nutrition anchor. No tracking, no targets. Just exposure.",
        eligibleTypes: ["first_action", "do"],
        readinessDescription: "When attempting a small action no longer triggers avoidance.",
        primarySignal: "emotional_comfort",
        secondarySignal: "recovery",
        activationEnergyCap: 2,
        durationWeeks: "3 weeks",
      },
      {
        name: "Build a Rhythm",
        intent: "Establish 2–3 day/week structure. Introduce written cues (not tracking).",
        eligibleTypes: ["do", "dont", "mindset_shift"],
        readinessDescription: "When a missed day triggers a restart, not a shutdown.",
        primarySignal: "emotional_comfort",
        secondarySignal: "recovery",
        activationEnergyCap: 3,
        durationWeeks: "3 weeks",
      },
      {
        name: "Expand at Your Pace",
        intent: "Add supporting recommendations. Introduce gentle self-monitoring.",
        eligibleTypes: ["do", "recovery_rule", "success_condition"],
        readinessDescription: "When adjusting the plan feels possible, not threatening.",
        primarySignal: "emotional_comfort",
        secondarySignal: "recovery",
        activationEnergyCap: 4,
        durationWeeks: "2 weeks",
      },
    ],
  },
  stress_sensitive: {
    progressionStyle: "Steady-cautious",
    maxPlanDurationWeeks: 10,
    dailyItems: { min: 3, max: 3 },
    weeklyItems: { min: 3, max: 3 },
    phases: [
      {
        name: "Build the Floor",
        intent: "Minimum viable routine. Prove consistency is possible. Backup systems for missed days.",
        eligibleTypes: ["first_action", "do", "environment_change"],
        readinessDescription: "When 3 sessions/week feels like a default, not a decision.",
        primarySignal: "consistency",
        secondarySignal: "emotional_comfort",
        activationEnergyCap: 2,
        durationWeeks: "3 weeks",
      },
      {
        name: "Find Your Rhythm",
        intent: "Extend duration, add structure. The nervous system now trusts the routine.",
        eligibleTypes: ["do", "dont", "recovery_rule"],
        readinessDescription: "When a missed session triggers a backup, not a full stop.",
        primarySignal: "recovery",
        secondarySignal: "consistency",
        activationEnergyCap: 3,
        durationWeeks: "5 weeks",
      },
      {
        name: "Expand Your Range",
        intent: "Add personalisation, fine-tuning, and self-monitoring. Foundation is solid.",
        eligibleTypes: ["do", "mindset_shift", "success_condition", "strength_insight"],
        readinessDescription: "When you adjust the plan instead of abandoning it.",
        primarySignal: "recovery",
        secondarySignal: "consistency",
        activationEnergyCap: 4,
        durationWeeks: "2 weeks",
      },
    ],
  },
  curious_explorer: {
    progressionStyle: "Variety-driven",
    maxPlanDurationWeeks: 10,
    dailyItems: { min: 3, max: 4 },
    weeklyItems: { min: 3, max: 4 },
    phases: [
      {
        name: "Explore What Works",
        intent:
          "Frame the entire plan as an exploration. Offer 2–3 options per slot to satisfy novelty needs.",
        eligibleTypes: ["first_action", "do", "environment_change"],
        readinessDescription: "When you have completed at least one full week without switching everything.",
        primarySignal: "engagement",
        secondarySignal: "consistency",
        activationEnergyCap: 3,
        durationWeeks: "2 weeks",
      },
      {
        name: "Find What Sticks",
        intent: "Narrow to what worked in Phase 1. Introduce structure without killing variety.",
        eligibleTypes: ["do", "dont", "mindset_shift"],
        readinessDescription: "When you can name your 3 anchor habits without hesitation.",
        primarySignal: "consistency",
        secondarySignal: "engagement",
        activationEnergyCap: 4,
        durationWeeks: "5 weeks",
      },
      {
        name: "Make It Yours",
        intent: "Lock the core, experiment at the edges. Add progression and optional items for depth.",
        eligibleTypes: ["do", "recovery_rule", "success_condition", "strength_insight"],
        readinessDescription: "When boredom no longer means abandonment.",
        primarySignal: "consistency",
        secondarySignal: "engagement",
        activationEnergyCap: 5,
        durationWeeks: "3 weeks",
      },
    ],
  },
  social_motivator: {
    progressionStyle: "Social-layered",
    maxPlanDurationWeeks: 8,
    dailyItems: { min: 3, max: 4 },
    weeklyItems: { min: 3, max: 4 },
    phases: [
      {
        name: "Find Your Pack",
        intent: "Establish social anchors — workout partners, meal prep groups, accountability buddies.",
        eligibleTypes: ["first_action", "do", "environment_change"],
        readinessDescription: "When at least one social accountability loop is active.",
        primarySignal: "social_embedding",
        secondarySignal: "consistency",
        activationEnergyCap: 3,
        durationWeeks: "2–3 weeks",
      },
      {
        name: "Run Together",
        intent: "Build group rhythm. Structure sessions, shared meals, social check-ins.",
        eligibleTypes: ["do", "dont", "recovery_rule"],
        readinessDescription: "When the social structure sustains without you initiating every time.",
        primarySignal: "social_embedding",
        secondarySignal: "recovery",
        activationEnergyCap: 4,
        durationWeeks: "3 weeks",
      },
      {
        name: "Stand Alone When Needed",
        intent:
          "Build independence within the social frame. Solo backup routines for when the group is unavailable.",
        eligibleTypes: ["do", "mindset_shift", "success_condition", "strength_insight"],
        readinessDescription: "When a solo week doesn't collapse the routine.",
        primarySignal: "social_embedding",
        secondarySignal: "recovery",
        activationEnergyCap: 5,
        durationWeeks: "2 weeks",
      },
    ],
  },
  resilient_performer: {
    progressionStyle: "Intensity-based",
    maxPlanDurationWeeks: 6,
    dailyItems: { min: 4, max: 5 },
    weeklyItems: { min: 4, max: 5 },
    phases: [
      {
        name: "Deploy Your Full Plan",
        intent:
          "Load the complete structured plan upfront: 3–4 day training split, meal structure, sleep protocol.",
        eligibleTypes: ["do", "dont", "environment_change", "first_action", "recovery_rule"],
        readinessDescription: "When all 4 pillars have been followed for 2 consecutive weeks.",
        primarySignal: "consistency",
        secondarySignal: "performance",
        activationEnergyCap: 4,
        durationWeeks: "2–3 weeks",
      },
      {
        name: "Optimize Without Overreaching",
        intent:
          "Add progressive overload, fine-tune nutrition timing, introduce blind spots and pattern predictions.",
        eligibleTypes: ["mindset_shift", "blind_spot", "pattern_prediction", "success_condition", "strength_insight"],
        readinessDescription: "When recovery is treated as part of performance, not a weakness.",
        primarySignal: "performance",
        secondarySignal: "consistency",
        activationEnergyCap: 5,
        durationWeeks: "3 weeks",
      },
    ],
  },
  self_regulated_planner: {
    progressionStyle: "System-completion",
    maxPlanDurationWeeks: 8,
    dailyItems: { min: 4, max: 5 },
    weeklyItems: { min: 4, max: 4 },
    phases: [
      {
        name: "Lay the System",
        intent: "Present the full architecture: all 4 pillars, structured routines, tracking system.",
        eligibleTypes: ["do", "dont", "environment_change", "first_action"],
        readinessDescription: "When all systems are set up and running for 2 weeks.",
        primarySignal: "consistency",
        secondarySignal: "performance",
        activationEnergyCap: 4,
        durationWeeks: "2 weeks",
      },
      {
        name: "Run the System",
        intent: "Maintain, adjust, refine. Add supporting and optional items as enhancements.",
        eligibleTypes: ["do", "recovery_rule", "mindset_shift", "success_condition"],
        readinessDescription: "When adjustments happen proactively, not reactively.",
        primarySignal: "performance",
        secondarySignal: "consistency",
        activationEnergyCap: 5,
        durationWeeks: "4 weeks",
      },
    ],
    optionalThirdPhase: {
      name: "Optimize Your System",
      intent:
        "Fine-tune nutrition timing, progressive overload, advanced recovery when goals need more refinement.",
      eligibleTypes: ["strength_insight", "blind_spot", "pattern_prediction"],
      readinessDescription: "When the system is producing measurable results.",
      primarySignal: "performance",
      secondarySignal: "consistency",
      activationEnergyCap: 5,
      durationWeeks: "2 weeks",
    },
  },
};

/** Goal-based pillar density weighting (percentages). */
export const GOAL_PILLAR_DENSITY: Record<
  string,
  { anchor: string; weights: Record<string, number> }
> = {
  goal_fat_loss: {
    anchor: "Nutrition",
    weights: { Nutrition: 35, "Physical Activity": 30, "Sleep & Recovery": 20, "Mental Wellness": 15 },
  },
  goal_energy: {
    anchor: "Sleep & Recovery",
    weights: { "Sleep & Recovery": 35, Nutrition: 25, "Physical Activity": 25, "Mental Wellness": 15 },
  },
  goal_consistency: {
    anchor: "Mental Wellness",
    weights: { "Mental Wellness": 30, "Physical Activity": 30, Nutrition: 20, "Sleep & Recovery": 20 },
  },
  goal_muscle_gain: {
    anchor: "Physical Activity",
    weights: { "Physical Activity": 35, Nutrition: 30, "Sleep & Recovery": 20, "Mental Wellness": 15 },
  },
  goal_stress_reduction: {
    anchor: "Mental Wellness",
    weights: { "Mental Wellness": 35, "Sleep & Recovery": 25, "Physical Activity": 20, Nutrition: 20 },
  },
  goal_better_recovery: {
    anchor: "Sleep & Recovery",
    weights: { "Sleep & Recovery": 35, "Physical Activity": 25, Nutrition: 20, "Mental Wellness": 20 },
  },
  goal_sustainable_routine: {
    anchor: "Mental Wellness",
    weights: { "Mental Wellness": 30, "Physical Activity": 25, Nutrition: 25, "Sleep & Recovery": 20 },
  },
};

export const PHASE1_DENSITY_OVERRIDE: Record<string, number> = {
  "Mental Wellness": 35,
  "Sleep & Recovery": 25,
  Nutrition: 20,
  "Physical Activity": 20,
};

export function parseDurationWeeks(range: string): number {
  const nums = range.match(/\d+/g)?.map(Number) ?? [2];
  if (nums.length === 1) return nums[0];
  return Math.round((nums[0] + nums[nums.length - 1]) / 2);
}

export function formatTotalDurationWeeks(weeks: number): string {
  return `Approximately ${weeks} weeks`;
}
