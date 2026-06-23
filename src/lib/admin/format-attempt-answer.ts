import type { AssessmentDefinition, AssessmentQuestion } from "@/types/models";
import { coerceAnswer } from "@/lib/scoring/engine";

export type FormattedAttemptAnswer = {
  display: string;
  detail?: string;
  answered: boolean;
};

function formatRawValue(raw: unknown): string {
  if (Array.isArray(raw)) return raw.join(", ");
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "string") return raw;
  if (raw == null) return "";
  return JSON.stringify(raw);
}

export function formatAttemptAnswer(q: AssessmentQuestion, raw: unknown): FormattedAttemptAnswer {
  const coerced = coerceAnswer(q, raw);
  if (coerced === null) {
    return { display: "Not answered", answered: false };
  }

  if (q.type === "likert" && typeof coerced === "number") {
    const min = q.scaleMin ?? 1;
    const max = q.scaleMax ?? 5;
    if (q.options?.length) {
      const idx = coerced - min;
      const label = q.options[idx];
      if (label) {
        return { display: label, detail: `${coerced} of ${max}`, answered: true };
      }
    }
    if (coerced === min && q.scaleMinLabel) {
      return { display: q.scaleMinLabel, detail: `${coerced} of ${max}`, answered: true };
    }
    if (coerced === max && q.scaleMaxLabel) {
      return { display: q.scaleMaxLabel, detail: `${coerced} of ${max}`, answered: true };
    }
    const span = `${min}–${max}`;
    const endpoints =
      q.scaleMinLabel && q.scaleMaxLabel ? ` (${q.scaleMinLabel} ↔ ${q.scaleMaxLabel})` : "";
    return { display: String(coerced), detail: `Scale ${span}${endpoints}`, answered: true };
  }

  if (q.type === "single" && typeof coerced === "string") {
    return { display: coerced, answered: true };
  }

  if (q.type === "multi" && Array.isArray(coerced)) {
    return {
      display: coerced.join(", "),
      detail: coerced.length === 1 ? "1 selected" : `${coerced.length} selected`,
      answered: true,
    };
  }

  return { display: formatRawValue(coerced), answered: true };
}

export type AttemptAnswerRow = {
  questionId: string;
  prompt: string;
  caption?: string;
  type: AssessmentQuestion["type"];
  display: string;
  detail?: string;
  answered: boolean;
};

export type AttemptAnswerSection = {
  id: string;
  title: string;
  description?: string;
  rows: AttemptAnswerRow[];
};

export type AttemptAnswerBlock = {
  assessmentId: string;
  assessmentTitle: string;
  sections: AttemptAnswerSection[];
};

export type OrphanAnswerRow = {
  questionId: string;
  display: string;
};

function blockForAssessment(
  def: AssessmentDefinition,
  answers: Record<string, unknown>,
): AttemptAnswerBlock {
  const sections: AttemptAnswerSection[] = def.sections.map((sec) => {
    const rows: AttemptAnswerRow[] = [];
    for (const qid of sec.questionIds) {
      const q = def.questions[qid];
      if (!q) continue;
      const formatted = formatAttemptAnswer(q, answers[qid]);
      rows.push({
        questionId: q.id,
        prompt: q.prompt,
        caption: q.caption,
        type: q.type,
        display: formatted.display,
        detail: formatted.detail,
        answered: formatted.answered,
      });
    }
    return {
      id: sec.id,
      title: sec.title,
      description: sec.description,
      rows,
    };
  });

  return {
    assessmentId: def.id,
    assessmentTitle: def.title,
    sections,
  };
}

export function buildAttemptAnswerBlocks(
  assessments: AssessmentDefinition[],
  answers: Record<string, unknown>,
): AttemptAnswerBlock[] {
  return assessments.map((def) => blockForAssessment(def, answers));
}

export function buildOrphanAnswerRows(
  assessments: AssessmentDefinition[],
  answers: Record<string, unknown>,
): OrphanAnswerRow[] {
  const knownIds = new Set(assessments.flatMap((def) => Object.keys(def.questions)));
  return Object.entries(answers)
    .filter(([key]) => !knownIds.has(key))
    .map(([questionId, raw]) => ({ questionId, display: formatRawValue(raw) || "—" }));
}

export function countAnsweredRows(blocks: AttemptAnswerBlock[]): { answered: number; total: number } {
  let answered = 0;
  let total = 0;
  for (const block of blocks) {
    for (const section of block.sections) {
      for (const row of section.rows) {
        total += 1;
        if (row.answered) answered += 1;
      }
    }
  }
  return { answered, total };
}
