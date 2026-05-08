import type { AssessmentQuestion } from "@/types/models";
import { coerceAnswer } from "@/lib/scoring/engine";

/** Valid random answers for every question — for manual QA only. */
export function randomAnswersForQuestions(questions: AssessmentQuestion[]): Record<string, number | string | string[]> {
  const next: Record<string, number | string | string[]> = {};

  for (const q of questions) {
    if (q.type === "likert") {
      const min = q.scaleMin ?? 1;
      const max = q.scaleMax ?? 5;
      const span = Math.max(0, max - min);
      next[q.id] = min + Math.floor(Math.random() * (span + 1));
    } else if (q.type === "single") {
      const opts = q.options ?? [];
      if (opts.length) next[q.id] = opts[Math.floor(Math.random() * opts.length)]!;
      else continue;
    } else {
      const opts = q.options ?? [];
      if (!opts.length) continue;
      const picks = opts.filter(() => Math.random() > 0.5);
      next[q.id] = picks.length ? picks : [opts[0]!];
    }

    const coerced = coerceAnswer(q, next[q.id]);
    if (coerced !== null) next[q.id] = coerced;
    else delete next[q.id];
  }

  return next;
}

export function assessmentTestToolsAllowed(): boolean {
  return (
    process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_ENABLE_TEST_TOOLS === "true"
  );
}
