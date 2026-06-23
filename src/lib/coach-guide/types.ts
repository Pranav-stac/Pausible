import type { FitTier, PersonaKey } from "@/lib/scoring/persona-types";
import type { IntegratedPlanSynthesis, PillarName, PlanOutput } from "@/lib/recommendations/types";

export type CoachGuideTraitRow = {
  trait: string;
  level: string;
  deviation: string | null;
  meaning: string | null;
};

export type CoachGuidePillarMatrix = {
  structure: Record<string, string>;
  environment: Record<string, string>;
  progression: Record<string, string>;
  recoveryProtocol: Record<string, string>;
};

export type CoachGuideDocument = {
  clientName: string;
  reportId: string;
  reportDate: string;
  personaTitle: string;
  fitScore: number;
  fitTier: FitTier;
  primaryPersona: PersonaKey;
  primaryPersonaLabel: string;
  secondaryPersonaLabel: string;
  secondaryPct: number;
  introduction: {
    personaSummary: string;
    personaDescription: string;
    secondaryInfluence: string;
    traits: CoachGuideTraitRow[];
    primaryGoal: string;
    topBarrier: string;
    motivates: string[];
    drains: string[];
    blindSpot: string;
    blindSpotCoachResponse: string;
    riskSignals: { signal: string; meaning: string }[];
  };
  guidingPrinciples: {
    pillarMatrix: CoachGuidePillarMatrix;
    validationCheck: [string, string, string];
    monitoringSignals: string[];
    pivotTriggers: string[];
    reviewCadence: { period: string; action: string }[];
  };
  closing: {
    fiveWordSummary: string;
  };
  /** Same phased plan as wellness report slide 9 — keeps coach guide aligned with client plan. */
  clientIntegratedPlan?: {
    planOutput: PlanOutput;
    synthesis: IntegratedPlanSynthesis;
  } | null;
  /** Phases → pillars covered (for matrix ↔ plan cross-reference). */
  planPhaseSummary?: {
    phase_number: number;
    name: string;
    anchorPillar: PillarName;
    pillars: PillarName[];
  }[];
  /** True when pillar matrix was derived from clientIntegratedPlan, not persona template only. */
  matrixSyncedFromPlan?: boolean;
  synthesized: boolean;
  synthesisError?: string | null;
};
