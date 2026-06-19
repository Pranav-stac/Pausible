import type { ReportTemplatesDoc } from "@/lib/admin/platform-config-types";
import { DEFAULT_REPORT_TEMPLATES } from "@/lib/admin/platform-config-defaults";
import type {
  ActionPlanSelection,
  OpportunityCard,
  PillarName,
} from "@/lib/recommendations/types";
import type { GeminiSynthesisContext } from "@/lib/recommendations/build-gemini-synthesis-context";
import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import { resolvePrimaryCentroidVector, resolvePrimaryPersonaKey, resolveTraitAverages } from "@/lib/scoring/normalize-persona";
import type { PersonaAnalysis, TraitKey } from "@/lib/scoring/persona-types";
import { personaLabel } from "@/lib/results/persona-display";
import { friendlyTraitLabel } from "@/lib/results/quick-profile";

const BEHAVIOURAL_BOX_TITLES = [
  "Behavioural Tendencies",
  "What Motivates You",
  "What Drains You",
  "Default Under Stress",
  "How You Build Habits",
  "Growth Pattern",
] as const;

const SECONDARY_BOX_TITLES = [
  "Behavioural Tendencies",
  "What Motivates You",
  "Growth Pattern",
] as const;

export type SectionFitBlend = {
  fitTier: string;
  blendStrength: string;
  secondaryPersona: string;
};

export function buildSystemPrompt(templates: ReportTemplatesDoc = DEFAULT_REPORT_TEMPLATES): string {
  const fitTones = Object.entries(templates.geminiFitTierTone)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  const blendRules = Object.entries(templates.geminiBlendRules)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  return `You are Pausibl's wellness report writer. You compose personalized wellness reports from pre-analyzed data. Your role is NOT to personalize generic advice — the data you receive is already personalized. Your role is to compose and structure this pre-personalized content into a coherent, emotionally intelligent narrative.

CORE PRINCIPLES:
1. You are a perceptive, warm wellness coach writing a report for one specific person.
2. Every statement should feel like it was written specifically for THIS user.
3. Use simple English understandable by any adult. No academic jargon. No western wellness buzzwords.
4. Never mention OCEAN, personality traits by technical names, or persona animal names.
5. OCEAN user-facing labels: Openness, Discipline (not Conscientiousness), Social Energy (not Extraversion), Agreeableness, Stress Sensitivity (not Neuroticism).
6. Fit tier names: Classic, Core, Leaning, Exploring. Never use Adaptive or Emerging.
7. Never use motivational fluff ("You've got this!", "Stay positive!", "Believe in yourself!").
8. Be behaviorally specific. "Walk for 20 minutes after dinner" not "Be more active."
9. Frame weaknesses as patterns to notice, not character flaws.
10. Frame strengths as genuine advantages, not consolation prizes.

TONE: Warm, insightful, slightly surprising. The user should feel understood, not lectured.

EMOTIONAL ARC ACROSS SECTIONS:
Page 3: Pride and Recognition
Page 4: Deep Understanding
Page 5: Nuance
Page 6: Revelation
Page 7: Confidence
Page 8: Excitement

FIT TIER ADJUSTMENTS:
${fitTones}

BLEND STRENGTH ADJUSTMENTS:
${blendRules}`;
}

function fitBlendFooter(fb: SectionFitBlend): string {
  const secondary = fb.blendStrength === "pure" ? "N/A (Pure blend)" : fb.secondaryPersona;
  return `- Fit tier: ${fb.fitTier} (Classic/Core/Leaning/Exploring)
- Blend strength: ${fb.blendStrength} (Pure/Tendencies/Strong Influence)
- Secondary persona (if blend != Pure): ${secondary}`;
}

function tagList(items: { label: string }[]): string {
  return items.length ? items.map((i) => i.label).join(", ") : "None specified";
}

function oceanInput(persona: PersonaAnalysis): string {
  const traits = resolveTraitAverages(persona);
  const centroid = resolvePrimaryCentroidVector(persona);
  return `User OCEAN scores: O=${traits.openness}, C=${traits.conscientiousness}, E=${traits.extraversion}, A=${traits.agreeableness}, N=${traits.neuroticism}
Centroid values: O=${centroid.openness}, C=${centroid.conscientiousness}, E=${centroid.extraversion}, A=${centroid.agreeableness}, N=${centroid.neuroticism}`;
}

function deviationLines(persona: PersonaAnalysis, primaryLabel: string): string {
  return (persona.traitDeviations ?? [])
    .slice(0, 2)
    .map((d, i) => {
      const name = friendlyTraitLabel(d.trait as TraitKey);
      const direction = d.direction === "above" ? "higher" : "lower";
      return `- Deviation ${i + 1}: ${name} is ${Math.abs(d.deviation).toFixed(1)} points ${direction} than typical ${primaryLabel}`;
    })
    .join("\n");
}

