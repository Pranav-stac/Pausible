import type { ReportLlmProvider } from "@/lib/recommendations/report-llm-types";
import type { BlendStrength, FitTier, PersonaKey } from "@/lib/scoring/persona-types";

export type RecommendationStrength = "core" | "supporting" | "optional" | "conditional";

export type RecommendationType =
  | "do"
  | "dont"
  | "first_action"
  | "mindset_shift"
  | "environment_change"
  | "recovery_rule"
  | "coach_note"
  | "safety_guidance"
  | "blind_spot"
  | "pattern_prediction"
  | "success_condition"
  | "strength_insight";

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
  oceanFit: string[];
  notes: string;
  /** Persona-specific user-facing text keyed by animal alias (e.g. steady_elephant). */
  personaContext: Partial<Record<string, string>>;
};

export type UserProfile = {
  primaryPersona: PersonaKey;
  secondaryPersona: PersonaKey;
  /** Animal nicknames used in recommendation master (e.g. shielded_turtle). */
  primaryPersonaAlias: string;
  secondaryPersonaAlias: string;
  fitTier: FitTier;
  blendRatio: number;
  blendStrength: BlendStrength;
  oceanTags: string[];
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
  ocean: number;
  strength: number;
  total: number;
  primaryPersonaMatch: boolean;
  secondaryPersonaMatch: boolean;
  allPersonasMatch: boolean;
  matchedBarriers: string[];
  matchedGoals: string[];
  matchedContext: string[];
  matchedOcean: string[];
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

export type PillarActionItem = {
  id: string;
  text: string;
  category: string;
  action?: string;
  why?: string;
};

export type PillarActionPlan = {
  pillar: PillarName;
  focusArea: string;
  focusReason: string;
  focusId: string | null;
  dos: PillarActionItem[];
  donts: PillarActionItem[];
  sourceIds: string[];
};

export type OpportunityCard = {
  id: string;
  pillar: PillarName;
  category: string;
  score: number;
  impactLevel: "High" | "Very High";
  personaContextText: string;
  headline: string;
  whyItMatters: string;
  sourceIds: string[];
};

/** @deprecated Use OpportunityCard — kept for cluster fallback. */
export type WellnessOpportunity = {
  title: string;
  summary: string;
  sourceIds: string[];
  category: string;
};

export type LaunchpadGroup = "start_here" | "environment_setup" | "recovery_rules";

export type LaunchpadItem = {
  id: string;
  text: string;
  pillar: PillarName;
  group: LaunchpadGroup;
  action?: string;
  context?: string;
};

export type PiSeriesSelection = {
  blindSpot: ScoredRecommendation | null;
  patternPrediction: ScoredRecommendation | null;
  successCondition: ScoredRecommendation | null;
  strengthInsight: ScoredRecommendation | null;
  secondaryBlindSpot: ScoredRecommendation | null;
  secondarySuccessCondition: ScoredRecommendation | null;
  blindSpotText: string;
  patternPredictionText: string;
  successConditionText: string;
  strengthInsightText: string;
  secondaryBlindSpotText: string;
  secondarySuccessConditionText: string;
  sourceIds: string[];
  complete: boolean;
};

export type CoachNotesBlock = {
  keyStrength: string;
  keyRisk: string;
  coachingNotes: string[];
  sourceIds: string[];
};

export type ActionPlanSelection = {
  profile: UserProfile;
  ranked: ScoredRecommendation[];
  /** Legacy cluster output (optional). */
  opportunities: RecommendationCluster[];
  opportunityCards: OpportunityCard[];
  piSeries: PiSeriesSelection;
  pillarPlans: Record<PillarName, PillarActionPlan>;
  launchpad: LaunchpadItem[];
  coachSourceRows: ScoredRecommendation[];
  safetyGuidance: ScoredRecommendation[];
  allSourceIds: string[];
  validationWarnings: string[];
};

export type GeminiTokenUsage = {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type PillarSynthesisDo = { action: string; why: string };
export type PillarSynthesisDont = { behavior: string; why: string };

export type ActionPlanSynthesis = {
  /** Legacy cluster summaries. */
  opportunities?: WellnessOpportunity[];
  opportunityCards: OpportunityCard[];
  pillarPlans: Record<
    PillarName,
    {
      focusArea: string;
      focusReason: string;
      dos: PillarSynthesisDo[];
      donts: PillarSynthesisDont[];
      sourceIds: string[];
    }
  >;
  launchpad: Record<LaunchpadGroup, { action: string; context: string; id: string }[]>;
  coachNotes: CoachNotesBlock;
  reportSections?: WellnessReportSections;
  safetyGuidance: { id: string; text: string }[];
  synthesized: boolean;
  synthesisError?: string;
  llmProvider?: ReportLlmProvider;
  tokenUsage?: GeminiTokenUsage | null;
};

export type WellnessReportSections = {
  personalityNarrative: string;
  quickProfile: {
    wellnessStyle: string;
    energyPattern: string;
    motivationDriver: string;
    riskFactor: string;
    bestEnvironment: string;
    personaPercentage: number;
  };
  blindSpots: {
    /** The pattern you don't notice */
    patternBody: string;
    /** What this means for your goals */
    goalsBody: string;
    /** @deprecated legacy combined field */
    heading?: string;
    body?: string;
  };
  successBlueprint: {
    /** What works for you */
    worksBody: string;
    /** Your natural advantage */
    advantageBody: string;
    /** @deprecated legacy combined field */
    heading?: string;
    body?: string;
  };
  traitDeviationNarratives: string[];
  opportunities: OpportunityCard[];
};

export type ActionPlan = ActionPlanSelection & {
  synthesis: ActionPlanSynthesis;
};
