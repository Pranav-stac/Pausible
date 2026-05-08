import type {
  AssessmentDefinition,
  AssessmentQuestion,
  AttemptAnswers,
  AttemptScores,
} from "@/types/models";

export function coerceAnswer(question: AssessmentQuestion, raw: unknown): number | string | string[] | null {
  if (question.type === "multi") {
    if (!Array.isArray(raw)) return null;
    return raw.filter((x) => typeof x === "string");
  }
  if (question.type === "single") {
    if (typeof raw !== "string") return null;
    return raw;
  }
  if (question.type === "likert") {
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    const max = question.scaleMax ?? 5;
    const min = question.scaleMin ?? 1;
    return Math.min(max, Math.max(min, Math.round(n)));
  }
  return null;
}

/** Normalized trait contribution 0–1 inside the inclusive scale endpoints. */
function likertContribution(q: AssessmentQuestion, rawScore: number): number {
  const max = q.scaleMax ?? 5;
  const min = q.scaleMin ?? 1;
  const span = Math.max(1e-6, max - min);
  const clipped = Math.min(max, Math.max(min, rawScore));
  const effective = q.reverse ? max + min - clipped : clipped;
  return (effective - min) / span;
}

/**
 * Lightweight scoring: for single/multi contributes `weights * (1/active selections)`.
 * Likert contributes `weights * normalizedScore` with optional reverse scoring.
 */
export function computeScores(
  assessment: AssessmentDefinition,
  answers: AttemptAnswers,
): AttemptScores {
  const dimensions: Record<string, number> = {};
  const addDim = (k: string, v: number) => {
    dimensions[k] = (dimensions[k] ?? 0) + v;
  };

  for (const q of Object.values(assessment.questions)) {
    const a = answers[q.id];
    if (a === undefined || a === null) continue;

    if (q.type === "likert") {
      const raw = typeof a === "number" ? a : null;
      if (raw === null) continue;
      const factor = likertContribution(q, raw);
      Object.entries(q.weights).forEach(([dim, w]) => addDim(dim, w * factor));
    } else if (q.type === "single") {
      const sel = typeof a === "string" ? a : "";
      const idx = (q.options ?? []).indexOf(sel);
      if (idx < 0) continue;
      const weightScale = ((idx + 1) / (q.options?.length ?? 1)) * 1.2;
      Object.entries(q.weights).forEach(([dim, w]) => addDim(dim, (w / 3) * weightScale));
    } else if (q.type === "multi") {
      const selections = Array.isArray(a) ? a : [];
      if (!selections.length) continue;
      const per = 1 / selections.length;
      selections.forEach((sel) => {
        const idx = (q.options ?? []).indexOf(String(sel));
        if (idx < 0) return;
        const weightScale = (idx + 1) / (q.options?.length ?? 1);
        Object.entries(q.weights).forEach(([dim, w]) =>
          addDim(dim, ((w / 3) * weightScale * per)),
        );
      });
    }
  }

  const archetypeKey = pickArchetype(assessment, dimensions);

  return { dimensions, archetypeKey };
}

function pickArchetype(
  assessment: AssessmentDefinition,
  scores: Record<string, number>,
): string | undefined {
  const bands = assessment.interpretation?.archetypes;
  if (!bands?.length) return undefined;

  const usesClassicFitness =
    ("drive" in scores || "structure" in scores || "recovery" in scores) &&
    bands.some((b) => ["driver", "architect", "balancer"].includes(b.key));

  if (usesClassicFitness) {
    const rank = ["drive", "structure", "recovery"] as const;
    const winner = [...rank].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0))[0];

    if (winner === "drive") return bands.find((b) => b.key === "driver")?.key ?? bands[0].key;
    if (winner === "structure") {
      return bands.find((b) => b.key === "architect")?.key ?? bands[1]?.key ?? bands[0].key;
    }
    return bands.find((b) => b.key === "balancer")?.key ?? bands[2]?.key ?? bands[0].key;
  }

  /** Big-five / generic: archetype.key matches dimension aggregates */
  let bestKey = bands[0].key;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const b of bands) {
    let s = scores[b.key];
    if (typeof s !== "number") {
      const match = Object.entries(scores).find(([dim]) => dim.toLowerCase() === b.key.toLowerCase())?.[1];
      s = typeof match === "number" ? match : Number.NEGATIVE_INFINITY;
    }
    if (s > bestScore) {
      bestScore = s;
      bestKey = b.key;
    }
  }
  return bestKey;
}