/** Page 4 — Primary Pattern (Guide §7.4) */
export function buildPrimaryPatternPrompt(
  selection: ActionPlanSelection,
  ctx: GeminiSynthesisContext,
  input: BuildProfileInput,
  fb: SectionFitBlend,
): string {
  const persona = input.scores?.persona;
  if (!persona) return "";

  const pi = selection.piSeries;
  const goals = tagList(ctx.matchedProfile.goals);
  const barriers = tagList(ctx.matchedProfile.barriers);
  const deviations = deviationLines(persona, ctx.personality.primaryPersona);

  return `PROMPT: PRIMARY_PATTERN

INPUT:
- primary_persona: ${ctx.personality.primaryPersona}
- success_condition_text: "${pi.successConditionText}"
- strength_insight_text: "${pi.strengthInsightText}"
- ${oceanInput(persona)}
- goals: ${goals}
- barriers: ${barriers}
- fit_tier: ${fb.fitTier}

TASK:
Generate content for the user's primary wellness personality.

SECTION 1: PERSONA NARRATIVE (150-200 words)
Write how this personality pattern shows up in wellness behaviour. Use success_condition_text and strength_insight_text as factual basis. Connect to goals and barriers where supported. Do not add advice not in the input.

SECTION 2: SIX BEHAVIOURAL BOXES
For each category below, write 2-3 sentences from success_condition_text, strength_insight_text, and OCEAN scores only:
${BEHAVIOURAL_BOX_TITLES.map((t, i) => `Box ${i + 1}: ${t}`).join("\n")}

SECTION 3: TRAIT DEVIATIONS (0, 1, or 2 cards)
${deviations || "No deviations exceed threshold — return empty array."}
Use user-facing trait names only. Maximum 2 cards.

RULES:
1. Do not mention persona animal names.
2. Write in second person. Simple English.
3. Every claim must trace to input data.
4. Tone: warm, insightful. Emotional arc: Deep Understanding.

OUTPUT FORMAT (strict JSON):
{
  "personaNarrative": "string",
  "behaviouralBoxes": [{ "title": "string", "content": "string" } x 6],
  "traitDeviations": [{ "trait": "string", "direction": "higher|lower", "content": "string" } x 0-2]
}

${fitBlendFooter(fb)}`;
}

/** Page 5 — Secondary Pattern (Guide §8.3) */
export function buildSecondaryPatternPrompt(
  selection: ActionPlanSelection,
  ctx: GeminiSynthesisContext,
  fb: SectionFitBlend,
): string {
  if (fb.blendStrength === "pure") return "";

  const pi = selection.piSeries;
  const secondarySuccess = pi.secondarySuccessConditionText?.trim() || "";
  const secondaryStrength = pi.secondaryStrengthInsightText?.trim() || "";

  const boxCount =
    fb.blendStrength === "tendencies" ? 3 : fb.blendStrength === "strong_influence" ? 6 : 0;
  const narrativeWords =
    fb.blendStrength === "tendencies" ? "80-100" : fb.blendStrength === "strong_influence" ? "100-150" : "2 sentences";
  const blendWords =
    fb.blendStrength === "tendencies" ? "60-80" : fb.blendStrength === "strong_influence" ? "100-120" : "null";

  return `PROMPT: SECONDARY_PATTERN

INPUT:
- secondary_persona: ${ctx.personality.secondaryPersona}
- primary_persona: ${ctx.personality.primaryPersona}
- blend_strength: ${fb.blendStrength}
- success_condition_text: "${secondarySuccess}"
- strength_insight_text: "${secondaryStrength}"
- goals: ${tagList(ctx.matchedProfile.goals)}
- barriers: ${tagList(ctx.matchedProfile.barriers)}
- fit_tier: ${fb.fitTier}

APPLY BLEND STRENGTH RULES:
- Tendencies: ${narrativeWords} word secondary narrative, 3 boxes (${SECONDARY_BOX_TITLES.join(", ")}), ${blendWords} word blend narrative.
- Strong Influence: ${narrativeWords} word secondary narrative, all 6 behavioural boxes, ${blendWords} word blend narrative with concrete examples.

RULES:
1. Do not mention persona animal names.
2. Write in second person.
3. Every claim must trace to input data.
4. Do not repeat or contradict primary pattern content.

OUTPUT FORMAT (strict JSON):
{
  "secondaryNarrative": "string",
  "behaviouralBoxes": [{ "title": "string", "content": "string" } x ${boxCount}],
  "blendNarrative": "string or null"
}

${fitBlendFooter(fb)}`;
}

