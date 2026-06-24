import { isActionPlanPoolRow } from "@/lib/recommendations/action-pool";
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

type ResolvedPhase = PhaseDefinition & { phaseNumber: number; durationWeeks: string };

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

function hasHighNeuroticismPersona(persona: PersonaKey): boolean {
  return persona === "brittle_avoidant" || persona === "stress_sensitive";
}

function secondaryInfluenceActive(profile: UserProfile, secondaryBlendPct?: number): boolean {
  if (profile.blendStrength === "pure") return false;
  if (typeof secondaryBlendPct === "number") return secondaryBlendPct > 15;
  return profile.blendStrength === "strong_influence";
}

function resolvePhases(profile: UserProfile, fitTier: FitTier): ResolvedPhase[] {
  const base = PERSONA_PHASE_CONFIG[profile.primaryPersona];
  let phases: PhaseDefinition[] = [...base.phases];

  if (fitTier === "exploring") {
    if (profile.primaryPersona === "self_regulated_planner" && base.optionalThirdPhase) {
      phases = [...phases, base.optionalThirdPhase];
    } else if (phases.length < 4 && base.optionalThirdPhase) {
      phases = [...phases, base.optionalThirdPhase];
    } else if (phases.length < 4) {
      const last = phases[phases.length - 1];
      phases = [
        ...phases,
        {
          ...last,
          name: "Settle In",
          intent: "Extra stabilisation time before expanding further.",
          durationWeeks: "2 weeks",
        },
      ];
    }
  }

  return phases.map((phase, index) => {
    let durationWeeks = phase.durationWeeks;
    if (index === 0) {
      if (fitTier === "core" || fitTier === "leaning" || fitTier === "exploring") {
        const baseWeeks = parseDurationWeeks(durationWeeks);
        durationWeeks = `Approximately ${baseWeeks + 1} weeks`;
      }
      if (fitTier === "exploring") {
        const baseWeeks = parseDurationWeeks(durationWeeks);
        durationWeeks = `Approximately ${baseWeeks + 1} weeks`;
      }
    }

    return {
      ...phase,
      phaseNumber: index + 1,
      durationWeeks,
    };
  });
}

