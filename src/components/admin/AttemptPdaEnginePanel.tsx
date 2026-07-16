"use client";

import { Fragment, useEffect, useState } from "react";
import type { AttemptEngineDebugPackage } from "@/lib/admin/build-attempt-engine-debug";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <h4 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900">{title}</h4>
      <div className="p-4">{children}</div>
    </section>
  );
}

function StatGrid({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="text-[10px] font-bold uppercase text-slate-500">{item.label}</dt>
          <dd className="mt-0.5 font-mono text-[11px] text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TagRow({ label, tags }: { label: string; tags: string[] }) {
  if (!tags.length) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {tags.map((t) => (
          <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-700">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function JsonDump({ value }: { value: unknown }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[10px] leading-relaxed text-slate-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function AttemptPdaEnginePanel({
  attemptId,
  api,
}: {
  attemptId: string;
  api: (path: string, init?: RequestInit) => Promise<Response>;
}) {
  const [data, setData] = useState<(AttemptEngineDebugPackage & { cacheMeta: AttemptEngineDebugPackage["cacheMeta"] & { versionMatch?: boolean | null; cacheSynthesisVersion?: string | null; expectedSynthesisVersion?: string } }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await api(`/api/admin/attempts/${encodeURIComponent(attemptId)}/engine-debug`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load engine debug");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attemptId, api]);

  if (loading) return <p className="text-xs text-slate-500">Running PDA engine trace…</p>;
  if (error) return <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>;
  if (!data) return null;

  const gateOk = data.preGenerationGate.ok;
  const cacheStale = data.cacheMeta.versionMatch === false;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600">
        Live PDA v1.9 engine trace — same pipeline as report generation (filter → score → rank → select → plan).
        Synthesis version: <span className="font-mono font-semibold">{data.synthesisVersion}</span>
        {cacheStale ? (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
            Cached report is stale — regenerate to match
          </span>
        ) : null}
      </p>

      <Section title="Pipeline summary">
        <StatGrid
          items={[
            { label: "Master recs", value: data.pipeline.masterCount },
            { label: "After filter", value: data.pipeline.filteredCount },
            { label: "Excluded", value: data.pipeline.excludedCount },
            { label: "Scored > 0", value: data.pipeline.scoredAboveZero },
            { label: "Plan pool", value: data.pipeline.planPoolCount },
            { label: "Plan score threshold", value: `> ${data.pipeline.planScoreThreshold}` },
            { label: "Max score (internal)", value: data.pdaMaxScore },
            { label: "DR13 bridge (FIT037)", value: data.pipeline.goalPreferenceBridge ? "Yes" : "No" },
            { label: "Secondary influence", value: data.pipeline.secondaryInfluenceActive ? `Yes (${data.pipeline.secondaryBlendPct?.toFixed(1)}%)` : "No" },
            { label: "Pre-gen gate", value: gateOk ? "PASS" : "FAIL" },
          ]}
        />
        {!gateOk ? (
          <ul className="mt-3 list-inside list-disc text-[11px] text-red-700">
            {data.preGenerationGate.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : null}
        {data.preGenerationGate.warnings.length ? (
          <ul className="mt-2 list-inside list-disc text-[11px] text-amber-800">
            {data.preGenerationGate.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
        {data.validationWarnings.length ? (
          <ul className="mt-2 list-inside list-disc text-[11px] text-amber-800">
            {data.validationWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
      </Section>

      <Section title="User profile (engine input)">
        <StatGrid
          items={[
            { label: "Primary", value: `${data.userProfile.primaryPersona} (${data.userProfile.primaryPersonaAlias})` },
            { label: "Secondary", value: `${data.userProfile.secondaryPersona} (${data.userProfile.secondaryPersonaAlias})` },
            { label: "Fit", value: `${data.userProfile.fitTier} · ${data.userProfile.fitScore}` },
            { label: "Blend", value: data.userProfile.blendStrength },
          ]}
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TagRow label="Goals" tags={data.userProfile.goals} />
          <TagRow label="Barriers" tags={data.userProfile.barriers} />
          <TagRow label="Context" tags={data.userProfile.context} />
          <TagRow label="Exclusions" tags={data.userProfile.exclusions} />
          <TagRow label="OCEAN tags (all)" tags={data.userProfile.oceanTags} />
          <TagRow label="OCEAN col T (scoring)" tags={data.userProfile.oceanTagsColT} />
          <TagRow label="OCEAN col L (clustering)" tags={data.userProfile.oceanCategoryTags} />
        </div>
        {data.barrierOverridesActive.length ? (
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase text-slate-500">Barrier overrides active (§21.10)</p>
            <ul className="mt-1 space-y-1 text-[11px]">
              {data.barrierOverridesActive.map((b) => (
                <li key={b.key}>
                  <span className="font-semibold">{b.key}</span>: {b.tags.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <Section title={`Filter audit — excluded (${data.filterAudit.length})`}>
        {data.filterAudit.length === 0 ? (
          <p className="text-[11px] text-slate-500">No rows excluded by §13 filter.</p>
        ) : (
          <div className="max-h-64 overflow-auto">
            <table className="w-full min-w-[600px] border-collapse text-[10px]">
              <thead>
                <tr className="border-b text-left uppercase text-slate-500">
                  <th className="py-1 pr-2">ID</th>
                  <th className="py-1 pr-2">Pillar</th>
                  <th className="py-1">Reasons</th>
                </tr>
              </thead>
              <tbody>
                {data.filterAudit.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 align-top">
                    <td className="py-1 pr-2 font-mono">{row.id}</td>
                    <td className="py-1 pr-2">{row.pillar}</td>
                    <td className="py-1 text-slate-600">
                      <ul className="list-inside list-disc">
                        {row.reasons.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title={`Clusters (${data.clusters.length})`}>
        <div className="space-y-3">
          {data.clusters.map((c) => (
            <div key={c.key} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="font-mono text-[11px] font-semibold text-slate-900">
                {c.category} · score {c.clusterScore.toFixed(1)}
              </p>
              <p className="mt-1 text-[10px] text-slate-600">
                Barrier: {c.mainBarrier ?? "—"} · OCEAN alignment: {c.oceanAlignment ?? "—"}
              </p>
              <p className="mt-1 font-mono text-[10px] text-slate-500">{c.rows.map((r) => r.id).join(", ")}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Scored recommendations (${data.scoredRecommendations.length})`}>
        <p className="mb-2 text-[10px] text-slate-500">
          Click a row to expand full §14 score breakdown. Plan gate = passes plan pool threshold.
        </p>
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[960px] border-collapse text-[10px]">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b text-left uppercase text-slate-500">
                <th className="px-2 py-1">ID</th>
                <th className="px-2 py-1">Pillar</th>
                <th className="px-2 py-1">Type</th>
                <th className="px-2 py-1">Total</th>
                <th className="px-2 py-1">Pers</th>
                <th className="px-2 py-1">Bar</th>
                <th className="px-2 py-1">Goal</th>
                <th className="px-2 py-1">Ctx</th>
                <th className="px-2 py-1">OCEAN</th>
                <th className="px-2 py-1">Eff</th>
                <th className="px-2 py-1">Str</th>
                <th className="px-2 py-1">Gate</th>
                <th className="px-2 py-1">Col T</th>
              </tr>
            </thead>
            <tbody>
              {data.scoredRecommendations.map((row) => (
                <Fragment key={row.id}>
                  <tr
                    className="cursor-pointer border-b border-slate-100 hover:bg-sky-50/50"
                    onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                  >
                    <td className="px-2 py-1 font-mono">{row.id}</td>
                    <td className="px-2 py-1">{row.pillar}</td>
                    <td className="px-2 py-1">{row.type}</td>
                    <td className="px-2 py-1 font-semibold tabular-nums">{row.score.total}</td>
                    <td className="px-2 py-1 tabular-nums">{row.score.persona}</td>
                    <td className="px-2 py-1 tabular-nums">{row.score.barriers}</td>
                    <td className="px-2 py-1 tabular-nums">{row.score.goals}</td>
                    <td className="px-2 py-1 tabular-nums">{row.score.context}</td>
                    <td className="px-2 py-1 tabular-nums">{row.score.ocean}</td>
                    <td className="px-2 py-1 tabular-nums">{row.score.effort}</td>
                    <td className="px-2 py-1 tabular-nums">{row.score.strength}</td>
                    <td className="px-2 py-1">{row.planGatePass ? "✓" : "—"}</td>
                    <td className="max-w-[120px] truncate px-2 py-1 font-mono text-[9px]">
                      {row.oceanTraitTags.join(", ")}
                    </td>
                  </tr>
                  {expandedRow === row.id ? (
                    <tr key={`${row.id}-detail`} className="bg-slate-50">
                      <td colSpan={13} className="px-3 py-2">
                        <p className="text-[11px] text-slate-800">{row.text}</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <TagRow label="Matched barriers" tags={row.score.matchedBarriers} />
                          <TagRow label="Matched goals" tags={row.score.matchedGoals} />
                          <TagRow label="Matched context" tags={row.score.matchedContext} />
                          <TagRow label="Matched OCEAN (col T)" tags={row.score.matchedOcean} />
                          <TagRow label="Col L tags" tags={row.oceanCategoryTags} />
                        </div>
                        {row.bridgeInjected ? (
                          <p className="mt-2 text-[10px] font-semibold text-teal-700">DR13 bridge injected (FIT037)</p>
                        ) : null}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Selection trace">
        <StatGrid
          items={[
            { label: "PI series complete", value: data.selectionSummary.piSeriesComplete ? "Yes" : "No" },
            { label: "PI source IDs", value: data.selectionSummary.piSourceIds.join(", ") || "—" },
            { label: "Opportunity cards", value: data.selectionSummary.opportunityCardIds.join(", ") || "—" },
            { label: "Safety guidance", value: data.selectionSummary.safetyGuidanceIds.join(", ") || "—" },
          ]}
        />
        <details className="mt-3">
          <summary className="cursor-pointer text-[11px] font-semibold text-slate-700">Pillar source IDs</summary>
          <JsonDump value={data.selectionSummary.pillarSourceIds} />
        </details>
      </Section>

      <Section title="Plan generator output (§21)">
        {data.planOutput ? (
          <div className="space-y-3">
            <StatGrid
              items={[
                { label: "Phases", value: data.planOutput.total_phases },
                { label: "Duration", value: `${data.planOutput.total_duration_weeks}w (${data.planOutput.total_duration_label})` },
                { label: "Show all phases", value: data.planOutput.show_all_phases ? "Yes" : "No (overwhelm-safe)" },
                { label: "Style", value: data.planOutput.progression_style },
              ]}
            />
            <p className="text-[10px] text-slate-600">
              <span className="font-bold">Generation notes:</span> {data.planOutput.generation_notes}
            </p>
            {data.planOutput.phases.map((phase) => (
              <details key={phase.phase_number} className="rounded-lg border border-slate-100">
                <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold text-slate-900">
                  Phase {phase.phase_number}: {phase.name} · AE cap {phase.activation_energy_cap}
                </summary>
                <div className="space-y-2 border-t border-slate-100 px-3 py-2 text-[10px]">
                  <p>
                    <span className="font-bold">Intent:</span> {phase.intent}
                  </p>
                  <p>
                    <span className="font-bold">Anchor:</span> [{phase.anchor_habit.id}] {phase.anchor_habit.text}
                  </p>
                  {phase.anchor_habit_alternate ? (
                    <p>
                      <span className="font-bold">Alt anchor (Fox):</span> [{phase.anchor_habit_alternate.id}]{" "}
                      {phase.anchor_habit_alternate.text}
                    </p>
                  ) : null}
                  <p className="font-bold">Daily rhythm</p>
                  <ul className="list-inside list-disc text-slate-700">
                    {phase.daily_rhythm.map((d) => (
                      <li key={d.id}>
                        [{d.id}] {d.text}
                      </li>
                    ))}
                  </ul>
                  <p className="font-bold">Weekly rhythm</p>
                  <ul className="list-inside list-disc text-slate-700">
                    {phase.weekly_rhythm.map((w) => (
                      <li key={w.id}>
                        [{w.id}] {w.text}
                      </li>
                    ))}
                  </ul>
                  <p>
                    <span className="font-bold">Readiness:</span> {phase.readiness_signal.description}
                  </p>
                  <p className="font-mono text-slate-500">
                    Pillars: N={phase.pillar_distribution.Nutrition} PA=
                    {phase.pillar_distribution["Physical Activity"]} S=
                    {phase.pillar_distribution["Sleep & Recovery"]} M=
                    {phase.pillar_distribution["Mental Wellness"]}
                  </p>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-red-600">Plan generator returned null (0 phases).</p>
        )}
      </Section>

      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">Raw engine debug JSON</summary>
        <div className="border-t border-slate-100 p-4">
          <JsonDump value={data} />
        </div>
      </details>
    </div>
  );
}
