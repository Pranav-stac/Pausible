import type { ReportTemplatesDoc } from "@/lib/admin/platform-config-types";
import { DEFAULT_REPORT_TEMPLATES } from "@/lib/admin/platform-config-defaults";
import type {
  ActionPlanSelection,
  OpportunityCard,
  PillarName,
  UserProfile,
} from "@/lib/recommendations/types";
import type { GeminiSynthesisContext } from "@/lib/recommendations/build-gemini-synthesis-context";
import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import { formatPdaUserContextBlock, resolveFirstName } from "@/lib/recommendations/pda-v12-prompt-context";
import {
  PDA_V12_PERSONA_BARRIER_BLOCK,
  PDA_V12_SYSTEM_PROMPT_CORE,
  PDA_V12_SYSTEM_PROMPT_OPENING,
  PDA_V12_SYSTEM_PROMPT_RULES,
} from "@/lib/recommendations/pda-v12-system-prompt";
import { resolvePrimaryCentroidVector, resolveTraitAverages } from "@/lib/scoring/normalize-persona";
import type { PersonaAnalysis, TraitKey } from "@/lib/scoring/persona-types";
import { userFacingTraitLabel } from "@/lib/results/trait-labels";

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
  blendRatio: number;
  blendStrength: string;
  secondaryPersona: string;
};

/** PDA v1.2 §18.1 — canonical system message for every report synthesis call. */
export function buildSystemPrompt(_templates?: ReportTemplatesDoc, userContextBlock?: string): string {
  if (!userContextBlock?.trim()) return PDA_V12_SYSTEM_PROMPT_CORE;
  return `${PDA_V12_SYSTEM_PROMPT_OPENING}

${userContextBlock.trim()}

${PDA_V12_SYSTEM_PROMPT_RULES}`;
}

export function buildSystemPromptForProfile(
  profile: UserProfile,
  input?: BuildProfileInput | null,
  ctx?: GeminiSynthesisContext | null,
  templates?: ReportTemplatesDoc,
): string {
  return buildSystemPrompt(templates, formatPdaUserContextBlock(profile, input, ctx));
}

function oceanInput(persona: PersonaAnalysis): string {
  const traits = resolveTraitAverages(persona);
  const centroid = resolvePrimaryCentroidVector(persona);
  return `ocean_scores: O=${traits.openness}, C=${traits.conscientiousness}, E=${traits.extraversion}, A=${traits.agreeableness}, N=${traits.neuroticism}
centroid_scores: O=${centroid.openness}, C=${centroid.conscientiousness}, E=${centroid.extraversion}, A=${centroid.agreeableness}, N=${centroid.neuroticism}`;
}

function deviationLines(persona: PersonaAnalysis, primaryLabel: string): string {
  return (persona.traitDeviations ?? [])
    .slice(0, 2)
    .map((d) => {
      const name = userFacingTraitLabel(d.trait as TraitKey);
      const direction = d.direction === "above" ? "higher" : "lower";
      return `- Deviation: ${name} is ${Math.abs(d.deviation).toFixed(1)} points ${direction} than typical ${primaryLabel}`;
    })
    .join("\n");
}

function tagList(items: { label: string }[]): string {
  return items.length ? items.map((i) => i.label).join(", ") : "None specified";
}

function personaBarrierBlock(firstName: string, barriers: string): string {
  return PDA_V12_PERSONA_BARRIER_BLOCK.replace(/\{first_name\}/g, firstName).replace(
    /\{barriers\[\]\}/g,
    barriers,
  );
}

