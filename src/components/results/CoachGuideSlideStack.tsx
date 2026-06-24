"use client";

import type { CoachGuideDocument } from "@/lib/coach-guide/types";
import { coachGuideCoverLine } from "@/lib/coach-guide/build-coach-guide";
import { fitTierLabel } from "@/lib/scoring/persona-fit";
import { formatPlanDurationTitle } from "@/lib/recommendations/plan/plan-phase-display";
import {
  IntegratedPlanBuiltNarrative,
  IntegratedPlanGuidingPrinciples,
  IntegratedPlanTable,
} from "@/components/results/integrated-plan-table";
import {
  REPORT_PAGE,
  REPORT_PAGE_BODY,
  ReportFooter,
  SlideLabel,
  SlideTitle,
} from "@/components/results/report-ui";

const PILLARS = ["Physical Activity", "Nutrition", "Sleep & Recovery", "Mental Wellness"] as const;
const MATRIX_ROWS = [
  { key: "structure", label: "Structure" },
  { key: "environment", label: "Environment" },
  { key: "progression", label: "Progression" },
  { key: "recoveryProtocol", label: "Recovery Protocol" },
] as const;

function coachGuidePageCount(guide: CoachGuideDocument): number {
  return guide.clientIntegratedPlan ? 5 : 4;
}

export function CoachGuideSlideStack({ guide, refId }: { guide: CoachGuideDocument; refId: string }) {
  const totalPages = coachGuidePageCount(guide);

  return (
    <>
      <CoachGuideCoverSlide guide={guide} page={1} totalPages={totalPages} refId={refId} />
      <CoachGuideIntroductionSlide guide={guide} page={2} totalPages={totalPages} refId={refId} />
      <CoachGuidePrinciplesSlide guide={guide} page={3} totalPages={totalPages} refId={refId} />
      {guide.clientIntegratedPlan ? (
        <CoachGuideIntegratedPlanSlide guide={guide} page={4} totalPages={totalPages} refId={refId} />
      ) : null}
      <CoachGuideClosingSlide
        guide={guide}
        page={guide.clientIntegratedPlan ? 5 : 4}
        totalPages={totalPages}
        refId={refId}
      />
    </>
  );
}

function CoachGuideCoverSlide({
  guide,
  page,
  totalPages,
  refId,
}: {
  guide: CoachGuideDocument;
  page: number;
  totalPages: number;
  refId: string;
}) {
  return (
    <section data-report-page className={REPORT_PAGE}>
      <div className={`${REPORT_PAGE_BODY} bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 text-white`}>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-teal-200/80">Pausibl Coach Guide</p>
          <h1 className="mt-6 text-4xl font-black tracking-tight">Personalized Coaching Brief</h1>
          <div className="mt-10 w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 text-left text-sm backdrop-blur">
            <p><span className="text-slate-300">Client</span> <span className="font-semibold">{guide.clientName}</span></p>
            <p className="mt-2"><span className="text-slate-300">Report ID</span> <span className="font-semibold">{guide.reportId}</span></p>
            <p className="mt-2"><span className="text-slate-300">Date</span> <span className="font-semibold">{guide.reportDate}</span></p>
            <p className="mt-2"><span className="text-slate-300">Persona</span> <span className="font-semibold">{coachGuideCoverLine(guide)}</span></p>
            <p className="mt-2"><span className="text-slate-300">Fit Score</span> <span className="font-semibold">{guide.fitScore}/100 — {fitTierLabel(guide.fitTier)} Tier</span></p>
          </div>
          <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
            Confidential — For coaching use only
          </p>
          <p className="mt-4 text-sm font-semibold text-teal-200">pausibl.com</p>
        </div>
        <ReportFooter page={page} total={totalPages} refId={refId} />
      </div>
    </section>
  );
}