function itemCountsForPhase(
  profile: UserProfile,
  fitTier: FitTier,
  phaseNumber: number,
): { daily: number; weekly: number } {
  const config = PERSONA_PHASE_CONFIG[profile.primaryPersona];
  let daily = config.dailyItems.max;
  let weekly = config.weeklyItems.max;

  if (profile.barriers.includes("barrier_overwhelm") && phaseNumber === 1) {
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

  if (profile.barriers.includes("barrier_starting_difficulty") && phaseNumber === 1) {
    cap = Math.min(cap, 2);
  }

  return Math.max(1, cap);
}

function applySecondarySignalOverride(
  phase: ResolvedPhase,
  secondaryPersona: PersonaKey | null,
  secondaryActive: boolean,
): { primary: ReadinessSignalType; secondary: ReadinessSignalType } {
  let primary = phase.primarySignal;
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
      if (phase.phaseNumber >= 2) secondary = "social_embedding";
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

function passesBarrierFilters(row: ScoredRecommendation, profile: UserProfile, phaseNumber: number): boolean {
  if (phaseNumber !== 1) return true;

  if (profile.barriers.includes("barrier_lack_of_time")) {
    const text = row.text.toLowerCase();
    if (text.includes("hour") && !text.includes("15 min") && !text.includes("10 min")) {
      return false;
    }
  }

  if (profile.barriers.includes("barrier_emotional_eating") && row.pillar === "Nutrition" && row.type === "do") {
    return true;
  }

  return true;
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
  if (ae > capacity.activationEnergyCap) return false;

  if (
    profile.barriers.includes("barrier_perfectionism") &&
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
    .sort(compareAnchorCandidates);

  if (profile.barriers.includes("barrier_poor_sleep") && phaseNumber === 1) {
    const sleepHit = candidates.find((r) => r.pillar === "Sleep & Recovery");
    if (sleepHit) return sleepHit;
  }

  if (profile.barriers.includes("barrier_starting_difficulty") && phaseNumber === 1) {
    const firstAction = candidates.find((r) => r.type === "first_action");
    if (firstAction) return firstAction;
  }

  const coreHit = candidates.find((r) => r.strength === "core");
  return coreHit ?? candidates[0] ?? null;
}

function assignPhaseItems(
  pool: ScoredRecommendation[],
  capacity: PhaseCapacity,
  phaseNumber: number,
  profile: UserProfile,
  used: Set<string>,
  density: Record<PillarName, number>,
  counts: { daily: number; weekly: number },
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

  const targetTotal = counts.daily + counts.weekly;
  let assigned = anchorRow ? 1 : 0;
  let extendedOnce = false;

  const candidates = pool
    .filter((r) => !used.has(r.id) && isEligibleForPhase(r, capacity, phaseNumber, profile))
    .filter((r) => PLAN_RHYTHM_TYPES.has(r.type))
    .sort(comparePlanRhythmCandidates);

  const strengthPhaseCutoff = phaseNumber === 1 ? 1 : phaseNumber === 2 ? 2 : 3;

  for (const row of candidates) {
    if (assigned >= targetTotal) break;

    const maxStrength = strengthPhaseCutoff === 1 ? 0 : strengthPhaseCutoff === 2 ? 1 : 2;
    if (strengthRank(row) > maxStrength && row.strength !== "conditional") continue;

    const pillarTarget = density[row.pillar] ?? 25;
    const currentPillarShare = pillarCounts[row.pillar] / Math.max(1, assigned);
    if (assigned > 2 && currentPillarShare * 100 > pillarTarget + 15) continue;

    if (!assignRhythmItem(row, daily, weekly, counts, false)) continue;

    used.add(row.id);
    pillarCounts[row.pillar] += 1;
    assigned += 1;
  }

  // R3 — at least one item per pillar where possible
  for (const pillar of PILLARS) {
    if (pillarCounts[pillar] > 0) continue;
    const filler = candidates.find((r) => !used.has(r.id) && r.pillar === pillar);
    if (!filler) continue;

    if (assigned >= targetTotal && !extendedOnce) {
      extendedOnce = true;
    } else if (assigned >= targetTotal) {
      continue;
    }

    if (!assignRhythmItem(filler, daily, weekly, counts, true)) continue;

    used.add(filler.id);
    pillarCounts[pillar] += 1;
    assigned += 1;
  }

  // R8 — extend once if high-priority items remain
  if (!extendedOnce && assigned >= targetTotal) {
    const leftover = candidates.find(
      (r) => !used.has(r.id) && (r.strength === "core" || r.strength === "supporting"),
    );
    if (leftover && assignRhythmItem(leftover, daily, weekly, { daily: counts.daily + 1, weekly: counts.weekly + 1 }, true)) {
      used.add(leftover.id);
    }
  }

  rebalanceRhythmBuckets(daily, weekly);

  return { daily, weekly, anchor: anchorRow };
}

/** Move daily-labelled items out of weekly (and vice versa) when slots were filled in order. */
function rebalanceRhythmBuckets(daily: PlanRecommendationItem[], weekly: PlanRecommendationItem[]): void {
  for (let i = weekly.length - 1; i >= 0; i--) {
    const item = weekly[i]!;
    if (classifyRhythmCadence(item.text, "do") === "daily") {
      daily.push(item);
      weekly.splice(i, 1);
    }
  }
  for (let i = daily.length - 1; i >= 0; i--) {
    const item = daily[i]!;
    if (classifyRhythmCadence(item.text, "do") === "weekly") {
      weekly.push(item);
      daily.splice(i, 1);
    }
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
  const { ranked, profile } = args;
  const fitTier = profile.fitTier;
  const secondaryActive = secondaryInfluenceActive(profile, args.secondaryBlendPct);
  const secondaryPersona = secondaryActive ? profile.secondaryPersona : null;

  const resolvedPhases = resolvePhases(profile, fitTier);
  if (resolvedPhases.length === 0) return null;

  const pool = ranked.filter((r) => isActionPlanPoolRow(r)).sort(compareCandidates);
  const used = new Set<string>();
  const phases: PlanPhaseOutput[] = [];

  for (const phase of resolvedPhases) {
    const counts = itemCountsForPhase(profile, fitTier, phase.phaseNumber);
    const aeCap = adjustActivationCap(
      phase.activationEnergyCap,
      fitTier,
      phase.phaseNumber,
      profile,
      secondaryPersona,
      secondaryActive,
    );

    const signals = applySecondarySignalOverride(phase, secondaryPersona, secondaryActive);
    if (fitTier === "exploring") {
      signals.secondary = "emotional_comfort";
    }

    const capacity: PhaseCapacity = {
      dailyCount: counts.daily,
      weeklyCount: counts.weekly,
      activationEnergyCap: aeCap,
      eligibleTypes: new Set(phase.eligibleTypes),
      primarySignal: signals.primary,
      secondarySignal: signals.secondary,
    };

    const density = pillarDensityForPhase(profile, phase.phaseNumber);
    const assigned = assignPhaseItems(
      pool,
      capacity,
      phase.phaseNumber,
      profile,
      used,
      density,
      counts,
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

    phases.push({
      phase_number: phase.phaseNumber,
      name: phase.name,
      intent: phase.intent,
      approx_duration_weeks: phase.durationWeeks,
      anchor_habit: anchorHabit,
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
  };
}
