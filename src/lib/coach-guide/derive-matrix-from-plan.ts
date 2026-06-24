import type { CoachGuideDocument, CoachGuidePillarMatrix } from "@/lib/coach-guide/types";
import { buildPlanAlignmentNotes } from "@/lib/coach-guide/plan-coach-alignment";
import { toPlanActionLine } from "@/lib/recommendations/plan/plan-phase-display";
import type {
  IntegratedPlanSynthesis,
  PillarName,
  PlanOutput,
} from "@/lib/recommendations/types";

const PILLARS: PillarName[] = [
  "Physical Activity",
  "Nutrition",
  "Sleep & Recovery",
  "Mental Wellness",
];

type PillarBucket = {
  anchors: { text: string; phase: number }[];
  daily: { text: string; phase: number }[];
  weekly: { text: string; phase: number }[];
};

const ENV_PATTERN =
  /\b(home|gym|bedroom|environment|quiet|private|off-peak|screen|phone|meal prep|stock|buffer|outdoors|kitchen)\b/i;
const RECOVERY_PATTERN =
  /\b(miss|backup|restart|recovery|bad night|off meal|if i|when flat|pause|disruption|deload|wind-down)\b/i;

function emptyBuckets(): Record<PillarName, PillarBucket> {
  return {
    Nutrition: { anchors: [], daily: [], weekly: [] },
    "Physical Activity": { anchors: [], daily: [], weekly: [] },
    "Sleep & Recovery": { anchors: [], daily: [], weekly: [] },
    "Mental Wellness": { anchors: [], daily: [], weekly: [] },
  };
}

function collectPillarBuckets(
  planOutput: PlanOutput,
  integratedPlan: IntegratedPlanSynthesis,
): Record<PillarName, PillarBucket> {
  const buckets = emptyBuckets();

  for (const phase of planOutput.phases) {
    const copy = integratedPlan.phases.find((p) => p.phase_number === phase.phase_number);
    const anchorText = toPlanActionLine(
      copy?.anchor_habit_user ?? phase.anchor_habit.text,
      120,
    );
    buckets[phase.anchor_habit.pillar].anchors.push({
      text: anchorText,
      phase: phase.phase_number,
    });

    phase.daily_rhythm.forEach((item, i) => {
      const text = toPlanActionLine(copy?.daily_rhythm_user?.[i] ?? item.text, 100);
      if (text) buckets[item.pillar].daily.push({ text, phase: phase.phase_number });
    });

    phase.weekly_rhythm.forEach((item, i) => {
      const text = toPlanActionLine(copy?.weekly_rhythm_user?.[i] ?? item.text, 100);
      if (text) buckets[item.pillar].weekly.push({ text, phase: phase.phase_number });
    });
  }

  return buckets;
}

function joinCell(parts: string[], fallback: string, maxParts = 2): string {
  const unique = [...new Set(parts.map((p) => p.trim()).filter(Boolean))].slice(0, maxParts);
  if (!unique.length) return fallback;
  if (unique.length === 1) return unique[0]!;
  return `${unique[0]}. ${unique[1]}`;
}

function itemsForPhase(buckets: PillarBucket, phase: number, kind: "daily" | "weekly"): string[] {
  return buckets[kind].filter((x) => x.phase === phase).map((x) => x.text);
}

function itemsFromPhase2Plus(buckets: PillarBucket, kind: "anchors" | "weekly"): string[] {
  return buckets[kind].filter((x) => x.phase > 1).map((x) => x.text);
}

function matchingItems(items: string[], pattern: RegExp): string[] {
  return items.filter((t) => pattern.test(t));
}

/** Map integrated plan items → pillar × dimension matrix (Structure / Environment / Progression / Recovery). */
export function deriveCoachMatrixFromPlan(
  planOutput: PlanOutput,
  integratedPlan: IntegratedPlanSynthesis,
  personaFallback: CoachGuidePillarMatrix,
): CoachGuidePillarMatrix {
  const buckets = collectPillarBuckets(planOutput, integratedPlan);
  const result: CoachGuidePillarMatrix = {
    structure: {},
    environment: {},
    progression: {},
    recoveryProtocol: {},
  };

  for (const pillar of PILLARS) {
    const bucket = buckets[pillar];
    const phase1Daily = itemsForPhase(bucket, 1, "daily");
    const phase1Weekly = itemsForPhase(bucket, 1, "weekly");
    const allDaily = bucket.daily.map((x) => x.text);
    const allWeekly = bucket.weekly.map((x) => x.text);
    const phase1Anchor = bucket.anchors.find((a) => a.phase === 1)?.text;
    const laterAnchors = itemsFromPhase2Plus(bucket, "anchors");

    const structureParts: string[] = [];
    if (phase1Anchor && planOutput.phases[0]?.anchor_habit.pillar === pillar) {
      structureParts.push(phase1Anchor);
    }
    structureParts.push(...phase1Daily.slice(0, 1));
    if (!structureParts.length && bucket.anchors[0]?.text) {
      structureParts.push(bucket.anchors[0].text);
    }

    const envCandidates = [
      ...matchingItems([...phase1Daily, ...allDaily], ENV_PATTERN),
      ...phase1Daily.slice(1, 2),
    ];

    const progressionParts = [...phase1Weekly, ...allWeekly.slice(0, 2), ...laterAnchors.slice(0, 1)];

    const recoveryCandidates = [
      ...matchingItems([...allWeekly, ...allDaily], RECOVERY_PATTERN),
      ...integratedPlan.phases
        .filter((p) => {
          const engine = planOutput.phases.find((ph) => ph.phase_number === p.phase_number);
          return engine?.anchor_habit.pillar === pillar;
        })
        .map((p) => toPlanActionLine(p.readiness_signal_user, 100))
        .filter(Boolean)
        .slice(0, 1),
    ];

    result.structure[pillar] = joinCell(structureParts, personaFallback.structure[pillar] ?? "");
    result.environment[pillar] = joinCell(envCandidates, personaFallback.environment[pillar] ?? "");
    result.progression[pillar] = joinCell(progressionParts, personaFallback.progression[pillar] ?? "");
    result.recoveryProtocol[pillar] = joinCell(
      recoveryCandidates,
      personaFallback.recoveryProtocol[pillar] ?? "",
    );
  }

  return result;
}

export type PlanPhasePillarSummary = {
  phase_number: number;
  name: string;
  anchorPillar: PillarName;
  pillars: PillarName[];
};

/** Which pillars each phase touches — for coach ↔ plan cross-reference. */
export function summarizePlanPhasePillars(planOutput: PlanOutput): PlanPhasePillarSummary[] {
  return planOutput.phases.map((phase) => {
    const pillars = new Set<PillarName>([phase.anchor_habit.pillar]);
    for (const item of [...phase.daily_rhythm, ...phase.weekly_rhythm]) {
      pillars.add(item.pillar);
    }
    return {
      phase_number: phase.phase_number,
      name: phase.name,
      anchorPillar: phase.anchor_habit.pillar,
      pillars: PILLARS.filter((p) => pillars.has(p)),
    };
  });
}

export function syncCoachGuideWithIntegratedPlan(
  guide: CoachGuideDocument,
  planOutput: PlanOutput,
  integratedPlan: IntegratedPlanSynthesis,
): CoachGuideDocument {
  return {
    ...guide,
    clientIntegratedPlan: {
      planOutput,
      synthesis: integratedPlan,
    },
    planPhaseSummary: summarizePlanPhasePillars(planOutput),
    planAlignmentNotes: buildPlanAlignmentNotes(planOutput, integratedPlan),
    matrixSyncedFromPlan: false,
  };
}
