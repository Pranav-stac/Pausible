import type { ReportTemplatesDoc } from "@/lib/admin/platform-config-types";
import { buildGeminiSynthesisContext } from "@/lib/recommendations/build-gemini-synthesis-context";
import type { GeminiSynthesisContext } from "@/lib/recommendations/build-gemini-synthesis-context";
import { buildUserProfile, type BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import {
  buildBlindSpotsPrompt,
  buildCoachingPrompt,
  buildDeviationPrompt,
  buildLaunchpadPrompt,
  buildOpportunitiesPrompt,
  buildPersonalityPrompt,
  buildPillarPrompt,
  buildSuccessBlueprintPrompt,
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
import type { ActionPlanSelection, OpportunityCard, PillarName } from "@/lib/recommendations/types";
import { loadReportLlmProviderAdmin } from "@/lib/server/report-llm-config";
import { loadReportTemplatesAdmin } from "@/lib/server/platform-config";
import type { PersonaAnalysis, TraitKey } from "@/lib/scoring/persona-types";
import { friendlyTraitLabel } from "@/lib/results/quick-profile";

export type AttemptLlmSectionContext = {
  id: string;
  slide: string;
  reportSection: string;
  label: string;
  userPrompt: string;
  inputData: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  skipped: boolean;
  skipReason?: string;
};

export type AttemptLlmContextPackage = {
  provider: ReportLlmProvider;
  model: string;
  systemPrompt: string;
  fitBlend: SectionFitBlend & { fitTone: string; blendRule: string };
  sharedContext: GeminiSynthesisContext;
  sections: AttemptLlmSectionContext[];
};

function section(
  partial: Omit<AttemptLlmSectionContext, "skipped" | "userPrompt"> & {
    userPrompt: string;
    skipReason?: string;
  },
): AttemptLlmSectionContext {
  const skipped = !partial.userPrompt.trim();
  return {
    ...partial,
    skipped,
    skipReason: skipped ? partial.skipReason ?? "No prompt generated for this section" : undefined,
  };
}

function personalityInputData(ctx: GeminiSynthesisContext, persona: PersonaAnalysis | null | undefined) {
  return {
    primaryPersona: ctx.personality.primaryPersona,
    secondaryPersona: ctx.personality.secondaryPersona,
    personaTitle: ctx.personality.personaTitle,
    fitScore: ctx.personality.fitScore,
    fitTier: ctx.personality.fitTier,
    blendStrength: ctx.personality.blendStrength,
    primarySummary: ctx.personality.primarySummary,
    oceanTraits: ctx.personality.oceanTraits,
    goals: ctx.matchedProfile.goals,
    barriers: ctx.matchedProfile.barriers,
    traitAverages: persona?.traitAverages ?? null,
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
    { pillar: "Nutrition", slide: "08" },
    { pillar: "Physical Activity", slide: "08" },
    { pillar: "Sleep & Recovery", slide: "09" },
    { pillar: "Mental Wellness", slide: "09" },
  ];

  return [
    section({
      id: "personality",
      slide: "03",
      reportSection: "Wellness Personality",
      label: "Wellness Personality",
      userPrompt: persona && input ? buildPersonalityPrompt(ctx, input, fb) : "",
      skipReason: "No persona scores on this attempt",
      inputData: personalityInputData(ctx, persona),
      outputSchema: { personalityNarrative: "string" },
    }),
    section({
      id: "blind_spots",
      slide: "04",
      reportSection: "What You Don't See",
      label: "Blind spots",
      userPrompt: buildBlindSpotsPrompt(selection, ctx, fb),
      inputData: {
        primaryPersona: ctx.personality.primaryPersona,
        blindSpotText: selection.piSeries.blindSpotText,
        patternPredictionText: selection.piSeries.patternPredictionText,
        secondaryBlindSpotText: selection.piSeries.secondaryBlindSpotText ?? null,
        goals: ctx.matchedProfile.goals,
        barriers: ctx.matchedProfile.barriers,
      },
      outputSchema: { patternBody: "string", goalsBody: "string" },
    }),
    section({
      id: "success_blueprint",
      slide: "05",
      reportSection: "Your Success Blueprint",
      label: "Success blueprint",
      userPrompt: buildSuccessBlueprintPrompt(selection, ctx, fb),
      inputData: {
        primaryPersona: ctx.personality.primaryPersona,
        successConditionText: selection.piSeries.successConditionText,
        strengthInsightText: selection.piSeries.strengthInsightText,
        secondarySuccessConditionText: selection.piSeries.secondarySuccessConditionText ?? null,
        goals: ctx.matchedProfile.goals,
      },
      outputSchema: { worksBody: "string", advantageBody: "string" },
    }),
    section({
      id: "trait_deviations",
      slide: "06",
      reportSection: "Where You Stand",
      label: "Trait deviations",
      userPrompt: persona ? buildDeviationPrompt(persona, ctx, fb) : "",
      skipReason: "No trait deviations to narrate",
      inputData: {
        primaryPersona: ctx.personality.primaryPersona,
        deviations: (persona?.traitDeviations ?? []).slice(0, 2).map((d) => ({
          trait: friendlyTraitLabel(d.trait as TraitKey),
          direction: d.direction,
          deviation: d.deviation,
        })),
      },
      outputSchema: { traitDeviationNarratives: ["string"] },
    }),
    section({
      id: "opportunities",
      slide: "07",
      reportSection: "High-Impact Opportunities",
      label: "Opportunity cards",
      userPrompt: buildOpportunitiesPrompt(selection.opportunityCards, ctx, fb),
      inputData: {
        primaryPersona: ctx.personality.primaryPersona,
        goals: ctx.matchedProfile.goals,
        barriers: ctx.matchedProfile.barriers,
        cards: selection.opportunityCards.map((c: OpportunityCard) => ({
          id: c.id,
          pillar: c.pillar,
          score: c.score,
          category: c.category,
          personaContextText: c.personaContextText,
        })),
      },
      outputSchema: { cards: [{ id: "string", headline: "string", whyItMatters: "string" }] },
    }),
    ...pillars.map(({ pillar, slide }) => {
      const plan = selection.pillarPlans[pillar];
      return section({
        id: `pillar_${pillar.toLowerCase().replace(/\s+/g, "_")}`,
        slide,
        reportSection: "4-Pillar Action Plan",
        label: `${pillar} pillar`,
        userPrompt: buildPillarPrompt(pillar, plan, ctx, fb),
        inputData: {
          primaryPersona: ctx.personality.primaryPersona,
          pillar,
          focusArea: plan.focusArea,
          focusReason: plan.focusReason,
          dos: plan.dos.map((d) => ({ id: d.id, text: d.text, category: d.category })),
          donts: plan.donts.map((d) => ({ id: d.id, text: d.text, category: d.category })),
          goals: ctx.matchedProfile.goals,
          barriers: ctx.matchedProfile.barriers,
        },
        outputSchema: {
          focusArea: "string",
          focusReason: "string",
          dos: [{ action: "string", why: "string" }],
          donts: [{ behavior: "string", why: "string" }],
        },
      });
    }),
    section({
      id: "launchpad",
      slide: "10",
      reportSection: "Wellness Launchpad",
      label: "Launchpad",
      userPrompt: buildLaunchpadPrompt(selection, ctx, fb),
      inputData: {
        primaryPersona: ctx.personality.primaryPersona,
        launchpad: selection.launchpad.map((item) => ({
          id: item.id,
          group: item.group,
          pillar: item.pillar,
          text: item.text,
        })),
      },
      outputSchema: {
        start_here: [{ id: "string", action: "string", context: "string" }],
        environment_setup: [{ id: "string", action: "string", context: "string" }],
        recovery_rules: [{ id: "string", action: "string", context: "string" }],
      },
    }),
    section({
      id: "coaching",
      slide: "11",
      reportSection: "Coaching Notes",
      label: "Coaching & safety",
      userPrompt: buildCoachingPrompt(selection, ctx, fb),
      inputData: {
        primaryPersona: ctx.personality.primaryPersona,
        keyStrengthSource: selection.piSeries.strengthInsightText,
        keyRiskSource: selection.piSeries.blindSpotText,
        coachingSourceRows: selection.coachSourceRows.map((row) => ({
          id: row.id,
          pillar: row.pillar,
          type: row.type,
          text: row.text,
        })),
        safetyRows: selection.safetyGuidance.map((row) => ({
          id: row.id,
          text: row.text,
        })),
      },
      outputSchema: {
        keyStrength: "string",
        keyRisk: "string",
        coachingNotes: ["string"],
        safetyGuidance: [{ id: "string", text: "string" }],
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

  return {
    provider,
    model: reportLlmModel(provider),
    systemPrompt: buildSystemPrompt(templates),
    fitBlend,
    sharedContext: ctx,
    sections: buildSections({ selection, ctx, input, templates, persona }),
  };
}
