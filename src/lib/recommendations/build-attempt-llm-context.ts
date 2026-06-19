import type { ReportTemplatesDoc } from "@/lib/admin/platform-config-types";
import { buildGeminiSynthesisContext } from "@/lib/recommendations/build-gemini-synthesis-context";
import type { GeminiSynthesisContext } from "@/lib/recommendations/build-gemini-synthesis-context";
import { buildUserProfile, type BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import {
  buildBlindSpotsPrompt,
  buildHighImpactPrioritiesPrompt,
  buildPillarPrompt,
  buildPrimaryPatternPrompt,
  buildSecondaryPatternPrompt,
  buildSystemPrompt,
  resolveFitBlend,
  type SectionFitBlend,
} from "@/lib/recommendations/gemini-section-prompts";
import { filterRecommendations } from "@/lib/recommendations/filter";
import { loadRecommendationConfig } from "@/lib/recommendations/load-recommendation-config";
import type { ReportLlmProvider } from "@/lib/recommendations/report-llm-types";
import { reportLlmModel } from "@/lib/recommendations/report-llm-types";
import { scoreAll } from "@/lib/recommendations/score";
import { selectActionPlan } from "@/lib/recommendations/select-action-plan";
import type { ActionPlanSelection, ActionPlanSynthesis, OpportunityCard, PillarName } from "@/lib/recommendations/types";
import { loadReportLlmProviderAdmin } from "@/lib/server/report-llm-config";
import { loadReportTemplatesAdmin } from "@/lib/server/platform-config";
import type { PersonaAnalysis } from "@/lib/scoring/persona-types";

export type AttemptLlmSectionContext = {
  id: string;
  slide: string;
  reportSection: string;
  label: string;
  userPrompt: string;
  inputData: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  output: unknown | null;
  skipped: boolean;
  skipReason?: string;
};

export type AttemptLlmReportOutputMeta = {
  available: boolean;
  synthesized: boolean;
  synthesisError?: string;
  tokenUsage?: ActionPlanSynthesis["tokenUsage"];
  llmProvider?: ActionPlanSynthesis["llmProvider"];
  synthesizedAt?: string;
};

export type AttemptLlmContextPackage = {
  provider: ReportLlmProvider;
  model: string;
  systemPrompt: string;
  fitBlend: SectionFitBlend & { fitTone: string; blendRule: string };
  sharedContext: GeminiSynthesisContext;
  reportOutput: AttemptLlmReportOutputMeta;
  sections: AttemptLlmSectionContext[];
};

const PILLAR_SECTION_IDS: Record<string, PillarName> = {
  pillar_nutrition: "Nutrition",
  pillar_physical_activity: "Physical Activity",
  "pillar_sleep_&_recovery": "Sleep & Recovery",
  pillar_mental_wellness: "Mental Wellness",
};

export function sectionOutputFromSynthesis(
  sectionId: string,
  synthesis: ActionPlanSynthesis | null | undefined,
): unknown | null {
  if (!synthesis) return null;

  const reportSections = synthesis.reportSections;
  switch (sectionId) {
    case "primary_pattern":
      if (reportSections?.primaryPattern) return reportSections.primaryPattern;
      if (reportSections?.personalityNarrative || reportSections?.successBlueprint) {
        return {
          personaNarrative: reportSections.personalityNarrative ?? null,
          successBlueprint: reportSections.successBlueprint ?? null,
          traitDeviationNarratives: reportSections.traitDeviationNarratives ?? null,
          _legacy: true,
        };
      }
      return null;
    case "secondary_pattern":
      return reportSections?.secondaryPattern ?? null;
    case "blind_spots":
      return reportSections?.blindSpots ?? null;
    case "high_impact_priorities":
      return synthesis.opportunityCards?.length ? synthesis.opportunityCards : null;
    default: {
      const pillar = PILLAR_SECTION_IDS[sectionId];
      return pillar ? synthesis.pillarPlans?.[pillar] ?? null : null;
    }
  }
}

export function attachSynthesisOutputs(
  pkg: Omit<AttemptLlmContextPackage, "reportOutput"> & { reportOutput?: AttemptLlmReportOutputMeta },
  synthesis: ActionPlanSynthesis | null | undefined,
  meta?: { synthesizedAt?: string; llmProvider?: ActionPlanSynthesis["llmProvider"] },
): AttemptLlmContextPackage {
  return {
    ...pkg,
    reportOutput: {
      available: Boolean(synthesis),
      synthesized: synthesis?.synthesized ?? false,
      synthesisError: synthesis?.synthesisError,
      tokenUsage: synthesis?.tokenUsage ?? undefined,
      llmProvider: synthesis?.llmProvider ?? meta?.llmProvider,
      synthesizedAt: meta?.synthesizedAt,
    },
    sections: pkg.sections.map((section) => ({
      ...section,
      output: sectionOutputFromSynthesis(section.id, synthesis),
    })),
  };
}

function section(
  partial: Omit<AttemptLlmSectionContext, "skipped" | "userPrompt" | "output"> & {
    userPrompt: string;
    skipReason?: string;
  },
): AttemptLlmSectionContext {
  const skipped = !partial.userPrompt.trim();
  return {
    ...partial,
    output: null,
    skipped,
    skipReason: skipped ? partial.skipReason ?? "No prompt generated for this section" : undefined,
  };
}

function buildSections(args: {
  selection: ActionPlanSelection;
  ctx: GeminiSynthesisContext;
  input: BuildProfileInput;
  templates: ReportTemplatesDoc;
  persona: PersonaAnalysis | null | undefined;
}): AttemptLlmSectionContext[] {
  const { selection, ctx, input, templates, persona } = args;
  const fb = resolveFitBlend(ctx, templates);

  const pillars: { pillar: PillarName; slide: string }[] = [
    { pillar: "Nutrition", slide: "07" },
    { pillar: "Physical Activity", slide: "07" },
    { pillar: "Sleep & Recovery", slide: "07" },
    { pillar: "Mental Wellness", slide: "07" },
  ];

  return [
    section({
      id: "primary_pattern",
      slide: "04",
      reportSection: "Your Primary Pattern",
      label: "Primary pattern",
      userPrompt: persona && input ? buildPrimaryPatternPrompt(selection, ctx, input, fb) : "",
      skipReason: "No persona scores on this attempt",
      inputData: {
        successConditionText: selection.piSeries.successConditionText,
        strengthInsightText: selection.piSeries.strengthInsightText,
        goals: ctx.matchedProfile.goals,
        barriers: ctx.matchedProfile.barriers,
      },
      outputSchema: {
        personaNarrative: "string",
        behaviouralBoxes: [{ title: "string", content: "string" }],
        traitDeviations: [{ trait: "string", direction: "string", content: "string" }],
      },
    }),
    section({
      id: "secondary_pattern",
      slide: "05",
      reportSection: "Your Secondary Pattern and Blend",
      label: "Secondary pattern",
      userPrompt: buildSecondaryPatternPrompt(selection, ctx, fb),
      skipReason: "Pure blend — no secondary content",
      inputData: {
        blendStrength: ctx.personality.blendStrength,
        secondarySuccessConditionText: selection.piSeries.secondarySuccessConditionText,
        secondaryStrengthInsightText: selection.piSeries.secondaryStrengthInsightText,
      },
      outputSchema: {
        secondaryNarrative: "string",
        behaviouralBoxes: [{ title: "string", content: "string" }],
        blendNarrative: "string|null",
      },
    }),
    section({
      id: "blind_spots",
      slide: "06",
      reportSection: "What You Don't See",
      label: "Blind spots",
      userPrompt: buildBlindSpotsPrompt(selection, ctx, fb),
      inputData: {
        blindSpotText: selection.piSeries.blindSpotText,
        patternPredictionText: selection.piSeries.patternPredictionText,
        goals: ctx.matchedProfile.goals,
        barriers: ctx.matchedProfile.barriers,
      },
      outputSchema: { patternBody: "string", goalsBody: "string" },
    }),
    ...pillars.map(({ pillar, slide }) => {
      const plan = selection.pillarPlans[pillar];
      return section({
        id: `pillar_${pillar.toLowerCase().replace(/\s+/g, "_")}`,
        slide,
        reportSection: "Your Key Actions",
        label: `${pillar} pillar`,
        userPrompt: buildPillarPrompt(pillar, plan, ctx, fb),
        inputData: {
          pillar,
          mindsetShift: plan.focusArea,
          dos: plan.dos,
          donts: plan.donts,
        },
        outputSchema: {
          mindsetShift: "string",
          doItems: [{ action: "string", why: "string" }],
          dontItems: [{ behaviour: "string", why: "string" }],
        },
      });
    }),
    section({
      id: "high_impact_priorities",
      slide: "08",
      reportSection: "Your High-Impact Priorities",
      label: "Priority cards",
      userPrompt: buildHighImpactPrioritiesPrompt(selection.opportunityCards, ctx, fb),
      inputData: {
        cards: selection.opportunityCards.map((c: OpportunityCard) => ({
          id: c.id,
          pillar: c.pillar,
          rank: c.rank,
          clusterScore: c.clusterScore,
          personaContextText: c.personaContextText,
        })),
      },
      outputSchema: {
        priorityCards: [
          { pillar: "string", rank: "number", headline: "string", whyItMatters: "string", startThisWeek: "string" },
        ],
      },
    }),
  ];
}

export async function buildAttemptLlmContextPackage(input: BuildProfileInput): Promise<AttemptLlmContextPackage> {
  const [config, templates, provider] = await Promise.all([
    loadRecommendationConfig(),
    loadReportTemplatesAdmin(),
    loadReportLlmProviderAdmin(),
  ]);

  const profile = buildUserProfile(input, config);
  const filtered = filterRecommendations(config.recommendations, profile);
  const ranked = scoreAll(filtered, profile);
  const selection = selectActionPlan(ranked, profile);
  const ctx = buildGeminiSynthesisContext(input, config, selection);
  const fitBlend = resolveFitBlend(ctx, templates);
  const persona = input.scores?.persona ?? null;

  return attachSynthesisOutputs(
    {
      provider,
      model: reportLlmModel(provider),
      systemPrompt: buildSystemPrompt(templates),
      fitBlend,
      sharedContext: ctx,
      sections: buildSections({ selection, ctx, input, templates, persona }),
    },
    null,
  );
}
