"use client";

import { useEffect, useState } from "react";
import type { ActionPlanApiResponse } from "@/lib/recommendations/client-types";
import { formatPillarDoLine, formatPillarDontLine } from "@/lib/recommendations/pillar-display";
import { buildStoredActionPlanCache, type StoredActionPlanCache } from "@/lib/recommendations/action-plan-cache";
import type { PillarName } from "@/lib/recommendations/types";
import { patchAttempt } from "@/lib/data/attempt-service";
import type { SerializedAttempt } from "@/lib/local/attempts";

const PILLAR_ORDER: PillarName[] = ["Nutrition", "Physical Activity", "Sleep & Recovery", "Mental Wellness"];

const PILLAR_ACCENTS: Record<PillarName, { bg: string; ring: string; dot: string }> = {
  Nutrition: { bg: "from-emerald-50 to-teal-50/60", ring: "ring-emerald-200/80", dot: "#059669" },
  "Physical Activity": { bg: "from-sky-50 to-blue-50/60", ring: "ring-sky-200/80", dot: "#0284c7" },
  "Sleep & Recovery": { bg: "from-indigo-50 to-violet-50/60", ring: "ring-indigo-200/80", dot: "#6366f1" },
  "Mental Wellness": { bg: "from-amber-50 to-orange-50/60", ring: "ring-amber-200/80", dot: "#ea580c" },
};

const LAUNCHPAD_HEADINGS = {
  start_here: "Start here",
  environment_setup: "Environment setup",
  recovery_rules: "Recovery rules",
} as const;

type Props = {
  attempt: SerializedAttempt;
  accent?: string;
  onActionPlanCached?: (cache: StoredActionPlanCache) => void;
};

function responseFromCache(cache: StoredActionPlanCache): ActionPlanApiResponse {
  return { plan: cache.plan };
}

