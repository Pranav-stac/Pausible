"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { ActionPlanApiResponse } from "@/lib/recommendations/client-types";
import type { StoredActionPlanCache } from "@/lib/recommendations/action-plan-cache";
import { buildResultsReportModel, reportAttemptRef } from "@/lib/results/build-results-report";
import { downloadReportAsPdf } from "@/lib/results/download-report-pdf";
import { collectReportImageUrls, preloadReportImages } from "@/lib/results/preload-report-images";
import { WellnessReportSlideStack } from "@/components/results/WellnessReportSlideStack";
import type { AssessmentDefinition } from "@/types/models";
import type { AttemptAnswers, AttemptScores } from "@/types/models";
import type { PersonaAnalysis } from "@/lib/scoring/persona-types";
import type { SerializedAttempt } from "@/lib/local/attempts";

type AdminAttemptRow = {
  id: string;
  uid: string;
  assessmentId: string;
  answers: AttemptAnswers;
  scores?: AttemptScores | null;
  personaAnalysis?: PersonaAnalysis | null;
  actionPlanCache?: StoredActionPlanCache | null;
  ownerEmail?: string | null;
};

type Props = {
  attemptId: string;
  api: (path: string, init?: RequestInit) => Promise<Response>;
};

function toSerializedAttempt(row: AdminAttemptRow): SerializedAttempt {
  return {
    id: row.id,
    uid: row.uid,
    assessmentId: row.assessmentId,
    answers: row.answers,
    scores: row.scores ?? null,
    personaAnalysis: row.personaAnalysis ?? row.scores?.persona ?? null,
    actionPlanCache: row.actionPlanCache ?? null,
    paymentStatus: "paid",
  };
}

function planFromCache(cache: StoredActionPlanCache | null | undefined): ActionPlanApiResponse | null {
  if (!cache?.plan) return null;
  return { plan: cache.plan };
}

export function AdminAttemptReportDownloader({ attemptId, api }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderBundle, setRenderBundle] = useState<{
    model: ReturnType<typeof buildResultsReportModel>;
    attempt: SerializedAttempt;
    plan: ActionPlanApiResponse;
    assessment: AssessmentDefinition;
  } | null>(null);

  const handleDownload = async () => {
    setBusy(true);
    setError(null);
    try {
      const attemptRes = await api(`/api/admin/attempts/${encodeURIComponent(attemptId)}`);
      const attemptJson = (await attemptRes.json()) as AdminAttemptRow & { error?: string };
      if (!attemptRes.ok) throw new Error(attemptJson.error ?? "Could not load attempt");

      const plan = planFromCache(attemptJson.actionPlanCache);
      if (!plan?.plan.synthesis) {
        throw new Error("No cached report on this attempt. Click “Regenerate with current provider” first.");
      }

      const assessmentRes = await api(
        `/api/admin/assessments/${encodeURIComponent(attemptJson.assessmentId || "default")}`,
      );
      const assessment = (await assessmentRes.json()) as AssessmentDefinition & { error?: string };
      if (!assessmentRes.ok) throw new Error(assessment.error ?? "Could not load assessment");

      const attempt = toSerializedAttempt(attemptJson);
      const model = buildResultsReportModel({
        attempt,
        assessment,
        participantName: attemptJson.ownerEmail ?? null,
      });

      flushSync(() => {
        setRenderBundle({ model, attempt, plan, assessment });
      });
      await preloadReportImages(collectReportImageUrls(model));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const root = rootRef.current;
      if (!root) throw new Error("Report renderer not ready");
      await downloadReportAsPdf(root, `pausible-report-${reportAttemptRef(attemptId)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not download report");
    } finally {
      setBusy(false);
    }
  };

  const refId = reportAttemptRef(attemptId);
  const synthesis = renderBundle?.plan.plan.synthesis;
  const sections = synthesis?.reportSections;

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleDownload()}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
      >
        {busy ? "Preparing report PDF…" : "Download wellness report PDF"}
      </button>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}

      <div
        ref={rootRef}
        className="scheme-light pointer-events-none fixed left-[-120rem] top-0 z-[-1] w-[49.625rem] bg-slate-100 text-slate-900"
        aria-hidden
      >
        {renderBundle && synthesis ? (
          <div className="flex flex-col gap-5 py-8">
            <WellnessReportSlideStack
              model={renderBundle.model}
              refId={refId}
              attempt={renderBundle.attempt}
              personaAnalysis={renderBundle.attempt.personaAnalysis}
              synthesis={synthesis}
              sections={sections}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
