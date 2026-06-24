"use client";

import type { CoachGuideDocument } from "@/lib/coach-guide/types";
import { fitTierLabel } from "@/lib/scoring/persona-fit";

const PILLARS = ["Physical Activity", "Nutrition", "Sleep & Recovery", "Mental Wellness"] as const;
const MATRIX_ROWS = [
  { key: "structure", label: "Structure" },
  { key: "environment", label: "Environment" },
  { key: "progression", label: "Progression" },
  { key: "recoveryProtocol", label: "Recovery Protocol" },
] as const;

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[10px] leading-relaxed text-slate-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function AdminCoachGuideDetail({ guide }: { guide: CoachGuideDocument | null | undefined }) {
  if (!guide) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-xs text-slate-500">
        No coach guide on this attempt. Regenerate the report to build the coaching brief.
      </p>
    );
  }

  const intro = guide.introduction;
  const principles = guide.guidingPrinciples;

  return (
    <div className="space-y-6 text-xs">
      {guide.synthesisError ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
          Synthesis error: {guide.synthesisError}
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-slate-900">Cover</h4>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Client</dt>
            <dd className="font-medium text-slate-900">{guide.clientName}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Report ID</dt>
            <dd className="font-mono text-slate-800">{guide.reportId}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Date</dt>
            <dd>{guide.reportDate}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Fit</dt>
            <dd>
              {guide.fitScore}/100 · {fitTierLabel(guide.fitTier)} · {guide.personaTitle}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Personas</dt>
            <dd>
              {guide.primaryPersonaLabel} + {guide.secondaryPersonaLabel} ({guide.secondaryPct}%)
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-slate-900">Introduction</h4>
        <p className="mt-2 text-slate-700">{intro.personaSummary}</p>
        <p className="mt-2 text-slate-700">{intro.personaDescription}</p>
        <p className="mt-2 rounded-lg bg-slate-50 p-3 text-slate-700">{intro.secondaryInfluence}</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-[11px]">
            <thead>
              <tr className="border-b text-left text-[10px] uppercase text-slate-500">
                <th className="py-1 pr-2">Trait</th>
                <th className="py-1 pr-2">Level</th>
                <th className="py-1 pr-2">Deviation</th>
                <th className="py-1">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {intro.traits.map((row) => (
                <tr key={row.trait} className="border-b border-slate-100">
                  <td className="py-1 pr-2 font-medium">{row.trait}</td>
                  <td className="py-1 pr-2">{row.level}</td>
                  <td className="py-1 pr-2 font-mono">{row.deviation ?? "—"}</td>
                  <td className="py-1 text-slate-600">{row.meaning ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase text-slate-500">
              {(intro.goals?.length ?? 0) > 1 ? "Goals" : "Goal"}
            </dt>
            <dd className="mt-0.5">
              {(intro.goals?.length ? intro.goals : intro.primaryGoal ? [intro.primaryGoal] : []).length > 1 ? (
                <ul className="list-inside list-disc">
                  {(intro.goals?.length ? intro.goals : [intro.primaryGoal]).map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              ) : (
                intro.goals?.[0] ?? intro.primaryGoal ?? "General wellness"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase text-slate-500">Top barrier</dt>
            <dd className="mt-0.5">{intro.topBarrier}</dd>
          </div>
        </dl>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500">Motivates</p>
            <ul className="mt-1 list-inside list-disc text-slate-700">
              {intro.motivates.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500">Drains</p>
            <ul className="mt-1 list-inside list-disc text-slate-700">
              {intro.drains.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50/60 p-3">
          <p className="text-[10px] font-bold uppercase text-amber-900">Blind spot</p>
          <p className="mt-1 text-slate-800">{intro.blindSpot}</p>
          <p className="mt-2 text-[10px] font-bold uppercase text-amber-900">Coach response</p>
          <p className="mt-1 text-slate-700">{intro.blindSpotCoachResponse}</p>
        </div>

        {intro.riskSignals.length ? (
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase text-slate-500">Risk signals</p>
            <ul className="mt-2 space-y-2">
              {intro.riskSignals.map((r) => (
                <li key={r.signal} className="rounded-lg border border-slate-100 p-2">
                  <span className="font-semibold text-slate-900">{r.signal}</span>
                  <span className="text-slate-600"> — {r.meaning}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-slate-900">Guiding principles — pillar matrix</h4>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[10px]">
            <thead>
              <tr className="border-b text-left uppercase text-slate-500">
                <th className="px-2 py-1">Dimension</th>
                {PILLARS.map((p) => (
                  <th key={p} className="px-2 py-1">
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_ROWS.map(({ key, label }) => (
                <tr key={key} className="border-b border-slate-100">
                  <td className="px-2 py-1 font-semibold text-slate-700">{label}</td>
                  {PILLARS.map((pillar) => (
                    <td key={pillar} className="px-2 py-1 align-top text-slate-600">
                      {principles.pillarMatrix[key][pillar] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500">Validation check</p>
            <ol className="mt-1 list-inside list-decimal text-slate-700">
              {principles.validationCheck.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500">Monitoring signals</p>
            <ul className="mt-1 list-inside list-disc text-slate-700">
              {principles.monitoringSignals.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500">Pivot triggers</p>
            <ul className="mt-1 list-inside list-disc text-slate-700">
              {principles.pivotTriggers.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-500">Review cadence</p>
            <ul className="mt-1 space-y-1 text-slate-700">
              {principles.reviewCadence.map((r) => (
                <li key={r.period}>
                  <span className="font-semibold">{r.period}:</span> {r.action}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-slate-900">Closing</h4>
        <p className="mt-2 text-lg font-bold text-teal-800">{guide.closing.fiveWordSummary}</p>
      </section>

      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">Raw coach guide JSON</summary>
        <div className="border-t border-slate-100 px-4 py-3">
          <JsonBlock value={guide} />
        </div>
      </details>
    </div>
  );
}
