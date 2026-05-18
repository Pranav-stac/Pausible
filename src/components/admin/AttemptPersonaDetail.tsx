"use client";

import { FACET_IDS_ORDERED } from "@/lib/scoring/question-bank-meta";
import { PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import type { PersonaAnalysis, PersonaKey } from "@/lib/scoring/persona-types";
import { PERSONA_KEYS, TRAIT_KEYS, TRAIT_LABELS } from "@/lib/scoring/persona-types";
import { personaLabel } from "@/lib/results/persona-display";

function fmt(n: number | undefined, digits = 2) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function pct(n: number | undefined) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

export function AttemptPersonaDetail({ analysis }: { analysis: PersonaAnalysis | null | undefined }) {
  if (!analysis) {
    return <p className="text-xs text-slate-500">No persona analysis on this attempt (pre-migration or incomplete).</p>;
  }

  return (
    <div className="space-y-6 text-xs">
      <section>
        <h4 className="font-semibold text-slate-800">Top personas</h4>
        <p className="mt-1 text-slate-600">
          Primary: <strong>{personaLabel(analysis.primaryPersona)}</strong> (
          {pct(analysis.personaPercentages[analysis.primaryPersona])}) · Secondary:{" "}
          <strong>{personaLabel(analysis.secondaryPersona)}</strong> (
          {pct(analysis.personaPercentages[analysis.secondaryPersona])}) · Alpha: {fmt(analysis.alpha, 2)}
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-slate-800">Trait averages (1–7)</h4>
        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr className="border-b text-left text-[10px] uppercase text-slate-500">
              <th className="py-1">Trait</th>
              <th className="py-1">Avg</th>
            </tr>
          </thead>
          <tbody>
            {TRAIT_KEYS.map((t, i) => (
              <tr key={t} className="border-b border-slate-100">
                <td className="py-1">
                  {i + 1}. {TRAIT_LABELS[t]}
                </td>
                <td className="py-1 font-mono">{fmt(analysis.traitAverages[t])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h4 className="font-semibold text-slate-800">Facet averages</h4>
        <div className="mt-2 max-h-48 overflow-y-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b text-left text-[10px] uppercase text-slate-500">
                <th className="py-1">Facet</th>
                <th className="py-1">Avg</th>
              </tr>
            </thead>
            <tbody>
              {FACET_IDS_ORDERED.map((facetId, i) => (
                <tr key={facetId} className="border-b border-slate-100">
                  <td className="py-0.5">
                    {i + 1}. {facetId}
                  </td>
                  <td className="py-0.5 font-mono">{fmt(analysis.facetAverages[facetId])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h4 className="font-semibold text-slate-800">Persona match</h4>
        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr className="border-b text-left text-[10px] uppercase text-slate-500">
              <th className="py-1">Persona</th>
              <th className="py-1">Distance</th>
              <th className="py-1">Si</th>
              <th className="py-1">%</th>
            </tr>
          </thead>
          <tbody>
            {PERSONA_KEYS.map((p: PersonaKey) => (
              <tr key={p} className="border-b border-slate-100">
                <td className="py-1">{PERSONA_DISPLAY[p].label}</td>
                <td className="py-1 font-mono">{fmt(analysis.personaDistances[p])}</td>
                <td className="py-1 font-mono">{fmt(analysis.personaSi[p], 4)}</td>
                <td className="py-1 font-mono">{pct(analysis.personaPercentages[p])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h4 className="font-semibold text-slate-800">Item responses ({analysis.itemResponses.length})</h4>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-slate-100">
          <table className="w-full border-collapse text-[10px]">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b text-left uppercase text-slate-500">
                <th className="px-2 py-1">ID</th>
                <th className="px-2 py-1">Facet</th>
                <th className="px-2 py-1">Trait</th>
                <th className="px-2 py-1">Score</th>
              </tr>
            </thead>
            <tbody>
              {analysis.itemResponses.map((row) => (
                <tr key={row.questionId} className="border-b border-slate-50">
                  <td className="px-2 py-0.5 font-mono">{row.questionId}</td>
                  <td className="px-2 py-0.5">{row.facetId}</td>
                  <td className="px-2 py-0.5">{row.trait}</td>
                  <td className="px-2 py-0.5 font-mono">{row.responseScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