/** PDA v1.2 §20.4 — PRIMARY_PATTERN */
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
  const firstName = resolveFirstName(input);

  return `PROMPT: PRIMARY_PATTERN

${personaBarrierBlock(firstName, barriers)}

INPUT:
- primary_persona: ${ctx.personality.primaryPersona}
- success_condition_text: "${pi.successConditionText}"
- strength_insight_text: "${pi.strengthInsightText}"
- ${oceanInput(persona)}
- goals: ${goals}
- barriers: ${barriers}
- fit_tier: ${fb.fitTier}

TASK: Produce a 150-200 word Persona Description; six behavioural boxes; and 0-2 trait-deviation cards.

Field constraints:
- Description 150-200 words, second person, grounded in success_condition_text + strength_insight_text.
- Exactly six boxes, titles: ${BEHAVIOURAL_BOX_TITLES.join(" · ")}. Each 2-3 sentences.
- Box sources: Tendencies<- success_condition+OCEAN; Motivates<- strength_insight+goals; Drains<- barriers+low OCEAN; Default Under Stress<- Stress Sensitivity+barriers; Build Habits<- Discipline; Growth<- strength_insight+Openness.
- Do NOT reuse whole sentences from personaNarrative inside any behavioural box (no copy-paste refrain).
- Trait cards only for |deviation|>0.8 (max 2); title '[user-facing trait] - higher/lower than typical' + exactly 2 sentences.
- Forbidden in boxes: technical trait names, animal names.

${deviations || "No deviations exceed threshold - return empty trait_deviations."}

FALLBACK: No qualifying deviation -> empty trait_deviations. A box lacking input -> one sentence from the strongest OCEAN signal; never fabricate a behaviour.

OUTPUT (strict JSON — platform keys):
{
  "personaNarrative": "string(150-200w)",
  "behaviouralBoxes": [{"title":"string","content":"string"} x6],
  "traitDeviations": [{"trait":"string","direction":"higher|lower","content":"string(2 sent)"} x0-2]
}`;
}

/** PDA v1.2 §20.5 — SECONDARY_PATTERN (persona-barrier block from §20.4 applies). */
export function buildSecondaryPatternPrompt(
  selection: ActionPlanSelection,
  ctx: GeminiSynthesisContext,
  input: BuildProfileInput,
  fb: SectionFitBlend,
): string {
  if (fb.blendStrength === "pure") return "";

  const pi = selection.piSeries;
  const secondarySuccess = pi.secondarySuccessConditionText?.trim() || "";
  const secondaryStrength = pi.secondaryStrengthInsightText?.trim() || "";
  const barriers = tagList(ctx.matchedProfile.barriers);
  const firstName = resolveFirstName(input);

  const boxCount =
    fb.blendStrength === "tendencies" ? 3 : fb.blendStrength === "strong_influence" ? 6 : 0;
  const narrativeWords =
    fb.blendStrength === "tendencies" ? "80-100" : fb.blendStrength === "strong_influence" ? "100-150" : "2 sentences";
  const blendWords =
    fb.blendStrength === "tendencies" ? "60-80" : fb.blendStrength === "strong_influence" ? "100-120" : "null";

  return `PROMPT: SECONDARY_PATTERN

${personaBarrierBlock(firstName, barriers)}

INPUT:
- secondary_persona: ${ctx.personality.secondaryPersona}
- primary_persona: ${ctx.personality.primaryPersona}
- blend_strength: ${fb.blendStrength}
- success_condition_text: "${secondarySuccess}"
- strength_insight_text: "${secondaryStrength}"
- goals: ${tagList(ctx.matchedProfile.goals)}
- barriers: ${barriers}
- fit_tier: ${fb.fitTier}

TASK: Apply blend rules - Pure: 2-sentence summary only. Tendencies: ${narrativeWords}w description + 3 boxes (${SECONDARY_BOX_TITLES.join(", ")}) + ${blendWords}w 'How Your Two Patterns Interact'. Strong: ${narrativeWords}w + all 6 boxes + ${blendWords}w interaction with one concrete example.

Field constraints:
- Do not repeat or contradict Page 4.
- Box count exactly 0, 3, or 6 per blend; titles match Page 4.
- Interaction uses only both personas' PI texts.

FALLBACK: Pure -> behaviouralBoxes=[] and blendNarrative=null.

OUTPUT (strict JSON):
{
  "secondaryNarrative": "string",
  "behaviouralBoxes": [{"title":"string","content":"string"} x ${boxCount}],
  "blendNarrative": "string or null"
}`;
}

