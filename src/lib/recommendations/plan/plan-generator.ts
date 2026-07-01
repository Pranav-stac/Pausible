import { isActionPlanPoolRow } from "@/lib/recommendations/action-pool";
import { hasBarrierOverride, hasPerfectionismPattern } from "@/lib/recommendations/barrier-override-tags";
import { GOAL_PREFERENCE_BRIDGE_REC_ID } from "@/lib/recommendations/goal-preference-bridge";
import { compareScored, passesPlanScoreGate } from "@/lib/recommendations/score";
import { classifyActivationEnergy } from "@/lib/recommendations/plan/activation-energy";
import { buildPhaseReadinessDescription } from "@/lib/recommendations/plan/build-readiness-signal";
import {
  anchorCandidateRank,
  classifyRhythmCadence,
  isValidAnchorCandidate,
} from "@/lib/recommendations/plan/plan-rhythm-cadence";
import {
  formatTotalDurationWeeks,
  GOAL_PILLAR_DENSITY,
  parseDurationWeeks,
  PERSONA_PHASE_CONFIG,
  PHASE1_DENSITY_OVERRIDE,
  type PhaseDefinition,
  type ReadinessSignalType,
} from "@/lib/recommendations/plan/phase-config";
import { resolvePhases, type ResolvedPhase } from "@/lib/recommendations/plan/plan-phase-resolve";
import type {
  PillarName,
  PlanOutput,
  PlanPhaseOutput,
  PlanRecommendationItem,
  RecommendationStrength,
  RecommendationType,
  ScoredRecommendation,
  UserProfile,
} from "@/lib/recommendations/types";
import { PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import type { FitTier, PersonaKey } from "@/lib/scoring/persona-types";

const PILLARS: PillarName[] = ["Nutrition", "Physical Activity", "Sleep & Recovery", "Mental Wellness"];

const STRENGTH_ORDER: Record<RecommendationStrength, number> = {
  core: 0,
  supporting: 1,
  optional: 2,
  conditional: 3,
};

type PhaseCapacity = {
  dailyCount: number;
  weeklyCount: number;
  activationEnergyCap: number;
  eligibleTypes: Set<string>;
  primarySignal: ReadinessSignalType;
  secondarySignal: ReadinessSignalType;
};

function strengthRank(row: ScoredRecommendation): number {
  return STRENGTH_ORDER[row.strength] ?? 9;
}

const PLAN_RHYTHM_TYPES = new Set<RecommendationType>([
  "do",
  "first_action",
  "environment_change",
  "recovery_rule",
  "dont",
]);

function planRhythmTypeRank(type: RecommendationType): number {
  if (type === "first_action") return 0;
  if (type === "do") return 1;
  if (type === "environment_change") return 2;
  if (type === "recovery_rule") return 3;
  if (type === "dont") return 4;
  return 20;
}

function compareCandidates(a: ScoredRecommendation, b: ScoredRecommendation): number {
  const sr = strengthRank(a) - strengthRank(b);
  if (sr !== 0) return sr;
  return b.score.total - a.score.total;
}

function comparePlanRhythmCandidates(a: ScoredRecommendation, b: ScoredRecommendation): number {
  const tr = planRhythmTypeRank(a.type) - planRhythmTypeRank(b.type);
  if (tr !== 0) return tr;
  return compareCandidates(a, b);
}

function compareAnchorCandidates(a: ScoredRecommendation, b: ScoredRecommendation): number {
  const ar = anchorCandidateRank(a) - anchorCandidateRank(b);
  if (ar !== 0) return ar;
  return comparePlanRhythmCandidates(a, b);
}

function assignRhythmItem(
  row: ScoredRecommendation,
  daily: PlanRecommendationItem[],
  weekly: PlanRecommendationItem[],
  counts: { daily: number; weekly: number },
  allowCadenceMismatch: boolean,
): boolean {
  const item = toPlanItem(row);
  const cadence = classifyRhythmCadence(row.text, row.type);

  if (cadence === "daily") {
    if (daily.length < counts.daily) {
      daily.push(item);
      return true;
    }
    if (allowCadenceMismatch && weekly.length < counts.weekly) {
      weekly.push(item);
      return true;
    }
    return false;
  }

  if (cadence === "weekly") {
    if (weekly.length < counts.weekly) {
      weekly.push(item);
      return true;
    }
    if (allowCadenceMismatch && daily.length < counts.daily) {
      daily.push(item);
      return true;
    }
    return false;
  }

  if (daily.length < counts.daily) {
    daily.push(item);
    return true;
  }
  if (weekly.length < counts.weekly) {
    weekly.push(item);
    return true;
  }
  return false;
}

function forceAssignRhythmItem(
  row: ScoredRecommendation,
  bucket: "daily" | "weekly",
  daily: PlanRecommendationItem[],
  weekly: PlanRecommendationItem[],
  counts: { daily: number; weekly: number },
): boolean {
  const item = toPlanItem(row);
  const list = bucket === "daily" ? daily : weekly;
  const cap = bucket === "daily" ? counts.daily : counts.weekly;
  if (list.length >= cap) return false;
  list.push(item);
  return true;
}

function cadencePrefersBucket(
  text: string,
  type: RecommendationType,
  bucket: "daily" | "weekly",
): number {
  const cadence = classifyRhythmCadence(text, type);
  if (bucket === "daily") {
    if (cadence === "daily") return 0;
    if (cadence === "either") return 1;
    return 2;
  }
  if (cadence === "weekly") return 0;
  if (cadence === "either") return 1;
  return 2;
}

function backfillRhythmBuckets(
  pool: ScoredRecommendation[],
  daily: PlanRecommendationItem[],
  weekly: PlanRecommendationItem[],
  counts: { daily: number; weekly: number },
  capacity: PhaseCapacity,
  phaseNumber: number,
  profile: UserProfile,
  used: Set<string>,
  totalPhases: number,
  anchorId: string | null,
): void {
  const skipIds = new Set([anchorId].filter(Boolean) as string[]);
  const strengthPhaseCutoff = phaseNumber === 1 ? 1 : phaseNumber === 2 ? 2 : 3;
  const maxStrength = strengthPhaseCutoff === 1 ? 0 : strengthPhaseCutoff === 2 ? 1 : 2;

  const fillBucket = (bucket: "daily" | "weekly", minCount: number, relaxStrength: boolean) => {
    const list = bucket === "daily" ? daily : weekly;
    while (list.length < minCount) {
      const candidates = pool
        .filter(
          (r) =>
            !used.has(r.id) &&
            !skipIds.has(r.id) &&
            isEligibleForPhase(r, capacity, phaseNumber, profile) &&
            PLAN_RHYTHM_TYPES.has(r.type) &&
            shouldAssignConditionalInPhase(r, phaseNumber, totalPhases, profile),
        )
        .sort((a, b) => {
          const cp = cadencePrefersBucket(a.text, a.type, bucket) - cadencePrefersBucket(b.text, b.type, bucket);
          if (cp !== 0) return cp;
          return comparePlanRhythmCandidates(a, b);
        });

      const row =
        candidates.find((r) => relaxStrength || strengthRank(r) <= maxStrength || r.strength === "conditional") ??
        candidates[0];
      if (!row) break;

      if (assignRhythmItem(row, daily, weekly, counts, true)) {
        used.add(row.id);
        continue;
      }
      if (forceAssignRhythmItem(row, bucket, daily, weekly, counts)) {
        used.add(row.id);
        continue;
      }
      break;
    }
  };

  fillBucket("daily", counts.daily, false);
  fillBucket("weekly", counts.weekly, false);
  if (daily.length < counts.daily || weekly.length < counts.weekly) {
    fillBucket("daily", counts.daily, true);
    fillBucket("weekly", counts.weekly, true);
  }
}

function hasHighNeuroticismPersona(persona: PersonaKey): boolean {
  return persona === "brittle_avoidant" || persona === "stress_sensitive";
}

function secondaryInfluenceActive(_profile: UserProfile, secondaryBlendPct?: number): boolean {
  return typeof secondaryBlendPct === "number" && secondaryBlendPct > 15;
}

function itemCountsForPhase(
  profile: UserProfile,
  fitTier: FitTier,
  phaseNumber: number,
  secondaryPersona: PersonaKey | null,
  secondaryActive: boolean,
): { daily: number; weekly: number } {
  const config = PERSONA_PHASE_CONFIG[profile.primaryPersona];
  let daily = config.dailyItems.max;
  let weekly = config.weeklyItems.max;

  if (hasBarrierOverride(profile, "overwhelm") && phaseNumber === 1) {
    daily = Math.max(1, daily - 1);
    weekly = Math.max(1, weekly - 1);
  }

  if (fitTier === "leaning" && phaseNumber === 1) {
    daily = Math.max(1, daily - 1);
  }

  if (fitTier === "exploring") {
    daily = Math.max(1, Math.min(3, daily - 1));
    weekly = Math.max(1, weekly - 1);
  }

  if (secondaryActive && secondaryPersona === "resilient_performer" && phaseNumber === 1) {
    if (profile.primaryPersona !== "resilient_performer") {
      daily += 1;
    }
  }

  if (secondaryActive && secondaryPersona === "curious_explorer") {
    weekly += 1;
  }

  return { daily, weekly };
}

function adjustActivationCap(
  baseCap: number,
  fitTier: FitTier,
  phaseNumber: number,
  profile: UserProfile,
  secondaryPersona: PersonaKey | null,
  secondaryActive: boolean,
): number {
  let cap = baseCap;

  if (fitTier === "leaning" && phaseNumber === 1) cap -= 1;
  if (fitTier === "exploring") cap -= 1;

  if (secondaryActive && secondaryPersona === "brittle_avoidant" && phaseNumber === 1) {
    cap -= 1;
  }

  if (hasBarrierOverride(profile, "starting_difficulty") && phaseNumber === 1) {
    cap = Math.min(cap, 2);
  }

  if (hasBarrierOverride(profile, "lack_of_time") && phaseNumber === 1) {
    cap = Math.min(cap, 2);
  }

  return Math.max(1, cap);
}

function applySecondarySignalOverride(
  phase: ResolvedPhase,
  secondaryPersona: PersonaKey | null,
  secondaryActive: boolean,
  primaryPersona: PersonaKey,
): { primary: ReadinessSignalType; secondary: ReadinessSignalType } {
  const primary = phase.primarySignal;
  let secondary = phase.secondarySignal;

  if (!secondaryActive || !secondaryPersona) {
    return { primary, secondary };
  }

  switch (secondaryPersona) {
    case "brittle_avoidant":
      secondary = "emotional_comfort";
      break;
    case "stress_sensitive":
      if (phase.phaseNumber === 1) secondary = "recovery";
      break;
    case "social_motivator":
      if (phase.phaseNumber >= 2 && primaryPersona !== "social_motivator") {
        secondary = "social_embedding";
      }
      break;
    default:
      break;
  }

  if (secondary === primary) {
    secondary = phase.secondarySignal;
  }

  return { primary, secondary };
}

function pillarDensityForPhase(
  profile: UserProfile,
  phaseNumber: number,
): Record<PillarName, number> {
  const primaryGoal = profile.goals[0];
  const goalConfig = primaryGoal ? GOAL_PILLAR_DENSITY[primaryGoal] : null;

  if (phaseNumber === 1 && hasHighNeuroticismPersona(profile.primaryPersona)) {
    return {
      "Mental Wellness": PHASE1_DENSITY_OVERRIDE["Mental Wellness"],
      "Sleep & Recovery": PHASE1_DENSITY_OVERRIDE["Sleep & Recovery"],
      Nutrition: PHASE1_DENSITY_OVERRIDE.Nutrition,
      "Physical Activity": PHASE1_DENSITY_OVERRIDE["Physical Activity"],
    };
  }

  if (!goalConfig) {
    return { Nutrition: 25, "Physical Activity": 25, "Sleep & Recovery": 25, "Mental Wellness": 25 };
  }

  return {
    Nutrition: goalConfig.weights.Nutrition ?? 25,
    "Physical Activity": goalConfig.weights["Physical Activity"] ?? 25,
    "Sleep & Recovery": goalConfig.weights["Sleep & Recovery"] ?? 25,
    "Mental Wellness": goalConfig.weights["Mental Wellness"] ?? 25,
  };
}

function toPlanItem(row: ScoredRecommendation): PlanRecommendationItem {
  return {
    id: row.id,
    // Rhythm slots need imperative actions — not personaContext essays used on narrative pages.
    text: row.text.trim(),
    pillar: row.pillar,
  };
}

function isStructuredRec(row: ScoredRecommendation): boolean {
  return classifyActivationEnergy(row) >= 4;
}

function isFallbackRec(row: ScoredRecommendation): boolean {
  return (
    row.type === "recovery_rule" ||
    row.strength === "conditional" ||
    /backup|fallback|if you miss|when you miss|shorter|short version|scale down|lighter session/i.test(
      row.text,
    )
  );
}

/** §21.5 R6 — place conditional recs in the phase where trigger context is most relevant. */
function bestPhaseForConditional(
  row: ScoredRecommendation,
  totalPhases: number,
  profile: UserProfile,
): number {
  if (row.id === GOAL_PREFERENCE_BRIDGE_REC_ID && profile.goalPreferenceBridge) {
    const disciplined =
      profile.primaryPersona === "resilient_performer" ||
      profile.primaryPersona === "self_regulated_planner";
    return disciplined ? 1 : Math.min(2, totalPhases);
  }

  const ctx = row.score.matchedContext;
  if (ctx.some((t) => t.startsWith("barrier_"))) return 1;
  if (ctx.some((t) => t.includes("sleep") || t.includes("stress") || t === "time_under_15_min")) {
    return Math.min(2, totalPhases);
  }
  if (ctx.some((t) => t.includes("advanced") || t.includes("experienced"))) {
    return totalPhases;
  }
  if (row.type === "recovery_rule") return Math.min(2, totalPhases);
  return Math.min(Math.max(2, Math.ceil(totalPhases / 2)), totalPhases);
}

function shouldAssignConditionalInPhase(
  row: ScoredRecommendation,
  phaseNumber: number,
  totalPhases: number,
  profile: UserProfile,
): boolean {
  if (row.strength !== "conditional") return true;
  return phaseNumber === bestPhaseForConditional(row, totalPhases, profile);
}

function passesBarrierFilters(row: ScoredRecommendation, profile: UserProfile, phaseNumber: number): boolean {
  if (phaseNumber !== 1) return true;

  if (hasBarrierOverride(profile, "lack_of_time")) {
    if (classifyActivationEnergy(row) > 2) return false;
    const text = row.text.toLowerCase();
    if (/\b\d+\s*(hour|hr|hrs)\b/.test(text) && !/\b(10|15)\s*min/.test(text)) return false;
    if (text.includes("hour") && !text.includes("15 min") && !text.includes("10 min")) {
      return false;
    }
  }

  return true;
}

function phaseItemsIncludeType(
  pool: ScoredRecommendation[],
  anchor: ScoredRecommendation | null,
  daily: PlanRecommendationItem[],
  weekly: PlanRecommendationItem[],
  predicate: (row: ScoredRecommendation) => boolean,
): boolean {
  const ids = new Set(
    [anchor?.id, ...daily.map((d) => d.id), ...weekly.map((w) => w.id)].filter(Boolean) as string[],
  );
  return pool.some((r) => ids.has(r.id) && predicate(r));
}

function injectBarrierRhythmItems(
  pool: ScoredRecommendation[],
  profile: UserProfile,
  phaseNumber: number,
  daily: PlanRecommendationItem[],
  weekly: PlanRecommendationItem[],
  anchor: ScoredRecommendation | null,
  used: Set<string>,
  counts: { daily: number; weekly: number },
): ScoredRecommendation | null {
  let currentAnchor = anchor;

  if (hasBarrierOverride(profile, "inconsistency")) {
    const hasRecovery =
      phaseNumber === 1 &&
      phaseItemsIncludeType(pool, currentAnchor, daily, weekly, (r) => r.type === "recovery_rule");
    if (!hasRecovery) {
      const recovery = pool
        .filter((r) => !used.has(r.id) && r.type === "recovery_rule")
        .sort(comparePlanRhythmCandidates)[0];
      if (recovery && assignRhythmItem(recovery, daily, weekly, counts, true)) {
        used.add(recovery.id);
      }
    }

    const hasFallback = phaseItemsIncludeType(pool, currentAnchor, daily, weekly, isFallbackRec);
    if (!hasFallback) {
      const fallback = pool
        .filter((r) => !used.has(r.id) && isFallbackRec(r))
        .sort(comparePlanRhythmCandidates)[0];
      if (fallback && assignRhythmItem(fallback, daily, weekly, counts, true)) {
        used.add(fallback.id);
      }
    }
  }

  if (phaseNumber === 1 && hasBarrierOverride(profile, "emotional_eating")) {
    const hasEmotional = phaseItemsIncludeType(
      pool,
      currentAnchor,
      daily,
      weekly,
      (r) => r.category === "emotional_eating",
    );
    if (!hasEmotional) {
      const hit = pool
        .filter((r) => !used.has(r.id) && r.category === "emotional_eating")
        .sort(comparePlanRhythmCandidates)[0];
      if (hit && assignRhythmItem(hit, daily, weekly, counts, true)) {
        used.add(hit.id);
      }
    }
  }

  if (phaseNumber === 1 && hasBarrierOverride(profile, "lack_of_time") && currentAnchor) {
    if (classifyActivationEnergy(currentAnchor) > 2) {
      const micro = pool
        .filter(
          (r) =>
            !used.has(r.id) &&
            classifyActivationEnergy(r) <= 2 &&
            PLAN_RHYTHM_TYPES.has(r.type) &&
            isValidAnchorCandidate(r),
        )
        .sort(compareAnchorCandidates)[0];
      if (micro) {
        used.delete(currentAnchor.id);
        currentAnchor = micro;
        used.add(micro.id);
      }
    }
  }

  return currentAnchor;
}

/** §21.10 barrier_lack_of_time — pair micro backup/short-version with each structured rec. */
function injectLackOfTimeShortVersions(
  pool: ScoredRecommendation[],
  profile: UserProfile,
  daily: PlanRecommendationItem[],
  weekly: PlanRecommendationItem[],
  anchor: ScoredRecommendation | null,
  used: Set<string>,
  counts: { daily: number; weekly: number },
): void {
  if (!hasBarrierOverride(profile, "lack_of_time")) return;

  const assignedIds = new Set([
    ...(anchor ? [anchor.id] : []),
    ...daily.map((d) => d.id),
    ...weekly.map((w) => w.id),
  ]);
  const structured = pool.filter((r) => assignedIds.has(r.id) && isStructuredRec(r));
  const pairedBackupIds = new Set(
    pool.filter((r) => assignedIds.has(r.id) && !isStructuredRec(r) && classifyActivationEnergy(r) <= 2).map((r) => r.id),
  );

  for (const structuredRec of structured) {
    const backup = pool
      .filter(
        (r) =>
          !used.has(r.id) &&
          !pairedBackupIds.has(r.id) &&
          r.id !== structuredRec.id &&
          classifyActivationEnergy(r) <= 2 &&
          PLAN_RHYTHM_TYPES.has(r.type) &&
          (r.pillar === structuredRec.pillar ||
            r.category === structuredRec.category ||
            /backup|shorter|short|micro|10.?min|5.?min|lighter/i.test(r.text)),
      )
      .sort((a, b) => {
        const pillarA = a.pillar === structuredRec.pillar ? 0 : 1;
        const pillarB = b.pillar === structuredRec.pillar ? 0 : 1;
        if (pillarA !== pillarB) return pillarA - pillarB;
        return comparePlanRhythmCandidates(a, b);
      })[0];

    if (backup && assignRhythmItem(backup, daily, weekly, counts, true)) {
      used.add(backup.id);
      pairedBackupIds.add(backup.id);
    }
  }
}

function applyBarrierCapacityOverrides(
  capacity: PhaseCapacity,
  phaseNumber: number,
  profile: UserProfile,
): PhaseCapacity {
  if (hasBarrierOverride(profile, "inconsistency") && phaseNumber === 1) {
    const eligibleTypes = new Set(capacity.eligibleTypes);
    eligibleTypes.add("recovery_rule");
    return { ...capacity, eligibleTypes };
  }
  return capacity;
}

function isEligibleForPhase(
  row: ScoredRecommendation,
  capacity: PhaseCapacity,
  phaseNumber: number,
  profile: UserProfile,
): boolean {
  if (!isActionPlanPoolRow(row)) return false;
  if (!passesBarrierFilters(row, profile, phaseNumber)) return false;

  const ae = classifyActivationEnergy(row);
  const poorSleepPromote =
    phaseNumber === 1 &&
    hasBarrierOverride(profile, "poor_sleep") &&
    row.pillar === "Sleep & Recovery";
  if (!poorSleepPromote && ae > capacity.activationEnergyCap) return false;

  if (
    hasBarrierOverride(profile, "perfectionism") &&
    phaseNumber === 1 &&
    row.type === "mindset_shift"
  ) {
    return true;
  }

  if (!capacity.eligibleTypes.has(row.type)) return false;
  return true;
}

function pickAnchor(
  pool: ScoredRecommendation[],
  capacity: PhaseCapacity,
  phaseNumber: number,
  profile: UserProfile,
  used: Set<string>,
): ScoredRecommendation | null {
  const candidates = pool
    .filter((r) => !used.has(r.id) && isEligibleForPhase(r, capacity, phaseNumber, profile))
    .filter((r) => PLAN_RHYTHM_TYPES.has(r.type) && isValidAnchorCandidate(r))
    .filter(
      (r) =>
        !hasBarrierOverride(profile, "lack_of_time") ||
        phaseNumber !== 1 ||
        classifyActivationEnergy(r) <= 2,
    )
    .sort(compareAnchorCandidates);

  if (hasBarrierOverride(profile, "poor_sleep") && phaseNumber === 1) {
    const sleepHit = candidates.find((r) => r.pillar === "Sleep & Recovery");
    if (sleepHit) return sleepHit;
  }

  if (phaseNumber === 1 && !hasBarrierOverride(profile, "poor_sleep")) {
    const primaryGoal = profile.goals[0];
    const goalConfig = primaryGoal ? GOAL_PILLAR_DENSITY[primaryGoal] : null;
    if (goalConfig?.anchor) {
      const anchorPillar = goalConfig.anchor as PillarName;
      const goalHit = candidates.find((r) => r.pillar === anchorPillar);
      if (goalHit) return goalHit;
    }
  }

  if (hasBarrierOverride(profile, "starting_difficulty") && phaseNumber === 1) {
    const firstAction = candidates.find((r) => r.type === "first_action");
    if (firstAction) return firstAction;
  }

  const coreHit = candidates.find((r) => r.strength === "core");
  return coreHit ?? candidates[0] ?? null;
}

function pickAnchorAlternate(
  pool: ScoredRecommendation[],
  capacity: PhaseCapacity,
  phaseNumber: number,
  profile: UserProfile,
  used: Set<string>,
  primaryAnchor: ScoredRecommendation | null,
  secondaryPersona: PersonaKey | null,
  secondaryActive: boolean,
): ScoredRecommendation | null {
  if (!secondaryActive || secondaryPersona !== "curious_explorer" || !primaryAnchor) return null;

  const candidates = pool
    .filter((r) => r.id !== primaryAnchor.id && !used.has(r.id))
    .filter((r) => isEligibleForPhase(r, capacity, phaseNumber, profile))
    .filter((r) => PLAN_RHYTHM_TYPES.has(r.type) && isValidAnchorCandidate(r))
    .sort(compareAnchorCandidates);

  return candidates[0] ?? null;
}

function pairDontRecsWithDo(
  pool: ScoredRecommendation[],
  daily: PlanRecommendationItem[],
  weekly: PlanRecommendationItem[],
  used: Set<string>,
  counts: { daily: number; weekly: number },
  capacity: PhaseCapacity,
  phaseNumber: number,
  profile: UserProfile,
): void {
  const assignedIds = new Set([...daily.map((d) => d.id), ...weekly.map((w) => w.id)]);
  const dos = pool.filter(
    (r) => assignedIds.has(r.id) && (r.type === "do" || r.type === "first_action"),
  );
  const pairedDontIds = new Set(
    pool.filter((r) => assignedIds.has(r.id) && r.type === "dont").map((r) => r.id),
  );

  for (const anchorDo of dos) {
    const dont = pool
      .filter(
        (r) =>
          !used.has(r.id) &&
          !pairedDontIds.has(r.id) &&
          r.type === "dont" &&
          isEligibleForPhase(r, capacity, phaseNumber, profile),
      )
      .sort((a, b) => {
        if (hasBarrierOverride(profile, "emotional_eating") && anchorDo.pillar === "Nutrition") {
          const catA = a.category === anchorDo.category ? 0 : 1;
          const catB = b.category === anchorDo.category ? 0 : 1;
          if (catA !== catB) return catA - catB;
        }
        const pillarA = a.pillar === anchorDo.pillar ? 0 : 1;
        const pillarB = b.pillar === anchorDo.pillar ? 0 : 1;
        if (pillarA !== pillarB) return pillarA - pillarB;
        const catA = a.category === anchorDo.category ? 0 : 1;
        const catB = b.category === anchorDo.category ? 0 : 1;
        return catA - catB;
      })[0];

    if (dont && assignRhythmItem(dont, daily, weekly, counts, true)) {
      used.add(dont.id);
      pairedDontIds.add(dont.id);
    }
  }
}

function injectSecondaryPersonaItems(
  pool: ScoredRecommendation[],
  profile: UserProfile,
  secondaryPersona: PersonaKey | null,
  secondaryActive: boolean,
  phaseNumber: number,
  daily: PlanRecommendationItem[],
  weekly: PlanRecommendationItem[],
  used: Set<string>,
  counts: { daily: number; weekly: number },
  capacity: PhaseCapacity,
): void {
  if (!secondaryActive || !secondaryPersona) return;

  const tryAdd = (row: ScoredRecommendation | undefined) => {
    if (!row || used.has(row.id)) return;
    if (!isEligibleForPhase(row, capacity, phaseNumber, profile)) return;
    if (assignRhythmItem(row, daily, weekly, counts, true)) {
      used.add(row.id);
    }
  };

  switch (secondaryPersona) {
    case "curious_explorer": {
      const variety = pool
        .filter((r) => !used.has(r.id) && (r.strength === "optional" || r.strength === "supporting"))
        .sort(comparePlanRhythmCandidates)[0];
      tryAdd(variety);
      break;
    }
    case "social_motivator":
      if (phaseNumber >= 2 && profile.primaryPersona !== "social_motivator") {
        const social = pool.find(
          (r) =>
            !used.has(r.id) &&
            (r.category.includes("social") ||
              r.contextFit.some((t) => t.includes("social")) ||
              /accountab|partner|group|buddy/i.test(r.text)),
        );
        tryAdd(social);
      }
      break;
    case "stress_sensitive": {
      const backup = pool.find(
        (r) =>
          !used.has(r.id) &&
          (r.type === "recovery_rule" || r.strength === "conditional" || r.type === "dont"),
      );
      tryAdd(backup);
      break;
    }
    case "self_regulated_planner":
      if (phaseNumber === 1 && profile.primaryPersona !== "self_regulated_planner") {
        const tracking = pool.find(
          (r) =>
            !used.has(r.id) &&
            (r.type === "success_condition" ||
              /track|log|record|check.?in|journal/i.test(r.text)),
        );
        tryAdd(tracking);
      }
      break;
    default:
      break;
  }
}

function assignPhaseItems(
  pool: ScoredRecommendation[],
  capacity: PhaseCapacity,
  phaseNumber: number,
  profile: UserProfile,
  used: Set<string>,
  density: Record<PillarName, number>,
  counts: { daily: number; weekly: number },
  totalPhases: number,
  secondaryBlendPct?: number,
): { daily: PlanRecommendationItem[]; weekly: PlanRecommendationItem[]; anchor: ScoredRecommendation | null } {
  const anchorRow = pickAnchor(pool, capacity, phaseNumber, profile, used);
  if (anchorRow) used.add(anchorRow.id);

  const daily: PlanRecommendationItem[] = [];
  const weekly: PlanRecommendationItem[] = [];
  const pillarCounts: Record<PillarName, number> = {
    Nutrition: 0,
    "Physical Activity": 0,
    "Sleep & Recovery": 0,
    "Mental Wellness": 0,
  };

  if (anchorRow) {
    pillarCounts[anchorRow.pillar] += 1;
  }

  const rhythmTarget = counts.daily + counts.weekly;
  let rhythmAssigned = 0;
  let extendedOnce = false;

  const candidates = pool
    .filter((r) => !used.has(r.id) && isEligibleForPhase(r, capacity, phaseNumber, profile))
    .filter((r) => PLAN_RHYTHM_TYPES.has(r.type))
    .sort(comparePlanRhythmCandidates);

  const strengthPhaseCutoff = phaseNumber === 1 ? 1 : phaseNumber === 2 ? 2 : 3;

  for (const row of candidates) {
    if (rhythmAssigned >= rhythmTarget) break;

    const maxStrength = strengthPhaseCutoff === 1 ? 0 : strengthPhaseCutoff === 2 ? 1 : 2;
    if (strengthRank(row) > maxStrength && row.strength !== "conditional") continue;
    if (!shouldAssignConditionalInPhase(row, phaseNumber, totalPhases, profile)) continue;

    const pillarTarget = density[row.pillar] ?? 25;
    const rhythmSlots = rhythmAssigned + (anchorRow ? 1 : 0);
    const currentPillarShare = pillarCounts[row.pillar] / Math.max(1, rhythmSlots);
    if (rhythmSlots > 2 && currentPillarShare * 100 > pillarTarget + 15) continue;

    const bucketPressure = daily.length >= counts.daily || weekly.length >= counts.weekly;
    if (!assignRhythmItem(row, daily, weekly, counts, bucketPressure)) continue;

    used.add(row.id);
    pillarCounts[row.pillar] += 1;
    rhythmAssigned += 1;
  }

  // R3 — at least one item per pillar where possible
  for (const pillar of PILLARS) {
    if (pillarCounts[pillar] > 0) continue;
    const filler = candidates.find(
      (r) =>
        !used.has(r.id) && r.pillar === pillar && shouldAssignConditionalInPhase(r, phaseNumber, totalPhases, profile),
    );
    if (!filler) continue;

    if (rhythmAssigned >= rhythmTarget && !extendedOnce) {
      extendedOnce = true;
    } else if (rhythmAssigned >= rhythmTarget) {
      continue;
    }

    if (!assignRhythmItem(filler, daily, weekly, counts, true)) continue;

    used.add(filler.id);
    pillarCounts[filler.pillar] += 1;
    rhythmAssigned += 1;
  }

  // R8 — extend once if high-priority items remain
  if (!extendedOnce && rhythmAssigned >= rhythmTarget) {
    const leftover = candidates.find(
      (r) => !used.has(r.id) && (r.strength === "core" || r.strength === "supporting"),
    );
    if (leftover && assignRhythmItem(leftover, daily, weekly, { daily: counts.daily + 1, weekly: counts.weekly + 1 }, true)) {
      used.add(leftover.id);
      rhythmAssigned += 1;
    }
  }

  rebalanceRhythmBuckets(daily, weekly, counts);

  pairDontRecsWithDo(pool, daily, weekly, used, counts, capacity, phaseNumber, profile);

  injectSecondaryPersonaItems(
    pool,
    profile,
    secondaryInfluenceActive(profile, secondaryBlendPct) ? profile.secondaryPersona : null,
    secondaryInfluenceActive(profile, secondaryBlendPct),
    phaseNumber,
    daily,
    weekly,
    used,
    counts,
    capacity,
  );

  const adjustedAnchor = injectBarrierRhythmItems(
    pool,
    profile,
    phaseNumber,
    daily,
    weekly,
    anchorRow,
    used,
    counts,
  );

  injectLackOfTimeShortVersions(pool, profile, daily, weekly, adjustedAnchor, used, counts);

  backfillRhythmBuckets(
    pool,
    daily,
    weekly,
    counts,
    capacity,
    phaseNumber,
    profile,
    used,
    totalPhases,
    adjustedAnchor?.id ?? null,
  );

  rebalanceRhythmBuckets(daily, weekly, counts);

  return { daily, weekly, anchor: adjustedAnchor };
}

/** Move misclassified items between buckets when the destination still has quota. */
function rebalanceRhythmBuckets(
  daily: PlanRecommendationItem[],
  weekly: PlanRecommendationItem[],
  counts: { daily: number; weekly: number },
): void {
  for (let i = weekly.length - 1; i >= 0; i--) {
    const item = weekly[i]!;
    if (classifyRhythmCadence(item.text, "do") !== "daily") continue;
    if (daily.length >= counts.daily) continue;
    daily.push(item);
    weekly.splice(i, 1);
  }
  for (let i = daily.length - 1; i >= 0; i--) {
    const item = daily[i]!;
    if (classifyRhythmCadence(item.text, "do") !== "weekly") continue;
    if (weekly.length >= counts.weekly) continue;
    weekly.push(item);
    daily.splice(i, 1);
  }
}

function buildGenerationNotes(
  profile: UserProfile,
  fitTier: FitTier,
  secondaryActive: boolean,
  secondaryBlendPct?: number,
): string {
  const notes: string[] = [];

  if (fitTier !== "classic") {
    notes.push(`fit_tier:${fitTier}`);
  }

  if (secondaryActive && profile.secondaryPersona !== profile.primaryPersona) {
    const label = PERSONA_DISPLAY[profile.secondaryPersona]?.label ?? profile.secondaryPersona;
    notes.push(`secondary:${label}@${secondaryBlendPct ?? "?"}%`);
  }

  for (const barrier of profile.barriers) {
    notes.push(`barrier:${barrier}`);
  }

  if (hasHighNeuroticismPersona(profile.primaryPersona)) {
    notes.push("phase1_density_override:high_neuroticism");
  }

  if (profile.goals[0]) {
    notes.push(`goal:${profile.goals[0]}`);
  }

  return notes.join("; ");
}

export function generatePlanOutput(args: {
  ranked: ScoredRecommendation[];
  profile: UserProfile;
  planId?: string;
  secondaryBlendPct?: number;
}): PlanOutput | null {
  const { profile } = args;
  const fitTier = profile.fitTier;
  const secondaryActive = secondaryInfluenceActive(profile, args.secondaryBlendPct);
  const secondaryPersona = secondaryActive ? profile.secondaryPersona : null;

  const resolvedPhases = resolvePhases(profile, fitTier);
  if (resolvedPhases.length === 0) return null;

  const totalPhases = resolvedPhases.length;
  const pool = args.ranked
    .filter(
      (r) =>
        isActionPlanPoolRow(r) &&
        (passesPlanScoreGate(r) ||
          (profile.goalPreferenceBridge && r.id === GOAL_PREFERENCE_BRIDGE_REC_ID)),
    )
    .sort((a, b) => compareScored(a, b));
  const used = new Set<string>();
  const phases: PlanPhaseOutput[] = [];

  let showAllPhases = !hasBarrierOverride(profile, "overwhelm");
  if (
    secondaryActive &&
    secondaryPersona === "self_regulated_planner" &&
    profile.primaryPersona !== "self_regulated_planner"
  ) {
    showAllPhases = true;
  }

  for (const phase of resolvedPhases) {
    const counts = itemCountsForPhase(profile, fitTier, phase.phaseNumber, secondaryPersona, secondaryActive);
    const aeCap = adjustActivationCap(
      phase.activationEnergyCap,
      fitTier,
      phase.phaseNumber,
      profile,
      secondaryPersona,
      secondaryActive,
    );

    const signals = applySecondarySignalOverride(phase, secondaryPersona, secondaryActive, profile.primaryPersona);
    if (fitTier === "exploring") {
      signals.secondary = "emotional_comfort";
    }

    const capacity: PhaseCapacity = applyBarrierCapacityOverrides(
      {
        dailyCount: counts.daily,
        weeklyCount: counts.weekly,
        activationEnergyCap: aeCap,
        eligibleTypes: new Set(phase.eligibleTypes),
        primarySignal: signals.primary,
        secondarySignal: signals.secondary,
      },
      phase.phaseNumber,
      profile,
    );

    const density = pillarDensityForPhase(profile, phase.phaseNumber);
    const assigned = assignPhaseItems(
      pool,
      capacity,
      phase.phaseNumber,
      profile,
      used,
      density,
      counts,
      totalPhases,
      args.secondaryBlendPct,
    );

    let anchor = assigned.anchor;
    if (!anchor) {
      const fallback = pool.find((r) => !used.has(r.id));
      if (fallback) {
        anchor = fallback;
        used.add(fallback.id);
      }
    }

    const pillarDistribution: Record<PillarName, number> = {
      Nutrition: 0,
      "Physical Activity": 0,
      "Sleep & Recovery": 0,
      "Mental Wellness": 0,
    };

    const allItems = [
      ...(anchor ? [anchor] : []),
      ...assigned.daily.map((d) => pool.find((r) => r.id === d.id)).filter(Boolean),
      ...assigned.weekly.map((w) => pool.find((r) => r.id === w.id)).filter(Boolean),
    ] as ScoredRecommendation[];

    for (const row of allItems) {
      pillarDistribution[row.pillar] += 1;
    }

    const anchorHabit = anchor
      ? toPlanItem(anchor)
      : assigned.daily[0] ??
        assigned.weekly[0] ?? {
          id: "fallback",
          text: "Start with one small action.",
          pillar: "Mental Wellness" as PillarName,
        };
    const dailyRhythm = assigned.daily.filter((d) => d.id !== anchor?.id);
    const weeklyRhythm = assigned.weekly;

    const anchorAlternateRow =
      secondaryActive && secondaryPersona === "curious_explorer"
        ? pickAnchorAlternate(pool, capacity, phase.phaseNumber, profile, used, anchor, secondaryPersona, secondaryActive)
        : null;

    phases.push({
      phase_number: phase.phaseNumber,
      name: phase.name,
      intent: phase.intent,
      approx_duration_weeks: phase.durationWeeks,
      anchor_habit: anchorHabit,
      anchor_habit_alternate: anchorAlternateRow ? toPlanItem(anchorAlternateRow) : null,
      daily_rhythm: dailyRhythm,
      weekly_rhythm: weeklyRhythm,
      readiness_signal: {
        primary_type: signals.primary,
        description: buildPhaseReadinessDescription({
          anchor: anchorHabit,
          daily: dailyRhythm,
          weekly: weeklyRhythm,
          primaryType: signals.primary,
          secondaryType: signals.secondary,
          barriers: profile.barriers,
          perfectionismPattern: hasPerfectionismPattern(profile) || hasBarrierOverride(profile, "perfectionism"),
          templateFallback: phase.readinessDescription,
        }),
        secondary_type: signals.secondary,
      },
      activation_energy_cap: aeCap,
      pillar_distribution: pillarDistribution,
    });
  }

  const totalDurationWeeks = phases.reduce((sum, p) => sum + parseDurationWeeks(p.approx_duration_weeks), 0);

  return {
    plan_id: args.planId ?? `plan_${profile.primaryPersona}_${Date.now()}`,
    persona: profile.primaryPersona,
    fit_tier: fitTier,
    secondary_persona: secondaryPersona,
    total_phases: phases.length,
    total_duration_weeks: totalDurationWeeks,
    total_duration_label: formatTotalDurationWeeks(totalDurationWeeks),
    progression_style: PERSONA_PHASE_CONFIG[profile.primaryPersona].progressionStyle,
    phases,
    generation_notes: buildGenerationNotes(profile, fitTier, secondaryActive, args.secondaryBlendPct),
    show_all_phases: showAllPhases,
  };
}
