"use client";

import type { GeminiSynthesisContext } from "@/lib/recommendations/build-gemini-synthesis-context";
import type { PillarName } from "@/lib/recommendations/types";

type SelectedPlan = GeminiSynthesisContext["selectedPlan"];
type ScoredRow = GeminiSynthesisContext["rankedRecommendations"][number];

const PILLARS: PillarName[] = ["Nutrition", "Physical Activity", "Sleep & Recovery", "Mental Wellness"];

const PRIMARY_PI_ITEMS = [
  { key: "blindSpotText", label: "Blind spot" },
  { key: "patternPredictionText", label: "Pattern prediction" },
  { key: "successConditionText", label: "Success condition" },
  { key: "strengthInsightText", label: "Strength insight" },
] as const;

const SECONDARY_PI_ITEMS = [
  { key: "secondaryBlindSpotText", label: "Secondary blind spot" },
  { key: "secondaryPatternPredictionText", label: "Secondary pattern prediction" },
  { key: "secondarySuccessConditionText", label: "Secondary success condition" },
  { key: "secondaryStrengthInsightText", label: "Secondary strength insight" },
] as const;

function RecommendationCard({ row }: { row: ScoredRow }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] text-slate-500">{row.id}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700">{row.type}</span>
        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800">{row.pillar}</span>
        <span className="text-[10px] font-mono tabular-nums text-slate-500">Score {row.totalScore}</span>
      </div>
      <p className="mt-1.5 text-sm leading-snug text-slate-900">{row.text}</p>
      {row.matchReasons.length ? (
        <ul className="mt-2 list-inside list-disc text-[10px] text-slate-500">
          {row.matchReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PiTextBlock({ label, text }: { label: string; text: string }) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return (
    <div className="rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-violet-800">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-800">{trimmed}</p>
    </div>
  );
}

export function AttemptSelectedPlanOverview({ plan }: { plan: SelectedPlan | null | undefined }) {
  if (!plan) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-xs text-slate-500">
        No selected plan on this attempt context.
      </p>
    );
  }

  const pi = plan.piSeries;
  const pillarEntries = PILLARS.map((pillar) => ({ pillar, data: plan.pillars[pillar] })).filter(
    (entry) => entry.data != null,
  );

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-900">PI series</h4>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              pi.complete ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
            }`}
          >
            {pi.complete ? "Complete" : "Incomplete"}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          Personality insight rows selected for primary and secondary persona report sections.
        </p>

        <div className="mt-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Primary persona</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PRIMARY_PI_ITEMS.map((item) => (
              <PiTextBlock key={item.key} label={item.label} text={String(pi[item.key] ?? "")} />
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Secondary persona</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {SECONDARY_PI_ITEMS.map((item) => (
              <PiTextBlock key={item.key} label={item.label} text={String(pi[item.key] ?? "")} />
            ))}
          </div>
        </div>

        {pi.sourceIds.length > 0 ? (
          <p className="mt-3 text-[10px] text-slate-500">
            Source IDs: <span className="font-mono">{pi.sourceIds.join(", ")}</span>
          </p>
        ) : null}
      </section>

      {plan.opportunities.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h4 className="text-sm font-semibold text-slate-900">
              High-impact opportunities ({plan.opportunities.length})
            </h4>
          </div>
          <div className="divide-y divide-slate-100">
            {plan.opportunities.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                    {item.pillar}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">{item.id}</span>
                  <span className="text-[10px] text-slate-500">
                    {item.impactLevel} · score {item.score}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">{item.category}</p>
                {item.personaContextText ? (
                  <p className="mt-1 text-sm text-slate-800">{item.personaContextText}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h4 className="text-sm font-semibold text-slate-900">Pillar picks</h4>
          <p className="mt-1 text-[11px] text-slate-500">
            Mindset focus plus do/don&apos;t recommendations chosen per wellness pillar.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {pillarEntries.map(({ pillar, data }) => (
            <div key={pillar} className="px-4 py-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{pillar}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{data.focusArea}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{data.focusReason}</p>

              {data.focusRow ? (
                <div className="mt-3">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Focus row</p>
                  <RecommendationCard row={data.focusRow} />
                </div>
              ) : null}

              {data.dos.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Dos ({data.dos.length})</p>
                  {data.dos.map((row) => (
                    <RecommendationCard key={row.id} row={row} />
                  ))}
                </div>
              ) : null}

              {data.donts.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-red-700">
                    Don&apos;ts ({data.donts.length})
                  </p>
                  {data.donts.map((row) => (
                    <RecommendationCard key={row.id} row={row} />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {plan.safetyGuidance.length > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50/40">
          <div className="border-b border-amber-100 px-4 py-3">
            <h4 className="text-sm font-semibold text-amber-950">
              Safety guidance ({plan.safetyGuidance.length})
            </h4>
          </div>
          <div className="space-y-2 px-4 py-3">
            {plan.safetyGuidance.map((row) => (
              <RecommendationCard key={row.id} row={row} />
            ))}
          </div>
        </section>
      ) : null}

      {plan.launchpad.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">Launchpad ({plan.launchpad.length})</h4>
          <div className="mt-3 space-y-2">
            {plan.launchpad.map((item, index) => (
              <div key={`${item.group}-${index}`} className="rounded-lg border border-slate-200 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{item.group}</p>
                <p className="mt-1 text-sm text-slate-800">{item.text}</p>
                {item.row ? <div className="mt-2"><RecommendationCard row={item.row} /></div> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {plan.coachNotes.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">Coach source rows ({plan.coachNotes.length})</h4>
          <div className="mt-3 space-y-2">
            {plan.coachNotes.map((row) => (
              <RecommendationCard key={row.id} row={row} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
