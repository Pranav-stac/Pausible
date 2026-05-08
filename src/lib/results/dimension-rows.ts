import type { AssessmentDefinition } from "@/types/models";
import type { SerializedAttempt } from "@/lib/local/attempts";
import { dimensionMaxContributions, dimensionPercentages } from "@/lib/scoring/dimension-caps";

export type DimensionRow = { key: string; label: string; pct: number };

function dimensionLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Ordered trait rows matching the premium results breakdown. */
export function dimensionRowsForAttempt(
  assessment: AssessmentDefinition,
  attempt: SerializedAttempt | null | undefined,
): DimensionRow[] {
  const dims = attempt?.scores?.dimensions;
  if (!dims) return [];
  const caps = dimensionMaxContributions(assessment);
  const raw = dimensionPercentages(dims, caps);
  const prio = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"] as const;
  const prioSet = new Set<string>(prio);
  const keys = Object.keys(raw);
  const ordered = [...prio.filter((p) => keys.includes(p)), ...keys.filter((k) => !prioSet.has(k)).sort()];
  return ordered.map((k) => ({ key: k, label: dimensionLabel(k), pct: raw[k] ?? 0 }));
}
