import type {
  ActionPlan,
  ActionPlanSelection,
  ActionPlanSynthesis,
  LaunchpadGroup,
  PillarName,
} from "@/lib/recommendations/types";
import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import type { RecommendationConfig } from "@/lib/recommendations/firestore-config-types";
import { LAUNCHPAD_GROUP_LABELS } from "@/lib/recommendations/select-action-plan";
import {
  buildGeminiSynthesisContext,
  type GeminiSynthesisContext,
} from "@/lib/recommendations/build-gemini-synthesis-context";
import { buildQuickProfile } from "@/lib/results/quick-profile";

const PILLARS: PillarName[] = ["Nutrition", "Physical Activity", "Sleep & Recovery", "Mental Wellness"];

const FIT_TIER_TONE: Record<string, string> = {
  classic: "Assertive and confident — use 'You naturally...' / 'You do X because...'",
  core: "Confident but softer — use 'You tend to...' / 'Your pattern suggests...'",
  adaptive: "Exploratory — use 'You may find...' / 'People with your pattern often...'",
  emerging: "Tentative and invitational — use 'Some aspects suggest...' / 'Consider whether...'",
};

const BLEND_RULES: Record<string, string> = {
  pure: "Never mention a secondary persona. Write as if the user is purely one type.",
  tendencies: "Include one sentence per section acknowledging secondary influence.",
  strong_influence: "Dedicate substantive content to the blend — show how two sides interact.",
};

function fallbackSynthesis(selection: ActionPlanSelection, input?: BuildProfileInput): ActionPlanSynthesis {
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
      dos: plan.dos.map((d) => d.text),
      donts: plan.donts.map((d) => d.text),
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
      selection.coachSourceRows[0]?.text ?? "Start with one small win this week.",
      selection.coachSourceRows[1]?.text ?? "Review weekly trends, not single bad days.",
    ].filter(Boolean),
    sourceIds: [...pi.sourceIds, ...selection.coachSourceRows.map((r) => r.id)],
  };

  const safetyGuidance = selection.safetyGuidance.map((s) => ({ id: s.id, text: s.text }));

  const quickProfile = persona
    ? buildQuickProfile(persona)
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
        heading: "The Pattern You Don't Notice",
        body: `${pi.blindSpotText}\n\n${pi.patternPredictionText}`.trim(),
      },
      successBlueprint: {
        heading: "What Works for You",
        body: `${pi.successConditionText}\n\n${pi.strengthInsightText}`.trim(),
      },
      traitDeviationNarratives: (persona?.traitDeviations ?? []).slice(0, 2).map(
        (d) =>
          `Your ${d.trait.replace(/_/g, " ")} is ${Math.abs(d.deviation).toFixed(1)} points ${d.direction} than typical for your profile — a meaningful difference in how you show up day to day.`,
      ),
      opportunities,
    },
    synthesized: false,
    synthesisError: "GEMINI_API_KEY not configured — showing deterministic copy from your matched recommendations.",
  };
}

