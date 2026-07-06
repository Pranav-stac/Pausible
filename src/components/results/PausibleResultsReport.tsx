"use client";

import Link from "next/link";
import { useRef, useState, useEffect, useCallback } from "react";
import type { ResultsReportModel } from "@/lib/results/build-results-report";
import { reportAttemptRef } from "@/lib/results/build-results-report";
import { downloadReportAsPdf, reportPdfFilename } from "@/lib/results/download-report-pdf";
import type { ActionPlanApiResponse } from "@/lib/recommendations/client-types";
import { buildStoredActionPlanCache, hashActionPlanInputs, type StoredActionPlanCache } from "@/lib/recommendations/action-plan-cache";
import { isActionPlanClientCacheValid } from "@/lib/recommendations/action-plan-client-cache";
import { reportLlmProviderLabel, type ReportLlmProvider } from "@/lib/recommendations/report-llm-types";
import type { PersonaAnalysis } from "@/lib/scoring/persona-types";
import type { SerializedAttempt } from "@/lib/local/attempts";
import { patchAttempt } from "@/lib/data/attempt-service";
import { WellnessReportSlideStack } from "@/components/results/WellnessReportSlideStack";
import { ReportPreparingScreen } from "@/components/results/ReportPreparingScreen";
import { collectReportImageUrls, preloadReportImages } from "@/lib/results/preload-report-images";

type Props = {
  model: ResultsReportModel;
  attempt: SerializedAttempt;
  attemptId: string;
  personaAnalysis?: PersonaAnalysis | null;
  shareUrl?: string | null;
  onCopyShare?: () => void;
  onActionPlanCached?: (cache: StoredActionPlanCache) => void;
  onBack?: () => void;
  forceRegenerate?: boolean;
  reportLlmProvider: ReportLlmProvider;
  reportLlmModel: string;
  /** Test mode only — download PDF once after the report finishes rendering. */
  autoDownloadPdf?: boolean;
};

function responseFromCache(cache: StoredActionPlanCache): ActionPlanApiResponse {
  return { plan: cache.plan };
}

