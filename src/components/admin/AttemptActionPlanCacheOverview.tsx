"use client";

import type { ActionPlanApiResponse } from "@/lib/recommendations/client-types";
import type { StoredActionPlanCache } from "@/lib/recommendations/action-plan-cache";
import type { PillarName } from "@/lib/recommendations/types";
import { personaLabel } from "@/lib/results/persona-display";
import { fitTierLabel } from "@/lib/scoring/persona-fit";

const PILLARS: PillarName[] = ["Nutrition", "Physical Activity", "Sleep & Recovery", "Mental Wellness"];

function parseCache(raw: unknown): StoredActionPlanCache | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const plan = row.plan;
  const inputHash = typeof row.inputHash === "string" ? row.inputHash : "";
  if (!inputHash || !plan || typeof plan !== "object") return null;
  return {
    inputHash,
    plan: plan as ActionPlanApiResponse["plan"],
    llmProvider: typeof row.llmProvider === "string" ? (row.llmProvider as StoredActionPlanCache["llmProvider"]) : undefined,
    synthesizedAt: typeof row.synthesizedAt === "string" ? row.synthesizedAt : undefined,
    tokenUsage:
      row.tokenUsage && typeof row.tokenUsage === "object"
        ? (row.tokenUsage as StoredActionPlanCache["tokenUsage"])
        : null,
  };
}

function TagList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

type Props = {
  cache: unknown;
  onOpenCoachGuide?: () => void;
};

export function AttemptActionPlanCacheOverview({ cache, onOpenCoachGuide }: Props) {
  const parsed = parseCache(cache);

  if (!parsed) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-xs text-slate-500">
        No action plan cached on this attempt. Generate results to build the wellness report.
      </p>
    );
  }

  const { plan, inputHash, synthesizedAt, llmProvider, tokenUsage } = parsed;
  const { profile, synthesis, audit } = plan;
  const opportunityCards = synthesis.opportunityCards ?? synthesis.reportSections?.opportunities ?? [];
  const integratedPhases = synthesis.integratedPlan?.phases?.length ?? 0;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-slate-900">Cache metadata</h4>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Synthesized</dt>
            <dd className="mt-0.5 text-sm text-slate-800">
              {synthesis.synthesized ? (
                <span className="font-semibold text-emerald-700">Yes</span>
              ) : (
                <span className="font-semibold text-amber-700">No</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">LLM provider</dt>
            <dd className="mt-0.5 text-sm text-slate-800">{llmProvider ?? synthesis.llmProvider ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Synthesized at</dt>
            <dd className="mt-0.5 text-sm text-slate-800">{synthesizedAt?.slice(0, 19).replace("T", " ") ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Input hash</dt>
            <dd className="mt-0.5 break-all font-mono text-[11px] text-slate-700">{inputHash.slice(0, 16)}…</dd>
          </div>
          {tokenUsage ? (
            <div className="sm:col-span-2">
              <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Token usage</dt>
              <dd className="mt-0.5 text-sm text-slate-800">
                {tokenUsage.model} · prompt {tokenUsage.promptTokens} · completion {tokenUsage.completionTokens} · total{" "}
                {tokenUsage.totalTokens}
              </dd>
            </div>
          ) : null}
        </dl>
        {synthesis.synthesisError ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {synthesis.synthesisError}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-slate-900">Matched profile</h4>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Primary persona</dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-900">{personaLabel(profile.primaryPersona)}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Secondary persona</dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-900">{personaLabel(profile.secondaryPersona)}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Fit tier</dt>
            <dd className="mt-0.5 text-sm text-slate-800">
              {fitTierLabel(profile.fitTier)} · blend {profile.blendStrength}
            </dd>
          </div>
        </dl>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TagList title="Goals" items={profile.goals} />
          <TagList title="Barriers" items={profile.barriers} />
          <TagList title="Context" items={profile.context} />
          <TagList title="Exclusions" items={profile.exclusions} />
        </div>
      </section>

      {opportunityCards.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h4 className="text-sm font-semibold text-slate-900">Opportunity cards ({opportunityCards.length})</h4>
          </div>
          <div className="divide-y divide-slate-100">
            {opportunityCards.map((card) => (
              <div key={card.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                    {card.pillar}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{card.id}</span>
                  <span className="text-[10px] text-slate-500">Score {card.score}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900">{card.headline}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{card.whyItMatters}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h4 className="text-sm font-semibold text-slate-900">Pillar plans</h4>
        </div>
        <div className="divide-y divide-slate-100">
          {PILLARS.map((pillar) => {
            const pillarPlan = synthesis.pillarPlans?.[pillar];
            if (!pillarPlan) {
              return (
                <div key={pillar} className="px-4 py-3 text-[11px] text-slate-500">
                  {pillar} — not generated
                </div>
              );
            }
            return (
              <div key={pillar} className="px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{pillar}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{pillarPlan.focusArea}</p>
                <p className="mt-1 text-[11px] text-slate-600">{pillarPlan.focusReason}</p>
                <p className="mt-2 text-[10px] text-slate-500">
                  {pillarPlan.dos.length} dos · {pillarPlan.donts.length} donts · {pillarPlan.sourceIds.length} sources
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {audit.rankedTop.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h4 className="text-sm font-semibold text-slate-900">Top ranked recommendations</h4>
          </div>
          <div className="max-h-64 overflow-auto">
            <table className="w-full min-w-[520px] border-collapse text-[11px]">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="border-b text-left text-[10px] uppercase text-slate-500">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Pillar</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {audit.rankedTop.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-3 py-1.5 font-mono">{row.id}</td>
                    <td className="px-3 py-1.5">{row.pillar}</td>
                    <td className="px-3 py-1.5">{row.type}</td>
                    <td className="px-3 py-1.5 font-mono tabular-nums">{row.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-slate-900">Generated artifacts</h4>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>
            Coach guide:{" "}
            {synthesis.coachGuide ? (
              onOpenCoachGuide ? (
                <button type="button" onClick={onOpenCoachGuide} className="font-semibold text-sky-700 hover:text-sky-900">
                  View in Coach guide tab →
                </button>
              ) : (
                <span className="font-semibold text-emerald-700">Present</span>
              )
            ) : (
              <span className="text-slate-500">Not generated</span>
            )}
          </li>
          <li>
            Integrated plan:{" "}
            {integratedPhases > 0 ? (
              <span className="font-semibold text-emerald-700">{integratedPhases} phases</span>
            ) : (
              <span className="text-slate-500">Not generated</span>
            )}
          </li>
          <li>
            Safety guidance:{" "}
            <span className="font-semibold text-slate-900">{synthesis.safetyGuidance?.length ?? 0} items</span>
          </li>
          <li>
            Source recommendations:{" "}
            <span className="font-semibold text-slate-900">{audit.sourceIds.length}</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
