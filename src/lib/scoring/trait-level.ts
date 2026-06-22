import type { TraitKey } from "@/lib/scoring/persona-types";
import { friendlyTraitLabel } from "@/lib/results/quick-profile";

/** Cay v1.0 bands: low 1–2.99, medium 3–4.99, high 5–7. */
export type TraitScoreBand = "low" | "medium" | "high";

export function traitScoreBand(score: number): TraitScoreBand {
  if (score >= 5) return "high";
  if (score >= 3) return "medium";
  return "low";
}

export function traitScoreBandLabel(band: TraitScoreBand): string {
  if (band === "high") return "High";
  if (band === "medium") return "Medium";
  return "Low";
}

/** Coach guide: compare user score to persona centroid (±0.8 threshold). */
export type CentroidTraitDescriptor = "Higher than typical" | "Typical" | "Lower than typical";

export function traitCentroidDescriptor(
  userScore: number,
  centroidScore: number,
  threshold = 0.8,
): CentroidTraitDescriptor {
  const diff = userScore - centroidScore;
  if (diff >= threshold) return "Higher than typical";
  if (diff <= -threshold) return "Lower than typical";
  return "Typical";
}

export function formatTraitScore(score: number): string {
  return Number.isFinite(score) ? score.toFixed(1) : "—";
}

export type TraitProfileRow = {
  trait: TraitKey;
  label: string;
  score: number;
  scoreFormatted: string;
  band: TraitScoreBand;
  bandLabel: string;
  centroidDescriptor: CentroidTraitDescriptor;
  deviation: number;
  isDeviation: boolean;
};

export function buildTraitProfileRows(
  traitAverages: Record<TraitKey, number>,
  centroid: Record<TraitKey, number>,
  deviationThreshold = 0.8,
): TraitProfileRow[] {
  const traits: TraitKey[] = [
    "openness",
    "conscientiousness",
    "extraversion",
    "agreeableness",
    "neuroticism",
  ];

  return traits.map((trait) => {
    const score = traitAverages[trait] ?? 0;
    const centroidScore = centroid[trait] ?? 0;
    const deviation = score - centroidScore;
    const band = traitScoreBand(score);
    const centroidDescriptor = traitCentroidDescriptor(score, centroidScore, deviationThreshold);

    return {
      trait,
      label: friendlyTraitLabel(trait),
      score,
      scoreFormatted: formatTraitScore(score),
      band,
      bandLabel: traitScoreBandLabel(band),
      centroidDescriptor,
      deviation,
      isDeviation: Math.abs(deviation) >= deviationThreshold,
    };
  });
}
