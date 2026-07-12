import { ACTION_PLAN_SYNTHESIS_VERSION } from "@/lib/recommendations/action-plan-cache";
import { isActionPlanPoolRow, isPiSeries } from "@/lib/recommendations/action-pool";
import { BARRIER_OVERRIDE_TAGS, hasBarrierOverride, type BarrierOverrideKey } from "@/lib/recommendations/barrier-override-tags";
import { buildUserProfile, type BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import { clusterRecommendations } from "@/lib/recommendations/cluster";
import { auditFilterExclusions } from "@/lib/recommendations/filter-audit";
import { filterForProfile } from "@/lib/recommendations/filter";
import { GOAL_PREFERENCE_BRIDGE_REC_ID, injectGoalPreferenceBridge } from "@/lib/recommendations/goal-preference-bridge";
import { injectContextSignalAnchors } from "@/lib/recommendations/context-signal-anchors";
import { injectModalityAnchors } from "@/lib/recommendations/modality-anchors";
import { loadRecommendationConfig } from "@/lib/recommendations/load-recommendation-config";
import { generatePlanOutput } from "@/lib/recommendations/plan/plan-generator";
import { validatePreGeneration } from "@/lib/recommendations/report-validation";
import { compareScored, passesPlanScoreGate, scoreAll } from "@/lib/recommendations/score";
import { PDA_MAX_SCORE, PDA_PLAN_SCORE_THRESHOLD } from "@/lib/recommendations/scoring-constants";
import { selectActionPlan } from "@/lib/recommendations/select-action-plan";
import type { PlanOutput, ScoredRecommendation, UserProfile } from "@/lib/recommendations/types";

const BARRIER_OVERRIDE_KEYS = Object.keys(BARRIER_OVERRIDE_TAGS) as BarrierOverrideKey[];

export type EngineDebugScoredRow = {
  id: string;
  pillar: string;
  category: string;
  type: string;
  strength: string;
  effortLevel: string;
  text: string;
  oceanTraitTags: string[];
  oceanCategoryTags: string[];
  score: {
    total: number;
    persona: number;
    barriers: number;
    goals: number;
    context: number;
    ocean: number;
    effort: number;
    strength: number;
    matchedBarriers: string[];
    matchedGoals: string[];
    matchedContext: string[];
    matchedOcean: string[];
    primaryPersonaMatch: boolean;
    secondaryPersonaMatch: boolean;
  };
  planGatePass: boolean;
  isPi: boolean;
  bridgeInjected: boolean;
};

export type AttemptEngineDebugPackage = {
  synthesisVersion: string;
  pdaMaxScore: number;
  pipeline: {
    masterCount: number;
    filteredCount: number;
    excludedCount: number;
    scoredAboveZero: number;
    planPoolCount: number;
    goalPreferenceBridge: boolean;
    bridgeRecId: string | null;
    secondaryBlendPct: number | null;
    secondaryInfluenceActive: boolean;
    planScoreThreshold: number;
  };
  userProfile: {
    primaryPersona: string;
    secondaryPersona: string;
    primaryPersonaAlias: string;
    secondaryPersonaAlias: string;
    fitTier: string;
    fitScore: number;
    blendStrength: string;
    goals: string[];
    barriers: string[];
    context: string[];
    exclusions: string[];
    oceanTags: string[];
    oceanTagsColT: string[];
    oceanCategoryTags: string[];
    derivedExclusions: string[];
    goalPreferenceBridge: boolean;
    isElderly65: boolean;
    isMinor: boolean;
    computedAgeYears: number | null;
  };
  barrierOverridesActive: { key: BarrierOverrideKey; tags: readonly string[] }[];
  filterAudit: { id: string; pillar: string; type: string; reasons: string[] }[];
  preGenerationGate: { ok: boolean; errors: string[]; warnings: string[] };
  validationWarnings: string[];
  clusters: ReturnType<typeof clusterRecommendations>;
  scoredRecommendations: EngineDebugScoredRow[];
  planOutput: PlanOutput | null;
  selectionSummary: {
    piSeriesComplete: boolean;
    piSourceIds: string[];
    opportunityCardIds: string[];
    pillarSourceIds: Record<string, string[]>;
    safetyGuidanceIds: string[];
    allSourceIds: string[];
  };
  cacheMeta: {
    hasCache: boolean;
    inputHash: string | null;
    synthesizedAt: string | null;
    versionMatch: boolean | null;
  };
};

const COL_T_TAG = /^[OCEAN]_(low|medium|high)$/;

function colTTagsFromProfile(tags: string[]): string[] {
  return tags.filter((t) => COL_T_TAG.test(t));
}

function serializeScoredRow(row: ScoredRecommendation, bridgeIds: Set<string>): EngineDebugScoredRow {
  return {
    id: row.id,
    pillar: row.pillar,
    category: row.category,
    type: row.type,
    strength: row.strength,
    effortLevel: row.effortLevel,
    text: row.text,
    oceanTraitTags: row.oceanTraitTags,
    oceanCategoryTags: row.oceanCategoryTags,
    score: {
      total: row.score.total,
      persona: row.score.persona,
      barriers: row.score.barriers,
      goals: row.score.goals,
      context: row.score.context,
      ocean: row.score.ocean,
      effort: row.score.effort,
      strength: row.score.strength,
      matchedBarriers: row.score.matchedBarriers,
      matchedGoals: row.score.matchedGoals,
      matchedContext: row.score.matchedContext,
      matchedOcean: row.score.matchedOcean,
      primaryPersonaMatch: row.score.primaryPersonaMatch,
      secondaryPersonaMatch: row.score.secondaryPersonaMatch,
    },
    planGatePass: passesPlanScoreGate(row) || bridgeIds.has(row.id),
    isPi: isPiSeries(row),
    bridgeInjected: bridgeIds.has(row.id),
  };
}

function activeBarrierOverrides(profile: UserProfile) {
  return BARRIER_OVERRIDE_KEYS.filter((key) => hasBarrierOverride(profile, key)).map((key) => ({
    key,
    tags: BARRIER_OVERRIDE_TAGS[key],
  }));
}

function secondaryInfluenceActive(profile: UserProfile, secondaryBlendPct: number | null): boolean {
  return typeof secondaryBlendPct === "number" && secondaryBlendPct > 15;
}

export async function buildAttemptEngineDebugPackage(
  input: BuildProfileInput,
  cacheMeta?: { inputHash?: string | null; synthesizedAt?: string | null },
): Promise<AttemptEngineDebugPackage> {
  const config = await loadRecommendationConfig();
  const profile = buildUserProfile(input, config);
  const master = config.recommendations;
  const filtered = filterForProfile(master, profile);
  const excluded = auditFilterExclusions(master, profile);
  const scored = scoreAll(filtered, profile);
  const preBridge = scored;
  const ranked = injectContextSignalAnchors(
    injectModalityAnchors(
      injectGoalPreferenceBridge(scored, profile, scored),
      profile,
      scored,
    ),
    profile,
    scored,
  );
  const bridgeInjected = ranked.some((r) => r.id === GOAL_PREFERENCE_BRIDGE_REC_ID && !preBridge.some((p) => p.id === r.id && p.score.total === r.score.total));
  const bridgeIds = new Set<string>();
  if (profile.goalPreferenceBridge) bridgeIds.add(GOAL_PREFERENCE_BRIDGE_REC_ID);

  const selection = selectActionPlan(ranked, profile);
  const gate = validatePreGeneration({
    answers: input.answers,
    scores: input.scores,
    ranked,
    selection,
    masterRows: master,
  });
  if (gate.warnings.length) {
    selection.validationWarnings.push(...gate.warnings);
  }

  const secondaryBlendPct =
    input.scores?.persona?.personaPercentages?.[profile.secondaryPersona] ?? null;

  const planOutput = generatePlanOutput({
    ranked,
    profile,
    planId: `debug_${profile.primaryPersona}`,
    secondaryBlendPct: secondaryBlendPct ?? undefined,
  });

  const planPool = ranked.filter((r) => isActionPlanPoolRow(r) && (passesPlanScoreGate(r) || bridgeIds.has(r.id)));

  const oceanColT = colTTagsFromProfile(profile.oceanTags);

  return {
    synthesisVersion: ACTION_PLAN_SYNTHESIS_VERSION,
    pdaMaxScore: PDA_MAX_SCORE,
    pipeline: {
      masterCount: master.length,
      filteredCount: filtered.length,
      excludedCount: excluded.length,
      scoredAboveZero: ranked.filter((r) => r.score.total > 0 && !isPiSeries(r)).length,
      planPoolCount: planPool.length,
      goalPreferenceBridge: profile.goalPreferenceBridge,
      bridgeRecId: profile.goalPreferenceBridge ? GOAL_PREFERENCE_BRIDGE_REC_ID : null,
      secondaryBlendPct,
      secondaryInfluenceActive: secondaryInfluenceActive(profile, secondaryBlendPct),
      planScoreThreshold: PDA_PLAN_SCORE_THRESHOLD,
    },
    userProfile: {
      primaryPersona: profile.primaryPersona,
      secondaryPersona: profile.secondaryPersona,
      primaryPersonaAlias: profile.primaryPersonaAlias,
      secondaryPersonaAlias: profile.secondaryPersonaAlias,
      fitTier: profile.fitTier,
      fitScore: input.scores?.persona?.fitScore ?? 0,
      blendStrength: profile.blendStrength,
      goals: profile.goals,
      barriers: profile.barriers,
      context: profile.context,
      exclusions: profile.exclusions,
      oceanTags: profile.oceanTags,
      oceanTagsColT: oceanColT,
      oceanCategoryTags: profile.oceanCategoryTags,
      derivedExclusions: profile.exclusions.filter((e) => e.startsWith("exclude_")),
      goalPreferenceBridge: profile.goalPreferenceBridge,
      isElderly65: profile.isElderly65,
      isMinor: profile.isMinor,
      computedAgeYears: profile.computedAgeYears ?? null,
    },
    barrierOverridesActive: activeBarrierOverrides(profile),
    filterAudit: excluded.map(({ row, reasons }) => ({
      id: row.id,
      pillar: row.pillar,
      type: row.type,
      reasons,
    })),
    preGenerationGate: gate,
    validationWarnings: selection.validationWarnings,
    clusters: clusterRecommendations(ranked, profile),
    scoredRecommendations: [...ranked]
      .sort(compareScored)
      .map((r) => serializeScoredRow(r, bridgeIds)),
    planOutput,
    selectionSummary: {
      piSeriesComplete: selection.piSeries.complete,
      piSourceIds: selection.piSeries.sourceIds,
      opportunityCardIds: selection.opportunityCards.map((c) => c.id),
      pillarSourceIds: Object.fromEntries(
        Object.entries(selection.pillarPlans).map(([p, plan]) => [p, plan.sourceIds]),
      ),
      safetyGuidanceIds: selection.safetyGuidance.map((s) => s.id),
      allSourceIds: selection.allSourceIds,
    },
    cacheMeta: {
      hasCache: Boolean(cacheMeta?.inputHash),
      inputHash: cacheMeta?.inputHash ?? null,
      synthesizedAt: cacheMeta?.synthesizedAt ?? null,
      versionMatch: cacheMeta?.inputHash ? null : null,
    },
  };
}
