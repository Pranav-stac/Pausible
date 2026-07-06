"use client";

import { useCallback, useMemo, useState } from "react";
import { InlineAnswerEditor, type InlineAnswerDraft } from "@/components/journey/InlineAnswerEditor";
import { BRAND_ACCENT_TEXT } from "@/components/marketing/marketing-brand";
import { coerceAnswer } from "@/lib/scoring/engine";
import type { AttemptAnswerBlock } from "@/lib/admin/format-attempt-answer";
import type { AssessmentDefinition, AssessmentQuestion, AttemptAnswers } from "@/types/models";

function findQuestion(
  assessments: AssessmentDefinition[],
  questionId: string,
): AssessmentQuestion | null {
  for (const def of assessments) {
    const q = def.questions[questionId];
    if (q) return q;
  }
  return null;
}

function draftFromAnswers(question: AssessmentQuestion, answers: AttemptAnswers): InlineAnswerDraft {
  const raw = answers[question.id];
  if (question.type === "likert" && typeof raw === "number") return { value: raw };
  if (question.type === "single" && typeof raw === "string") return { value: raw };
  if (question.type === "multi" && Array.isArray(raw)) return { value: raw as string[] };
  if (question.type === "likert") return { value: question.scaleMin ?? 1 };
  if (question.type === "single") return { value: "" };
  return { value: [] };
}

function ReviewRow({
  row,
  index,
  question,
  answers,
  isEditing,
  isSaving,
  saveError,
  onStartEdit,
  onCancelEdit,
  onSave,
}: {
  row: AttemptAnswerBlock["sections"][0]["rows"][0];
  index: number;
  question: AssessmentQuestion | null;
  answers: AttemptAnswers;
  isEditing: boolean;
  isSaving: boolean;
  saveError: string | null;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (draft: InlineAnswerDraft) => void;
}) {
  const [draft, setDraft] = useState<InlineAnswerDraft | null>(null);

  const startEdit = useCallback(() => {
    if (!question) return;
    setDraft(draftFromAnswers(question, answers));
    onStartEdit();
  }, [answers, onStartEdit, question]);

  const cancelEdit = useCallback(() => {
    setDraft(null);
    onCancelEdit();
  }, [onCancelEdit]);

  const handleSave = useCallback(() => {
    if (!question || !draft) return;
    const coerced = coerceAnswer(question, draft.value);
    if (coerced === null) return;
    onSave({ ...draft, value: coerced });
  }, [draft, onSave, question]);

  const canSave = question && draft ? coerceAnswer(question, draft.value) !== null : false;

  return (
    <article
      className={`flex h-full flex-col rounded-2xl border px-4 py-3.5 sm:px-5 ${
        isEditing
          ? "border-[#2D82FF]/35 bg-[#F7F9FB]/80 ring-1 ring-[#2D82FF]/15"
          : row.answered
            ? "border-slate-100 bg-white"
            : "border-amber-100 bg-amber-50/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Question {index + 1}</p>
        {isEditing ? (
          <button
            type="button"
            onClick={cancelEdit}
            disabled={isSaving}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            disabled={!question}
            className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Change
          </button>
        )}
      </div>
      <h4 className="mt-1 text-sm font-semibold leading-snug text-slate-900">{row.prompt}</h4>
      {row.caption ? <p className="mt-1 text-[11px] text-slate-500">{row.caption}</p> : null}

      {isEditing && question && draft ? (
        <div className="mt-3">
          <InlineAnswerEditor question={question} answers={answers} draft={draft} onDraftChange={setDraft} />
          {saveError ? <p className="mt-3 text-xs text-red-700">{saveError}</p> : null}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || isSaving}
            className={`mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
              canSave ? "bg-linear-to-r from-[#00C9C8] to-[#2D82FF] hover:opacity-95" : "bg-slate-300"
            }`}
          >
            {isSaving ? "Saving…" : "Save answer"}
          </button>
        </div>
      ) : (
        <>
          <p
            className={`mt-2.5 text-sm leading-relaxed ${row.answered ? "font-medium text-slate-800" : "italic text-slate-500"}`}
          >
            {row.display}
          </p>
          {row.detail ? <p className="mt-1 text-[11px] text-slate-500">{row.detail}</p> : null}
        </>
      )}
    </article>
  );
}

export function SubmissionAnswersReview({
  blocks,
  answeredCount,
  totalCount,
  assessments,
  answers,
  onSaveAnswers,
}: {
  blocks: AttemptAnswerBlock[];
  answeredCount: number;
  totalCount: number;
  assessments: AssessmentDefinition[];
  answers: AttemptAnswers;
  onSaveAnswers: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const questionById = useMemo(() => {
    const map = new Map<string, AssessmentQuestion>();
    for (const def of assessments) {
      for (const q of Object.values(def.questions)) {
        map.set(q.id, q);
      }
    }
    return map;
  }, [assessments]);

  const handleSave = useCallback(
    async (questionId: string, draft: InlineAnswerDraft) => {
      const question = questionById.get(questionId);
      if (!question) return;

      setSavingQuestionId(questionId);
      setSaveError(null);
      try {
        const patch: Record<string, unknown> = { [questionId]: draft.value, ...draft.extra };
        await onSaveAnswers(patch);
        setEditingQuestionId(null);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Could not save your answer. Please try again.");
      } finally {
        setSavingQuestionId(null);
      }
    },
    [onSaveAnswers, questionById],
  );

  if (!blocks.length) return null;

  return (
    <div className="space-y-5 text-left">
      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Your responses</p>
          <p className="mt-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">{answeredCount}</span> of{" "}
            <span className="font-semibold text-slate-900">{totalCount}</span> questions recorded across both steps.
          </p>
        </div>
        <p className={`mt-2 text-xs sm:mt-0 sm:max-w-xs sm:text-right ${BRAND_ACCENT_TEXT}`}>
          Tap Change on any answer to edit it here before building your report.
        </p>
      </div>

      {blocks.map((block, blockIdx) => (
        <div key={block.assessmentId} className="space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Step {blockIdx + 1}</p>
            <h2 className="mt-1 text-base font-bold text-slate-950">{block.assessmentTitle}</h2>
          </div>

          {block.sections.map((section) => (
            <section
              key={section.id}
              className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
            >
              <header className="border-b border-slate-100 bg-slate-50/90 px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  {section.title.replace(/^Section \d+ — /, "")}
                </h3>
                {section.description ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{section.description}</p>
                ) : null}
              </header>
              <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
                {section.rows.map((row, idx) => (
                  <ReviewRow
                    key={row.questionId}
                    row={row}
                    index={idx}
                    question={findQuestion(assessments, row.questionId)}
                    answers={answers}
                    isEditing={editingQuestionId === row.questionId}
                    isSaving={savingQuestionId === row.questionId}
                    saveError={editingQuestionId === row.questionId ? saveError : null}
                    onStartEdit={() => {
                      setSaveError(null);
                      setEditingQuestionId(row.questionId);
                    }}
                    onCancelEdit={() => {
                      if (savingQuestionId) return;
                      setSaveError(null);
                      setEditingQuestionId(null);
                    }}
                    onSave={(draft) => void handleSave(row.questionId, draft)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ))}
    </div>
  );
}
