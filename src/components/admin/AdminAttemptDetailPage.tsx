"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AdminAttemptReportDownloader } from "@/components/admin/AdminAttemptReportDownloader";
import { AdminCoachGuideDetail } from "@/components/admin/AdminCoachGuideDetail";
import { AttemptActionPlanCacheOverview } from "@/components/admin/AttemptActionPlanCacheOverview";
import { AttemptAnswersView } from "@/components/admin/AttemptAnswersView";
import { AttemptLlmContextPanel } from "@/components/admin/AttemptLlmContextPanel";
import { AttemptPersonaDetail } from "@/components/admin/AttemptPersonaDetail";
import { AttemptPdaEnginePanel } from "@/components/admin/AttemptPdaEnginePanel";
import { AttemptScoresOverview } from "@/components/admin/AttemptScoresOverview";
import { AttemptSelectedPlanOverview } from "@/components/admin/AttemptSelectedPlanOverview";
import { getWellnessContextQuestionnaire, wellnessContextAssessmentId } from "@/data/wellness-context-questionnaire";
import {
  buildAttemptAnswerBlocks,
  buildOrphanAnswerRows,
  countAnsweredRows,
} from "@/lib/admin/format-attempt-answer";
import { getFirebaseAuth } from "@/lib/firebase/client";
import type { CoachGuideDocument } from "@/lib/coach-guide/types";
import type { AttemptLlmContextPackage } from "@/lib/recommendations/build-attempt-llm-context";
import type { ActionPlanSynthesis } from "@/lib/recommendations/types";
import type { PersonaAnalysis } from "@/lib/scoring/persona-types";
import type { AssessmentDefinition, AttemptScores } from "@/types/models";

type DetailTab = "answers" | "overview" | "wellness" | "calculation" | "pda-engine" | "llm" | "coach-guide";

type AttemptRecord = Record<string, unknown>;

type Props = {
  attemptId: string;
};

const TABS: { id: DetailTab; label: string }[] = [
  { id: "answers", label: "Answers" },
  { id: "overview", label: "Overview" },
  { id: "wellness", label: "Wellness values" },
  { id: "calculation", label: "Calculation" },
  { id: "pda-engine", label: "PDA engine" },
  { id: "llm", label: "Prompts & responses" },
  { id: "coach-guide", label: "Coach guide" },
];

async function getBearer(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

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
                {personality.fitTier} · {personality.fitScore}% · blend ratio{" "}
                {Number.isFinite(personality.blendRatio) ? personality.blendRatio.toFixed(3) : "∞"} ·{" "}
                {personality.blendStrength}
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
        <section>
          <h4 className="mb-3 text-sm font-semibold text-slate-900">Selected plan (PI series + pillar picks)</h4>
          <AttemptSelectedPlanOverview plan={selectedPlan} />
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h4 className="text-sm font-semibold text-slate-900">Ranked recommendations ({ranked.length})</h4>
          <p className="mt-1 text-[11px] text-slate-500">
            PDA §14 scoring — per-pillar rank with tier-scaled persona, blend secondary, caps. Max internal score{" "}
            {155}. See <strong>PDA engine</strong> tab for full breakdown.
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

function MetaField({ label, value }: { label: string; value: ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-all text-[11px] text-slate-800">{value}</dd>
    </div>
  );
}

function OverviewTab({
  attempt,
  attemptId,
  api,
  persona,
  onOpenCoachGuide,
}: {
  attempt: AttemptRecord;
  attemptId: string;
  api: (path: string, init?: RequestInit) => Promise<Response>;
  persona: PersonaAnalysis | null;
  onOpenCoachGuide: () => void;
}) {
  const resultsUrl = typeof attempt.resultsUrl === "string" ? attempt.resultsUrl : `/results/${attemptId}`;
  const scores = (attempt.scores as AttemptScores | null | undefined) ?? null;
  const ownerType = String(attempt.ownerType ?? "anonymous");
  const ownerLabel =
    ownerType === "google" ? (attempt.ownerEmail as string | null) ?? "Google user" : "Anonymous";

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
        <h4 className="text-sm font-semibold text-slate-900">Quick links</h4>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href={resultsUrl}
            target="_blank"
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Open results page
          </Link>
          <AdminAttemptReportDownloader attemptId={attemptId} api={api} />
        </div>
        <p className="mt-2 break-all font-mono text-[11px] text-slate-600">{resultsUrl}</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-slate-900">Attempt metadata</h4>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <MetaField label="Attempt ID" value={<span className="font-mono">{String(attempt.id ?? attemptId)}</span>} />
          <MetaField label="User ID" value={<span className="font-mono">{String(attempt.uid ?? "")}</span>} />
          <MetaField label="Owner" value={ownerLabel} />
          <MetaField label="Owner type" value={ownerType} />
          <MetaField label="Assessment" value={String(attempt.assessmentId ?? "")} />
          <MetaField label="Answer count" value={String(attempt.answersCount ?? "")} />
          <MetaField label="Payment status" value={String(attempt.paymentStatus ?? "")} />
          <MetaField label="Payment provider" value={String(attempt.paymentProvider ?? "")} />
          <MetaField label="Payment ID" value={<span className="font-mono">{String(attempt.paymentId ?? "")}</span>} />
          <MetaField
            label="Share eligible"
            value={attempt.isLatestShareEligible ? "Yes" : attempt.isLatestShareEligible === false ? "No" : null}
          />
          <MetaField label="Share token" value={<span className="font-mono">{String(attempt.shareToken ?? "")}</span>} />
          <MetaField label="Created" value={String(attempt.createdAt ?? "")} />
          <MetaField label="Paid at" value={String(attempt.paidAt ?? "")} />
          <MetaField label="Claimed at" value={String(attempt.claimedAt ?? "")} />
        </dl>
      </section>

      <section>
        <h4 className="mb-3 text-sm font-semibold text-slate-900">Stored scores</h4>
        <AttemptScoresOverview scores={scores} persona={persona} />
      </section>

      <section>
        <h4 className="mb-3 text-sm font-semibold text-slate-900">Action plan cache</h4>
        <AttemptActionPlanCacheOverview cache={attempt.actionPlanCache} onOpenCoachGuide={onOpenCoachGuide} />
      </section>

      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">Raw debug JSON</summary>
        <div className="space-y-4 border-t border-slate-100 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Scores</p>
            <JsonBlock value={attempt.scores} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Action plan cache</p>
            <JsonBlock value={attempt.actionPlanCache} />
          </div>
        </div>
      </details>
    </div>
  );
}

