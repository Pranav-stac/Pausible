"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminAttemptReportDownloader } from "@/components/admin/AdminAttemptReportDownloader";
import { AdminCoachGuideDetail } from "@/components/admin/AdminCoachGuideDetail";
import { AttemptLlmContextPanel } from "@/components/admin/AttemptLlmContextPanel";
import { AttemptPersonaDetail } from "@/components/admin/AttemptPersonaDetail";
import type { CoachGuideDocument } from "@/lib/coach-guide/types";
import type { AttemptLlmContextPackage } from "@/lib/recommendations/build-attempt-llm-context";
import type { ActionPlanSynthesis } from "@/lib/recommendations/types";
import type { PersonaAnalysis } from "@/lib/scoring/persona-types";

type DetailTab = "overview" | "wellness" | "calculation" | "llm" | "coach-guide";

type AttemptRecord = Record<string, unknown>;

type Props = {
  attemptId: string;
  api: (path: string, init?: RequestInit) => Promise<Response>;
  onClose: () => void;
};

const TABS: { id: DetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "wellness", label: "Wellness values" },
  { id: "calculation", label: "Calculation" },
  { id: "llm", label: "Prompts & responses" },
  { id: "coach-guide", label: "Coach guide" },
];

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[10px] leading-relaxed text-slate-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function extractCoachGuide(attempt: AttemptRecord | null): CoachGuideDocument | null {
  if (!attempt) return null;
  const cache = attempt.actionPlanCache as Record<string, unknown> | null | undefined;
  const plan = cache?.plan as Record<string, unknown> | null | undefined;
  const synthesis = plan?.synthesis as ActionPlanSynthesis | null | undefined;
  return synthesis?.coachGuide ?? null;
}

function personaFromAttempt(attempt: AttemptRecord | null): PersonaAnalysis | null {
  if (!attempt) return null;
  const direct = attempt.personaAnalysis as PersonaAnalysis | undefined;
  if (direct) return direct;
  const scores = attempt.scores as { persona?: PersonaAnalysis } | null | undefined;
  return scores?.persona ?? null;
}

