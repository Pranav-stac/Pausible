import type { AssessmentDefinition } from "@/types/models";

/**
 * Estimated maximum raw contribution per dimension (used to show 0–100% bars).
 * Likert assumes full-scale agreement; single/multi mirrors engine heuristics.
 */
export function dimensionMaxContributions(assessment: AssessmentDefinition): Record<string, number> {
  const caps: Record<string, number> = {};
  const addDim = (k: string, v: number) => {
    caps[k] = (caps[k] ?? 0) + v;
  };

  for (const q of Object.values(assessment.questions)) {
    if (q.type === "likert") {
      for (const [dim, w] of Object.entries(q.weights)) addDim(dim, w * 1);
      continue;
    }
    if (q.type === "single") {
      for (const [dim, w] of Object.entries(q.weights)) addDim(dim, (w / 3) * 1.2);
      continue;
    }
    if (q.type === "multi") {
      for (const [dim, w] of Object.entries(q.weights)) addDim(dim, w / 3);
    }
  }
  return caps;
}

export function dimensionPercentages(
  dimensions: Record<string, number>,
  caps: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(dimensions)) {
    const cap = caps[k];
    /** Legacy fallback (~12 pts per dim) when cap missing */
    const denom = cap && cap > 0 ? cap : Math.max(Number(v), 12);
    out[k] = Math.min(100, Math.round((Number(v) / denom) * 100));
  }
  return out;
}
