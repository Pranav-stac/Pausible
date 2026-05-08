"use client";

import { useCallback, useMemo, useState } from "react";
import type { AssessmentDefinition, AssessmentQuestion, AssessmentSection } from "@/types/models";

function newQuestionId(existing: Record<string, AssessmentQuestion>): string {
  let n = 1;
  while (existing[`q_${n}`]) n++;
  return `q_${n}`;
}

function newSectionId(sections: AssessmentSection[]): string {
  let n = 1;
  while (sections.some((s) => s.id === `section_${n}`)) n++;
  return `section_${n}`;
}

function weightsToText(w: Record<string, number>): string {
  return Object.entries(w)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

function textToWeights(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const m = /^([^:]+):\s*([\d.-]+)/.exec(t);
    if (m) out[m[1].trim()] = Number(m[2]);
  }
  return out;
}

export function AssessmentUiEditor({
  draft,
  onChange,
}: {
  draft: AssessmentDefinition;
  onChange: (next: AssessmentDefinition) => void;
}) {
  const [activeQ, setActiveQ] = useState<string | null>(() =>
    Object.keys(draft.questions)[0] ?? null,
  );

  const q = activeQ ? draft.questions[activeQ] : null;

  const updateAssessment = useCallback(
    (patch: Partial<AssessmentDefinition>) => {
      onChange({ ...draft, ...patch });
    },
    [draft, onChange],
  );

  const updateSection = useCallback(
    (sectionId: string, patch: Partial<AssessmentSection>) => {
      const sections = draft.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s));
      updateAssessment({ sections });
    },
    [draft.sections, updateAssessment],
  );

  const addSection = useCallback(() => {
    const id = newSectionId(draft.sections);
    const qid = newQuestionId(draft.questions);
    const newQ: AssessmentQuestion = {
      id: qid,
      prompt: "New question",
      type: "likert",
      scaleMin: 1,
      scaleMax: 7,
      reverse: false,
      weights: { openness: 1 },
    };
    updateAssessment({
      sections: [...draft.sections, { id, title: "New section", questionIds: [qid] }],
      questions: { ...draft.questions, [qid]: newQ },
    });
    setActiveQ(qid);
  }, [draft.sections, draft.questions, updateAssessment]);

  const removeSection = useCallback(
    (sectionId: string) => {
      const sec = draft.sections.find((s) => s.id === sectionId);
      if (!sec) return;
      const nextQs = { ...draft.questions };
      for (const qid of sec.questionIds) delete nextQs[qid];
      updateAssessment({
        sections: draft.sections.filter((s) => s.id !== sectionId),
        questions: nextQs,
      });
      setActiveQ((cur) => (cur && sec.questionIds.includes(cur) ? null : cur));
    },
    [draft.sections, draft.questions, updateAssessment],
  );

  const addQuestionToSection = useCallback(
    (sectionId: string) => {
      const qid = newQuestionId(draft.questions);
      const newQ: AssessmentQuestion = {
        id: qid,
        prompt: "New question",
        type: "likert",
        scaleMin: 1,
        scaleMax: 7,
        reverse: false,
        weights: { openness: 1 },
      };
      const sections = draft.sections.map((s) =>
        s.id === sectionId ? { ...s, questionIds: [...s.questionIds, qid] } : s,
      );
      updateAssessment({
        sections,
        questions: { ...draft.questions, [qid]: newQ },
      });
      setActiveQ(qid);
    },
    [draft.sections, draft.questions, updateAssessment],
  );

  const removeQuestionFromSection = useCallback(
    (sectionId: string, qid: string) => {
      const sections = draft.sections.map((s) =>
        s.id === sectionId ? { ...s, questionIds: s.questionIds.filter((x) => x !== qid) } : s,
      );
      const nextQs = { ...draft.questions };
      delete nextQs[qid];
      updateAssessment({ sections, questions: nextQs });
      setActiveQ((cur) => (cur === qid ? null : cur));
    },
    [draft.sections, draft.questions, updateAssessment],
  );

  const updateQuestion = useCallback(
    (qid: string, patch: Partial<AssessmentQuestion>) => {
      const prev = draft.questions[qid];
      if (!prev) return;
      onChange({
        ...draft,
        questions: { ...draft.questions, [qid]: { ...prev, ...patch, id: qid } },
      });
    },
    [draft, onChange],
  );

  const archetypes = draft.interpretation?.archetypes ?? [];

  const setArchetypes = useCallback(
    (
      rows: NonNullable<
        NonNullable<AssessmentDefinition["interpretation"]>["archetypes"]
      >,
    ) => {
      updateAssessment({
        interpretation: {
          ...draft.interpretation,
          archetypes: rows,
        },
      });
    },
    [draft.interpretation, updateAssessment],
  );

  const sectionList = useMemo(
    () =>
      draft.sections.map((s) => ({
        ...s,
        questions: s.questionIds.map((id) => draft.questions[id]).filter(Boolean),
      })),
    [draft.sections, draft.questions],
  );

  const activePreview =
    activeQ && draft.questions[activeQ]
      ? draft.questions[activeQ].prompt.replace(/\s+/g, " ").trim().slice(0, 72)
      : "";

  return (
    <div className="max-w-full space-y-4 overflow-x-hidden">
      <div className="rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm text-sky-950">
        <p className="font-semibold">Visual editor tips</p>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-sky-900/95">
          <li>Tap a question id in any section to load it in the editor on the right (desktop).</li>
          <li>Weights use one trait per line — same keys as scoring (example: conscientiousness: 1).</li>
          <li>Inactive assessments are hidden from public takers; save in Admin before testing.</li>
        </ul>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assessment</h4>
          <div className="mt-3 space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Title
              <input
                value={draft.title}
                onChange={(e) => updateAssessment({ title: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Description
              <textarea
                value={draft.description ?? ""}
                onChange={(e) => updateAssessment({ description: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={draft.active !== false}
                onChange={(e) => updateAssessment({ active: e.target.checked })}
              />
              Active (published)
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sections</h4>
            <button
              type="button"
              onClick={() => void addSection()}
              className="min-h-10 shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              + Section
            </button>
          </div>
          <div className="mt-3 space-y-4">
            {sectionList.map((s) => (
              <div key={s.id} className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                <div className="flex flex-wrap gap-2">
                  <input
                    value={s.title}
                    onChange={(e) => updateSection(s.id, { title: e.target.value })}
                    className="min-w-[120px] flex-1 rounded border border-slate-200 px-2 py-1 text-sm font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => void addQuestionToSection(s.id)}
                    className="min-h-10 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                  >
                    + Question
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeSection(s.id)}
                    className="min-h-10 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Remove section
                  </button>
                </div>
                <p className="mt-1 font-mono text-[10px] text-slate-500">id: {s.id}</p>
                <ul className="mt-2 space-y-1">
                  {s.questionIds.map((qid) => (
                    <li key={qid} className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveQ(qid)}
                        className={`flex min-h-11 flex-1 flex-col gap-0.5 rounded-xl px-3 py-2 text-left ${
                          activeQ === qid ? "bg-sky-100 text-sky-950 ring-2 ring-sky-300" : "bg-white hover:bg-slate-100"
                        }`}
                      >
                        <span className="font-mono text-[11px] font-semibold">{qid}</span>
                        {draft.questions[qid] ? (
                          <span className="line-clamp-2 text-[11px] text-slate-600">
                            {draft.questions[qid].prompt.replace(/\s+/g, " ").trim()}
                          </span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeQuestionFromSection(s.id, qid)}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-lg font-medium text-red-600 hover:bg-red-50"
                        aria-label={`Remove question ${qid}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question editor</h4>
            {activeQ ? (
              <span className="max-w-[min(100%,14rem)] truncate text-[10px] font-medium text-slate-400" title={activePreview}>
                {activePreview}
                {activePreview.length >= 72 ? "…" : ""}
              </span>
            ) : null}
          </div>
          {!q ? (
            <p className="mt-3 text-sm text-slate-500">Select a question from the left.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="font-mono text-[11px] text-slate-500">{q.id}</p>
              <label className="block text-xs font-semibold text-slate-700">
                Prompt
                <textarea
                  value={q.prompt}
                  onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Caption / code
                <input
                  value={q.caption ?? ""}
                  onChange={(e) => updateQuestion(q.id, { caption: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                Type
                <select
                  value={q.type}
                  onChange={(e) =>
                    updateQuestion(q.id, {
                      type: e.target.value as AssessmentQuestion["type"],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="likert">Likert</option>
                  <option value="single">Single choice</option>
                  <option value="multi">Multi choice</option>
                </select>
              </label>
              {q.type === "likert" ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Scale min
                    <input
                      type="number"
                      value={q.scaleMin ?? 1}
                      onChange={(e) => updateQuestion(q.id, { scaleMin: Number(e.target.value) })}
                      className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Scale max
                    <input
                      type="number"
                      value={q.scaleMax ?? 7}
                      onChange={(e) => updateQuestion(q.id, { scaleMax: Number(e.target.value) })}
                      className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="col-span-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(q.reverse)}
                      onChange={(e) => updateQuestion(q.id, { reverse: e.target.checked })}
                    />
                    Reverse-keyed item
                  </label>
                </div>
              ) : null}
              <label className="block text-xs font-semibold text-slate-700">
                Dimension weights <span className="font-normal text-slate-400">one per line: key: weight</span>
                <textarea
                  value={weightsToText(q.weights)}
                  onChange={(e) => updateQuestion(q.id, { weights: textToWeights(e.target.value) })}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
                />
              </label>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Archetypes (scoring)</h4>
            <button
              type="button"
              onClick={() =>
                setArchetypes([
                  ...archetypes,
                  {
                    key: `arch_${archetypes.length + 1}`,
                    label: "New archetype",
                    minScore: 0,
                    maxScore: 100,
                    summary: "",
                    bullets: [],
                  },
                ])
              }
              className="min-h-10 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              + Row
            </button>
          </div>
          <div className="mt-3 max-h-56 space-y-2 overflow-y-auto text-xs">
            {archetypes.map((row, idx) => (
              <div key={`${row.key}-${idx}`} className="rounded border border-slate-100 p-2">
                <div className="grid gap-1 sm:grid-cols-2">
                  <input
                    value={row.key}
                    onChange={(e) => {
                      const next = [...archetypes];
                      next[idx] = { ...row, key: e.target.value };
                      setArchetypes(next);
                    }}
                    className="rounded border px-2 py-1 font-mono"
                    placeholder="key"
                  />
                  <input
                    value={row.label}
                    onChange={(e) => {
                      const next = [...archetypes];
                      next[idx] = { ...row, label: e.target.value };
                      setArchetypes(next);
                    }}
                    className="rounded border px-2 py-1"
                    placeholder="label"
                  />
                </div>
                <div className="mt-1 grid grid-cols-2 gap-1">
                  <input
                    type="number"
                    value={row.minScore}
                    onChange={(e) => {
                      const next = [...archetypes];
                      next[idx] = { ...row, minScore: Number(e.target.value) };
                      setArchetypes(next);
                    }}
                    className="rounded border px-2 py-1"
                    placeholder="min"
                  />
                  <input
                    type="number"
                    value={row.maxScore ?? ""}
                    onChange={(e) => {
                      const next = [...archetypes];
                      const v = e.target.value;
                      next[idx] = {
                        ...row,
                        maxScore: v === "" ? undefined : Number(v),
                      };
                      setArchetypes(next);
                    }}
                    className="rounded border px-2 py-1"
                    placeholder="max (optional)"
                  />
                </div>
                <textarea
                  value={row.summary}
                  onChange={(e) => {
                    const next = [...archetypes];
                    next[idx] = { ...row, summary: e.target.value };
                    setArchetypes(next);
                  }}
                  rows={2}
                  className="mt-1 w-full rounded border px-2 py-1 text-[11px]"
                  placeholder="summary"
                />
                <textarea
                  value={row.bullets.join("\n")}
                  onChange={(e) => {
                    const next = [...archetypes];
                    next[idx] = {
                      ...row,
                      bullets: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean),
                    };
                    setArchetypes(next);
                  }}
                  rows={2}
                  className="mt-1 w-full rounded border px-2 py-1 font-mono text-[10px]"
                  placeholder="bullets — one per line"
                />
                <button
                  type="button"
                  onClick={() => setArchetypes(archetypes.filter((_, j) => j !== idx))}
                  className="mt-1 text-[11px] text-red-600"
                >
                  Remove archetype
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
