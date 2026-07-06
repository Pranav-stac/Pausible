"use client";

import Link from "next/link";
import { buildChangeAnswerHref } from "@/lib/assessment/edit-answer-links";
import type { AttemptAnswerBlock } from "@/lib/admin/format-attempt-answer";

function ReviewRow({
  row,
  index,
  changeHref,
}: {
  row: AttemptAnswerBlock["sections"][0]["rows"][0];
  index: number;
  changeHref: string;
}) {
  return (
    <article
      className={`flex h-full flex-col rounded-2xl border px-4 py-3.5 sm:px-5 ${
        row.answered ? "border-slate-100 bg-white" : "border-amber-100 bg-amber-50/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Question {index + 1}</p>
        <Link
          href={changeHref}
          className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
        >
          Change
        </Link>
      </div>
      <h4 className="mt-1 text-sm font-semibold leading-snug text-slate-900">{row.prompt}</h4>
      {row.caption ? <p className="mt-1 text-[11px] text-slate-500">{row.caption}</p> : null}
      <p
        className={`mt-2.5 text-sm leading-relaxed ${row.answered ? "font-medium text-slate-800" : "italic text-slate-500"}`}
      >
        {row.display}
      </p>
      {row.detail ? <p className="mt-1 text-[11px] text-slate-500">{row.detail}</p> : null}
    </article>
  );
}

export function SubmissionAnswersReview({
  blocks,
  answeredCount,
  totalCount,
  attemptId,
  returnPath,
}: {
  blocks: AttemptAnswerBlock[];
  answeredCount: number;
  totalCount: number;
  attemptId: string;
  returnPath: string;
}) {
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
        <p className="mt-2 text-xs text-slate-500 sm:mt-0 sm:max-w-xs sm:text-right">
          Use Change on any answer to update it before building your report.
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
                    changeHref={buildChangeAnswerHref({
                      attemptId,
                      assessmentId: block.assessmentId,
                      questionId: row.questionId,
                      returnPath,
                    })}
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