/** Page 6 — What You Don't See (Guide §9.3) */
export function buildBlindSpotsPrompt(
  selection: ActionPlanSelection,
  ctx: GeminiSynthesisContext,
  fb: SectionFitBlend,
): string {
  const pi = selection.piSeries;
  const goals = tagList(ctx.matchedProfile.goals);
  const barriers = tagList(ctx.matchedProfile.barriers);

  return `PROMPT: WHAT_YOU_DONT_SEE

INPUT:
- primary_persona: ${ctx.personality.primaryPersona}
- blind_spot_text: "${pi.blindSpotText}"
- pattern_prediction_text: "${pi.patternPredictionText}"
- goals: ${goals}
- barriers: ${barriers}
- fit_tier: ${fb.fitTier}

TASK:
SECTION 1: THE PATTERN YOU DO NOT NOTICE (80-100 words)
Transform blind_spot_text into a relatable scenario. Never use: blind spot, weakness, flaw, problem.

SECTION 2: WHAT THIS MEANS FOR YOUR GOALS (60-80 words)
Connect the pattern to goals using pattern_prediction_text. End with one forward-looking sentence.

RULES:
1. Never use: blind spot, weakness, flaw, deficiency, problem, limitation.
2. Write in second person.
3. Tone: observational, revelatory.

OUTPUT FORMAT (strict JSON):
{ "patternBody": "string", "goalsBody": "string" }

${fitBlendFooter(fb)}`;
}

/** Page 7 — Key Actions per pillar (Guide §10.4) */
export function buildPillarPrompt(
  pillar: PillarName,
  plan: ActionPlanSelection["pillarPlans"][PillarName],
  ctx: GeminiSynthesisContext,
  fb: SectionFitBlend,
): string {
  const focusText = plan.focusReason || plan.focusArea;
  const doLines = plan.dos.map((d, i) => `- do_rec ${i + 1}: "${d.text}" [category: ${d.category.replace(/_/g, " ")}]`);
  const dontLines = plan.donts.map((d, i) => `- dont_rec ${i + 1}: "${d.text}"`);

  return `PROMPT: PILLAR_ACTIONS

INPUT:
- pillar: ${pillar}
- primary_persona: ${ctx.personality.primaryPersona}
- mindset_shift: "${focusText}"
${doLines.join("\n")}
${dontLines.join("\n")}
- fit_tier: ${fb.fitTier}
- blend_strength: ${fb.blendStrength}

TASK:
Format pre-selected recommendations. You are a composer, not a creator.

MINDSET SHIFT (max 15 words): single reframe from mindset_shift input.

DO (3 items): action max 12 words (imperative), why max 20 words.

DO NOT (2 items): behaviour max 12 words, why max 20 words.

OUTPUT FORMAT (strict JSON):
{
  "pillar": "${pillar}",
  "mindsetShift": "string",
  "doItems": [{ "action": "string", "why": "string" } x 3],
  "dontItems": [{ "behaviour": "string", "why": "string" } x 2]
}

${fitBlendFooter(fb)}`;
}

/** Page 8 — High-Impact Priorities (Guide §11.2) */
export function buildHighImpactPrioritiesPrompt(
  cards: OpportunityCard[],
  ctx: GeminiSynthesisContext,
  fb: SectionFitBlend,
): string {
  const goals = tagList(ctx.matchedProfile.goals);
  const barriers = tagList(ctx.matchedProfile.barriers);
  const cardLines = cards.map(
    (c) =>
      `- rank ${c.rank}: pillar=${c.pillar}, cluster_score=${c.clusterScore.toFixed(1)}, rec_text="${c.personaContextText}", category=${c.category.replace(/_/g, " ")}`,
  );

  return `PROMPT: HIGH_IMPACT_PRIORITIES

INPUT:
- primary_persona: ${ctx.personality.primaryPersona}
- priorities:
${cardLines.join("\n")}
- goals: ${goals}
- barriers: ${barriers}
- fit_tier: ${fb.fitTier}

TASK:
Generate ${cards.length} priority cards ranked by cluster_score.

PER CARD:
- pillar, rank, headline (max 10 words), whyItMatters (40-50 words), startThisWeek (1 specific sentence from rec_text).

RULES:
1. Do not invent actions not in input.
2. Each card from a different pillar.
3. Write in second person.

OUTPUT FORMAT (strict JSON):
{
  "priorityCards": [{
    "pillar": "string",
    "rank": number,
    "headline": "string",
    "whyItMatters": "string",
    "startThisWeek": "string"
  }]
}

${fitBlendFooter(fb)}`;
}

export function resolveFitBlend(ctx: GeminiSynthesisContext, templates: ReportTemplatesDoc): SectionFitBlend & { fitTone: string; blendRule: string } {
  const { personality } = ctx;
  return {
    fitTier: personality.fitTier,
    blendStrength: personality.blendStrength,
    secondaryPersona: personality.secondaryPersona,
    fitTone: templates.geminiFitTierTone[personality.fitTier] ?? "",
    blendRule: templates.geminiBlendRules[personality.blendStrength] ?? "",
  };
}

// Legacy aliases for admin tooling during migration
export const buildPersonalityPrompt = buildPrimaryPatternPrompt;
export const buildSuccessBlueprintPrompt = buildPrimaryPatternPrompt;
export const buildDeviationPrompt = buildPrimaryPatternPrompt;
export const buildOpportunitiesPrompt = buildHighImpactPrioritiesPrompt;