function CoachGuideIntroductionSlide({
  guide,
  page,
  totalPages,
  refId,
}: {
  guide: CoachGuideDocument;
  page: number;
  totalPages: number;
  refId: string;
}) {
  const intro = guide.introduction;
  return (
    <section data-report-page className={REPORT_PAGE}>
      <div className={REPORT_PAGE_BODY}>
        <SlideLabel index="02" label="Introduction" />
        <SlideTitle title={`Introduction to ${guide.clientName}`} />

        <div className="mb-5 rounded-xl border border-teal-100 bg-teal-50/50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-teal-800">Primary persona</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{guide.primaryPersonaLabel}</p>
          <p className="mt-2 text-sm text-slate-700">{intro.personaDescription}</p>
        </div>

        <div className="mb-5 rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Secondary influence</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{intro.secondaryInfluence}</p>
        </div>

        <div className="mb-5 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Trait</th>
                <th className="px-4 py-2">Level</th>
                <th className="px-4 py-2">Deviation</th>
              </tr>
            </thead>
            <tbody>
              {intro.traits.map((t) => (
                <tr key={t.trait} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-semibold text-slate-900">{t.trait}</td>
                  <td className="px-4 py-2 text-slate-700">{t.level}</td>
                  <td className="px-4 py-2 text-slate-600">{t.deviation ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-[10px] font-bold uppercase text-slate-500">
              {(intro.goals?.length ?? 0) > 1 ? "Goals" : "Goal"}
            </p>
            {(intro.goals?.length ? intro.goals : intro.primaryGoal ? [intro.primaryGoal] : []).length > 1 ? (
              <ul className="mt-1 space-y-1 text-sm font-semibold text-slate-900">
                {(intro.goals?.length ? intro.goals : [intro.primaryGoal]).map((g) => (
                  <li key={g}>• {g}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 font-semibold text-slate-900">
                {intro.goals?.[0] ?? intro.primaryGoal ?? "General wellness"}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-[10px] font-bold uppercase text-slate-500">Top barrier</p>
            <p className="mt-1 font-semibold text-slate-900">{intro.topBarrier}</p>
          </div>
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
            <p className="text-[10px] font-bold uppercase text-emerald-800">What motivates {guide.clientName}</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {intro.motivates.map((m) => <li key={m}>• {m}</li>)}
            </ul>
          </div>
          <div className="rounded-lg border border-rose-100 bg-rose-50/40 p-4">
            <p className="text-[10px] font-bold uppercase text-rose-800">What drains {guide.clientName}</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {intro.drains.map((d) => <li key={d}>• {d}</li>)}
            </ul>
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-[10px] font-bold uppercase text-amber-900">Blind spot</p>
          <p className="mt-2 text-sm text-slate-700">{intro.blindSpot}</p>
          <p className="mt-3 text-sm font-medium text-slate-900">Coach response: {intro.blindSpotCoachResponse}</p>
        </div>

        <ReportFooter page={page} total={totalPages} refId={refId} />
      </div>
    </section>
  );
}

function CoachGuidePrinciplesSlide({
  guide,
  page,
  totalPages,
  refId,
}: {
  guide: CoachGuideDocument;
  page: number;
  totalPages: number;
  refId: string;
}) {
  const gp = guide.guidingPrinciples;
  const matrix = gp.pillarMatrix;
  const hasClientPlan = Boolean(guide.clientIntegratedPlan);
  const matrixFromPlan = Boolean(guide.matrixAiGeneratedFromPlan);

  return (
    <section data-report-page className={REPORT_PAGE}>
      <div className={REPORT_PAGE_BODY}>
        <SlideLabel index="03" label="Guiding Principles" />
        <SlideTitle
          title="Guiding Principles for Coach"
          subtitle={
            matrixFromPlan
              ? `AI coaching matrix for ${guide.clientName} — grounded in their integrated plan and ${guide.primaryPersonaLabel} principles.`
              : hasClientPlan
                ? `Persona coaching principles for ${guide.clientName} — regenerate to refresh AI matrix from their plan.`
                : "Coaching matrix and monitoring signals"
          }
        />

        <div className="mb-4 rounded-lg border border-teal-100 bg-teal-50/50 px-3 py-2.5 text-[10px] leading-relaxed text-slate-700">
          <p className="font-bold uppercase tracking-wide text-teal-800">
            {matrixFromPlan ? "AI matrix from plan + persona" : "Coaching matrix = persona principles"}
          </p>
          <p className="mt-1">
            {matrixFromPlan ? (
              <>
                Each cell tells the coach <span className="font-semibold">how to coach</span> this pillar using{" "}
                {guide.clientName}&apos;s real anchors, rhythms, and readiness cues — not a copy of the client table.
              </>
            ) : (
              <>
                <span className="font-semibold">Structure</span> = how to build routine for this persona ·{" "}
                <span className="font-semibold">Environment</span> = setup and context ·{" "}
                <span className="font-semibold">Progression</span> = when and how to advance load ·{" "}
                <span className="font-semibold">Recovery</span> = how to handle misses without shame
              </>
            )}
          </p>
        </div>

        {guide.planAlignmentNotes?.length ? (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-[10px] font-bold uppercase text-slate-500">Client plan snapshot (for reference)</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              {guide.planAlignmentNotes.map((note) => (
                <li key={note}>• {note}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 text-xs">
          <p className="border-b border-slate-200 bg-slate-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-white">
            Coaching matrix
          </p>
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900 text-[10px] font-bold uppercase tracking-wide text-white">
                <th className="px-3 py-2 text-left"> </th>
                {PILLARS.map((p) => (
                  <th key={p} className="px-3 py-2 text-left">{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_ROWS.map((row) => (
                <tr key={row.key} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-bold text-slate-800">{row.label}</td>
                  {PILLARS.map((pillar) => (
                    <td key={pillar} className="px-3 py-2 align-top text-slate-700">
                      {matrix[row.key][pillar]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        <div className="mb-5 rounded-lg border border-slate-200 p-4">
          <p className="text-[10px] font-bold uppercase text-slate-500">Validation check</p>
          <ol className="mt-2 space-y-1 text-sm text-slate-700">
            {gp.validationCheck.map((line, i) => (
              <li key={i}>{i + 1}. {line}</li>
            ))}
          </ol>
        </div>

        <div className="mb-5 rounded-lg border border-slate-200 p-4">
          <p className="text-[10px] font-bold uppercase text-slate-500">Signals to watch</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {gp.monitoringSignals.map((s) => <li key={s}>• {s}</li>)}
          </ul>
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-[10px] font-bold uppercase text-slate-500">Pivot triggers</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {gp.pivotTriggers.map((t) => <li key={t}>• {t}</li>)}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-[10px] font-bold uppercase text-slate-500">Review cadence</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {gp.reviewCadence.map((row) => (
                <li key={row.period}>
                  <span className="font-semibold text-slate-900">{row.period}:</span> {row.action}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {guide.clientIntegratedPlan ? (
          <p className="text-xs leading-relaxed text-slate-600">
            The next page shows {guide.clientName}&apos;s integrated phased plan — the client sees the same actions
            on their wellness report. Use this matrix when reviewing each phase: Structure and Environment for setup,
            Progression for weekly load, Recovery when adherence slips.
          </p>
        ) : null}

        <ReportFooter page={page} total={totalPages} refId={refId} />
      </div>
    </section>
  );
}

function CoachGuideIntegratedPlanSlide({
  guide,
  page,
  totalPages,
  refId,
}: {
  guide: CoachGuideDocument;
  page: number;
  totalPages: number;
  refId: string;
}) {
  const plan = guide.clientIntegratedPlan;
  if (!plan) return null;

  const { planOutput, synthesis } = plan;

  return (
    <section data-report-page className={REPORT_PAGE}>
      <div className={REPORT_PAGE_BODY}>
        <SlideLabel index="04" label="Client Integrated Plan" />
        <SlideTitle
          title={`${guide.clientName}'s ${formatPlanDurationTitle(planOutput.total_duration_weeks)} Integrated Plan`}
          subtitle={synthesis.plan_subtitle}
        />

  
        {/* <IntegratedPlanGuidingPrinciples className="mb-3" /> */}

        <IntegratedPlanTable planOutput={planOutput} integratedPlan={synthesis} />

        <IntegratedPlanBuiltNarrative narrative={synthesis.plan_built_narrative} />

        <ReportFooter page={page} total={totalPages} refId={refId} />
      </div>
    </section>
  );
}

function CoachGuideClosingSlide({
  guide,
  page,
  totalPages,
  refId,
}: {
  guide: CoachGuideDocument;
  page: number;
  totalPages: number;
  refId: string;
}) {
  return (
    <section data-report-page className={REPORT_PAGE}>
      <div className={REPORT_PAGE_BODY}>
        <SlideLabel index={guide.clientIntegratedPlan ? "05" : "04"} label="Core Philosophy" />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-medium text-slate-600">What is most likely to work for THIS person?</p>
          <p className="mt-6 text-2xl font-black tracking-wide text-teal-800">{guide.closing.fiveWordSummary}</p>
          <p className="mt-10 text-sm font-bold text-slate-800">PAUSIBL</p>
          <p className="mt-2 text-sm text-teal-700">pausibl.com</p>
          <p className="mt-8 max-w-md text-xs leading-relaxed text-slate-500">
            This guide is for coaching use only. It is not a substitute for professional medical, nutritional, or psychological advice.
          </p>
        </div>
        <ReportFooter page={page} total={totalPages} refId={refId} />
      </div>
    </section>
  );
}
