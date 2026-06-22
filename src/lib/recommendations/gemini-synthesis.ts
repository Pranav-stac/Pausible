import type {
  ActionPlan,
  ActionPlanSelection,
  ActionPlanSynthesis,
  BehaviouralBox,
  GeminiTokenUsage,
  OpportunityCard,
  PillarName,
  PillarSynthesisDo,
  PillarSynthesisDont,
  PrimaryPatternSection,
  SecondaryPatternSection,
} from "@/lib/recommendations/types";
import type { ReportTemplatesDoc } from "@/lib/admin/platform-config-types";
import { DEFAULT_REPORT_TEMPLATES } from "@/lib/admin/platform-config-defaults";
import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import type { RecommendationConfig } from "@/lib/recommendations/firestore-config-types";
import {
  buildGeminiSynthesisContext,
  type GeminiSynthesisContext,
} from "@/lib/recommendations/build-gemini-synthesis-context";
import { callGeminiSection, mergeTokenUsage, parseSectionJson, type GeminiSectionResult } from "@/lib/recommendations/gemini-api-client";
import { callOpenAiSection } from "@/lib/recommendations/openai-api-client";
import { SECTION_OUTPUT_TOKENS } from "@/lib/recommendations/section-output-limits";
import {
  DEFAULT_REPORT_LLM_PROVIDER,
  reportLlmModel,
  type ReportLlmProvider,
} from "@/lib/recommendations/report-llm-types";
import {
  buildBlindSpotsPrompt,
  buildHighImpactPrioritiesPrompt,
  buildPillarPrompt,
  buildPrimaryPatternPrompt,
  buildSecondaryPatternPrompt,
  buildSystemPrompt,
  resolveFitBlend,
} from "@/lib/recommendations/gemini-section-prompts";
import { buildQuickProfile, friendlyTraitLabel } from "@/lib/results/quick-profile";
import type { PersonaAnalysis, TraitKey } from "@/lib/scoring/persona-types";

const PILLARS: PillarName[] = ["Nutrition", "Physical Activity", "Sleep & Recovery", "Mental Wellness"];

