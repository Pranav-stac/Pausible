"use client";

import Link from "next/link";
import { useRef, useState, useEffect, useMemo } from "react";
import type { ResultsReportModel } from "@/lib/results/build-results-report";
import { reportAttemptRef } from "@/lib/results/build-results-report";
import { downloadReportAsPdf } from "@/lib/results/download-report-pdf";
import { resolveBlindSpotColumns, resolveSuccessBlueprintColumns } from "@/lib/results/resolve-report-sections";
import { PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import type { ActionPlanApiResponse } from "@/lib/recommendations/client-types";
import { buildStoredActionPlanCache, hashActionPlanInputs, type StoredActionPlanCache } from "@/lib/recommendations/action-plan-cache";
import type { PillarName } from "@/lib/recommendations/types";
import type { PersonaAnalysis } from "@/lib/scoring/persona-types";
import type { SerializedAttempt } from "@/lib/local/attempts";
import { patchAttempt } from "@/lib/data/attempt-service";
import {
  CoachingSlide,
  CoverSlide,
  DualColumnSection,
  DualPillarSlide,
  IntroductionSlide,
  LaunchpadSlide,
  OpportunityCardsGrid,
  ReportFooter,
  REPORT_PAGE,
  REPORT_PAGE_BODY,
  SlideLabel,
  SlideTitle,
  WellnessPersonalitySlide,
  WhereYouStandSlide,
} from "@/components/results/report-ui";
import { ReportPreparingScreen } from "@/components/results/ReportPreparingScreen";
import { collectReportImageUrls, preloadReportImages } from "@/lib/results/preload-report-images";

const TOTAL_PAGES = 11;
const PILLAR_PAIR_A: PillarName[] = ["Nutrition", "Physical Activity"];
const PILLAR_PAIR_B: PillarName[] = ["Sleep & Recovery", "Mental Wellness"];

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
};

function responseFromCache(cache: StoredActionPlanCache): ActionPlanApiResponse {
  return { plan: cache.plan };
}

function secondaryInfluenceText(model: ResultsReportModel): string | null {
  if (!model.secondaryKey || model.blendStrength === "pure") return null;
  const secondary = PERSONA_DISPLAY[model.secondaryKey];
  if (model.blendStrength === "strong_influence") {
    return `Your ${secondary.label} side is not a minor footnote — it actively shapes how you respond under pressure. When planning wellness, account for both your ${model.animalName ?? model.primaryLabel} need for structure and your ${secondary.label} pull toward ${secondary.archetype.toLowerCase()} patterns.`;
  }
  return `You also show ${secondary.label} tendencies — enough to influence timing, social context, or recovery choices even when your primary pattern leads.`;
}