function TagList({ title, items }: { title: string; items: { tag: string; label: string }[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item.tag}
            className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
            title={item.tag}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WellnessValuesTab({ context }: { context: AttemptLlmContextPackage | null }) {
  const grouped = useMemo(() => {
    const rows = context?.sharedContext.wellnessResponses ?? [];
    const map = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = map.get(row.section) ?? [];
      list.push(row);
      map.set(row.section, list);
    }
    return [...map.entries()];
  }, [context]);

  if (!context) {
    return <p className="text-xs text-slate-500">Loading wellness context…</p>;
  }

  if (!grouped.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-xs text-slate-500">
        No wellness context answers recorded on this attempt.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-600">
        Wellness questionnaire answers grouped by section, with derived tags used in recommendation scoring.
      </p>
      {grouped.map(([section, rows]) => (
        <section key={section} className="rounded-xl border border-slate-200 bg-white">
          <h4 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900">{section}</h4>
          <div className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <div key={`${section}-${i}`} className="px-4 py-3">
                <p className="text-[11px] font-medium text-slate-800">{row.question}</p>
                <p className="mt-1 text-sm text-slate-900">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Answer: </span>
                  {row.answer}
                </p>
                {row.tags.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {row.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-teal-50 px-2 py-0.5 font-mono text-[10px] text-teal-900"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[10px] text-slate-400">No tags mapped</p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CalculationTab({
  persona,
  context,
}: {
  persona: PersonaAnalysis | null;
  context: AttemptLlmContextPackage | null;
}) {
  const ranked = context?.sharedContext.rankedRecommendations ?? [];
  const personality = context?.sharedContext.personality;
  const matched = context?.sharedContext.matchedProfile;
  const selectedPlan = context?.sharedContext.selectedPlan;

  return (
    <div className="space-y-6">
      <AttemptPersonaDetail analysis={persona} />

      {personality ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">Personality synthesis inputs</h4>
          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-bold uppercase text-slate-500">Primary</dt>
              <dd>{personality.primaryPersona}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase text-slate-500">Secondary</dt>
              <dd>{personality.secondaryPersona}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase text-slate-500">Fit tier</dt>
              <dd>
                {personality.fitTier} · {personality.fitScore}% · blend {personality.blendStrength}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[10px] font-bold uppercase text-slate-500">Persona mix</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {personality.personaMix.map((p) => (
                  <span key={p.persona} className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px]">
                    {p.persona}: {p.pct.toFixed(1)}%
                  </span>
                ))}
              </dd>
            </div>
          </dl>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[400px] border-collapse text-[11px]">
              <thead>
                <tr className="border-b text-left text-[10px] uppercase text-slate-500">
                  <th className="py-1">Trait</th>
                  <th className="py-1">Score</th>
                  <th className="py-1">Band</th>
                </tr>
              </thead>
              <tbody>
                {personality.oceanTraits.map((t) => (
                  <tr key={t.trait} className="border-b border-slate-100">
                    <td className="py-1">{t.trait}</td>
                    <td className="py-1 font-mono">{t.score.toFixed(2)}</td>
                    <td className="py-1">{t.band}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {matched ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">Matched profile tags</h4>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <TagList title="Goals" items={matched.goals} />
            <TagList title="Barriers" items={matched.barriers} />
            <TagList title="Context" items={matched.context} />
            <TagList title="Exclusions" items={matched.exclusions} />
          </div>
        </section>
      ) : null}

      {selectedPlan ? (
        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">
            Selected plan (PI series + pillar picks)
          </summary>
          <div className="border-t border-slate-100 px-4 py-3">
            <JsonBlock value={selectedPlan} />
          </div>
        </details>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h4 className="text-sm font-semibold text-slate-900">Ranked recommendations ({ranked.length})</h4>
          <p className="mt-1 text-[11px] text-slate-500">
            Scoring formula: primary +25, secondary +15, all_personas +10, barrier +12 (cap 36), goal +8 (cap 24),
            context +3 (cap 15), OCEAN +4 (cap 20), strength bonus. Max 155.
          </p>
        </div>
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full min-w-[900px] border-collapse text-[10px]">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="border-b text-left uppercase text-slate-500">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Pillar</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Strength</th>
                <th className="px-3 py-2">Text</th>
                <th className="px-3 py-2">Match reasons</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 align-top hover:bg-slate-50/80">
                  <td className="px-3 py-2 font-mono">{row.id}</td>
                  <td className="px-3 py-2">{row.pillar}</td>
                  <td className="px-3 py-2">{row.type}</td>
                  <td className="px-3 py-2 font-mono font-semibold tabular-nums">{row.totalScore}</td>
                  <td className="px-3 py-2">{row.strength}</td>
                  <td className="max-w-[220px] px-3 py-2 text-slate-700">{row.text}</td>
                  <td className="max-w-[200px] px-3 py-2 text-slate-500">
                    {row.matchReasons.length ? (
                      <ul className="list-inside list-disc">
                        {row.matchReasons.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function OverviewTab({
  attempt,
  attemptId,
  api,
}: {
  attempt: AttemptRecord;
  attemptId: string;
  api: Props["api"];
}) {
  const metaKeys = [
    "id",
    "uid",
    "ownerType",
    "ownerEmail",
    "assessmentId",
    "paymentStatus",
    "paymentProvider",
    "paymentId",
    "shareToken",
    "isLatestShareEligible",
    "createdAt",
    "paidAt",
    "claimedAt",
    "answersCount",
    "resultsUrl",
  ] as const;

  return (
    <div className="space-y-4">
      <dl className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        {metaKeys.map((key) => {
          const v = attempt[key];
          if (v === undefined || v === null || v === "") return null;
          return (
            <div key={key}>
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{key}</dt>
              <dd className="mt-0.5 break-all font-mono text-[11px] text-slate-800">
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </dd>
            </div>
          );
        })}
      </dl>

      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">Raw answers JSON</summary>
        <div className="border-t border-slate-100 px-4 py-3">
          <JsonBlock value={attempt.answers ?? attempt.answersPreview} />
        </div>
      </details>

      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">Stored scores JSON</summary>
        <div className="border-t border-slate-100 px-4 py-3">
          <JsonBlock value={attempt.scores} />
        </div>
      </details>

      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">Action plan cache</summary>
        <div className="border-t border-slate-100 px-4 py-3">
          <JsonBlock value={attempt.actionPlanCache} />
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-2">
        <AdminAttemptReportDownloader attemptId={attemptId} api={api} />
        <Link
          href={(attempt.resultsUrl as string) ?? `#`}
          target="_blank"
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
        >
          Open results route
        </Link>
      </div>
    </div>
  );
}

export function AdminAttemptDetailPanel({ attemptId, api, onClose }: Props) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const [attempt, setAttempt] = useState<AttemptRecord | null>(null);
  const [llmContext, setLlmContext] = useState<AttemptLlmContextPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [attemptRes, contextRes] = await Promise.all([
          api(`/api/admin/attempts/${encodeURIComponent(attemptId)}`),
          api(`/api/admin/attempt-llm-context/${encodeURIComponent(attemptId)}`),
        ]);
        const attemptJson = (await attemptRes.json()) as AttemptRecord & { error?: string };
        const contextJson = (await contextRes.json()) as AttemptLlmContextPackage & { error?: string };
        if (!attemptRes.ok) throw new Error(attemptJson.error ?? "Failed to load attempt");
        if (!contextRes.ok) throw new Error(contextJson.error ?? "Failed to load LLM context");
        if (!cancelled) {
          setAttempt(attemptJson);
          setLlmContext(contextJson);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load attempt detail");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attemptId, api, reloadKey]);

  const coachGuide = extractCoachGuide(attempt);
  const persona = personaFromAttempt(attempt);

  return (
    <>
      <button type="button" className="fixed inset-0 z-40 bg-slate-900/40" aria-label="Close panel" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-5xl flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">Attempt detail</h3>
            <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">{attemptId}</p>
          </div>
          <button type="button" className="shrink-0 text-sm font-semibold text-slate-500 hover:text-slate-800" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="border-b border-slate-200 bg-white px-4">
          <nav className="-mb-px flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 border-b-2 px-3 py-2.5 text-xs font-semibold transition ${
                  tab === t.id
                    ? "border-sky-600 text-sky-700"
                    : "border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto p-4 text-xs">
          {loading ? (
            <p className="text-slate-500">Loading attempt data…</p>
          ) : error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-800">{error}</p>
          ) : !attempt ? (
            <p className="text-slate-500">Attempt not found.</p>
          ) : (
            <>
              {tab === "overview" ? <OverviewTab attempt={attempt} attemptId={attemptId} api={api} /> : null}
              {tab === "wellness" ? <WellnessValuesTab context={llmContext} /> : null}
              {tab === "calculation" ? <CalculationTab persona={persona} context={llmContext} /> : null}
              {tab === "llm" ? (
                <AttemptLlmContextPanel
                  attemptId={attemptId}
                  api={api}
                  externalData={llmContext}
                  expandAllSections
                  onDataChange={() => setReloadKey((k) => k + 1)}
                />
              ) : null}
              {tab === "coach-guide" ? <AdminCoachGuideDetail guide={coachGuide} /> : null}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