function formatAnswerList(raw: unknown): string | null {
  if (Array.isArray(raw) && raw.length) return raw.join(", ");
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

function topBarrierLabel(ctx: GeminiSynthesisContext): string | undefined {
  return ctx.matchedProfile.barriers[0]?.label;
}

function buildGoalsFallbackBody(selection: ActionPlanSelection, input?: BuildProfileInput): string {
  const goalsRaw = formatAnswerList(input?.answers?.wc_wellness_goals);
  const barrierRaw = formatAnswerList(input?.answers?.wc_biggest_barrier);
  const goals =
    goalsRaw ??
    (selection.profile.goals.length ? selection.profile.goals.map((g) => g.replace(/_/g, " ")).join(", ") : null);
  const barrier =
    barrierRaw ??
    (selection.profile.barriers.length ? selection.profile.barriers.map((b) => b.replace(/_/g, " ")).join(", ") : null);

  if (goals && barrier) {
    return `This pattern directly touches what you said you want — ${goals} — while your biggest barrier (${barrier.toLowerCase()}) may be partly fueled by the unconscious loop above.`;
  }
  if (goals) {
    return `This hidden pattern likely intersects with your stated goal: ${goals}. When progress stalls, it is often this background habit — not lack of effort — that needs attention first.`;
  }
  return "This pattern quietly competes with the goals you care about most. Naming it gives you a clearer lever for change.";
}

function fallbackPillarDos(plan: ActionPlanSelection["pillarPlans"][PillarName]): PillarSynthesisDo[] {
  return plan.dos.slice(0, 3).map((d) => ({ action: d.text, why: "This fits your persona-specific patterns." }));
}

function fallbackPillarDonts(plan: ActionPlanSelection["pillarPlans"][PillarName]): PillarSynthesisDont[] {
  return plan.donts.map((d) => ({ behavior: d.text, why: "This pattern works against your natural wellness style." }));
}

function fallbackPrimaryPattern(
  selection: ActionPlanSelection,
  persona: PersonaAnalysis | null | undefined,
): PrimaryPatternSection {
  const pi = selection.piSeries;
  const boxes: BehaviouralBox[] = [
    { title: "Behavioural Tendencies", content: pi.successConditionText || "—" },
    { title: "What Motivates You", content: pi.strengthInsightText || "—" },
    { title: "What Drains You", content: pi.blindSpotText || "—" },
    { title: "Default Under Stress", content: pi.patternPredictionText || "—" },
    { title: "How You Build Habits", content: pi.successConditionText || "—" },
    { title: "Growth Pattern", content: pi.strengthInsightText || "—" },
  ];
  const traitDeviations = (persona?.traitDeviations ?? []).slice(0, 2).map((d) => ({
    trait: friendlyTraitLabel(d.trait as TraitKey),
    direction: (d.direction === "above" ? "higher" : "lower") as "higher" | "lower",
    content: `Your ${friendlyTraitLabel(d.trait as TraitKey).toLowerCase()} differs from the typical pattern for your profile.`,
  }));
  return {
    personaNarrative: [pi.successConditionText, pi.strengthInsightText].filter(Boolean).join("\n\n").trim(),
    behaviouralBoxes: boxes,
    traitDeviations,
  };
}

function fallbackSecondaryPattern(selection: ActionPlanSelection): SecondaryPatternSection | null {
  const pi = selection.piSeries;
  if (!pi.secondarySuccessConditionText?.trim() && !pi.secondaryStrengthInsightText?.trim()) return null;
  return {
    secondaryNarrative: pi.secondarySuccessConditionText || pi.secondaryStrengthInsightText,
    behaviouralBoxes: [
      { title: "Behavioural Tendencies", content: pi.secondarySuccessConditionText || "—" },
      { title: "What Motivates You", content: pi.secondaryStrengthInsightText || "—" },
      { title: "Growth Pattern", content: pi.secondaryPatternPredictionText || "—" },
    ],
    blendNarrative: null,
  };
}

function fallbackSynthesis(
  selection: ActionPlanSelection,
  input?: BuildProfileInput,
  ctx?: GeminiSynthesisContext,
): ActionPlanSynthesis {
  const pi = selection.piSeries;
  const persona = input?.scores?.persona;
  const primaryPattern = fallbackPrimaryPattern(selection, persona);
  const secondaryPattern = fallbackSecondaryPattern(selection);

  const opportunityCards = selection.opportunityCards.map((card, i) => ({
    ...card,
    rank: card.rank || i + 1,
    headline: card.personaContextText.split(".")[0]?.slice(0, 80) || card.category.replace(/_/g, " "),
    whyItMatters: `This pillar scored highly for your profile (cluster ${card.clusterScore.toFixed(0)}).`,
    startThisWeek: card.personaContextText.split(".")[0] ?? card.personaContextText,
  }));

  const pillarPlans = {} as ActionPlanSynthesis["pillarPlans"];
  for (const pillar of PILLARS) {
    const plan = selection.pillarPlans[pillar];
    pillarPlans[pillar] = {
      focusArea: plan.focusArea,
      focusReason: plan.focusReason,
      dos: fallbackPillarDos(plan),
      donts: fallbackPillarDonts(plan),
      sourceIds: plan.sourceIds,
    };
  }

  const quickProfile = persona
    ? buildQuickProfile(persona, ctx ? topBarrierLabel(ctx) : undefined)
    : {
        wellnessStyle: "Personalized",
        energyPattern: "Steady-paced",
        motivationDriver: "Your unique pattern",
        riskFactor: "Inconsistency",
        bestEnvironment: "Structured with flexibility",
        personaPercentage: 0,
      };

  const safetyGuidance = selection.safetyGuidance.map((s) => ({
    id: s.id,
    text: s.text,
  }));

  return {
    opportunityCards,
    pillarPlans,
    launchpad: { start_here: [], environment_setup: [], recovery_rules: [] },
    coachNotes: {
      keyStrength: pi.strengthInsightText || "",
      keyRisk: pi.blindSpotText || "",
      coachingNotes: [],
      sourceIds: pi.sourceIds,
    },
    safetyGuidance,
    reportSections: {
      primaryPattern,
      secondaryPattern: secondaryPattern ?? undefined,
      quickProfile,
      blindSpots: {
        patternBody: pi.blindSpotText,
        goalsBody: buildGoalsFallbackBody(selection, input),
      },
      opportunities: opportunityCards,
    },
    synthesized: false,
    synthesisError: "LLM API key not configured — showing deterministic copy from your matched recommendations.",
  };
}

function missingApiKeyMessage(provider: ReportLlmProvider): string {
  if (provider === "gpt") {
    return "OPENAI_API_KEY not configured — showing deterministic copy from your matched recommendations.";
  }
  return "GEMINI_API_KEY not configured — showing deterministic copy from your matched recommendations.";
}

function applyOpportunityCardFallbacks(cards: OpportunityCard[]): OpportunityCard[] {
  return cards.map((card, i) => {
    const rank = card.rank || i + 1;
    const firstSentence = card.personaContextText.split(".")[0]?.trim() ?? "";
    return {
      ...card,
      rank,
      headline:
        card.headline?.trim() ||
        firstSentence.slice(0, 80) ||
        card.category.replace(/_/g, " "),
      whyItMatters:
        card.whyItMatters?.trim() ||
        `This pillar scored highly for your profile (cluster ${card.clusterScore.toFixed(0)}).`,
      startThisWeek: card.startThisWeek?.trim() || firstSentence || card.personaContextText,
    };
  });
}

function mergePriorityCards(
  base: OpportunityCard[],
  parsed: {
    priorityCards?: {
      pillar: string;
      rank: number;
      headline: string;
      whyItMatters: string;
      startThisWeek: string;
    }[];
  } | null,
): OpportunityCard[] {
  if (!parsed?.priorityCards?.length) return base;
  return base.map((card) => {
    const hit = parsed.priorityCards?.find((c) => c.rank === card.rank) ?? parsed.priorityCards?.[card.rank - 1];
    if (!hit) return card;
    return {
      ...card,
      headline: hit.headline?.trim() || card.headline,
      whyItMatters: hit.whyItMatters?.trim() || card.whyItMatters,
      startThisWeek: hit.startThisWeek?.trim() || card.startThisWeek,
    };
  });
}

export async function synthesizeActionPlanWithLlm(
  selection: ActionPlanSelection,
  ctx: GeminiSynthesisContext,
  input?: BuildProfileInput,
  templates: ReportTemplatesDoc = DEFAULT_REPORT_TEMPLATES,
  provider: ReportLlmProvider = DEFAULT_REPORT_LLM_PROVIDER,
): Promise<ActionPlanSynthesis> {
  const fallback = fallbackSynthesis(selection, input, ctx);
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const apiKey = provider === "gpt" ? openaiKey : geminiKey;
  if (!apiKey) {
    return { ...fallback, llmProvider: provider, synthesisError: missingApiKeyMessage(provider) };
  }

  const model = reportLlmModel(provider);
  const systemPrompt = buildSystemPrompt(templates);
  const fb = resolveFitBlend(ctx, templates);
  const persona = input?.scores?.persona;
  const errors: string[] = [];
  const tokenParts: (GeminiTokenUsage | null)[] = [];

  const emptySection = (): GeminiSectionResult => ({ text: "", tokenUsage: null });

  const call = (
    userPrompt: string,
    maxOutputTokens: number = SECTION_OUTPUT_TOKENS.default,
  ): Promise<GeminiSectionResult> => {
    if (!userPrompt.trim()) return Promise.resolve(emptySection());
    if (provider === "gpt") {
      return callOpenAiSection({ apiKey, model, systemPrompt, userPrompt, json: true, maxOutputTokens });
    }
    return callGeminiSection({ apiKey, model, systemPrompt, userPrompt, json: true, maxOutputTokens });
  };

  // Guide §13.3 — Primary first, then parallel sections, priorities after pillars.
  const primaryRes =
    persona && input
      ? await call(buildPrimaryPatternPrompt(selection, ctx, input, fb), SECTION_OUTPUT_TOKENS.primaryPattern)
      : emptySection();
  tokenParts.push(primaryRes.tokenUsage);
  if (primaryRes.error) errors.push(`primary_pattern: ${primaryRes.error}`);

  const [blindRes, secondaryRes, nutritionRes, physicalRes, sleepRes, mentalRes] = await Promise.all([
    call(buildBlindSpotsPrompt(selection, ctx, fb), SECTION_OUTPUT_TOKENS.blindSpots),
    call(buildSecondaryPatternPrompt(selection, ctx, fb), SECTION_OUTPUT_TOKENS.secondaryPattern),
    call(buildPillarPrompt("Nutrition", selection.pillarPlans.Nutrition, ctx, fb), SECTION_OUTPUT_TOKENS.pillar),
    call(
      buildPillarPrompt("Physical Activity", selection.pillarPlans["Physical Activity"], ctx, fb),
      SECTION_OUTPUT_TOKENS.pillar,
    ),
    call(
      buildPillarPrompt("Sleep & Recovery", selection.pillarPlans["Sleep & Recovery"], ctx, fb),
      SECTION_OUTPUT_TOKENS.pillar,
    ),
    call(
      buildPillarPrompt("Mental Wellness", selection.pillarPlans["Mental Wellness"], ctx, fb),
      SECTION_OUTPUT_TOKENS.pillar,
    ),
  ]);

  for (const res of [blindRes, secondaryRes, nutritionRes, physicalRes, sleepRes, mentalRes]) {
    tokenParts.push(res.tokenUsage);
    if (res.error) errors.push(res.error);
  }

  const prioritiesRes = await call(
    buildHighImpactPrioritiesPrompt(selection.opportunityCards, ctx, fb),
    SECTION_OUTPUT_TOKENS.priorities,
  );
  tokenParts.push(prioritiesRes.tokenUsage);
  if (prioritiesRes.error) errors.push(`priorities: ${prioritiesRes.error}`);

  const primaryJson = parseSectionJson<PrimaryPatternSection>(primaryRes.text);
  if (primaryRes.text.trim() && !primaryJson?.personaNarrative?.trim()) {
    errors.push("primary_pattern: response was not valid JSON or missing personaNarrative");
  }
  const blindJson = parseSectionJson<{ patternBody?: string; goalsBody?: string }>(blindRes.text);
  const secondaryJson = parseSectionJson<SecondaryPatternSection>(secondaryRes.text);
  const prioritiesJson = parseSectionJson<{
    priorityCards?: {
      pillar: string;
      rank: number;
      headline: string;
      whyItMatters: string;
      startThisWeek: string;
    }[];
  }>(prioritiesRes.text);

  const pillarJsonByName: Record<
    PillarName,
    {
      mindsetShift?: string;
      doItems?: PillarSynthesisDo[];
      dontItems?: PillarSynthesisDont[];
      focusArea?: string;
      dos?: PillarSynthesisDo[];
      donts?: PillarSynthesisDont[];
    } | null
  > = {
    Nutrition: parseSectionJson(nutritionRes.text),
    "Physical Activity": parseSectionJson(physicalRes.text),
    "Sleep & Recovery": parseSectionJson(sleepRes.text),
    "Mental Wellness": parseSectionJson(mentalRes.text),
  };

  const quickProfile = persona
    ? buildQuickProfile(persona, topBarrierLabel(ctx))
    : fallback.reportSections!.quickProfile;

  const primaryPattern: PrimaryPatternSection =
    primaryJson?.personaNarrative?.trim()
      ? {
          personaNarrative: primaryJson.personaNarrative,
          behaviouralBoxes: primaryJson.behaviouralBoxes?.length
            ? primaryJson.behaviouralBoxes
            : fallbackPrimaryPattern(selection, persona).behaviouralBoxes,
          traitDeviations: primaryJson.traitDeviations ?? [],
        }
      : fallbackPrimaryPattern(selection, persona);

  const secondaryPattern: SecondaryPatternSection | undefined =
    secondaryJson?.secondaryNarrative?.trim()
      ? {
          secondaryNarrative: secondaryJson.secondaryNarrative,
          behaviouralBoxes: secondaryJson.behaviouralBoxes ?? [],
          blendNarrative: secondaryJson.blendNarrative ?? null,
        }
      : fallbackSecondaryPattern(selection) ?? undefined;

  const pillarPlans = {} as ActionPlanSynthesis["pillarPlans"];
  for (const pillar of PILLARS) {
    const base = selection.pillarPlans[pillar];
    const parsed = pillarJsonByName[pillar];
    const dos = parsed?.doItems ?? parsed?.dos;
    const donts = parsed?.dontItems ?? parsed?.donts;
    pillarPlans[pillar] = {
      focusArea: parsed?.mindsetShift?.trim() || parsed?.focusArea?.trim() || base.focusArea,
      focusReason: parsed?.mindsetShift?.trim() || parsed?.focusArea?.trim() || base.focusReason,
      dos: dos?.length ? dos : fallbackPillarDos(base),
      donts: donts?.length ? donts : fallbackPillarDonts(base),
      sourceIds: base.sourceIds,
    };
  }

  const opportunityCards = applyOpportunityCardFallbacks(
    mergePriorityCards(selection.opportunityCards, prioritiesJson),
  );

  const safetyGuidance = selection.safetyGuidance.map((s) => ({
    id: s.id,
    text: s.text,
  }));

  const reportSections = {
    primaryPattern,
    secondaryPattern,
    quickProfile,
    blindSpots: {
      patternBody: blindJson?.patternBody?.trim() || fallback.reportSections!.blindSpots.patternBody,
      goalsBody: blindJson?.goalsBody?.trim() || fallback.reportSections!.blindSpots.goalsBody,
    },
    opportunities: opportunityCards,
  };

  const tokenUsage = mergeTokenUsage(tokenParts, model);
  const llmSucceeded = (tokenUsage?.totalTokens ?? 0) > 0;

  return {
    opportunityCards,
    pillarPlans,
    launchpad: { start_here: [], environment_setup: [], recovery_rules: [] },
    coachNotes: {
      keyStrength: primaryPattern.behaviouralBoxes[1]?.content ?? "",
      keyRisk: reportSections.blindSpots.patternBody,
      coachingNotes: [],
      sourceIds: selection.piSeries.sourceIds,
    },
    safetyGuidance,
    reportSections,
    synthesized: llmSucceeded,
    llmProvider: provider,
    synthesisError: errors.length ? errors.join("; ") : null,
    tokenUsage,
  };
}

export async function buildActionPlan(args: {
  selection: ActionPlanSelection;
  input: BuildProfileInput;
  config: RecommendationConfig;
  reportTemplates?: ReportTemplatesDoc;
  llmProvider?: ReportLlmProvider;
}): Promise<ActionPlan> {
  const { loadReportTemplatesAdmin } = await import("@/lib/server/platform-config");
  const { loadReportLlmProviderAdmin } = await import("@/lib/server/report-llm-config");
  const { generatePlanOutput } = await import("@/lib/recommendations/plan/plan-generator");
  const { synthesizeIntegratedPlanPage } = await import("@/lib/recommendations/plan/synthesize-plan-page");

  const templates = args.reportTemplates ?? (await loadReportTemplatesAdmin());
  const llmProvider = args.llmProvider ?? (await loadReportLlmProviderAdmin());
  const ctx = buildGeminiSynthesisContext(args.input, args.config, args.selection);

  const secondaryBlendPct = args.input.scores?.persona?.personaPercentages?.[args.selection.profile.secondaryPersona];
  const planOutput = generatePlanOutput({
    ranked: args.selection.ranked,
    profile: args.selection.profile,
    planId: `plan_${args.selection.profile.primaryPersona}_${Date.now()}`,
    secondaryBlendPct,
  });

  const [synthesis, integratedPlan, coachGuide] = await Promise.all([
    synthesizeActionPlanWithLlm(args.selection, ctx, args.input, templates, llmProvider),
    synthesizeIntegratedPlanPage(planOutput, args.selection.profile, args.input, llmProvider),
    (async () => {
      const { buildCoachGuideDocument } = await import("@/lib/coach-guide/build-coach-guide");
      if (!args.input.scores?.persona) return null;
      return buildCoachGuideDocument({
        profile: args.selection.profile,
        persona: args.input.scores.persona,
        input: args.input,
        reportId: `plan_${args.selection.profile.primaryPersona}_${Date.now()}`.slice(-8).toUpperCase(),
      });
    })(),
  ]);

  return {
    ...args.selection,
    planOutput,
    synthesis: {
      ...synthesis,
      integratedPlan,
      planOutput,
      coachGuide,
    },
  };
}

export const synthesizeActionPlanWithGemini = synthesizeActionPlanWithLlm;
