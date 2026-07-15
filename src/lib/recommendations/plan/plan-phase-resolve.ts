import {
  parseDurationWeeks,
  PERSONA_PHASE_CONFIG,
  type PhaseDefinition,
} from "@/lib/recommendations/plan/phase-config";
import type { UserProfile } from "@/lib/recommendations/types";
import type { FitTier } from "@/lib/scoring/persona-types";

export type ResolvedPhase = PhaseDefinition & { phaseNumber: number; durationWeeks: string };

const OPTIMIZATION_GOALS = new Set([
  "goal_fat_loss",
  "goal_strength",
  "goal_sleep_recovery",
  "goal_energy",
  "goal_overall_health",
]);

const ROUTINE_ONLY_GOALS = new Set([
  "goal_consistency",
  "goal_stress_reduction",
]);

/** §21.2.6 — optional Phase 3 when goals still need refinement beyond the 2-phase system. */
export function steadyElephantGoalsNeedPhase3(profile: UserProfile): boolean {
  if (!profile.goals.length) return true;
  if (profile.goals.every((g) => ROUTINE_ONLY_GOALS.has(g))) return false;
  return profile.goals.some((g) => OPTIMIZATION_GOALS.has(g)) || profile.goals.length > 1;
}

function settleInPhase(last: PhaseDefinition): PhaseDefinition {
  return {
    ...last,
    name: "Settle In",
    intent: "Extra stabilisation time before expanding further.",
    durationWeeks: "2 weeks",
  };
}

function appendExploringPhase(
  phases: PhaseDefinition[],
  base: (typeof PERSONA_PHASE_CONFIG)[keyof typeof PERSONA_PHASE_CONFIG],
): PhaseDefinition[] {
  if (phases.length >= 4) return phases;
  if (base.optionalThirdPhase && !phases.some((p) => p.name === base.optionalThirdPhase!.name)) {
    return [...phases, base.optionalThirdPhase];
  }
  const last = phases[phases.length - 1];
  if (!last) return phases;
  return [...phases, settleInPhase(last)];
}

/** §21.8 — Phase 1 duration adjustments by fit tier. */
export function adjustPhase1DurationWeeks(baseDuration: string, fitTier: FitTier): string {
  const baseWeeks = parseDurationWeeks(baseDuration);
  if (fitTier === "core" || fitTier === "leaning") {
    return `Approximately ${baseWeeks + 1} weeks`;
  }
  if (fitTier === "exploring") {
    return `Approximately ${baseWeeks + 2} weeks`;
  }
  return baseDuration;
}

/** §21.1–21.8 — persona phase list with fit-tier and goal-based adjustments. */
export function resolvePhases(profile: UserProfile, fitTier: FitTier): ResolvedPhase[] {
  const base = PERSONA_PHASE_CONFIG[profile.primaryPersona];
  let phases: PhaseDefinition[] = [...base.phases];

  if (
    profile.primaryPersona === "self_regulated_planner" &&
    base.optionalThirdPhase &&
    steadyElephantGoalsNeedPhase3(profile)
  ) {
    phases = [...phases, base.optionalThirdPhase];
  }

  if (fitTier === "exploring" && phases.length < 4) {
    phases = appendExploringPhase(phases, base);
  }

  return phases.map((phase, index) => ({
    ...phase,
    phaseNumber: index + 1,
    durationWeeks:
      index === 0 ? adjustPhase1DurationWeeks(phase.durationWeeks, fitTier) : phase.durationWeeks,
  }));
}
