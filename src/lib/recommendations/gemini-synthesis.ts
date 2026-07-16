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
import { normalizePillarDont, normalizePillarDo } from "@/lib/recommendations/pillar-display";
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
  buildSystemPromptForProfile,
  resolveFitBlend,
} from "@/lib/recommendations/gemini-section-prompts";
import { applyPdaV12SynthesisPostProcess } from "@/lib/recommendations/qa-synthesis-checks";
import { resolvedText } from "@/lib/recommendations/action-pool";
import {
  failedRulesForSection,
  mapQaFailuresToSections,
  prependQaFailedRules,
  type QaRegenSection,
} from "@/lib/recommendations/qa-regen";
import { sanitizePostSynthesisInput, validatePostSynthesis } from "@/lib/recommendations/report-validation";
import { scrubBlocklistTerms } from "@/lib/recommendations/content-blocklist";
import { PDA_REPORT_PILLAR_ORDER } from "@/lib/recommendations/scoring-constants";
import { resolvePrimaryPersonaKey } from "@/lib/scoring/normalize-persona";
import { buildQuickProfile, friendlyTraitLabel } from "@/lib/results/quick-profile";
import type { PersonaAnalysis, TraitKey } from "@/lib/scoring/persona-types";

const PILLARS: PillarName[] = [...PDA_REPORT_PILLAR_ORDER];

function scrubCopy(text: string): string {
  return scrubBlocklistTerms(text);
}

function scrubPrimaryPattern(pattern: PrimaryPatternSection): PrimaryPatternSection {
  return {
    ...pattern,
    personaNarrative: scrubCopy(pattern.personaNarrative),
    behaviouralBoxes: pattern.behaviouralBoxes.map((box) => ({
      ...box,
      content: scrubCopy(box.content),
    })),
  };
}

function scrubSecondaryPattern(pattern: SecondaryPatternSection | undefined): SecondaryPatternSection | undefined {
  if (!pattern) return pattern;
  return {
    ...pattern,
    secondaryNarrative: scrubCopy(pattern.secondaryNarrative),
    blendNarrative: pattern.blendNarrative ? scrubCopy(pattern.blendNarrative) : pattern.blendNarrative,
    behaviouralBoxes: pattern.behaviouralBoxes.map((box) => ({
      ...box,
      content: scrubCopy(box.content),
    })),
  };
}

function scrubPillarPlans(
  plans: ActionPlanSynthesis["pillarPlans"],
): ActionPlanSynthesis["pillarPlans"] {
  const out = { ...plans };
  for (const pillar of PILLARS) {
    const plan = out[pillar];
    out[pillar] = {
      ...plan,
      focusArea: scrubCopy(plan.focusArea),
      focusReason: scrubCopy(plan.focusReason),
      dos: plan.dos.map((d) => ({ ...d, action: scrubCopy(d.action), why: scrubCopy(d.why) })),
      donts: plan.donts.map((d) => ({ ...d, behavior: scrubCopy(d.behavior), why: scrubCopy(d.why) })),
    };
  }
  return out;
}

function scrubOpportunityCards(cards: ActionPlanSynthesis["opportunityCards"]): ActionPlanSynthesis["opportunityCards"] {
  return cards.map((card) => ({
    ...card,
    headline: card.headline ? scrubCopy(card.headline) : card.headline,
    whyItMatters: card.whyItMatters ? scrubCopy(card.whyItMatters) : card.whyItMatters,
    startThisWeek: card.startThisWeek ? scrubCopy(card.startThisWeek) : card.startThisWeek,
  }));
}

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
  const barrierRaw =
    formatAnswerList(input?.answers?.wc_wellness_barriers) ||
    formatAnswerList(input?.answers?.wc_biggest_barrier);
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

function normFocus(text: string): string {
  return text.trim().toLowerCase().replace(/[.!?\s]+$/g, "").replace(/\s+/g, " ");
}