export function PausibleResultsReport({
  model,
  attempt,
  attemptId,
  personaAnalysis = null,
  shareUrl,
  onCopyShare,
  onActionPlanCached,
  onBack,
  forceRegenerate = false,
  reportLlmProvider,
  reportLlmModel,
  autoDownloadPdf = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const loadedSigRef = useRef<string | null>(null);
  const autoDownloadedRef = useRef(false);
  const [localForceRegen, setLocalForceRegen] = useState(false);
  const effectiveForceRegen = forceRegenerate || localForceRegen;
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfErr, setPdfErr] = useState<string | null>(null);

  const clientCache = isActionPlanClientCacheValid(attempt.actionPlanCache, reportLlmProvider, effectiveForceRegen)
    ? attempt.actionPlanCache
    : null;
  const [planData, setPlanData] = useState<ActionPlanApiResponse | null>(() =>
    clientCache ? responseFromCache(clientCache) : null,
  );
  const [planLoading, setPlanLoading] = useState(!clientCache);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planMeta, setPlanMeta] = useState<{ cached?: boolean; llmProvider?: ReportLlmProvider }>({});
  const [assetsReady, setAssetsReady] = useState(
    () => Boolean(clientCache) && collectReportImageUrls(model).length === 0,
  );

  const refId = reportAttemptRef(attemptId);
  const reportReady = !planLoading && !!planData && assetsReady;
  const sections = planData?.plan.synthesis.reportSections;
  const synthesis = planData?.plan.synthesis;

  const loadSig = `${attempt.id}|${effectiveForceRegen}|${reportLlmProvider}|${hashActionPlanInputs(
    attempt.answers,
    attempt.scores ?? null,
    reportLlmProvider,
  )}`;

  useEffect(() => {
    const validCache = isActionPlanClientCacheValid(attempt.actionPlanCache, reportLlmProvider, effectiveForceRegen);
    if (validCache) {
      setPlanData(responseFromCache(attempt.actionPlanCache!));
      setPlanLoading(false);
      setPlanError(null);
      setPlanMeta({ cached: true, llmProvider: reportLlmProvider });
      loadedSigRef.current = loadSig;
      return;
    }

    if (loadedSigRef.current === loadSig) return;

    let cancelled = false;

    async function load() {
      setPlanLoading(true);
      setPlanError(null);
      try {
        const res = await fetch("/api/recommendations/action-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: attempt.id,
            answers: attempt.answers,
            scores: attempt.scores ?? null,
            participantName: model.participantName,
            forceRegenerate: effectiveForceRegen,
          }),
        });
        const json = (await res.json()) as ActionPlanApiResponse & {
          error?: string;
          code?: string;
          inputHash?: string;
          llmProvider?: "gemini" | "gpt";
          cached?: boolean;
        };
        if (!res.ok) {
          if (json.code === "recommendation_config_missing") {
            throw new Error("Recommendation data is not loaded yet.");
          }
          throw new Error(json.error ?? `Request failed (${res.status})`);
        }
        if (cancelled) return;
        loadedSigRef.current = loadSig;
        setPlanData({ plan: json.plan });
        setPlanMeta({
          cached: json.cached,
          llmProvider: json.llmProvider === "gpt" ? "gpt" : reportLlmProvider,
        });
        if (json.inputHash) {
          const cache = buildStoredActionPlanCache(
            json.inputHash,
            json.plan,
            json.llmProvider === "gpt" ? "gpt" : reportLlmProvider,
          );
          const reportDisplayName =
            (typeof json.reportDisplayName === "string" && json.reportDisplayName.trim()) ||
            json.plan?.synthesis?.reportDisplayName?.trim() ||
            undefined;
          onActionPlanCached?.(cache);
          void patchAttempt(attempt.id, {
            actionPlanCache: cache,
            ...(reportDisplayName ? { reportDisplayName } : {}),
          });
        }
      } catch (e) {
        if (!cancelled) setPlanError(e instanceof Error ? e.message : "Could not load report content");
      } finally {
        if (!cancelled) setPlanLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    attempt.actionPlanCache,
    attempt.answers,
    attempt.id,
    attempt.scores,
    effectiveForceRegen,
    loadSig,
    onActionPlanCached,
    reportLlmProvider,
  ]);

  useEffect(() => {
    if (planLoading || !planData) {
      setAssetsReady(false);
      return;
    }

    let cancelled = false;
    void preloadReportImages(collectReportImageUrls(model)).then(() => {
      if (!cancelled) setAssetsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [model, planData, planLoading]);

  const downloadPdf = useCallback(async () => {
    const root = rootRef.current;
    if (!root) return false;
    setPdfBusy(true);
    setPdfErr(null);
    try {
      await downloadReportAsPdf(root, reportPdfFilename(model.participantName, refId));
      return true;
    } catch (e) {
      setPdfErr(e instanceof Error ? e.message : "Could not create PDF.");
      return false;
    } finally {
      setPdfBusy(false);
    }
  }, [model.participantName, refId]);

  useEffect(() => {
    if (!reportReady || !autoDownloadPdf || autoDownloadedRef.current) return;

    let cancelled = false;
    autoDownloadedRef.current = true;

    void (async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      if (cancelled) return;
      const ok = await downloadPdf();
      if (!ok) autoDownloadedRef.current = false;
    })();

    return () => {
      cancelled = true;
    };
  }, [autoDownloadPdf, downloadPdf, reportReady]);

  if (!reportReady || !planData || !synthesis) {
    return (
      <ReportPreparingScreen
        onBack={onBack}
        error={
          planError ??
          (synthesis && !synthesis.synthesized && synthesis.synthesisError
            ? synthesis.synthesisError
            : null)
        }
        subtitle={
          autoDownloadPdf
            ? planLoading
              ? "Generating your report — PDF will download when ready."
              : "Loading report visuals — PDF will download shortly…"
            : planLoading
              ? "Generating your personalized insights — we’ll show your report as soon as it’s ready."
              : "Loading report visuals…"
        }
      />
    );
  }

  const handlePdf = async () => {
    await downloadPdf();
  };

  return (
    <div className="scheme-light min-h-screen bg-slate-100 pb-16 text-slate-900">
      <div className="sticky top-[3.25rem] z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[52rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Wellness report</p>
            <p className="text-sm font-bold text-slate-900">{model.personaTitle ?? model.primaryLabel}</p>
            {synthesis ? (
              <div className="mt-1 space-y-0.5">
                <p className="text-[10px] text-slate-500">
                  {synthesis.synthesized
                    ? `${reportLlmProviderLabel(planMeta.llmProvider ?? synthesis.llmProvider ?? reportLlmProvider)} · ${synthesis.tokenUsage?.model ?? reportLlmModel}${planMeta.cached ? " · cached" : " · freshly generated"}`
                    : (synthesis.tokenUsage?.totalTokens ?? 0) > 0
                      ? `Quality check used template copy — ${reportLlmProviderLabel(planMeta.llmProvider ?? synthesis.llmProvider ?? reportLlmProvider)} output was adjusted`
                      : `Template copy only — ${reportLlmProviderLabel(reportLlmProvider)} did not run`}
                </p>
                {!synthesis.synthesized && synthesis.synthesisError ? (
                  <p className="text-[10px] leading-snug text-amber-800">{synthesis.synthesisError}</p>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                ← Summary
              </button>
            ) : null}
            {shareUrl && onCopyShare ? (
              <button
                type="button"
                onClick={onCopyShare}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                Copy share link
              </button>
            ) : null}
            <button
              type="button"
              disabled={planLoading}
              onClick={() => {
                loadedSigRef.current = null;
                setPlanData(null);
                setPlanMeta({});
                setLocalForceRegen(true);
              }}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              {planLoading && localForceRegen ? "Refreshing…" : "Refresh report"}
            </button>
            <Link
              href="/assessment/default"
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              Retake
            </Link>
            <button
              type="button"
              disabled={pdfBusy}
              onClick={() => void handlePdf()}
              className="rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {pdfBusy ? "Preparing PDF…" : "Download PDF"}
            </button>
          </div>
        </div>
        {pdfErr ? <p className="mx-auto max-w-[52rem] px-4 pb-2 text-center text-xs text-red-700">{pdfErr}</p> : null}
      </div>

      <div ref={rootRef} className="mx-auto flex max-w-[52rem] flex-col gap-5 py-8 sm:gap-6 sm:py-10">
        <WellnessReportSlideStack
          model={model}
          refId={refId}
          attempt={attempt}
          personaAnalysis={personaAnalysis}
          synthesis={synthesis}
          sections={sections}
        />
      </div>

      {/* Share + history only on summary view — full report is print/PDF focused */}
    </div>
  );
}