export function WellnessActionPlan({ attempt, accent = "#0284c7", onActionPlanCached }: Props) {
  const initialCache = attempt.actionPlanCache?.plan ? attempt.actionPlanCache : null;
  const [data, setData] = useState<ActionPlanApiResponse | null>(() =>
    initialCache ? responseFromCache(initialCache) : null,
  );
  const [loading, setLoading] = useState(!initialCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (attempt.actionPlanCache?.plan) {
      setData(responseFromCache(attempt.actionPlanCache));
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/recommendations/action-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: attempt.id,
            answers: attempt.answers,
            scores: attempt.scores ?? null,
          }),
        });
        const json = (await res.json()) as ActionPlanApiResponse & {
          error?: string;
          code?: string;
          inputHash?: string;
          cached?: boolean;
        };
        if (!res.ok) {
          if (json.code === "recommendation_config_missing") {
            throw new Error(
              "Recommendation data is not loaded in Firestore yet. An admin must run POST /api/admin/recommendations/seed once.",
            );
          }
          throw new Error(json.error ?? `Request failed (${res.status})`);
        }
        if (cancelled) return;

        setData({ plan: json.plan });

        if (json.inputHash) {
          const cache = buildStoredActionPlanCache(json.inputHash, json.plan);
          onActionPlanCached?.(cache);
          void patchAttempt(attempt.id, { actionPlanCache: cache });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load your action plan");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [attempt.actionPlanCache, attempt.answers, attempt.id, attempt.scores, onActionPlanCached]);

  if (loading) {
    return (
      <div className="results-bento-in overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.22)] sm:p-8">
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-2.5 w-2.5 animate-pulse rounded-full"
            style={{ backgroundColor: accent }}
          />
          <p className="text-sm font-semibold text-slate-600">Building your personalized action plan…</p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50/80 p-5 text-sm text-rose-900">
        <p className="font-bold">Action plan unavailable</p>
        <p className="mt-1 text-rose-800/90">{error ?? "Unknown error"}</p>
      </div>
    );
  }

  const { synthesis } = data.plan;
  const showAiNote = !synthesis.synthesized && synthesis.synthesisError;

  return (
    <section className="space-y-4" aria-labelledby="wellness-action-plan-heading">
      <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Personalized</p>
          <h2 id="wellness-action-plan-heading" className="text-xl font-black text-slate-950 sm:text-2xl">
            Your wellness action plan
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Matched to your persona, goals, and context — then summarized for you
            {synthesis.synthesized ? " with AI" : ""}.
          </p>
        </div>
        {synthesis.synthesized ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-800 ring-1 ring-violet-200">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            AI summary
          </span>
        ) : null}
      </div>

      {showAiNote ? (
        <p className="rounded-xl bg-slate-100 px-4 py-2 text-xs text-slate-600">{synthesis.synthesisError}</p>
      ) : null}

      {(() => {
        const cards =
          synthesis.opportunityCards ??
          (synthesis.opportunities ?? []).map((o) => ({
            id: o.category,
            pillar: "Nutrition" as const,
            category: o.category,
            headline: o.title,
            whyItMatters: o.summary,
            impactLevel: "High" as const,
            score: 0,
            personaContextText: o.summary,
            sourceIds: o.sourceIds,
          }));
        if (cards.length === 0) return null;
        return (
          <div className="grid gap-3 sm:grid-cols-3">
            {cards.map((opp, i) => (
              <div
                key={opp.id + i}
                className="results-bento-in overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{opp.pillar}</p>
                <h3 className="mt-1 text-base font-bold text-slate-950">{opp.headline}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{opp.whyItMatters}</p>
              </div>
            ))}
          </div>
        );
      })()}

      <div className="grid gap-4 lg:grid-cols-2">
        {PILLAR_ORDER.map((pillar) => {
          const plan = synthesis.pillarPlans[pillar];
          const accentP = PILLAR_ACCENTS[pillar];
          if (!plan) return null;
          return (
            <article
              key={pillar}
              className={`overflow-hidden rounded-[1.5rem] bg-linear-to-br ${accentP.bg} ring-1 ${accentP.ring}`}
            >
              <header className="border-b border-white/60 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentP.dot }} />
                  <h3 className="text-sm font-black text-slate-950">{pillar}</h3>
                </div>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Focus: {plan.focusArea}
                </p>
                <p className="mt-2 text-sm text-slate-700">{plan.focusReason}</p>
              </header>
              <div className="grid gap-0 sm:grid-cols-2">
                <div className="border-b border-white/50 p-4 sm:border-b-0 sm:border-r">
                  <p className="text-[10px] font-bold uppercase text-emerald-800">Do</p>
                  <ul className="mt-2 space-y-2">
                    {plan.dos.map((item, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-800">
                        <span className="text-emerald-600">✓</span>
                        <span>{formatPillarDoLine(item)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase text-rose-800">Don&apos;t</p>
                  <ul className="mt-2 space-y-2">
                    {plan.donts.map((item, idx) => (
                      <li key={idx} className="flex gap-2 text-sm text-slate-800">
                        <span className="text-rose-500">✕</span>
                        <span>{formatPillarDontLine(item)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Wellness launchpad</p>
          <h3 className="text-lg font-black text-slate-950">Quick starts this week</h3>
        </div>
        <div className="grid gap-0 md:grid-cols-3 md:divide-x md:divide-slate-100">
          {(Object.keys(LAUNCHPAD_HEADINGS) as (keyof typeof LAUNCHPAD_HEADINGS)[]).map((key) => (
            <div key={key} className="p-4 sm:p-5">
              <p className="text-xs font-bold text-slate-800">{LAUNCHPAD_HEADINGS[key]}</p>
              <ul className="mt-3 space-y-2">
                {(synthesis.launchpad[key] ?? []).map((item) => (
                  <li key={item.id} className="text-sm leading-relaxed text-slate-600">
                    <span className="font-medium text-slate-800">{item.action}</span>
                    {item.context ? <span className="block text-xs text-slate-500">{item.context}</span> : null}
                  </li>
                ))}
                {(synthesis.launchpad[key] ?? []).length === 0 ? (
                  <li className="text-sm text-slate-400">—</li>
                ) : null}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div
          className="rounded-[1.5rem] p-5 text-white shadow-md"
          style={{ background: `linear-gradient(135deg, ${accent}, #6366f1)` }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Coach notes</p>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="font-bold text-white/90">Key strength</dt>
              <dd className="mt-1 leading-relaxed text-white/95">{synthesis.coachNotes.keyStrength}</dd>
            </div>
            <div>
              <dt className="font-bold text-white/90">Watch for</dt>
              <dd className="mt-1 leading-relaxed text-white/95">{synthesis.coachNotes.keyRisk}</dd>
            </div>
            <div>
              <dt className="font-bold text-white/90">Coaching notes</dt>
              <dd className="mt-1">
                <ul className="space-y-2">
                  {(synthesis.coachNotes.coachingNotes ?? []).map((note) => (
                    <li key={note} className="leading-relaxed text-white/95">
                      {note}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </div>

        {synthesis.safetyGuidance.length > 0 ? (
          <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/90 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-900">Safety guidance</p>
            <ul className="mt-3 space-y-3">
              {synthesis.safetyGuidance.map((s) => (
                <li key={s.id} className="text-sm leading-relaxed text-amber-950">
                  {s.text}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
