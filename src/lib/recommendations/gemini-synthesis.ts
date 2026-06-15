import type {
  ActionPlan,
  ActionPlanSelection,
  ActionPlanSynthesis,
  GeminiTokenUsage,
  OpportunityCard,
  PillarName,
  PillarSynthesisDo,
  PillarSynthesisDont,
} from "@/lib/recommendations/types";
import type { ReportTemplatesDoc } from "@/lib/admin/platform-config-types";
import { DEFAULT_REPORT_TEMPLATES } from "@/lib/admin/platform-config-defaults";
import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import type { RecommendationConfig } from "@/lib/recommendations/firestore-config-types";
import { resolvedText } from "@/lib/recommendations/action-pool";
import {
  buildGeminiSynthesisContext,
  type GeminiSynthesisContext,
} from "@/lib/recommendations/build-gemini-synthesis-context";
import { callGeminiSection, mergeTokenUsage, parseSectionJson, type GeminiSectionResult } from "@/lib/recommendations/gemini-api-client";
import { callOpenAiSection } from "@/lib/recommendations/openai-api-client";
import {
  DEFAULT_REPORT_LLM_PROVIDER,
  reportLlmModel,
  type ReportLlmProvider,
} from "@/lib/recommendations/report-llm-types";
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
} from "@/lib/recommendations/gemini-section-prompts";
import { buildQuickProfile, friendlyTraitLabel } from "@/lib/results/quick-profile";
import type { TraitKey } from "@/lib/scoring/persona-types";

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
  const goals = goalsRaw ?? (selection.profile.goals.length ? selection.profile.goals.map((g) => g.replace(/_/g, " ")).join(", ") : null);
  const barrier = barrierRaw ?? (selection.profile.barriers.length ? selection.profile.barriers.map((b) => b.replace(/_/g, " ")).join(", ") : null);

  if (goals && barrier) {
    return `This pattern directly touches what you said you want — ${goals} — while your biggest barrier (${barrier.toLowerCase()}) may be partly fueled by the unconscious loop above. Naming it gives you a clearer lever: adjust the pattern, and the goal becomes more reachable.`;
  }
  if (goals) {
    return `This hidden pattern likely intersects with your stated goal: ${goals}. When progress stalls, it may be this background habit — not lack of effort — that needs attention first.`;
  }
  if (barrier) {
    return `Your reported barrier — ${barrier} — often worsens when this unconscious pattern runs unchecked. Addressing the pattern first can loosen the grip that barrier has on your routine.`;
  }
  return "This pattern quietly competes with the goals you care about most. When motivation dips, it is often this background loop — not willpower — that deserves your attention first.";
}

function fallbackPillarDos(plan: ActionPlanSelection["pillarPlans"][PillarName]): PillarSynthesisDo[] {
  return plan.dos.map((d) => ({ action: d.text, why: "This fits your persona-specific patterns." }));
}

function fallbackPillarDonts(plan: ActionPlanSelection["pillarPlans"][PillarName]): PillarSynthesisDont[] {
  return plan.donts.map((d) => ({ behavior: d.text, why: "This pattern works against your natural wellness style." }));
}