async function loadAssessment(
  api: (path: string, init?: RequestInit) => Promise<Response>,
  id: string,
): Promise<AssessmentDefinition | null> {
  try {
    const res = await api(`/api/admin/assessments/${encodeURIComponent(id)}`);
    return (await res.json()) as AssessmentDefinition;
  } catch {
    return null;
  }
}

export function AdminAttemptDetailPage({ attemptId }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<DetailTab>("answers");
  const [attempt, setAttempt] = useState<AttemptRecord | null>(null);
  const [llmContext, setLlmContext] = useState<AttemptLlmContextPackage | null>(null);
  const [personalityAssessment, setPersonalityAssessment] = useState<AssessmentDefinition | null>(null);
  const [wellnessAssessment, setWellnessAssessment] = useState<AssessmentDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getBearer();
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(path, { ...init, headers });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? `Request failed (${res.status})`);
    }
    return res;
  }, []);

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

        const assessmentId = String(attemptJson.assessmentId ?? "default");
        const [personalityDef, wellnessDef] = await Promise.all([
          loadAssessment(api, assessmentId),
          loadAssessment(api, wellnessContextAssessmentId),
        ]);

        if (!cancelled) {
          setAttempt(attemptJson);
          setLlmContext(contextJson);
          setPersonalityAssessment(personalityDef);
          setWellnessAssessment(wellnessDef ?? getWellnessContextQuestionnaire());
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

  const answers = useMemo(() => {
    const raw = attempt?.answers ?? attempt?.answersPreview;
    return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  }, [attempt]);

  const answerBlocks = useMemo(() => {
    const assessments = [personalityAssessment, wellnessAssessment].filter(
      (def): def is AssessmentDefinition => def != null,
    );
    return buildAttemptAnswerBlocks(assessments, answers);
  }, [answers, personalityAssessment, wellnessAssessment]);

  const orphanRows = useMemo(() => {
    const assessments = [personalityAssessment, wellnessAssessment].filter(
      (def): def is AssessmentDefinition => def != null,
    );
    return buildOrphanAnswerRows(assessments, answers);
  }, [answers, personalityAssessment, wellnessAssessment]);

  const answerCounts = useMemo(() => countAnsweredRows(answerBlocks), [answerBlocks]);

  const coachGuide = extractCoachGuide(attempt);
  const persona = personaFromAttempt(attempt);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => router.push("/admin?tab=attempts")}
              className="text-xs font-semibold text-sky-700 hover:text-sky-900"
            >
              ← Back to attempts
            </button>
            <h1 className="mt-2 text-lg font-semibold text-slate-900">Attempt detail</h1>
            <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">{attemptId}</p>
          </div>
          {attempt?.resultsUrl ? (
            <Link
              href={String(attempt.resultsUrl)}
              target="_blank"
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
            >
              Open results
            </Link>
          ) : null}
        </div>

        <div className="mx-auto max-w-6xl border-t border-slate-100 px-4 sm:px-6">
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
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 text-xs sm:px-6">
        {loading ? (
          <p className="text-slate-500">Loading attempt data…</p>
        ) : error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-800">{error}</p>
        ) : !attempt ? (
          <p className="text-slate-500">Attempt not found.</p>
        ) : (
          <>
            {tab === "answers" ? (
              <AttemptAnswersView
                blocks={answerBlocks}
                orphanRows={orphanRows}
                answeredCount={answerCounts.answered}
                totalCount={answerCounts.total}
              />
            ) : null}
            {tab === "overview" ? (
              <OverviewTab
                attempt={attempt}
                attemptId={attemptId}
                api={api}
                persona={persona}
                onOpenCoachGuide={() => setTab("coach-guide")}
              />
            ) : null}
            {tab === "wellness" ? <WellnessValuesTab context={llmContext} /> : null}
            {tab === "calculation" ? <CalculationTab persona={persona} context={llmContext} /> : null}
            {tab === "pda-engine" ? <AttemptPdaEnginePanel attemptId={attemptId} api={api} /> : null}
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
      </main>
    </div>
  );
}
