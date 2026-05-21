import {
  getWellnessContextQuestionnaire,
  isWellnessContextAnswerKey,
} from "@/data/wellness-context-questionnaire";
import { PERSONA_ANIMAL, PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import { PERSONA_KEYS, type PersonaKey } from "@/lib/scoring/persona-types";
import { personaLabel } from "@/lib/results/persona-display";
import { dimensionRowsForAttempt, type DimensionRow } from "@/lib/results/dimension-rows";
import type { AssessmentDefinition } from "@/types/models";
import type { SerializedAttempt } from "@/lib/local/attempts";

export type PersonaMixRow = { key: PersonaKey; label: string; pct: number };

export type WellnessContextRow = { section: string; prompt: string; answer: string };

export type ResultsReportModel = {
  participantName: string;
  generatedAt: string;
  primaryKey: PersonaKey | null;
  primaryLabel: string;
  primarySummary: string;
  primaryBullets: string[];
  animalName: string | null;
  animalEmoji: string | null;
  animalImagePath: string | null;
  secondaryKey: PersonaKey | null;
  secondaryLabel: string | null;
  secondaryPct: number | null;
  personaMix: PersonaMixRow[];
  dimensions: DimensionRow[];
  wellnessHighlights: WellnessContextRow[];
};

function formatAnswer(raw: unknown): string {
  if (Array.isArray(raw)) return raw.join(", ");
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "string") return raw;
  return "";
}

export function buildWellnessHighlights(answers: Record<string, unknown>): WellnessContextRow[] {
  const def = getWellnessContextQuestionnaire();
  const rows: WellnessContextRow[] = [];

  for (const sec of def.sections) {
    for (const qid of sec.questionIds) {
      const q = def.questions[qid];
      if (!q) continue;
      const raw = answers[qid];
      const answer = formatAnswer(raw);
      if (!answer) continue;
      rows.push({
        section: sec.title.replace(/^Section \d+ — /, ""),
        prompt: q.prompt,
        answer,
      });
    }
  }

  return rows.slice(0, 12);
}

export function buildResultsReportModel(args: {
  attempt: SerializedAttempt;
  assessment: AssessmentDefinition;
  participantName?: string | null;
}): ResultsReportModel {
  const { attempt, assessment, participantName } = args;
  const primaryKey = (attempt.scores?.archetypeKey as PersonaKey | undefined) ?? null;
  const secondaryKey = (attempt.scores?.secondaryArchetypeKey as PersonaKey | undefined) ?? null;
  const primaryCopy = primaryKey ? PERSONA_DISPLAY[primaryKey] : null;
  const animal = primaryKey ? PERSONA_ANIMAL[primaryKey] : null;

  const pcts = attempt.scores?.persona?.personaPercentages;
  const personaMix: PersonaMixRow[] = pcts
    ? [...PERSONA_KEYS]
        .map((k) => ({ key: k, label: PERSONA_DISPLAY[k].label, pct: pcts[k] ?? 0 }))
        .sort((a, b) => b.pct - a.pct)
    : [];

  const wellnessAnswers: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attempt.answers ?? {})) {
    if (isWellnessContextAnswerKey(k)) wellnessAnswers[k] = v;
  }

  const iso = attempt.paidAtIso ?? attempt.createdAtIso;
  const generatedAt = iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "long" }) : new Date().toLocaleDateString();

  return {
    participantName: participantName?.trim() || "Your profile",
    generatedAt,
    primaryKey,
    primaryLabel: primaryKey ? personaLabel(primaryKey) : "Your profile",
    primarySummary: primaryCopy?.summary ?? "",
    primaryBullets: primaryCopy?.bullets ?? [],
    animalName: animal?.name ?? null,
    animalEmoji: animal?.emoji ?? null,
    animalImagePath: animal?.imagePath ?? null,
    secondaryKey,
    secondaryLabel: secondaryKey ? personaLabel(secondaryKey) : null,
    secondaryPct:
      secondaryKey && pcts ? (pcts[secondaryKey] ?? null) : null,
    personaMix,
    dimensions: dimensionRowsForAttempt(assessment, attempt),
    wellnessHighlights: buildWellnessHighlights(wellnessAnswers),
  };
}

/** Short id for report footer (strips wc_ prefix). */
export function reportAttemptRef(attemptId: string): string {
  return attemptId.slice(0, 8).toUpperCase();
}