function buildPrompt(selection: ActionPlanSelection, ctx: GeminiSynthesisContext): string {
  const { personality, matchedProfile } = ctx;
  const fitTone = FIT_TIER_TONE[personality.fitTier] ?? FIT_TIER_TONE.classic;
  const blendRule = BLEND_RULES[personality.blendStrength] ?? BLEND_RULES.pure;
  const pi = selection.piSeries;

  const payload = {
    fitTier: personality.fitTier,
    blendStrength: personality.blendStrength,
    wellnessQuestionnaire: ctx.wellnessResponses,
    personality: ctx.personality,
    matchedTags: matchedProfile,
    piSeries: {
      blindSpot: pi.blindSpotText,
      patternPrediction: pi.patternPredictionText,
      successCondition: pi.successConditionText,
      strengthInsight: pi.strengthInsightText,
      secondaryBlindSpot: pi.secondaryBlindSpotText,
      secondarySuccessCondition: pi.secondarySuccessConditionText,
    },
    opportunityCards: selection.opportunityCards,
    pillarPlans: selection.pillarPlans,
    launchpad: selection.launchpad,
    coachSourceRows: selection.coachSourceRows.map((r) => ({
      id: r.id,
      text: r.text,
      pillar: r.pillar,
      personaContext: r.personaContext,
    })),
    safetyGuidance: selection.safetyGuidance,
    allowedSourceIds: selection.allSourceIds,
  };

  return `You are Pausibl's wellness report writer (v2.1). Compose pre-personalized content — do NOT invent new medical advice.

SYSTEM PRINCIPLES:
- Warm, insightful, slightly surprising. Second person only.
- Never use OCEAN trait names, animal persona names, MBTI, or motivational fluff.
- Behaviorally specific: "Walk 20 minutes after dinner" not "be more active."
- Fit tier tone: ${fitTone}
- Blend strength: ${blendRule}

You are a synthesizer only. Use ONLY rows in the payload. Preserve source IDs.

Return valid JSON:
{
  "opportunityCards": [{ "id": string, "headline": string (max 10 words), "whyItMatters": string (40-50 words), "sourceIds": string[], "pillar": string, "category": string, "impactLevel": "High"|"Very High" }],
  "pillarPlans": {
    "Nutrition": { "focusArea": string (max 15 words), "focusReason": string, "dos": string[4], "donts": string[2], "sourceIds": string[] },
    "Physical Activity": { ... },
    "Sleep & Recovery": { ... },
    "Mental Wellness": { ... }
  },
  "launchpad": {
    "start_here": [{ "id": string, "action": string, "context": string }],
    "environment_setup": [{ "id": string, "action": string, "context": string }],
    "recovery_rules": [{ "id": string, "action": string, "context": string }]
  },
  "coachNotes": { "keyStrength": string, "keyRisk": string, "coachingNotes": string[3-4], "sourceIds": string[] },
  "safetyGuidance": [{ "id": string, "text": string }],
  "reportSections": {
    "personalityNarrative": string (150-200 words),
    "quickProfile": { "wellnessStyle": string, "energyPattern": string, "motivationDriver": string, "riskFactor": string, "bestEnvironment": string, "personaPercentage": number, "archetype": string },
    "blindSpots": { "heading": string, "body": string },
    "successBlueprint": { "heading": string, "body": string },
    "traitDeviationNarratives": string[],
    "opportunities": same as opportunityCards
  }
}

Launchpad group labels: ${Object.entries(LAUNCHPAD_GROUP_LABELS).map(([k, v]) => `${k}=${v}`).join(", ")}

INPUT:
${JSON.stringify(payload, null, 2)}`;
}

function parseGeminiJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw);
}

export async function synthesizeActionPlanWithGemini(
  selection: ActionPlanSelection,
  ctx: GeminiSynthesisContext,
  input?: BuildProfileInput,
): Promise<ActionPlanSynthesis> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return fallbackSynthesis(selection, input);

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  const prompt = buildPrompt(selection, ctx);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      const fallback = fallbackSynthesis(selection, input);
      return { ...fallback, synthesisError: `Gemini HTTP ${res.status}: ${errText.slice(0, 200)}` };
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const fallback = fallbackSynthesis(selection, input);
      return { ...fallback, synthesisError: "Gemini returned empty content" };
    }

    const parsed = parseGeminiJson(text) as ActionPlanSynthesis;
    return {
      ...parsed,
      opportunityCards: parsed.opportunityCards ?? selection.opportunityCards,
      synthesized: true,
    };
  } catch (e) {
    const fallback = fallbackSynthesis(selection, input);
    const msg = e instanceof Error ? e.message : String(e);
    return { ...fallback, synthesisError: `Gemini error: ${msg}` };
  }
}

export async function buildActionPlan(args: {
  selection: ActionPlanSelection;
  input: BuildProfileInput;
  config: RecommendationConfig;
}): Promise<ActionPlan> {
  const ctx = buildGeminiSynthesisContext(args.input, args.config, args.selection);
  const synthesis = await synthesizeActionPlanWithGemini(args.selection, ctx, args.input);
  return { ...args.selection, synthesis };
}
