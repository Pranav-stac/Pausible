"use client";

import { AttemptPersonaDetail } from "@/components/admin/AttemptPersonaDetail";
import { personaLabel } from "@/lib/results/persona-display";
import type { PersonaAnalysis } from "@/lib/scoring/persona-types";
import type { AttemptScores } from "@/types/models";

function fmt(n: number | undefined, digits = 2) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

export function AttemptScoresOverview({
  scores,
  persona,
}: {
  scores: AttemptScores | null | undefined;
  persona: PersonaAnalysis | null | undefined;
}) {
  if (!scores && !persona) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-xs text-slate-500">
        No scores stored on this attempt yet.
      </p>
    );
  }

  const dimensions = scores?.dimensions ?? {};
  const dimensionEntries = Object.entries(dimensions).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      {(scores?.archetypeKey || scores?.secondaryArchetypeKey) && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">Archetype summary</h4>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Primary</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">
                {scores?.archetypeKey ? personaLabel(scores.archetypeKey) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Secondary</dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-900">
                {scores?.secondaryArchetypeKey ? personaLabel(scores.secondaryArchetypeKey) : "—"}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {dimensionEntries.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">Dimension scores</h4>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[280px] border-collapse text-[11px]">
              <thead>
                <tr className="border-b text-left text-[10px] uppercase text-slate-500">
                  <th className="py-1.5 pr-3">Dimension</th>
                  <th className="py-1.5">Score</th>
                </tr>
              </thead>
              <tbody>
                {dimensionEntries.map(([key, value]) => (
                  <tr key={key} className="border-b border-slate-100">
                    <td className="py-1.5 pr-3 font-medium text-slate-800">{key}</td>
                    <td className="py-1.5 font-mono tabular-nums">{fmt(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-slate-900">Persona analysis</h4>
        <div className="mt-3">
          <AttemptPersonaDetail analysis={persona} />
        </div>
      </section>
    </div>
  );
}