function fallbackSynthesis(
  selection: ActionPlanSelection,
  input?: BuildProfileInput,
  ctx?: GeminiSynthesisContext,
): ActionPlanSynthesis {
  const pi = selection.piSeries;
  const persona = input?.scores?.persona;

  const opportunities = selection.opportunityCards.map((card) => ({
    ...card,
    headline: card.personaContextText.split(".")[0]?.slice(0, 80) || card.category.replace(/_/g, " "),
    whyItMatters: `This fits your profile because it addresses patterns tied to your goals and barriers. Score: ${card.impactLevel}.`,
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

  const launchpad = {
    start_here: [] as ActionPlanSynthesis["launchpad"]["start_here"],
    environment_setup: [] as ActionPlanSynthesis["launchpad"]["environment_setup"],
    recovery_rules: [] as ActionPlanSynthesis["launchpad"]["recovery_rules"],
  };
  for (const item of selection.launchpad) {
    launchpad[item.group].push({
      id: item.id,
      action: item.text,
      context: `From your ${item.pillar} plan — start this week.`,
    });
  }

  const coachNotes = {
    keyStrength: pi.strengthInsightText || "You have clear motivations we can build on.",
    keyRisk: pi.blindSpotText || "Watch for overload when life gets busy.",
    coachingNotes: [
      pi.patternPredictionText || "Notice when routines slip under stress.",
      pi.successConditionText || "Protect the conditions where you do your best work.",
      selection.coachSourceRows[0] ? resolvedText(selection.coachSourceRows[0], selection.profile) : "Start with one small win this week.",
      selection.coachSourceRows[1] ? resolvedText(selection.coachSourceRows[1], selection.profile) : "Review weekly trends, not single bad days.",
    ].filter(Boolean),
    sourceIds: [...pi.sourceIds, ...selection.coachSourceRows.map((r) => r.id)],
  };

  const safetyGuidance = selection.safetyGuidance.map((s) => ({
    id: s.id,
    text: resolvedText(s, selection.profile),
  }));

  const quickProfile = persona
    ? buildQuickProfile(persona, ctx ? topBarrierLabel(ctx) : undefined)
    : {
        wellnessStyle: "Personalized",
        energyPattern: "Steady-paced",
        motivationDriver: "Your unique pattern",
        riskFactor: "Inconsistency",
        bestEnvironment: "Structured with flexibility",
        personaPercentage: 0,
        archetype: "",
      };

  return {
    opportunities: opportunities.map((o) => ({
      title: o.headline,
      summary: o.whyItMatters,
      sourceIds: o.sourceIds,
      category: o.category,
    })),
    opportunityCards: opportunities,
    pillarPlans,
    launchpad,
    coachNotes,
    safetyGuidance,
    reportSections: {
      personalityNarrative: persona
        ? `You approach wellness with a ${quickProfile.wellnessStyle.toLowerCase()} style. ${persona.personaTitle ? `Your pattern is best described as a ${persona.fitTier} fit.` : ""} You tend to respond well when your environment matches how you naturally operate — especially around ${quickProfile.motivationDriver.toLowerCase()}.`
        : "Your wellness profile reflects a unique combination of habits, motivations, and constraints.",
      quickProfile,
      blindSpots: {
        patternBody: [pi.blindSpotText, pi.patternPredictionText].filter(Boolean).join("\n\n").trim(),
        goalsBody: buildGoalsFallbackBody(selection, input),
      },
      successBlueprint: {
        worksBody: pi.successConditionText?.trim() || "Your best results come when structure and recovery are protected together.",
        advantageBody: pi.strengthInsightText?.trim() || coachNotes.keyStrength,
      },
      traitDeviationNarratives: (persona?.traitDeviations ?? []).slice(0, 2).map((d) => {
        const name = friendlyTraitLabel(d.trait as TraitKey);
        const direction = d.direction === "above" ? "higher" : "lower";
        return `Your ${name.toLowerCase()} is ${Math.abs(d.deviation).toFixed(1)} points ${direction} than typical for your profile — a meaningful difference in how you show up day to day.`;
      }),
      opportunities,
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

function mergeOpportunityCards(
  base: OpportunityCard[],
  parsed: { cards?: { id: string; headline: string; whyItMatters: string }[] } | null,
): OpportunityCard[] {
  if (!parsed?.cards?.length) return base;
  return base.map((card, i) => {
    const hit = parsed.cards?.find((c) => c.id === card.id) ?? parsed.cards?.[i];
    if (!hit) return card;
    return {
      ...card,
      headline: hit.headline?.trim() || card.headline,
      whyItMatters: hit.whyItMatters?.trim() || card.whyItMatters,
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
    return { ...fallback, synthesisError: missingApiKeyMessage(provider) };
  }

  const model = reportLlmModel(provider);
  const systemPrompt = buildSystemPrompt(templates);
  const fb = resolveFitBlend(ctx, templates);
  const persona = input?.scores?.persona;
  const errors: string[] = [];
  const tokenParts: (GeminiTokenUsage | null)[] = [];

  const emptySection = (): GeminiSectionResult => ({ text: "", tokenUsage: null });

  const call = (userPrompt: string): Promise<GeminiSectionResult> => {
    if (!userPrompt.trim()) return Promise.resolve(emptySection());
    if (provider === "gpt") {
      return callOpenAiSection({ apiKey, model, systemPrompt, userPrompt, json: true });
    }
    return callGeminiSection({ apiKey, model, systemPrompt, userPrompt, json: true });
  };

  // Guide §13.3 — personality first, coaching last; other sections in parallel.
  const personalityRes =
    persona && input ? await call(buildPersonalityPrompt(ctx, input, fb)) : emptySection();
  tokenParts.push(personalityRes.tokenUsage);
  if (personalityRes.error) errors.push(`personality: ${personalityRes.error}`);

  const [
    blindRes,
    successRes,
    deviationRes,
    oppRes,
    nutritionRes,
    physicalRes,
    sleepRes,
    mentalRes,
    launchpadRes,
  ] = await Promise.all([
    call(buildBlindSpotsPrompt(selection, ctx, fb)),
    call(buildSuccessBlueprintPrompt(selection, ctx, fb)),
    persona ? call(buildDeviationPrompt(persona, ctx, fb)) : Promise.resolve(emptySection()),
    call(buildOpportunitiesPrompt(selection.opportunityCards, ctx, fb)),
    call(buildPillarPrompt("Nutrition", selection.pillarPlans.Nutrition, ctx, fb)),
    call(buildPillarPrompt("Physical Activity", selection.pillarPlans["Physical Activity"], ctx, fb)),
    call(buildPillarPrompt("Sleep & Recovery", selection.pillarPlans["Sleep & Recovery"], ctx, fb)),
    call(buildPillarPrompt("Mental Wellness", selection.pillarPlans["Mental Wellness"], ctx, fb)),
    call(buildLaunchpadPrompt(selection, ctx, fb)),
  ]);

  for (const res of [blindRes, successRes, deviationRes, oppRes, nutritionRes, physicalRes, sleepRes, mentalRes, launchpadRes]) {
    tokenParts.push(res.tokenUsage);
    if (res.error) errors.push(res.error);
  }

  const coachingRes = await call(buildCoachingPrompt(selection, ctx, fb));
  tokenParts.push(coachingRes.tokenUsage);
  if (coachingRes.error) errors.push(`coaching: ${coachingRes.error}`);

  const personalityJson = parseSectionJson<{ personalityNarrative?: string }>(personalityRes.text);
  const blindJson = parseSectionJson<{ patternBody?: string; goalsBody?: string }>(blindRes.text);
  const successJson = parseSectionJson<{ worksBody?: string; advantageBody?: string }>(successRes.text);
  const deviationJson = parseSectionJson<{ traitDeviationNarratives?: string[] }>(deviationRes.text);
  const oppJson = parseSectionJson<{ cards?: { id: string; headline: string; whyItMatters: string }[] }>(oppRes.text);
  const launchpadJson = parseSectionJson<ActionPlanSynthesis["launchpad"]>(launchpadRes.text);
  const coachingJson = parseSectionJson<{
    keyStrength?: string;
    keyRisk?: string;
    coachingNotes?: string[];
    safetyGuidance?: { id: string; text: string }[];
  }>(coachingRes.text);

  const pillarJsonByName: Record<PillarName, {
    focusArea?: string;
    focusReason?: string;
    dos?: PillarSynthesisDo[];
    donts?: PillarSynthesisDont[];
  } | null> = {
    Nutrition: parseSectionJson(nutritionRes.text),
    "Physical Activity": parseSectionJson(physicalRes.text),
    "Sleep & Recovery": parseSectionJson(sleepRes.text),
    "Mental Wellness": parseSectionJson(mentalRes.text),
  };

  const quickProfile = persona
    ? buildQuickProfile(persona, topBarrierLabel(ctx))
    : fallback.reportSections!.quickProfile;

  const pillarPlans = {} as ActionPlanSynthesis["pillarPlans"];
  for (const pillar of PILLARS) {
    const base = selection.pillarPlans[pillar];
    const parsed = pillarJsonByName[pillar];
    pillarPlans[pillar] = {
      focusArea: parsed?.focusArea?.trim() || base.focusArea,
      focusReason: parsed?.focusReason?.trim() || base.focusReason,
      dos: parsed?.dos?.length ? parsed.dos : fallbackPillarDos(base),
      donts: parsed?.donts?.length ? parsed.donts : fallbackPillarDonts(base),
      sourceIds: base.sourceIds,
    };
  }

  const opportunityCards = mergeOpportunityCards(selection.opportunityCards, oppJson);

  const launchpad = launchpadJson ?? fallback.launchpad;
  const coachNotes = {
    keyStrength: coachingJson?.keyStrength?.trim() || fallback.coachNotes.keyStrength,
    keyRisk: coachingJson?.keyRisk?.trim() || fallback.coachNotes.keyRisk,
    coachingNotes: coachingJson?.coachingNotes?.filter(Boolean).length
      ? coachingJson.coachingNotes!.filter(Boolean)
      : fallback.coachNotes.coachingNotes,
    sourceIds: fallback.coachNotes.sourceIds,
  };

  const safetyGuidance =
    coachingJson?.safetyGuidance?.length
      ? coachingJson.safetyGuidance
      : fallback.safetyGuidance;

  const reportSections = {
    personalityNarrative: personalityJson?.personalityNarrative?.trim() || fallback.reportSections!.personalityNarrative,
    quickProfile,
    blindSpots: {
      patternBody: blindJson?.patternBody?.trim() || fallback.reportSections!.blindSpots.patternBody,
      goalsBody: blindJson?.goalsBody?.trim() || fallback.reportSections!.blindSpots.goalsBody,
    },
    successBlueprint: {
      worksBody: successJson?.worksBody?.trim() || fallback.reportSections!.successBlueprint.worksBody,
      advantageBody: successJson?.advantageBody?.trim() || fallback.reportSections!.successBlueprint.advantageBody,
    },
    traitDeviationNarratives:
      deviationJson?.traitDeviationNarratives?.filter(Boolean).length
        ? deviationJson.traitDeviationNarratives!.filter(Boolean)
        : fallback.reportSections!.traitDeviationNarratives,
    opportunities: opportunityCards,
  };

  const tokenUsage = mergeTokenUsage(tokenParts, model);

  return {
    opportunities: opportunityCards.map((o) => ({
      title: o.headline,
      summary: o.whyItMatters,
      sourceIds: o.sourceIds,
      category: o.category,
    })),
    opportunityCards,
    pillarPlans,
    launchpad,
    coachNotes,
    safetyGuidance,
    reportSections,
    synthesized: true,
    synthesisError: errors.length ? errors.join("; ") : undefined,
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
  const templates = args.reportTemplates ?? (await loadReportTemplatesAdmin());
  const llmProvider = args.llmProvider ?? (await loadReportLlmProviderAdmin());
  const ctx = buildGeminiSynthesisContext(args.input, args.config, args.selection);
  const synthesis = await synthesizeActionPlanWithLlm(args.selection, ctx, args.input, templates, llmProvider);
  return { ...args.selection, synthesis };
}

/** @deprecated Use synthesizeActionPlanWithLlm */
export const synthesizeActionPlanWithGemini = synthesizeActionPlanWithLlm;