/** PDA v1.2 §20.6 — WHAT_YOU_DONT_SEE */
export function buildBlindSpotsPrompt(
  selection: ActionPlanSelection,
  ctx: GeminiSynthesisContext,
  fb: SectionFitBlend,
): string {
  const pi = selection.piSeries;

  return `PROMPT: WHAT_YOU_DONT_SEE

INPUT:
- primary_persona: ${ctx.personality.primaryPersona}
- blind_spot_text: "${pi.blindSpotText}"
- pattern_prediction_text: "${pi.patternPredictionText}"
- goals: ${tagList(ctx.matchedProfile.goals)}
- barriers: ${tagList(ctx.matchedProfile.barriers)}
- fit_tier: ${fb.fitTier}

TASK:
- 'The Pattern You Don't Notice' (80-100w self-recognition scenario from blind_spot_text)
- 'What This Means For Your Goals' (60-80w, connect to a named goal via pattern_prediction_text, end with a forward look)

Field constraints:
- Never use: blind spot, weakness, flaw, deficiency, problem, limitation. Observational, not critical.
- Name the specific goal and mechanism; add no prediction beyond pattern_prediction_text.

FALLBACK: Empty pattern_prediction_text -> write section 2 from the strongest goal + blind_spot_text; never invent a prediction.

OUTPUT (strict JSON):
{
  "pattern_you_do_not_notice": "string(80-100w)",
  "what_this_means_for_your_goals": "string(60-80w)"
}`;
}

/** PDA v1.2 §20.7 — PILLAR_ACTIONS (×4) */
export function buildPillarPrompt(
  pillar: PillarName,
  plan: ActionPlanSelection["pillarPlans"][PillarName],
  profile: UserProfile,
  ctx: GeminiSynthesisContext,
  input: BuildProfileInput,
  _fb: SectionFitBlend,
): string {
  const focusText = plan.focusReason || plan.focusArea;
  const doLines = plan.dos.map((d) => `  {text: "${d.text}", category: ${d.category}}`);
  const dontLines = plan.donts.map((d) => `  {text: "${d.text}", category: ${d.category}}`);

  return `PROMPT: PILLAR_ACTIONS

Compose the Key Actions block for pillar: ${pillar}.

INPUT (already selected for this user):
  mindset_shift: "${focusText}"
  do_recs (up to 3): [
${doLines.join(",\n")}
  ]
  dont_recs (up to 2): [
${dontLines.join(",\n")}
  ]

${formatPdaUserContextBlock(profile, input, ctx)}

Produce: a headline (the mindset reframe, <=15 words); why_this_matters (ONE different sentence, <=25 words,
tying the mindset to this user's goal/barrier — never copy the headline); 3 DO items (action = imperative
<=12 words, why <=20 words); 2 DON'T items (behaviour to avoid <=12 words, why <=20 words). Compose ONLY from
the supplied texts. Apply the system-prompt rules, PLUS the pillar rules below.

PHYSICAL ACTIVITY:
 - At least 2 of the 3 DO items must reflect the user's activity_prefs. If 'dance' is a pref, phrase a
   DO around a dance session; 'swimming' -> pool; 'running' -> an easy jog; etc. Use the supplied
   activity-matched rec; if none was supplied, choose the supplied DO closest to the pref and frame it
   toward that activity (framing only). Fall back to walking ONLY if activity_prefs is empty, OR
   fitness_level = sedentary AND activity_level = sedentary.
 - Do NOT output walking as a primary DO if fitness_level is consistent/advanced AND activity_level is
   moderate/very_active (walking may appear only as active recovery).
NUTRITION:
 - If meal_control = others_prepare: give NO cooking / meal-prep / kitchen-organisation / grocery
   advice. Use request/selection framing (fill the plate protein-first from what's served; ask the
   preparer for one small change; keep your own healthy snacks) and acknowledge the constraint once
   ('Since you don't decide the menu...').
 - If 'fat_loss' is NOT in goals: use no caloric-deficit, weight-management, or body-composition
   language. (muscle -> protein adequacy; energy -> steady blood sugar; overall health -> balanced eating.)
SLEEP & RECOVERY:
 - If caffeine = none: do not mention caffeine at all.
ALL PILLARS:
 - Apply the lifestyle-language rule (system rule 4) and persona-barrier override (system rule 5).
SAFETY (if restriction_flags non-empty OR age >= 65) - PHYSICAL ACTIVITY only:
 - Make the FIRST line of this pillar block exactly the clearance string from the Disclaimer Logic
   (see 38.8), and add a scale-back option ('if this feels too much, do [gentler version]') to every
   DO that involves effort.

FALLBACK: if fewer than 3 do / 2 dont were supplied, output exactly what is provided; never invent to pad.

OUTPUT (strict JSON):
{
  "pillar": "${pillar}",
  "headline": "string(<=15w)",
  "why_this_matters": "string(<=25w, distinct from headline)",
  "do_items": [{"action":"string(<=12w)","why":"string(<=20w)"} x3],
  "dont_items": [{"behaviour":"string(<=12w)","why":"string(<=20w)"} x2]
}`;
}

