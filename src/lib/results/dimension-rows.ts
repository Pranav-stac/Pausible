import type { AssessmentDefinition } from "@/types/models";
import type { SerializedAttempt } from "@/lib/local/attempts";
import { dimensionMaxContributions, dimensionPercentages } from "@/lib/scoring/dimension-caps";
import { traitScoreBand, traitScoreBandLabel, formatTraitScore } from "@/lib/scoring/trait-level";
import { friendlyTraitLabel } from "@/lib/results/quick-profile";
import type { TraitKey } from "@/lib/scoring/persona-types";

export type DimensionRow = {
  key: string;
  label: string;
  /** Legacy 0–100 meter — kept for story poster compatibility. */
  pct: number;
  score: number;
  scoreFormatted: string;
  band: string;
  bandLabel: string;
};

function traitMeterPercent(traitAvg: number, min = 1, max = 7): number {
  const span = Math.max(1e-6, max - min);
  const clipped = Math.min(max, Math.max(min, traitAvg));
  return Math.round(((clipped - min) / span) * 100);
}

/** Ordered trait rows using Cay v1.0 score bands (not misleading 0–100 as "high"). */
export function dimensionRowsForAttempt(
  assessment: AssessmentDefinition,
  attempt: SerializedAttempt | null | undefined,
): DimensionRow[] {
  const dims = attempt?.scores?.dimensions;
  const personaTraits = attempt?.scores?.persona?.traitAverages;
  if (personaTraits) {
    const prio: TraitKey[] = [
      "openness",
      "conscientiousness",
      "extraversion",
      "agreeableness",
      "neuroticism",
    ];
    return prio.map((k) => {
      const score = personaTraits[k] ?? 0;
      const band = traitScoreBand(score);
      return {
        key: k,
        label: friendlyTraitLabel(k),
        pct: traitMeterPercent(score),
        score,
        scoreFormatted: formatTraitScore(score),
        band,
        bandLabel: traitScoreBandLabel(band),
      };
    });
  }

  if (!dims) return [];

  const caps = dimensionMaxContributions(assessment);
  const raw = dimensionPercentages(dims, caps);
  const prio = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"] as const;
  const prioSet = new Set<string>(prio);
  const keys = Object.keys(raw);
  const ordered = [...prio.filter((p) => keys.includes(p)), ...keys.filter((k) => !prioSet.has(k)).sort()];
  return ordered.map((k) => {
    const score = (raw[k] ?? 0) / 100 * 6 + 1;
    const band = traitScoreBand(score);
    return {
      key: k,
      label: friendlyTraitLabel(k as TraitKey),
      pct: raw[k] ?? 0,
      score,
      scoreFormatted: formatTraitScore(score),
      band,
      bandLabel: traitScoreBandLabel(band),
    };
  });
}