function secondaryContextText(model: ResultsReportModel): string | null {
  if (!model.secondaryKey || model.blendStrength === "pure" || model.blendStrength === "tendencies") return null;
  const secondary = PERSONA_DISPLAY[model.secondaryKey];
  const pct = model.secondaryPct != null ? `${model.secondaryPct.toFixed(0)}% match` : "secondary match";
  return `Strong ${secondary.label} influence (${pct}) means your wellness plan should explicitly address both sides. The distribution chart shows how closely you align with each archetype — your blend is a feature, not noise.`;
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
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const loadedSigRef = useRef<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfErr, setPdfErr] = useState<string | null>(null);

  const initialCache =
    !forceRegenerate && attempt.actionPlanCache?.plan ? attempt.actionPlanCache : null;
  const [planData, setPlanData] = useState<ActionPlanApiResponse | null>(() =>
    initialCache ? responseFromCache(initialCache) : null,
  );
  const [planLoading, setPlanLoading] = useState(!initialCache);
  const [planError, setPlanError] = useState<string | null>(null);
  const [assetsReady, setAssetsReady] = useState(
    () => Boolean(initialCache) && collectReportImageUrls(model).length === 0,
  );

  const refId = reportAttemptRef(attemptId);
  const reportReady = !planLoading && !!planData && assetsReady;
  const sections = planData?.plan.synthesis.reportSections;
  const synthesis = planData?.plan.synthesis;

  const loadSig = `${attempt.id}|${forceRegenerate}|${hashActionPlanInputs(attempt.answers, attempt.scores ?? null)}`;

  useEffect(() => {
    if (!forceRegenerate && attempt.actionPlanCache?.plan) {
      setPlanData(responseFromCache(attempt.actionPlanCache));
      setPlanLoading(false);
      setPlanError(null);
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
            forceRegenerate,
          }),
        });
        const json = (await res.json()) as ActionPlanApiResponse & {
          error?: string;
          code?: string;
          inputHash?: string;
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
        if (json.inputHash) {
          const cache = buildStoredActionPlanCache(json.inputHash, json.plan);
          onActionPlanCached?.(cache);
          void patchAttempt(attempt.id, { actionPlanCache: cache });
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
  }, [attempt.actionPlanCache, attempt.answers, attempt.id, attempt.scores, forceRegenerate, loadSig, onActionPlanCached]);

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

  const blindSpots = useMemo(
    () => resolveBlindSpotColumns(sections, synthesis, attempt),
    [sections, synthesis, attempt],
  );

  const successBlueprint = useMemo(
    () => resolveSuccessBlueprintColumns(sections, synthesis, model),
    [sections, synthesis, model],
  );

  if (!reportReady) {
    return (
      <ReportPreparingScreen
        onBack={onBack}
        error={planError}
        subtitle={
          planLoading
            ? "Generating your personalized insights — this usually takes about 15 seconds."
            : "Loading report visuals…"
        }
      />
    );
  }

  const handlePdf = async () => {
    const root = rootRef.current;
    if (!root) return;
    setPdfBusy(true);
    setPdfErr(null);
    try {
      await downloadReportAsPdf(root, `pausible-report-${refId}`);
    } catch (e) {
      setPdfErr(e instanceof Error ? e.message : "Could not create PDF.");
    } finally {
      setPdfBusy(false);
    }
  };

  const personalityText =
    sections?.personalityNarrative?.trim() ||
    model.primarySummary ||
    "Your wellness personality reflects how you naturally approach health, fitness, and recovery.";

  const traitNarratives = sections?.traitDeviationNarratives ?? [];
  const opportunityCards = synthesis?.opportunityCards ?? [];
  const secondaryInfluence = secondaryInfluenceText(model);
  const secondaryContext = secondaryContextText(model);

  return (
    <div className="scheme-light min-h-screen bg-slate-100 pb-16 text-slate-900">
      <div className="sticky top-[3.25rem] z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[52rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Wellness report</p>
            <p className="text-sm font-bold text-slate-900">{model.personaTitle ?? model.primaryLabel}</p>
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
        <CoverSlide model={model} refId={refId} totalPages={TOTAL_PAGES} />
        <IntroductionSlide page={2} totalPages={TOTAL_PAGES} refId={refId} />

        <WellnessPersonalitySlide
          model={model}
          narrative={personalityText}
          secondaryInfluence={secondaryInfluence}
          quickProfile={sections?.quickProfile}
          page={3}
          totalPages={TOTAL_PAGES}
          refId={refId}
        />

        {/* Slide 04 — What You Don't See */}
        <section data-report-page className={REPORT_PAGE}>
          <div className={REPORT_PAGE_BODY}>
            <SlideLabel index="04" label="What You Don't See" />
            <SlideTitle
              title="What You Don't See"
              subtitle="The patterns that quietly shape your wellness journey"
            />
            <DualColumnSection left={blindSpots.left} right={blindSpots.right} />
            <p className="mt-6 text-[10px] text-slate-400">
              Emotional arc: Revelation — &ldquo;I never thought about it that way&rdquo;
            </p>
            <ReportFooter page={4} total={TOTAL_PAGES} refId={refId} />
          </div>
        </section>

        {/* Slide 05 — Success Blueprint */}
        <section data-report-page className={REPORT_PAGE}>
          <div className={REPORT_PAGE_BODY}>
            <SlideLabel index="05" label="Your Success Blueprint" />
            <SlideTitle title="Your Success Blueprint" subtitle="What works specifically for your personality" />
            <DualColumnSection left={successBlueprint.left} right={successBlueprint.right} />
            <p className="mt-6 text-[10px] text-slate-400">
              Emotional arc: Hope + curiosity — &ldquo;This could actually work for me&rdquo;
            </p>
            <ReportFooter page={5} total={TOTAL_PAGES} refId={refId} />
          </div>
        </section>

        <WhereYouStandSlide
          model={model}
          personaAnalysis={personaAnalysis}
          traitDeviationNarratives={traitNarratives}
          secondaryContext={secondaryContext}
          page={6}
          totalPages={TOTAL_PAGES}
          refId={refId}
        />

        {/* Slide 07 — Opportunities */}
        <section data-report-page className={REPORT_PAGE}>
          <div className={REPORT_PAGE_BODY}>
            <SlideLabel index="07" label="High-Impact Wellness Opportunities" />
            <SlideTitle
              title="Your High-Impact Wellness Opportunities"
              subtitle="The 3 biggest areas where small changes will create the most impact"
            />
            {opportunityCards.length > 0 ? (
              <OpportunityCardsGrid cards={opportunityCards} />
            ) : (
              <p className="text-sm text-slate-500">No opportunity cards for this profile.</p>
            )}
            <p className="mt-6 text-[10px] text-slate-400">
              Emotional arc: Excitement — &ldquo;These are genuinely useful&rdquo;
            </p>
            <ReportFooter page={7} total={TOTAL_PAGES} refId={refId} />
          </div>
        </section>

        <DualPillarSlide
          pillars={PILLAR_PAIR_A}
          plans={synthesis?.pillarPlans ?? {}}
          page={8}
          totalPages={TOTAL_PAGES}
          refId={refId}
          slideIndex="08"
          slideLabel="4-Pillar Action Plan (1/2)"
          title="Your Personalized Action Plan"
        />
        <DualPillarSlide
          pillars={PILLAR_PAIR_B}
          plans={synthesis?.pillarPlans ?? {}}
          page={9}
          totalPages={TOTAL_PAGES}
          refId={refId}
          slideIndex="09"
          slideLabel="4-Pillar Action Plan (2/2)"
          title="Your Personalized Action Plan"
        />

        {synthesis ? (
          <LaunchpadSlide launchpad={synthesis.launchpad} page={10} totalPages={TOTAL_PAGES} refId={refId} />
        ) : null}

        {synthesis ? (
          <CoachingSlide
            keyStrength={synthesis.coachNotes.keyStrength}
            keyRisk={synthesis.coachNotes.keyRisk}
            coachingNotes={synthesis.coachNotes.coachingNotes ?? []}
            safetyGuidance={synthesis.safetyGuidance}
            page={11}
            totalPages={TOTAL_PAGES}
            refId={refId}
          />
        ) : null}
      </div>

      {/* Share + history only on summary view — full report is print/PDF focused */}
    </div>
  );
}
