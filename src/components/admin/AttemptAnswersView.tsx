"use client";

import type { AttemptAnswerBlock, OrphanAnswerRow } from "@/lib/admin/format-attempt-answer";

const TYPE_LABELS: Record<string, string> = {
  likert: "Scale",
  single: "Single choice",
  multi: "Multi select",
};

function AnswerBadge({ type }: { type: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function AnswerRow({ row, index }: { row: AttemptAnswerBlock["sections"][0]["rows"][0]; index: number }) {
  return (
    <article
      className={`px-4 py-3.5 ${row.answered ? "bg-white" : "bg-amber-50/40"}`}
      data-question-id={row.questionId}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Question {index + 1}</p>
        <AnswerBadge type={row.type} />
      </div>
      <h4 className="mt-1 text-sm font-semibold leading-snug text-slate-900">{row.prompt}</h4>
      {row.caption ? <p className="mt-1 text-[11px] text-slate-500">{row.caption}</p> : null}
      <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Answer</p>
        <p className={`mt-0.5 text-sm ${row.answered ? "font-medium text-slate-900" : "italic text-slate-500"}`}>
          {row.display}
        </p>
        {row.detail ? <p className="mt-1 text-[11px] text-slate-500">{row.detail}</p> : null}
      </div>
      <p className="mt-2 font-mono text-[10px] text-slate-400">{row.questionId}</p>
    </article>
  );
}

function OrphanRows({ rows }: { rows: OrphanAnswerRow[] }) {
  if (!rows.length) return null;
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/30">
      <div className="border-b border-amber-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-amber-950">Unmapped answer keys</h3>
        <p className="mt-0.5 text-[11px] text-amber-800">
          These keys exist on the attempt but were not found in the loaded assessments.
        </p>
      </div>
      <div className="divide-y divide-amber-100">
        {rows.map((row) => (
          <div key={row.questionId} className="px-4 py-3">
            <p className="font-mono text-[11px] font-semibold text-amber-900">{row.questionId}</p>
            <p className="mt-1 text-sm text-slate-800">{row.display}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

type Props = {
  blocks: AttemptAnswerBlock[];
  orphanRows: OrphanAnswerRow[];
  answeredCount: number;
  totalCount: number;
};

export function AttemptAnswersView({ blocks, orphanRows, answeredCount, totalCount }: Props) {
  if (!blocks.length && !orphanRows.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        No answers recorded on this attempt.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-slate-900">{answeredCount}</span> of{" "}
          <span className="font-semibold text-slate-900">{totalCount}</span> questions answered
        </p>
        {totalCount > 0 ? (
          <div className="h-2 min-w-[120px] flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-sky-500 transition-all"
              style={{ width: `${Math.round((answeredCount / totalCount) * 100)}%` }}
            />
          </div>
        ) : null}
      </div>

      {blocks.map((block) => (
        <div key={block.assessmentId} className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{block.assessmentTitle}</h2>
            <p className="mt-0.5 font-mono text-[11px] text-slate-500">{block.assessmentId}</p>
          </div>

          {block.sections.map((section) => (
            <section key={section.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
                {section.description ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{section.description}</p>
                ) : null}
              </header>
              <div className="divide-y divide-slate-100">
                {section.rows.map((row, idx) => (
                  <AnswerRow key={row.questionId} row={row} index={idx} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ))}

      <OrphanRows rows={orphanRows} />
    </div>
  );
}
