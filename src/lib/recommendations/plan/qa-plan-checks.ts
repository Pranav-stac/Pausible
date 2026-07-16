import { resolvePhaseItemTargets } from "@/lib/recommendations/plan/plan-generator";
import type {
  IntegratedPlanSynthesis,
  PlanOutput,
  UserProfile,
} from "@/lib/recommendations/types";
import type { FitTier, PersonaKey } from "@/lib/scoring/persona-types";

export type PlanQaCheckResult = {
  failures: string[];
  warnings: string[];
};

const VAGUE_PROGRESSION =
  /\b(add more|increase gradually|do more|ramp up|build up gradually)\b/i;

function normalizeItemText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function phaseRhythmTexts(
  planOutput: PlanOutput,
  integrated: IntegratedPlanSynthesis | null,
): Array<{ phase: number; texts: string[] }> {
  return planOutput.phases.map((phase, index) => {
    const userPhase = integrated?.phases.find((p) => p.phase_number === phase.phase_number);
    const daily =
      userPhase?.daily_rhythm_user?.length
        ? userPhase.daily_rhythm_user
        : phase.daily_rhythm.map((r) => r.text);
    const weekly =
      userPhase?.weekly_rhythm_user?.length
        ? userPhase.weekly_rhythm_user
        : phase.weekly_rhythm.map((r) => r.text);
    const anchor =
      userPhase?.anchor_habit_user?.trim() ||
      phase.anchor_habit?.text ||
      "";
    return {
      phase: phase.phase_number,
      texts: [anchor, ...daily, ...weekly].map(normalizeItemText).filter(Boolean),
    };
  });
}

/**
 * PDA §39 check 10 PHASES — distinct items, persona min counts, numeric progression.
 * Runs on deterministic plan_output (+ optional AI wording).
 */
export function runPlanQaChecks(
  planOutput: PlanOutput,
  profile: UserProfile,
  integrated: IntegratedPlanSynthesis | null = null,
): PlanQaCheckResult {
  const failures: string[] = [];
  const warnings: string[] = [];

  const secondaryActive =
    typeof profile.secondaryBlendPct === "number" && profile.secondaryBlendPct > 15;
  const secondaryPersona = (planOutput.secondary_persona ??
    (secondaryActive ? profile.secondaryPersona : null)) as PersonaKey | null;
  const fitTier = planOutput.fit_tier as FitTier;

  const byPhase = phaseRhythmTexts(planOutput, integrated);
  const seen = new Map<string, number>();
  for (const { phase, texts } of byPhase) {
    for (const text of texts) {
      const prior = seen.get(text);
      if (prior != null && prior !== phase) {
        failures.push(
          `qa_phases: item repeats verbatim across phase ${prior} and phase ${phase}`,
        );
      } else if (prior == null) {
        seen.set(text, phase);
      }
    }
  }

  for (const phase of planOutput.phases) {
    const targets = resolvePhaseItemTargets(
      profile,
      fitTier,
      phase.phase_number,
      secondaryPersona,
      secondaryActive,
    );
    if (phase.daily_rhythm.length < targets.daily) {
      failures.push(
        `qa_phases: phase ${phase.phase_number} daily ${phase.daily_rhythm.length} < required ${targets.daily}`,
      );
    }
    if (phase.weekly_rhythm.length < targets.weekly) {
      failures.push(
        `qa_phases: phase ${phase.phase_number} weekly ${phase.weekly_rhythm.length} < required ${targets.weekly}`,
      );
    }
  }

  const progressionSnippets = [
    ...(integrated?.phases.map((p) => `${p.phase_intent_user} ${p.readiness_signal_user}`) ?? []),
    ...planOutput.phases.map((p) => `${p.intent} ${p.readiness_signal.description}`),
  ];

  for (const snippet of progressionSnippets) {
    if (!VAGUE_PROGRESSION.test(snippet)) continue;
    // Reset lastIndex for global-less reuse; test() on non-/g is fine but re-match locally.
    const local = snippet.match(/\b(add more|increase gradually|do more|ramp up|build up gradually)\b/i);
    if (!local || local.index == null) continue;
    const window = snippet.slice(Math.max(0, local.index - 24), local.index + local[0].length + 24);
    if (!/\d/.test(window)) {
      failures.push(`qa_phases: vague progression "${local[0]}" without a number`);
      break;
    }
  }

  return { failures, warnings };
}

/** Deterministic fallback: de-dupe verbatim rhythm texts across phases (keep first occurrence). */
export function dedupePlanPhaseItems(planOutput: PlanOutput): PlanOutput {
  const used = new Set<string>();
  const phases = planOutput.phases.map((phase) => {
    const keep = (items: typeof phase.daily_rhythm) =>
      items.filter((item) => {
        const key = normalizeItemText(item.text);
        if (!key || used.has(key)) return false;
        used.add(key);
        return true;
      });
    const anchorKey = normalizeItemText(phase.anchor_habit.text);
    if (anchorKey) used.add(anchorKey);
    return {
      ...phase,
      daily_rhythm: keep(phase.daily_rhythm),
      weekly_rhythm: keep(phase.weekly_rhythm),
    };
  });
  return { ...planOutput, phases };
}
