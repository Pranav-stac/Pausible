import type { ReportTemplatesDoc } from "@/lib/admin/platform-config-types";
import { DEFAULT_REPORT_TEMPLATES } from "@/lib/admin/platform-config-defaults";
import { resolvedText } from "@/lib/recommendations/action-pool";
import type {
  ActionPlanSelection,
  LaunchpadGroup,
  OpportunityCard,
  PillarName,
} from "@/lib/recommendations/types";
import type { GeminiSynthesisContext } from "@/lib/recommendations/build-gemini-synthesis-context";
import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";
import { LAUNCHPAD_GROUP_LABELS } from "@/lib/recommendations/select-action-plan";
import { PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import { resolvePrimaryCentroidVector, resolvePrimaryPersonaKey, resolveTraitAverages } from "@/lib/scoring/normalize-persona";
import type { PersonaAnalysis, TraitKey } from "@/lib/scoring/persona-types";
import { personaLabel } from "@/lib/results/persona-display";
import { friendlyTraitLabel } from "@/lib/results/quick-profile";

const FIT_TIER_TONE: Record<string, string> = {
  classic: "Assertive, confident — \"You naturally...\" / \"You always...\"",
  core: "Confident but softer — \"You tend to...\" / \"Your pattern suggests...\"",
  adaptive: "Exploratory — \"You may find...\" / \"People like you often...\"",
  emerging: "Tentative, invitational — \"Some aspects suggest...\" / \"Consider whether...\"",
};

const BLEND_RULES: Record<string, string> = {
  pure: "Never mention a secondary persona. Write as if the user is purely one type.",
  tendencies: "Include one sentence per section acknowledging secondary influence.",
  strong_influence: "Dedicate substantive content to the blend. Show how two sides interact.",
};

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
5. Never use motivational fluff ("You've got this!", "Stay positive!", "Believe in yourself!").
6. Be behaviorally specific. "Walk for 20 minutes after dinner" not "Be more active."
7. Frame weaknesses as patterns to notice, not character flaws.
8. Frame strengths as genuine advantages, not consolation prizes.

TONE: Warm, insightful, slightly surprising. The user should feel understood, not lectured.

EMOTIONAL ARC ACROSS SECTIONS:
Slide 2: Pride + Recognition ("I see you clearly")
Slide 3: Revelation ("I never thought of it that way")
Slide 4: Hope + Curiosity ("This could actually work for me")
Slide 5: Clarity ("Now I understand where I stand")
Slide 6: Excitement ("These are genuinely useful")
Slides 7-8: Confidence ("I know exactly what to do")
Slide 9: Momentum ("I can start right now")
Slide 10: Trust ("I'm in good hands")

FIT TIER ADJUSTMENTS:
${fitTones}

BLEND STRENGTH ADJUSTMENTS:
${blendRules}`;
}

function fitBlendFooter(fb: SectionFitBlend): string {
  const secondary =
    fb.blendStrength === "pure" ? "N/A (Pure blend)" : fb.secondaryPersona;
  return `- Fit tier: ${fb.fitTier} (Classic/Core/Adaptive/Emerging)
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

function archetypeDescription(persona: PersonaAnalysis): string {
  const key = resolvePrimaryPersonaKey(persona);
  const copy = PERSONA_DISPLAY[key];
  return copy ? `${copy.archetype}. ${copy.summary}` : personaLabel(key);
}

/** Slide 2 — Wellness Personality (Guide §5.4) */
export function buildPersonalityPrompt(
  ctx: GeminiSynthesisContext,
  input: BuildProfileInput,
  fb: SectionFitBlend,
): string {
  const persona = input.scores?.persona;
  if (!persona) return "";

  const primary = ctx.personality.primaryPersona;
  const goals = tagList(ctx.matchedProfile.goals);
  const barriers = tagList(ctx.matchedProfile.barriers);

  return `You are writing the Wellness Personality section of a personalized wellness report.

INPUT DATA:
- Primary persona: ${primary} (${ctx.personality.fitScore}% fit)
- Secondary persona: ${ctx.personality.secondaryPersona}
- Persona title: ${ctx.personality.personaTitle}
- Archetype: ${archetypeDescription(persona)}
- ${oceanInput(persona)}
- User goals: ${goals}
- User barriers: ${barriers}

TASK:
Write a 2-3 paragraph personality narrative (150-200 words) that describes how this person approaches wellness. Do NOT list traits. Write as if you are a perceptive coach who has been observing this person.

RULES:
1. Open with a strength-based observation (emotional arc: Pride)
2. Describe their natural behavioral patterns around health, fitness, and nutrition
3. Mention their likely relationship with consistency, motivation, and environment
4. Reference their specific barriers naturally, not as a clinical list
5. End with a recognition statement that makes the user feel understood
6. Use simple English. No jargon. No academic terms.
7. Write in second person ("You tend to..." not "This persona...")
8. Do NOT mention OCEAN traits by name (no "Your Openness score...")
9. Do NOT mention persona names (no "As a Steady Elephant...")
10. Tone: warm, insightful, slightly surprising

OUTPUT FORMAT:
Return valid JSON only: { "personalityNarrative": string }

${fitBlendFooter(fb)}`;
}

/** Slide 3 — Blind Spots (Guide §6.4) */
export function buildBlindSpotsPrompt(
  selection: ActionPlanSelection,
  ctx: GeminiSynthesisContext,
  fb: SectionFitBlend,
): string {
  const pi = selection.piSeries;
  const goals = tagList(ctx.matchedProfile.goals);
  const barriers = tagList(ctx.matchedProfile.barriers);
  const secondaryBlind =
    pi.secondaryBlindSpotText?.trim() ? pi.secondaryBlindSpotText : "N/A";

  return `You are writing the "What You Don't See" section of a personalized wellness report. This is the Revelation moment — users should feel "I never thought about it that way."

INPUT DATA:
- Primary persona: ${ctx.personality.primaryPersona}
- Blind spot insight (persona context): "${pi.blindSpotText}"
- Pattern prediction (persona context): "${pi.patternPredictionText}"
- Secondary blind spot (if applicable): "${secondaryBlind}"
- User barriers: ${barriers}
- User goals: ${goals}

TASK:
Write two distinct subsections:

SUBSECTION 1 — "The Pattern You Don't Notice" (80-100 words):
Transform the blind spot insight into a narrative that reveals an unconscious pattern. Start with a specific scenario the user would recognize. Use the pattern prediction to show where this leads if unchecked.

SUBSECTION 2 — "What This Means for Your Goals" (60-80 words):
Connect the blind spot directly to the user's stated goals and barriers. Show how this hidden pattern has been undermining their specific goals.

RULES:
1. Never say "blind spot" — show, don't label
2. Use concrete scenarios, not abstract descriptions
3. Tone: revelatory but compassionate, never judgmental
4. Reference specific user goals/barriers naturally
5. Simple English. No clinical language.
6. Write in second person.

OUTPUT FORMAT:
Return valid JSON only: { "patternBody": string, "goalsBody": string }

${fitBlendFooter(fb)}`;
}

/** Slide 4 — Success Blueprint (Guide §7.4) */
export function buildSuccessBlueprintPrompt(
  selection: ActionPlanSelection,
  ctx: GeminiSynthesisContext,
  fb: SectionFitBlend,
): string {
  const pi = selection.piSeries;
  const goals = tagList(ctx.matchedProfile.goals);
  const secondarySuccess =
    pi.secondarySuccessConditionText?.trim() ? pi.secondarySuccessConditionText : "N/A";

  return `You are writing the "Success Blueprint" section. This is the Hope + Curiosity moment — users should feel excited about their natural advantages.

INPUT DATA:
- Primary persona: ${ctx.personality.primaryPersona}
- Success condition (persona context): "${pi.successConditionText}"
- Strength insight (persona context): "${pi.strengthInsightText}"
- Secondary success condition (if applicable): "${secondarySuccess}"
- User goals: ${goals}

TASK:
Write two distinct subsections:

SUBSECTION 1 — "What Works for You" (80-100 words):
Transform the success condition into a concrete picture of what their ideal wellness setup looks like. Be specific about environments, timing, social context, and structure. This should feel like a prescription, not generic advice.

SUBSECTION 2 — "Your Natural Advantage" (60-80 words):
Reframe the strength insight as a genuine competitive advantage. Show how this trait, which they may take for granted, is actually rare and powerful in a wellness context.

RULES:
1. Be specific and concrete — "train in the early morning with a fixed 3-day schedule" not "find what works for you"
2. Connect to user's stated goals
3. Tone: empowering, specific, slightly surprising
4. Simple English. No jargon.
5. Write in second person.

OUTPUT FORMAT:
Return valid JSON only: { "worksBody": string, "advantageBody": string }

${fitBlendFooter(fb)}`;
}

/** Slide 5 — Trait deviation narratives (Guide §8.4) */
export function buildDeviationPrompt(
  persona: PersonaAnalysis,
  ctx: GeminiSynthesisContext,
  fb: SectionFitBlend,
): string {
  const deviations = (persona.traitDeviations ?? []).slice(0, 2);
  if (!deviations.length) return "";

  const lines = deviations.map((d, i) => {
    const name = friendlyTraitLabel(d.trait as TraitKey);
    const direction = d.direction === "above" ? "higher" : "lower";
    return `- Deviation ${i + 1}: ${name} is ${Math.abs(d.deviation).toFixed(1)} points ${direction} than typical ${ctx.personality.primaryPersona}`;
  });

  return `You are writing trait deviation narratives for the "Where You Stand" section. Each deviation card needs a short explanatory paragraph.

INPUT DATA:
- Primary persona: ${ctx.personality.primaryPersona}
${lines.join("\n")}

TASK:
For each deviation, write a 2-sentence explanation (30-40 words) that:
1. First sentence: What this means practically for their wellness behavior
2. Second sentence: How this makes them different from a typical member of their persona

RULES:
1. Never use OCEAN trait names directly — translate to behavioral language
2. Frame deviations as interesting differences, not problems
3. Use "you" language
4. Be specific about behavioral implications

OUTPUT FORMAT:
Return valid JSON only: { "traitDeviationNarratives": string[] } — one entry per deviation, in order.

${fitBlendFooter(fb)}`;
}

/** Slide 6 — High-Impact Opportunities (Guide §9.4) */
export function buildOpportunitiesPrompt(
  cards: OpportunityCard[],
  ctx: GeminiSynthesisContext,
  fb: SectionFitBlend,
): string {
  const goals = tagList(ctx.matchedProfile.goals);
  const barriers = tagList(ctx.matchedProfile.barriers);

  const cardLines = cards.map((c, i) => {
    return `- Opportunity ${i + 1}: Pillar=${c.pillar}, Score=${c.score}, Persona context text="${c.personaContextText}", Category=${c.category.replace(/_/g, " ")}`;
  });

  return `You are writing the 3 High-Impact Opportunity cards for a wellness report.

INPUT DATA:
- Primary persona: ${ctx.personality.primaryPersona}
${cardLines.join("\n")}
- User goals: ${goals}
- User barriers: ${barriers}

TASK:
For each opportunity, generate:
1. HEADLINE (max 10 words): A compelling, specific action statement derived from the persona context text. Not generic.
2. WHY IT MATTERS (2-3 sentences, 40-50 words): Connect the recommendation to the user's persona patterns and stated goals.

RULES:
1. Headlines must be specific and actionable
2. "Why It Matters" must reference persona-specific behavioral patterns
3. Do NOT repeat the persona context text verbatim — synthesize it
4. Vary sentence structure across the 3 cards
5. Simple English. No jargon.
6. Write in second person.

OUTPUT FORMAT:
Return valid JSON only:
{
  "cards": [
    { "id": string, "headline": string, "whyItMatters": string }
  ]
}
Use the same opportunity order as INPUT. Include each opportunity id: ${cards.map((c) => c.id).join(", ")}

${fitBlendFooter(fb)}`;
}

/** Slides 7-8 — Action Plan per pillar (Guide §10.4) */
export function buildPillarPrompt(
  pillar: PillarName,
  plan: ActionPlanSelection["pillarPlans"][PillarName],
  ctx: GeminiSynthesisContext,
  fb: SectionFitBlend,
): string {
  const goals = tagList(ctx.matchedProfile.goals);
  const barriers = tagList(ctx.matchedProfile.barriers);

  const focusText = plan.focusReason || plan.focusArea;
  const doLines = plan.dos.map((d, i) => `- Do ${i + 1} (persona context): "${d.text}" [category: ${d.category.replace(/_/g, " ")}]`);
  const dontLines = plan.donts.map((d, i) => `- Don't ${i + 1} (persona context): "${d.text}" [category: ${d.category.replace(/_/g, " ")}]`);

  return `You are writing the Action Plan section for the ${pillar} pillar.

INPUT DATA:
- Primary persona: ${ctx.personality.primaryPersona}
- Focus Area (mindset_shift persona context): "${focusText}"
${doLines.join("\n")}
${dontLines.join("\n")}
- User goals relevant to this pillar: ${goals}
- User barriers relevant to this pillar: ${barriers}

TASK:
Generate content for all 7 items:

1. FOCUS AREA (1 sentence, max 15 words): Distill the mindset_shift persona context into a single powerful reframe.

2. FOR EACH DO (4 items): Generate:
   - action (max 12 words): A clear, specific action derived from the persona context. Start with a verb.
   - why (max 20 words): A persona-specific reason this action matters for THIS user.

3. FOR EACH DON'T (2 items): Generate:
   - behavior (max 12 words): The specific behavior to avoid. Start with a verb.
   - why (max 20 words): Why this behavior is particularly harmful for THIS persona type.

RULES:
1. Do NOT repeat persona context text verbatim — synthesize it
2. Actions must be concrete enough to do tomorrow
3. "why" must reference persona-specific patterns, not generic health reasons
4. No jargon. Simple English.
5. Write in second person.

OUTPUT FORMAT:
Return valid JSON only:
{
  "focusArea": string,
  "focusReason": string,
  "dos": [{ "action": string, "why": string }],
  "donts": [{ "behavior": string, "why": string }]
}

${fitBlendFooter(fb)}`;
}

/** Slide 9 — Wellness Launchpad (Guide §11.3) */
export function buildLaunchpadPrompt(
  selection: ActionPlanSelection,
  ctx: GeminiSynthesisContext,
  fb: SectionFitBlend,
): string {
  const byGroup = (group: LaunchpadGroup) =>
    selection.launchpad.filter((i) => i.group === group);

  const formatItems = (group: LaunchpadGroup) => {
    const items = byGroup(group);
    return items.map((item, i) => `  ${i + 1}. "${item.text}" [pillar: ${item.pillar}, id: ${item.id}]`).join("\n");
  };

  return `You are writing the "Wellness Launchpad" section — the user's immediate action plan for their first week.

INPUT DATA:
- Primary persona: ${ctx.personality.primaryPersona}
- Start Here actions (persona context):
${formatItems("start_here")}
- Environment changes (persona context):
${formatItems("environment_setup")}
- Recovery rules (persona context):
${formatItems("recovery_rules")}

TASK:
For each of the 6 items, generate:
- action (max 15 words): A specific, immediately doable action. Must be completable this week.
- context (max 12 words): One line explaining when or how to do this.

RULES:
1. These must be the easiest possible entry points — zero friction
2. "Start Here" items should be doable TODAY
3. "Environment Setup" items should be one-time changes
4. "Recovery Rules" should be simple if-then rules
5. No jargon. Simple English.

OUTPUT FORMAT:
Return valid JSON only:
{
  "start_here": [{ "id": string, "action": string, "context": string }],
  "environment_setup": [{ "id": string, "action": string, "context": string }],
  "recovery_rules": [{ "id": string, "action": string, "context": string }]
}

Launchpad group labels: ${Object.entries(LAUNCHPAD_GROUP_LABELS).map(([k, v]) => `${k}=${v}`).join(", ")}

${fitBlendFooter(fb)}`;
}

/** Slide 10 — Coaching Guide (Guide §12.4) */
export function buildCoachingPrompt(
  selection: ActionPlanSelection,
  ctx: GeminiSynthesisContext,
  fb: SectionFitBlend,
): string {
  const pi = selection.piSeries;
  const profile = selection.profile;
  const barriers = tagList(ctx.matchedProfile.barriers);

  const topRecs = selection.coachSourceRows.slice(0, 5).map((r, i) => {
    const text = resolvedText(r, profile);
    return `  ${i + 1}. "${text}" [pillar: ${r.pillar}, id: ${r.id}]`;
  });

  const safetyRecs = selection.safetyGuidance.map((r) => {
    const text = resolvedText(r, profile);
    return `"${text}" [id: ${r.id}]`;
  });

  return `You are writing the Coaching Guide — the final page of a wellness report. This should leave the user feeling confident and supported.

INPUT DATA:
- Primary persona: ${ctx.personality.primaryPersona}
- Persona title: ${ctx.personality.personaTitle}
- Strength insight (persona context): "${pi.strengthInsightText}"
- Blind spot (persona context): "${pi.blindSpotText}"
- Top barriers: ${barriers}
- PI series for this persona (all 4 persona context texts):
  - Blind spot: "${pi.blindSpotText}"
  - Pattern prediction: "${pi.patternPredictionText}"
  - Success condition: "${pi.successConditionText}"
  - Strength insight: "${pi.strengthInsightText}"
- Top 5 recommendations by score (persona context texts):
${topRecs.join("\n")}
- Safety guidance recs (if any): ${safetyRecs.length ? safetyRecs.join("; ") : "None"}

TASK:
Generate 4 sections:

1. KEY STRENGTH (2 sentences, 30-40 words): Single biggest wellness advantage from strength insight.

2. KEY RISK (2 sentences, 30-40 words): Single biggest threat to consistency from blind spot. Frame as something to watch for, not a flaw.

3. COACHING NOTES (3-4 items, each 15-25 words): Distill PI series and top recommendations into coaching observations. Format: "[Observation]. [Action or reframe]."

4. SAFETY NOTES (only if safety recs provided): Rewrite each in clear, non-alarming language. One sentence each.

RULES:
1. Tone: confident, warm, coach-like. End on trust.
2. Key Strength and Key Risk should feel like two sides of the same coin
3. Coaching notes should feel like private observations, not textbook advice
4. No jargon. Simple English.
5. Write in second person.

OUTPUT FORMAT:
Return valid JSON only:
{
  "keyStrength": string,
  "keyRisk": string,
  "coachingNotes": string[],
  "safetyGuidance": [{ "id": string, "text": string }]
}
For safetyGuidance, use ids from safety recs when provided; otherwise return [].

${fitBlendFooter(fb)}`;
}

export function resolveFitBlend(ctx: GeminiSynthesisContext, templates: ReportTemplatesDoc): SectionFitBlend & { fitTone: string; blendRule: string } {
  const { personality } = ctx;
  return {
    fitTier: personality.fitTier,
    blendStrength: personality.blendStrength,
    secondaryPersona: personality.secondaryPersona,
    fitTone:
      templates.geminiFitTierTone[personality.fitTier] ??
      FIT_TIER_TONE[personality.fitTier] ??
      FIT_TIER_TONE.classic,
    blendRule:
      templates.geminiBlendRules[personality.blendStrength] ??
      BLEND_RULES[personality.blendStrength] ??
      BLEND_RULES.pure,
  };
}
