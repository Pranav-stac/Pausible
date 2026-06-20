"use client";

import type { ActionPlanSynthesis, OpportunityCard, WellnessReportSections } from "@/lib/recommendations/types";
import type { ResultsReportModel } from "@/lib/results/build-results-report";
import type { PersonaAnalysis } from "@/lib/scoring/persona-types";
import type { SerializedAttempt } from "@/lib/local/attempts";
import { resolveBlindSpotColumns } from "@/lib/results/resolve-report-sections";
import {
  CoverSlide,
  DualColumnSection,
  IntegratedPlanSlide,
  KeyActionsSlide,
  PatternMatchSlide,
  PrimaryPatternSlide,
  PriorityCardsSlide,
  REPORT_PAGE,
  REPORT_PAGE_BODY,
  ReportFooter,
  SecondaryPatternSlide,
  SlideLabel,
  SlideTitle,
  UnderstandingWellnessPersonalitySlide,
  WhatComesNextSlide,
} from "@/components/results/report-ui";

const TOTAL_PAGES = 10;

type Props = {
  model: ResultsReportModel;
  refId: string;
  attempt: SerializedAttempt;
  personaAnalysis?: PersonaAnalysis | null;
  synthesis: ActionPlanSynthesis;
  sections?: WellnessReportSections;
};

export function WellnessReportSlideStack({
  model,
  refId,
  attempt,
  personaAnalysis = null,
  synthesis,
  sections,
}: Props) {
  const blindSpots = resolveBlindSpotColumns(sections, synthesis, attempt);
  const primaryPattern = sections?.primaryPattern;
  const secondaryPattern = sections?.secondaryPattern;
  const opportunityCards: OpportunityCard[] = synthesis.opportunityCards ?? [];
  const planOutput = synthesis.planOutput ?? null;
  const integratedPlan = synthesis.integratedPlan ?? null;

  return (
    <>
      <CoverSlide model={model} refId={refId} totalPages={TOTAL_PAGES} />
      <UnderstandingWellnessPersonalitySlide page={2} totalPages={TOTAL_PAGES} refId={refId} />

      <PatternMatchSlide
        model={model}
        quickProfile={sections?.quickProfile}
        personaAnalysis={personaAnalysis}
        page={3}
        totalPages={TOTAL_PAGES}
        refId={refId}
      />

      <PrimaryPatternSlide
        model={model}
        primaryPattern={primaryPattern}
        page={4}
        totalPages={TOTAL_PAGES}
        refId={refId}
      />

      <SecondaryPatternSlide
        model={model}
        secondaryPattern={secondaryPattern}
        page={5}
        totalPages={TOTAL_PAGES}
        refId={refId}
      />

      <section data-report-page className={REPORT_PAGE}>
        <div className={REPORT_PAGE_BODY}>
          <SlideLabel index="06" label="What You Don't See" />
          <SlideTitle
            title="What You Don't See"
            subtitle="The patterns that quietly shape your wellness journey"
          />
          <p className="mb-5 text-sm text-slate-600">
            Every wellness personality has patterns that are hard to see from the inside. Recognising them is the first step to working with them.
          </p>
          <DualColumnSection left={blindSpots.left} right={blindSpots.right} />
          <ReportFooter page={6} total={TOTAL_PAGES} refId={refId} />
        </div>
      </section>

      <KeyActionsSlide plans={synthesis.pillarPlans} page={7} totalPages={TOTAL_PAGES} refId={refId} />

      <PriorityCardsSlide cards={opportunityCards} page={8} totalPages={TOTAL_PAGES} refId={refId} />

      <WhatComesNextSlide page={9} totalPages={TOTAL_PAGES} refId={refId} />

      {planOutput && integratedPlan ? (
        <IntegratedPlanSlide
          planOutput={planOutput}
          integratedPlan={integratedPlan}
          page={10}
          totalPages={TOTAL_PAGES}
          refId={refId}
        />
      ) : null}
    </>
  );
}