/** PDA v1.2 §20.8 — HIGH_IMPACT_PRIORITIES */
export function buildHighImpactPrioritiesPrompt(
  cards: OpportunityCard[],
  profile: UserProfile,
  ctx: GeminiSynthesisContext,
  input: BuildProfileInput,
  _fb: SectionFitBlend,
): string {
  const cardLines = cards.map(
    (c) =>
      `  {rank: ${c.rank}, pillar: ${c.pillar}, rec_text: "${c.personaContextText}", category: ${c.category}}`,
  );

  return `PROMPT: HIGH_IMPACT_PRIORITIES

Generate ${cards.length} priority cards from the supplied, ranked priorities:
  priorities: [
${cardLines.join(",\n")}
  ]

${formatPdaUserContextBlock(profile, input, ctx)}

Per card: label 'PRIORITY {rank} - {PILLAR}'; headline (<=10 words); why_it_matters (40-50 words,
tie to the user's pattern/goal/barrier from the input); first_step (ONE sentence).

FIRST-STEP RULE (mandatory - this is where past reports failed):
 - The first_step MUST be a concrete physical action the user can do TODAY or TONIGHT.
 - It MUST pass the PHOTOGRAPH TEST: you could photograph someone doing it. No principles, no
   restatements of the recommendation, no mindset lines.
 - FORMAT exactly: "[Verb] [specific object] [specific time/context]." Derive it from rec_text; do not invent.
   BAD:  "Connection is your reset button."   /   "A 5-out-of-7 anchor gives you structure."
   GOOD: "Text one friend today and suggest a walk this weekend."  /  "Tonight, set your alarm for the
         same wake time you'll use all week."

Apply lifestyle-language and persona-barrier rules. One card per pillar; order by rank.

FALLBACK: render exactly the number of priorities supplied (min 3, max 4).

OUTPUT (strict JSON):
{
  "priority_cards": [{
    "pillar": "string",
    "rank": number,
    "headline": "string(<=10w)",
    "why_it_matters": "string(40-50w)",
    "first_step": "string(1 sentence, photograph test)"
  }]
}`;
}

export function resolveFitBlend(
  ctx: GeminiSynthesisContext,
  templates: ReportTemplatesDoc = DEFAULT_REPORT_TEMPLATES,
): SectionFitBlend & { fitTone: string; blendRule: string } {
  const { personality } = ctx;
  return {
    fitTier: personality.fitTier,
    blendRatio: personality.blendRatio,
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