/** Headline vs supporting reason must differ — identical Focus/Reason flattens Slide 07. */
function resolvePillarFocusCopy(
  pillar: PillarName,
  base: ActionPlanSelection["pillarPlans"][PillarName],
  parsed: {
    headline?: string;
    mindsetShift?: string;
    focusArea?: string;
    why_this_matters?: string;
    reason?: string;
    focusReason?: string;
    do_items?: PillarSynthesisDo[];
    doItems?: PillarSynthesisDo[];
    dos?: PillarSynthesisDo[];
  } | null,
): { focusArea: string; focusReason: string } {
  const headline =
    parsed?.headline?.trim() || parsed?.mindsetShift?.trim() || parsed?.focusArea?.trim() || "";
  const focusArea = headline || base.focusArea;

  let focusReason =
    parsed?.why_this_matters?.trim() ||
    parsed?.reason?.trim() ||
    parsed?.focusReason?.trim() ||
    "";

  if (!focusReason || normFocus(focusReason) === normFocus(focusArea)) {
    const engineReason = base.focusReason?.trim() || "";
    if (engineReason && normFocus(engineReason) !== normFocus(focusArea)) {
      focusReason = engineReason;
    }
  }

  if (!focusReason || normFocus(focusReason) === normFocus(focusArea)) {
    const dos = parsed?.do_items ?? parsed?.doItems ?? parsed?.dos ?? [];
    const why = dos.find((d) => d.why?.trim())?.why?.trim();
    if (why && normFocus(why) !== normFocus(focusArea)) {
      focusReason = why;
    }
  }

  if (!focusReason || normFocus(focusReason) === normFocus(focusArea)) {
    focusReason = `This keeps ${pillar.toLowerCase()} simple enough to hold when stress and time both press in.`;
  }

  return { focusArea, focusReason };
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

function fallbackSecondaryPattern(
  selection: ActionPlanSelection,
  blendStrength?: string,
): SecondaryPatternSection | null {
  const pi = selection.piSeries;
  const success = pi.secondarySuccessConditionText?.trim() || "";
  const strength = pi.secondaryStrengthInsightText?.trim() || "";
  if (!success && !strength) return null;

  // PDA §20.5 Pure: 2-sentence summary only; empty boxes; no blend narrative.
  if (blendStrength === "pure") {
    const s1 = success || strength;
    const s2 =
      strength && strength !== s1
        ? strength
        : "This secondary pattern does not meaningfully reshape how your primary pattern shows up day to day.";
    return {
      secondaryNarrative: `${s1.replace(/\s+/g, " ").trim().replace(/\.$/, "")}. ${s2.replace(/\s+/g, " ").trim()}`.slice(0, 600),
      behaviouralBoxes: [],
      blendNarrative: null,
    };
  }

  return {
    secondaryNarrative: success || strength,
    behaviouralBoxes: [
      { title: "Behavioural Tendencies", content: success || "—" },
      { title: "What Motivates You", content: strength || "—" },
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
  const secondaryPattern = fallbackSecondaryPattern(
    selection,
    selection.profile.blendStrength ?? input?.scores?.persona?.blendStrength,
  );

  const opportunityCards = selection.opportunityCards.map((card, i) => ({
    ...card,
    rank: card.rank || i + 1,
    headline: card.personaContextText.split(".")[0]?.slice(0, 80) || card.category.replace(/_/g, " "),
    whyItMatters: "This pillar matters strongly for your profile.",
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
  const safetyCards = selection.safetyCards ?? [];

  const blindSpots = {
    patternBody: pi.blindSpotText,
    goalsBody: buildGoalsFallbackBody(selection, input),
  };

  const processed = applyPdaV12SynthesisPostProcess(selection.profile, {
    pillarPlans,
    primaryPattern,
    opportunityCards,
    blindSpots,
  }, selection.ranked);

  return {
    opportunityCards: processed.opportunityCards,
    pillarPlans: processed.pillarPlans,
    launchpad: { start_here: [], environment_setup: [], recovery_rules: [] },
    coachNotes: {
      keyStrength: pi.strengthInsightText || "",
      keyRisk: pi.blindSpotText || "",
      coachingNotes: selection.coachSourceRows.map((r) =>
        resolvedText(r, selection.profile, { topScoring: true }),
      ),
      sourceIds: [
        ...new Set([...pi.sourceIds, ...selection.coachSourceRows.map((r) => r.id)]),
      ],
    },
    safetyGuidance,
    safetyCards,
    reportSections: {
      primaryPattern: processed.primaryPattern,
      secondaryPattern: secondaryPattern ?? undefined,
      quickProfile,
      blindSpots: processed.blindSpots,
      opportunities: processed.opportunityCards,
    },
    synthesized: false,
    synthesisError: [
      "LLM API key not configured — showing deterministic copy from your matched recommendations.",
      ...processed.qa.warnings.map((w) => `qa_warn: ${w}`),
      ...processed.qa.failures.map((f) => `qa: ${f}`),
    ]
      .filter(Boolean)
      .join("; "),
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
        card.whyItMatters?.trim() || "This pillar matters strongly for your profile.",
      startThisWeek: card.startThisWeek?.trim() || firstSentence || card.personaContextText,
    };
  });
}

function mergePriorityCards(
  base: OpportunityCard[],
  parsed: {
    priority_cards?: {
      pillar: string;
      rank: number;
      headline: string;
      why_it_matters: string;
      first_step: string;
    }[];
    priorityCards?: {
      pillar: string;
      rank: number;
      headline: string;
      whyItMatters: string;
      startThisWeek: string;
    }[];
  } | null,
): OpportunityCard[] {
  const cards = parsed?.priority_cards ?? parsed?.priorityCards;
  if (!cards?.length) return base;
  return base.map((card) => {
    const hit = cards.find((c) => c.rank === card.rank) ?? cards[card.rank - 1];
    if (!hit) return card;
    const why =
      ("why_it_matters" in hit ? hit.why_it_matters : hit.whyItMatters)?.trim() || card.whyItMatters;
    const step =
      ("first_step" in hit ? hit.first_step : hit.startThisWeek)?.trim() || card.startThisWeek;
    return {
      ...card,
      headline: hit.headline?.trim() || card.headline,
      whyItMatters: why,
      startThisWeek: step,
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
  const systemPrompt = buildSystemPromptForProfile(selection.profile, input, ctx, templates);
  const fb = resolveFitBlend(ctx, templates);
  const persona = input?.scores?.persona;
  const errors: string[] = [];
  const tokenParts: (GeminiTokenUsage | null)[] = [];

  const emptySection = (): GeminiSectionResult => ({ text: "", tokenUsage: null });

  const callOnce = (
    userPrompt: string,
    maxOutputTokens: number = SECTION_OUTPUT_TOKENS.default,
  ): Promise<GeminiSectionResult> => {
    if (!userPrompt.trim()) return Promise.resolve(emptySection());
    if (provider === "gpt") {
      return callOpenAiSection({ apiKey, model, systemPrompt, userPrompt, json: true, maxOutputTokens });
    }
    return callGeminiSection({ apiKey, model, systemPrompt, userPrompt, json: true, maxOutputTokens });
  };

  /** §25 — retry once on invalid JSON before fallback. */
  const call = async (
    userPrompt: string,
    maxOutputTokens: number = SECTION_OUTPUT_TOKENS.default,
    validate?: (parsed: unknown) => boolean,
  ): Promise<GeminiSectionResult> => {
    const first = await callOnce(userPrompt, maxOutputTokens);
    if (!userPrompt.trim()) return first;
    if (first.error) return first;
    const parsed = parseSectionJson(first.text);
    if (!validate || validate(parsed)) return first;
    const retry = await callOnce(userPrompt, maxOutputTokens);
    return retry.text.trim() ? retry : first;
  };

  // Guide §13.3 — Primary first, then parallel sections, priorities after pillars.
  const primaryRes =
    persona && input
      ? await call(
          buildPrimaryPatternPrompt(selection, ctx, input, fb),
          SECTION_OUTPUT_TOKENS.primaryPattern,
          (p) => Boolean((p as PrimaryPatternSection | null)?.personaNarrative?.trim()),
        )
      : emptySection();
  tokenParts.push(primaryRes.tokenUsage);
  if (primaryRes.error) errors.push(`primary_pattern: ${primaryRes.error}`);

  const [blindRes, secondaryRes, sleepRes, nutritionRes, physicalRes, mentalRes] = await Promise.all([
    call(
      buildBlindSpotsPrompt(selection, ctx, fb),
      SECTION_OUTPUT_TOKENS.blindSpots,
      (p) => {
        const j = p as { pattern_you_do_not_notice?: string; patternBody?: string } | null;
        return Boolean(j?.pattern_you_do_not_notice?.trim() || j?.patternBody?.trim());
      },
    ),
    call(buildSecondaryPatternPrompt(selection, ctx, input ?? { answers: {} }, fb), SECTION_OUTPUT_TOKENS.secondaryPattern),
    call(
      buildPillarPrompt("Sleep & Recovery", selection.pillarPlans["Sleep & Recovery"], selection.profile, ctx, input ?? { answers: {} }, fb),
      SECTION_OUTPUT_TOKENS.pillar,
      (p) => {
        const j = p as { headline?: string; do_items?: unknown[]; doItems?: unknown[] } | null;
        const dos = j?.do_items ?? j?.doItems;
        return Boolean(j?.headline?.trim() || (dos?.length ?? 0) > 0);
      },
    ),
    call(
      buildPillarPrompt("Nutrition", selection.pillarPlans.Nutrition, selection.profile, ctx, input ?? { answers: {} }, fb),
      SECTION_OUTPUT_TOKENS.pillar,
      (p) => {
        const j = p as { headline?: string; do_items?: unknown[]; doItems?: unknown[] } | null;
        const dos = j?.do_items ?? j?.doItems;
        return Boolean(j?.headline?.trim() || (dos?.length ?? 0) > 0);
      },
    ),
    call(
      buildPillarPrompt("Physical Activity", selection.pillarPlans["Physical Activity"], selection.profile, ctx, input ?? { answers: {} }, fb),
      SECTION_OUTPUT_TOKENS.pillar,
      (p) => {
        const j = p as { headline?: string; do_items?: unknown[]; doItems?: unknown[] } | null;
        const dos = j?.do_items ?? j?.doItems;
        return Boolean(j?.headline?.trim() || (dos?.length ?? 0) > 0);
      },
    ),
    call(
      buildPillarPrompt("Mental Wellness", selection.pillarPlans["Mental Wellness"], selection.profile, ctx, input ?? { answers: {} }, fb),
      SECTION_OUTPUT_TOKENS.pillar,
      (p) => {
        const j = p as { headline?: string; do_items?: unknown[]; doItems?: unknown[] } | null;
        const dos = j?.do_items ?? j?.doItems;
        return Boolean(j?.headline?.trim() || (dos?.length ?? 0) > 0);
      },
    ),
  ]);

  for (const res of [blindRes, secondaryRes, sleepRes, nutritionRes, physicalRes, mentalRes]) {
    tokenParts.push(res.tokenUsage);
    if (res.error) errors.push(res.error);
  }

  const prioritiesRes = await call(
    buildHighImpactPrioritiesPrompt(selection.opportunityCards, selection.profile, ctx, input ?? { answers: {} }, fb),
    SECTION_OUTPUT_TOKENS.priorities,
    (p) => {
      const j = p as { priority_cards?: unknown[]; priorityCards?: unknown[] } | null;
      return Boolean((j?.priority_cards ?? j?.priorityCards)?.length);
    },
  );
  tokenParts.push(prioritiesRes.tokenUsage);
  if (prioritiesRes.error) errors.push(`priorities: ${prioritiesRes.error}`);

  const primaryJson = parseSectionJson<PrimaryPatternSection>(primaryRes.text);
  if (primaryRes.text.trim() && !primaryJson?.personaNarrative?.trim()) {
    errors.push("primary_pattern: response was not valid JSON or missing personaNarrative");
  }
  const blindJson = parseSectionJson<{
    patternBody?: string;
    goalsBody?: string;
    pattern_you_do_not_notice?: string;
    what_this_means_for_your_goals?: string;
  }>(blindRes.text);
  const secondaryJson = parseSectionJson<SecondaryPatternSection>(secondaryRes.text);
  const prioritiesJson = parseSectionJson<{
    priority_cards?: {
      pillar: string;
      rank: number;
      headline: string;
      why_it_matters: string;
      first_step: string;
    }[];
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
      headline?: string;
      mindsetShift?: string;
      why_this_matters?: string;
      reason?: string;
      focusReason?: string;
      do_items?: PillarSynthesisDo[];
      doItems?: PillarSynthesisDo[];
      dont_items?: (PillarSynthesisDont & { behaviour?: string })[];
      dontItems?: (PillarSynthesisDont & { behaviour?: string })[];
      focusArea?: string;
      dos?: PillarSynthesisDo[];
      donts?: (PillarSynthesisDont & { behaviour?: string })[];
    } | null
  > = {
    "Sleep & Recovery": parseSectionJson(sleepRes.text),
    Nutrition: parseSectionJson(nutritionRes.text),
    "Physical Activity": parseSectionJson(physicalRes.text),
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

  const blendStrength = fb.blendStrength || selection.profile.blendStrength || persona?.blendStrength;
  const secondaryPattern: SecondaryPatternSection | undefined =
    secondaryJson?.secondaryNarrative?.trim()
      ? {
          secondaryNarrative: secondaryJson.secondaryNarrative,
          behaviouralBoxes: blendStrength === "pure" ? [] : (secondaryJson.behaviouralBoxes ?? []),
          blendNarrative: blendStrength === "pure" ? null : (secondaryJson.blendNarrative ?? null),
        }
      : fallbackSecondaryPattern(selection, blendStrength) ?? undefined;

  const pillarPlans = {} as ActionPlanSynthesis["pillarPlans"];
  for (const pillar of PILLARS) {
    const base = selection.pillarPlans[pillar];
    const parsed = pillarJsonByName[pillar];
    const { focusArea, focusReason } = resolvePillarFocusCopy(pillar, base, parsed);
    const dos = parsed?.do_items ?? parsed?.doItems ?? parsed?.dos;
    const rawDonts = parsed?.dont_items ?? parsed?.dontItems ?? parsed?.donts;
    pillarPlans[pillar] = {
      focusArea,
      focusReason,
      dos: dos?.length ? dos.map(normalizePillarDo) : fallbackPillarDos(base),
      donts: rawDonts?.length ? rawDonts.map(normalizePillarDont) : fallbackPillarDonts(base),
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
  const safetyCards = selection.safetyCards ?? [];

  const reportSections = {
    primaryPattern,
    secondaryPattern,
    quickProfile,
    blindSpots: {
      patternBody:
        blindJson?.pattern_you_do_not_notice?.trim() ||
        blindJson?.patternBody?.trim() ||
        fallback.reportSections!.blindSpots.patternBody,
      goalsBody:
        blindJson?.what_this_means_for_your_goals?.trim() ||
        blindJson?.goalsBody?.trim() ||
        fallback.reportSections!.blindSpots.goalsBody,
    },
    opportunities: opportunityCards,
  };

  const primaryPersonaKey = persona ? resolvePrimaryPersonaKey(persona) : null;

  const scrubbedPrimaryPattern = scrubPrimaryPattern(primaryPattern);
  const scrubbedSecondaryPattern = scrubSecondaryPattern(secondaryPattern);
  const scrubbedPillarPlans = scrubPillarPlans(pillarPlans);
  const scrubbedOpportunityCards = scrubOpportunityCards(opportunityCards);
  const scrubbedBlindSpots = {
    patternBody: scrubCopy(reportSections.blindSpots.patternBody),
    goalsBody: scrubCopy(reportSections.blindSpots.goalsBody),
  };

  const pdaProcessed = applyPdaV12SynthesisPostProcess(selection.profile, {
    pillarPlans: scrubbedPillarPlans,
    primaryPattern: scrubbedPrimaryPattern,
    opportunityCards: scrubbedOpportunityCards,
    blindSpots: scrubbedBlindSpots,
  }, selection.ranked);

  let finalPrimaryPattern = pdaProcessed.primaryPattern;
  let finalSecondaryPattern = scrubbedSecondaryPattern;
  let finalPillarPlans = pdaProcessed.pillarPlans;
  let finalOpportunityCards = pdaProcessed.opportunityCards;
  let finalBlindSpots = pdaProcessed.blindSpots;
  let qaFailures = [...pdaProcessed.qa.failures];
  let qaWarnings = [...pdaProcessed.qa.warnings];

  // PDA §39 — on QA failure, regenerate failing sections once with the failed rule at top.
  if (qaFailures.length > 0) {
    const sectionsToRegen = mapQaFailuresToSections(qaFailures);
    errors.push(`qa_regen: retrying ${sectionsToRegen.join(", ")}`);

    const profileInput = input ?? { answers: {} };
    const regenJobs: Array<{ section: QaRegenSection; promise: Promise<GeminiSectionResult> }> = [];

    for (const section of sectionsToRegen) {
      const rules = failedRulesForSection(section, qaFailures);
      if (section === "primary_pattern" && persona && input) {
        regenJobs.push({
          section,
          promise: call(
            prependQaFailedRules(buildPrimaryPatternPrompt(selection, ctx, input, fb), rules),
            SECTION_OUTPUT_TOKENS.primaryPattern,
          ),
        });
      } else if (section === "secondary_pattern") {
        regenJobs.push({
          section,
          promise: call(
            prependQaFailedRules(
              buildSecondaryPatternPrompt(selection, ctx, profileInput, fb),
              rules,
            ),
            SECTION_OUTPUT_TOKENS.secondaryPattern,
          ),
        });
      } else if (section === "blind_spots") {
        regenJobs.push({
          section,
          promise: call(
            prependQaFailedRules(buildBlindSpotsPrompt(selection, ctx, fb), rules),
            SECTION_OUTPUT_TOKENS.blindSpots,
          ),
        });
      } else if (section === "priorities") {
        regenJobs.push({
          section,
          promise: call(
            prependQaFailedRules(
              buildHighImpactPrioritiesPrompt(
                selection.opportunityCards,
                selection.profile,
                ctx,
                profileInput,
                fb,
              ),
              rules,
            ),
            SECTION_OUTPUT_TOKENS.priorities,
          ),
        });
      } else if (
        section === "Sleep & Recovery" ||
        section === "Nutrition" ||
        section === "Physical Activity" ||
        section === "Mental Wellness"
      ) {
        regenJobs.push({
          section,
          promise: call(
            prependQaFailedRules(
              buildPillarPrompt(
                section,
                selection.pillarPlans[section],
                selection.profile,
                ctx,
                profileInput,
                fb,
              ),
              rules,
            ),
            SECTION_OUTPUT_TOKENS.pillar,
          ),
        });
      }
      // plan_page regen is handled in synthesizeIntegratedPlanPage (§39 PHASES).
    }

    const regenResults = await Promise.all(regenJobs.map((j) => j.promise));
    let regenPrimary = finalPrimaryPattern;
    let regenSecondary = finalSecondaryPattern;
    let regenPillars = { ...finalPillarPlans };
    let regenCards = finalOpportunityCards;
    let regenBlind = finalBlindSpots;

    for (let i = 0; i < regenJobs.length; i++) {
      const { section } = regenJobs[i]!;
      const res = regenResults[i]!;
      tokenParts.push(res.tokenUsage);
      if (res.error) {
        errors.push(`qa_regen_${section}: ${res.error}`);
        continue;
      }

      if (section === "primary_pattern") {
        const j = parseSectionJson<PrimaryPatternSection>(res.text);
        if (j?.personaNarrative?.trim()) {
          regenPrimary = {
            personaNarrative: j.personaNarrative,
            behaviouralBoxes: j.behaviouralBoxes?.length
              ? j.behaviouralBoxes
              : regenPrimary.behaviouralBoxes,
            traitDeviations: j.traitDeviations ?? regenPrimary.traitDeviations,
          };
        }
      } else if (section === "secondary_pattern") {
        const j = parseSectionJson<SecondaryPatternSection>(res.text);
        if (j?.secondaryNarrative?.trim()) {
          regenSecondary = {
            secondaryNarrative: j.secondaryNarrative,
            behaviouralBoxes: blendStrength === "pure" ? [] : (j.behaviouralBoxes ?? []),
            blendNarrative: blendStrength === "pure" ? null : (j.blendNarrative ?? null),
          };
        }
      } else if (section === "blind_spots") {
        const j = parseSectionJson<{
          patternBody?: string;
          goalsBody?: string;
          pattern_you_do_not_notice?: string;
          what_this_means_for_your_goals?: string;
        }>(res.text);
        regenBlind = {
          patternBody:
            j?.pattern_you_do_not_notice?.trim() || j?.patternBody?.trim() || regenBlind.patternBody,
          goalsBody:
            j?.what_this_means_for_your_goals?.trim() || j?.goalsBody?.trim() || regenBlind.goalsBody,
        };
      } else if (section === "priorities") {
        const j = parseSectionJson<{
          priority_cards?: {
            pillar: string;
            rank: number;
            headline: string;
            why_it_matters: string;
            first_step: string;
          }[];
          priorityCards?: {
            pillar: string;
            rank: number;
            headline: string;
            whyItMatters: string;
            startThisWeek: string;
          }[];
        }>(res.text);
        if (j) {
          regenCards = applyOpportunityCardFallbacks(
            mergePriorityCards(selection.opportunityCards, j),
          );
        }
      } else if (
        section === "Sleep & Recovery" ||
        section === "Nutrition" ||
        section === "Physical Activity" ||
        section === "Mental Wellness"
      ) {
        const parsed = parseSectionJson<{
          headline?: string;
          do_items?: PillarSynthesisDo[];
          doItems?: PillarSynthesisDo[];
          dont_items?: (PillarSynthesisDont & { behaviour?: string })[];
          dontItems?: (PillarSynthesisDont & { behaviour?: string })[];
          dos?: PillarSynthesisDo[];
          donts?: (PillarSynthesisDont & { behaviour?: string })[];
        }>(res.text);
        const base = selection.pillarPlans[section];
        const { focusArea, focusReason } = resolvePillarFocusCopy(section, base, parsed);
        const dos = parsed?.do_items ?? parsed?.doItems ?? parsed?.dos;
        const rawDonts = parsed?.dont_items ?? parsed?.dontItems ?? parsed?.donts;
        if (dos?.length || rawDonts?.length || parsed?.headline) {
          regenPillars[section] = {
            focusArea,
            focusReason,
            dos: dos?.length ? dos.map(normalizePillarDo) : regenPillars[section].dos,
            donts: rawDonts?.length
              ? rawDonts.map(normalizePillarDont)
              : regenPillars[section].donts,
            sourceIds: base.sourceIds,
          };
        }
      }
    }

    const reprocessed = applyPdaV12SynthesisPostProcess(selection.profile, {
      pillarPlans: scrubPillarPlans(regenPillars),
      primaryPattern: scrubPrimaryPattern(regenPrimary),
      opportunityCards: scrubOpportunityCards(regenCards),
      blindSpots: {
        patternBody: scrubCopy(regenBlind.patternBody),
        goalsBody: scrubCopy(regenBlind.goalsBody),
      },
    }, selection.ranked);
    finalPrimaryPattern = reprocessed.primaryPattern;
    finalSecondaryPattern = scrubSecondaryPattern(regenSecondary);
    finalPillarPlans = reprocessed.pillarPlans;
    finalOpportunityCards = reprocessed.opportunityCards;
    finalBlindSpots = reprocessed.blindSpots;
    qaFailures = [...reprocessed.qa.failures];
    qaWarnings = [...reprocessed.qa.warnings];
  }

  if (qaWarnings.length) {
    errors.push(...qaWarnings.map((w) => `qa_warn: ${w}`));
  }
  if (qaFailures.length) {
    errors.push(...qaFailures.map((f) => `qa: ${f}`));
  }

  const tokenUsage = mergeTokenUsage(tokenParts, model);
  const llmSucceeded = (tokenUsage?.totalTokens ?? 0) > 0;

  const postGate = validatePostSynthesis(
    sanitizePostSynthesisInput({
      primaryNarrative: finalPrimaryPattern.personaNarrative,
      secondaryNarrative: finalSecondaryPattern?.secondaryNarrative,
      blindPattern: finalBlindSpots.patternBody,
      blindGoals: finalBlindSpots.goalsBody,
      pillarFocus: PILLARS.map((p) => finalPillarPlans[p].focusArea),
      pillarDos: PILLARS.flatMap((p) => finalPillarPlans[p].dos.map((d) => d.action)),
      pillarDonts: PILLARS.flatMap((p) => finalPillarPlans[p].donts.map((d) => d.behavior)),
      priorityHeadlines: finalOpportunityCards.map((c) => c.headline ?? ""),
      priorityBodies: finalOpportunityCards.map((c) => c.whyItMatters ?? ""),
      behaviouralBoxBodies: finalPrimaryPattern.behaviouralBoxes.map((b) => b.content),
      primaryPersonaKey,
      pillarSourceIds: PILLARS.map((p) => finalPillarPlans[p].sourceIds ?? []),
      piSourceIds: selection.piSeries.sourceIds,
    }),
  );

  if (postGate.warnings.length) {
    errors.push(...postGate.warnings.map((w) => `post_gate_warn: ${w}`));
  }
  if (postGate.violations.length) {
    errors.push(...postGate.violations.map((v) => `post_gate: ${v}`));
  }

  if (postGate.useFallback) {
    const fallbackProcessed = applyPdaV12SynthesisPostProcess(selection.profile, {
      pillarPlans: scrubPillarPlans(fallback.pillarPlans),
      primaryPattern: scrubPrimaryPattern(
        fallback.reportSections?.primaryPattern ?? fallbackPrimaryPattern(selection, persona),
      ),
      opportunityCards: scrubOpportunityCards(fallback.opportunityCards),
      blindSpots: {
        patternBody: scrubCopy(fallback.reportSections?.blindSpots.patternBody ?? finalBlindSpots.patternBody),
        goalsBody: scrubCopy(fallback.reportSections?.blindSpots.goalsBody ?? finalBlindSpots.goalsBody),
      },
    }, selection.ranked);
    finalPrimaryPattern = fallbackProcessed.primaryPattern;
    finalSecondaryPattern = scrubSecondaryPattern(fallback.reportSections?.secondaryPattern);
    finalPillarPlans = fallbackProcessed.pillarPlans;
    finalOpportunityCards = fallbackProcessed.opportunityCards;
    finalBlindSpots = fallbackProcessed.blindSpots;
  }

  const finalReportSections = {
    primaryPattern: finalPrimaryPattern,
    secondaryPattern: finalSecondaryPattern,
    quickProfile,
    blindSpots: finalBlindSpots,
    opportunities: finalOpportunityCards,
  };

  return {
    opportunityCards: finalOpportunityCards,
    pillarPlans: finalPillarPlans,
    launchpad: { start_here: [], environment_setup: [], recovery_rules: [] },
    coachNotes: {
      keyStrength: finalPrimaryPattern.behaviouralBoxes[1]?.content ?? "",
      keyRisk: finalBlindSpots.patternBody,
      coachingNotes: selection.coachSourceRows.map((r) =>
        resolvedText(r, selection.profile, { topScoring: true }),
      ),
      sourceIds: [
        ...new Set([
          ...selection.piSeries.sourceIds,
          ...selection.coachSourceRows.map((r) => r.id),
        ]),
      ],
    },
    safetyGuidance,
    safetyCards,
    reportSections: finalReportSections,
    synthesized: Boolean(finalPrimaryPattern.personaNarrative?.trim()),
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
  const { dedupePlanPhaseItems, runPlanQaChecks } = await import(
    "@/lib/recommendations/plan/qa-plan-checks"
  );

  const templates = args.reportTemplates ?? (await loadReportTemplatesAdmin());
  const llmProvider = args.llmProvider ?? (await loadReportLlmProviderAdmin());
  const ctx = buildGeminiSynthesisContext(args.input, args.config, args.selection);

  const secondaryBlendPct = args.input.scores?.persona?.personaPercentages?.[args.selection.profile.secondaryPersona];
  let planOutput = generatePlanOutput({
    ranked: args.selection.ranked,
    profile: args.selection.profile,
    planId: `plan_${args.selection.profile.primaryPersona}_${Date.now()}`,
    secondaryBlendPct,
  });

  if (planOutput) {
    const planQa = runPlanQaChecks(planOutput, args.selection.profile, null);
    if (planQa.failures.some((f) => /repeats verbatim/i.test(f))) {
      planOutput = dedupePlanPhaseItems(planOutput);
    }
  }
  const [synthesis, integratedPlan, reportDisplayName] = await Promise.all([
    synthesizeActionPlanWithLlm(args.selection, ctx, args.input, templates, llmProvider),
    synthesizeIntegratedPlanPage(
      planOutput,
      args.selection.profile,
      args.input,
      llmProvider,
      args.selection.opportunityCards,
    ),
    (async () => {
      const { synthesizeReportDisplayName } = await import(
        "@/lib/recommendations/synthesize-report-display-name"
      );
      return synthesizeReportDisplayName({
        profile: args.selection.profile,
        persona: args.input.scores?.persona,
        input: args.input,
        llmProvider,
      });
    })(),
  ]);

  const reportId = (planOutput?.plan_id ?? `plan_${Date.now()}`).slice(-8).toUpperCase();
  let coachGuide = null;
  if (args.input.scores?.persona && planOutput && integratedPlan) {
    const { synthesizeCoachGuideDocument } = await import("@/lib/coach-guide/synthesize-coach-guide");
    coachGuide = await synthesizeCoachGuideDocument({
      profile: args.selection.profile,
      persona: args.input.scores.persona,
      input: args.input,
      reportId,
      llmProvider,
      planOutput,
      integratedPlan,
    });
  }

  return {
    ...args.selection,
    planOutput,
    synthesis: {
      ...synthesis,
      integratedPlan,
      planOutput,
      coachGuide,
      reportDisplayName,
    },
  };
}

export const synthesizeActionPlanWithGemini = synthesizeActionPlanWithLlm;
