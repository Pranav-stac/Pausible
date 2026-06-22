"use client";

import { useRef, useState, useEffect } from "react";
import type { ActionPlanApiResponse } from "@/lib/recommendations/client-types";
import { buildStoredActionPlanCache, hashActionPlanInputs, type StoredActionPlanCache } from "@/lib/recommendations/action-plan-cache";
import { isActionPlanClientCacheValid } from "@/lib/recommendations/action-plan-client-cache";
import type { ReportLlmProvider } from "@/lib/recommendations/report-llm-types";
import type { SerializedAttempt } from "@/lib/local/attempts";
import { patchAttempt } from "@/lib/data/attempt-service";
import { reportAttemptRef } from "@/lib/results/build-results-report";
import { downloadReportAsPdf } from "@/lib/results/download-report-pdf";
import { CoachGuideSlideStack } from "@/components/results/CoachGuideSlideStack";
import { ReportPreparingScreen } from "@/components/results/ReportPreparingScreen";
import { resolveParticipantFirstName } from "@/lib/results/resolve-participant-name";

type Props = {
  attempt: SerializedAttempt;
  attemptId: string;
  participantName?: string | null;
  onBack?: () => void;
  forceRegenerate?: boolean;
  reportLlmProvider: ReportLlmProvider;
};

export function PausibleCoachGuideReport({
  attempt,
  attemptId,
  participantName,
  onBack,
  forceRegenerate = false,
  reportLlmProvider,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const clientCache = isActionPlanClientCacheValid(attempt.actionPlanCache, reportLlmProvider, forceRegenerate)
    ? attempt.actionPlanCache
    : null;
  const [planData, setPlanData] = useState<ActionPlanApiResponse | null>(() =>
    clientCache ? { plan: clientCache.plan } : null,
  );
  const [loading, setLoading] = useState(!clientCache);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const refId = reportAttemptRef(attemptId);
  const coachGuideRaw = planData?.plan.synthesis.coachGuide;
  const displayFirstName = resolveParticipantFirstName({
    participantName,
    ownerEmail: attempt.ownerEmail,
    answers: attempt.answers,
    fallback: "Client",
  });
  const coachGuide =
    coachGuideRaw && displayFirstName !== "Client"
      ? { ...coachGuideRaw, clientName: displayFirstName }
      : coachGuideRaw;

  useEffect(() => {
    const validCache = isActionPlanClientCacheValid(attempt.actionPlanCache, reportLlmProvider, forceRegenerate);
    if (validCache) {
      setPlanData({ plan: attempt.actionPlanCache!.plan });
      setLoading(false);
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
            attemptId,
            answers: attempt.answers,
            scores: attempt.scores,
            participantName,
            forceRegenerate,
            llmProvider: reportLlmProvider,
          }),
        });
        if (!res.ok) throw new Error(`Failed to load coach guide (${res.status})`);
        const data = (await res.json()) as ActionPlanApiResponse;
        if (cancelled) return;
        setPlanData(data);
        const cache = buildStoredActionPlanCache(
          hashActionPlanInputs(attempt.answers, attempt.scores ?? null, reportLlmProvider),
          data.plan,
          reportLlmProvider,
        );
        void patchAttempt(attemptId, { actionPlanCache: cache });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load coach guide");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [attempt, attemptId, forceRegenerate, reportLlmProvider, participantName]);

  if (loading) {
    return <ReportPreparingScreen title="Preparing coach guide…" onBack={onBack} />;
  }

  if (error || !coachGuide) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-slate-600">{error ?? "Coach guide could not be generated."}</p>
        {onBack ? (
          <button type="button" onClick={onBack} className="mt-6 text-sm font-semibold text-teal-700">
            ← Back
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 scheme-light">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          {onBack ? (
            <button type="button" onClick={onBack} className="text-sm font-semibold text-slate-700 hover:text-slate-900">
              ← Back to summary
            </button>
          ) : (
            <span className="text-sm font-bold text-slate-900">Coach Guide</span>
          )}
          <button
            type="button"
            disabled={pdfBusy}
            onClick={async () => {
              if (!rootRef.current) return;
              setPdfBusy(true);
              try {
                await downloadReportAsPdf(rootRef.current, `pausibl-coach-guide-${refId}.pdf`);
              } finally {
                setPdfBusy(false);
              }
            }}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {pdfBusy ? "Exporting…" : "Download PDF"}
          </button>
        </div>
      </div>
      <div ref={rootRef} className="mx-auto max-w-4xl space-y-6 px-4 py-8 print:space-y-0 print:px-0 print:py-0">
        <CoachGuideSlideStack guide={coachGuide} refId={refId} />
      </div>
    </div>
  );
}
