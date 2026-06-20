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
  clusterScore: number;
  rank: number;
  impactLevel: "High" | "Very High";
  personaContextText: string;
  headline: string;
  whyItMatters: string;
  startThisWeek: string;
  sourceIds: string[];
};

export type BehaviouralBox = {
  title: string;
  content: string;
};

export type TraitDeviationCard = {
  trait: string;
  direction: "higher" | "lower";
  content: string;
};

export type PrimaryPatternSection = {
  personaNarrative: string;
  behaviouralBoxes: BehaviouralBox[];
  traitDeviations: TraitDeviationCard[];
};

export type SecondaryPatternSection = {
  secondaryNarrative: string;
  behaviouralBoxes: BehaviouralBox[];
  blendNarrative: string | null;
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
  secondaryStrengthInsight: ScoredRecommendation | null;
  secondaryPatternPrediction: ScoredRecommendation | null;
  blindSpotText: string;
  patternPredictionText: string;
  successConditionText: string;
  strengthInsightText: string;
  secondaryBlindSpotText: string;
  secondarySuccessConditionText: string;
  secondaryStrengthInsightText: string;
  secondaryPatternPredictionText: string;
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

export type WellnessReportSections = {
  /** Page 4 — Primary Pattern (v2.0). */
  primaryPattern?: PrimaryPatternSection;
  /** Page 5 — Secondary Pattern and Blend (v2.0). */
  secondaryPattern?: SecondaryPatternSection;
  quickProfile: {
    wellnessStyle: string;
    energyPattern: string;
    motivationDriver: string;
    riskFactor: string;
    bestEnvironment: string;
    personaPercentage: number;
  };
  blindSpots: {
    patternBody: string;
    goalsBody: string;
    heading?: string;
    body?: string;
  };
  /** @deprecated Use primaryPattern — kept for cached reports. */
  personalityNarrative?: string;
  /** @deprecated Use primaryPattern — kept for cached reports. */
  successBlueprint?: {
    worksBody: string;
    advantageBody: string;
    heading?: string;
    body?: string;
  };
  /** @deprecated Use primaryPattern.traitDeviations — kept for cached reports. */
  traitDeviationNarratives?: string[];
  opportunities: OpportunityCard[];
};

export type PlanRecommendationItem = {
  id: string;
  text: string;
  pillar: PillarName;
};

export type PlanReadinessSignal = {
  primary_type: string;
  description: string;
  secondary_type: string;
};

export type PlanPhaseOutput = {
  phase_number: number;
  name: string;
  intent: string;
  approx_duration_weeks: string;
  anchor_habit: PlanRecommendationItem;
  daily_rhythm: PlanRecommendationItem[];
  weekly_rhythm: PlanRecommendationItem[];
  readiness_signal: PlanReadinessSignal;
  activation_energy_cap: number;
  pillar_distribution: Record<PillarName, number>;
};

export type PlanOutput = {
  plan_id: string;
  persona: PersonaKey;
  fit_tier: FitTier;
  secondary_persona: PersonaKey | null;
  total_phases: number;
  total_duration_weeks: number;
  total_duration_label: string;
  progression_style: string;
  phases: PlanPhaseOutput[];
  generation_notes: string;
};

export type IntegratedPlanSynthesis = {
  plan_subtitle: string;
  goal_framing: string;
  phases: {
    phase_number: number;
    phase_intent_user: string;
    readiness_signal_user: string;
  }[];
  plan_notes: string[];
  synthesized: boolean;
  synthesisError?: string | null;
};

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
  synthesisError?: string | null;
  llmProvider?: ReportLlmProvider;
  tokenUsage?: GeminiTokenUsage | null;
  integratedPlan?: IntegratedPlanSynthesis | null;
  planOutput?: PlanOutput | null;
};

export type ActionPlan = ActionPlanSelection & {
  planOutput: PlanOutput | null;
  synthesis: ActionPlanSynthesis;
};
