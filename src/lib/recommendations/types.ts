import type { PersonaKey } from "@/lib/scoring/persona-types";

export type RecommendationStrength = "core" | "supporting" | "optional" | "conditional";

export type RecommendationType =
  | "do"
  | "dont"
  | "first_action"
  | "mindset_shift"
  | "environment_change"
  | "recovery_rule"
  | "coach_note"
  | "safety_guidance";

export type PillarName = "Nutrition" | "Physical Activity" | "Sleep & Recovery" | "Mental Wellness";

export type RecommendationRow = {
  id: string;
  pillar: PillarName;
  category: string;
  type: RecommendationType;
  text: string;
  personaFit: string[];
  contextFit: string[];
  goalFit: string[];
  barrierFit: string[];
  excludeIf: string[];
  strength: RecommendationStrength;
  notes: string;
};

export type UserProfile = {
  primaryPersona: PersonaKey;
  secondaryPersona: PersonaKey;
  /** Animal nicknames used in recommendation CSV (e.g. shielded_turtle). */
  primaryPersonaAlias: string;
  secondaryPersonaAlias: string;
  goals: string[];
  barriers: string[];
  context: string[];
  exclusions: string[];
};

export type ScoreBreakdown = {
  persona: number;
  barriers: number;
  goals: number;
  context: number;
  strength: number;
  total: number;
  primaryPersonaMatch: boolean;
  secondaryPersonaMatch: boolean;
  allPersonasMatch: boolean;
  matchedBarriers: string[];
  matchedGoals: string[];
  matchedContext: string[];
};

export type ScoredRecommendation = RecommendationRow & {
  score: ScoreBreakdown;
  excluded: false;
};

export type RecommendationCluster = {
  key: string;
  category: string;
  mainBarrier: string | null;
  clusterScore: number;
  rows: ScoredRecommendation[];
};

export type PillarActionPlan = {
  pillar: PillarName;
  focusArea: string;
  focusReason: string;
  dos: { id: string; text: string }[];
  donts: { id: string; text: string }[];
  sourceIds: string[];
};

export type WellnessOpportunity = {
  title: string;
  summary: string;
  sourceIds: string[];
  category: string;
};

export type LaunchpadGroup = "remove_friction" | "build_awareness" | "create_support";

export type LaunchpadItem = {
  id: string;
  text: string;
  group: LaunchpadGroup;
};

export type CoachNotesBlock = {
  keyStrength: string;
  keyRisk: string;
  guidance: string;
  sourceIds: string[];
};

export type ActionPlanSelection = {
  profile: UserProfile;
  ranked: ScoredRecommendation[];
  opportunities: RecommendationCluster[];
  pillarPlans: Record<PillarName, PillarActionPlan>;
  launchpad: LaunchpadItem[];
  coachNotes: ScoredRecommendation[];
  safetyGuidance: ScoredRecommendation[];
  allSourceIds: string[];
};

export type ActionPlanSynthesis = {
  opportunities: WellnessOpportunity[];
  pillarPlans: Record<
    PillarName,
    {
      focusArea: string;
      focusReason: string;
      dos: string[];
      donts: string[];
      sourceIds: string[];
    }
  >;
  launchpad: Record<LaunchpadGroup, string[]>;
  coachNotes: CoachNotesBlock;
  safetyGuidance: { id: string; text: string }[];
  synthesized: boolean;
  synthesisError?: string;
};

export type ActionPlan = ActionPlanSelection & {
  synthesis: ActionPlanSynthesis;
};
