import { containsBlocklistTerm, scrubBlocklistTerms } from "@/lib/recommendations/content-blocklist";
import { applyLifestyleFraming } from "@/lib/recommendations/lifestyle-framing";
import {
  applySafetyDisclaimersToPillarPlan,
  PHYSICAL_DISCLAIMER_DEFAULT,
  PHYSICAL_DISCLAIMER_INJURY,
  PHYSICAL_DISCLAIMER_PREGNANCY,
} from "@/lib/recommendations/safety-disclaimers";
import { buildProfileSafetyContext } from "@/lib/recommendations/profile-safety-context";
import type {
  ActionPlanSynthesis,
  OpportunityCard,
  PillarName,
  PrimaryPatternSection,
  PillarSynthesisDo,
  PillarSynthesisDont,
  UserProfile,
} from "@/lib/recommendations/types";
import { PDA_REPORT_PILLAR_ORDER } from "@/lib/recommendations/scoring-constants";

const PILLARS: PillarName[] = [...PDA_REPORT_PILLAR_ORDER];

const PREF_WORDS =
  /\b(walk|run|jog|strength|weight|cardio|hiit|yoga|pilates|stretch|sport|dance|swim|pool|cycle|bike|home)\b/i;

const MEAL_PREP_WORDS = /\b(cook|meal prep|kitchen|grocery|recipe)\b/i;
const FAT_LOSS_WORDS = /\b(deficit|calorie|weight loss|lean out|fat loss)\b/i;
const WORK_WORDS = /\b(work|office|meeting|commute|workday)\b/i;
const STRENGTH_ASSERT =
  /\b(disciplined|consistency comes naturally|gritty|naturally consistent|always follow through)\b/i;

const VALID_DISCLAIMERS = [
  PHYSICAL_DISCLAIMER_DEFAULT,
  PHYSICAL_DISCLAIMER_PREGNANCY,
  PHYSICAL_DISCLAIMER_INJURY,
  "Consult your doctor before starting or changing any exercise routine.",
  "check with your doctor",
  "ob/gyn",
  "physiotherapist",
];

export type QaCheckResult = {
  failures: string[];
  warnings: string[];
};

function scrubForbiddenNutritionCopy(text: string): string {
  return text
    .replace(/\b(meal prep|cooking|kitchen|grocery|recipe)\b/gi, "meal choice")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function scrubCaffeineMentions(text: string): string {
  return text.replace(/\b[^.!?]*\bcaffeine\b[^.!?]*[.!?]?/gi, "").replace(/\s{2,}/g, " ").trim();
}

function scrubFatLossCopy(text: string): string {
  return text
    .replace(/\b(deficit|calorie|calories|weight loss|lean out|fat loss|body composition)\b/gi, "steady habits")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function appendPersonaBarrierAck(narrative: string): string {
  const ack =
    "You've flagged consistency as a challenge, so this plan is built to grow that quality gradually. ";
  if (narrative.toLowerCase().includes("challenge")) return narrative;
  return `${ack}${narrative}`;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function prefLabel(tag: string): string {
  return tag.replace(/^activity_pref_/, "").replace(/_/g, " ");
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(" ");
}

function padPersonaNarrative(narrative: string, boxes: { content: string }[]): string {
  let out = narrative.trim();
  if (wordCount(out) >= 150) return out;

  const extras = boxes.map((b) => b.content.trim()).filter(Boolean);
  for (const extra of extras) {
    if (wordCount(out) >= 150) break;
    out = `${out} ${extra}`.replace(/\s{2,}/g, " ").trim();
  }

  if (wordCount(out) < 150) {
    out = `${out} You respond best when guidance respects your natural rhythm and builds in small, repeatable steps.`.trim();
  }

  return out;
}

function ensureActivityPreferenceDos(
  dos: PillarSynthesisDo[],
  prefs: string[],
): PillarSynthesisDo[] {
  if (!prefs.length) return dos;

  const next = dos.map((d) => ({ ...d }));
  let hits = next.filter((d) => prefMatches(d.action)).length;

  for (let i = 0; i < next.length && hits < 2; i++) {
    if (prefMatches(next[i].action)) continue;
    const pref = prefLabel(prefs[hits % prefs.length]);
    next[i] = {
      ...next[i],
      action: truncateWords(`Include a ${pref} session: ${next[i].action}`, 12),
    };
    hits++;
  }

  return next;
}

function finalizeCopy(text: string, profile: UserProfile): string {
  return applyLifestyleFraming(scrubBlocklistTerms(text), profile);
}

function applyQaAutoFixes(
  profile: UserProfile,
  data: {
    pillarPlans: ActionPlanSynthesis["pillarPlans"];
    primaryPattern: PrimaryPatternSection;
    opportunityCards: OpportunityCard[];
  },
): void {
  const safety = buildProfileSafetyContext(profile);

  if (safety.mealsByOthers) {
    const nutrition = data.pillarPlans.Nutrition;
    data.pillarPlans.Nutrition = {
      ...nutrition,
      focusArea: scrubForbiddenNutritionCopy(nutrition.focusArea),
      focusReason: scrubForbiddenNutritionCopy(nutrition.focusReason),
      dos: nutrition.dos.map((d) => ({
        action: scrubForbiddenNutritionCopy(d.action),
        why: scrubForbiddenNutritionCopy(d.why),
      })),
      donts: nutrition.donts.map((d) => ({
        behavior: scrubForbiddenNutritionCopy(d.behavior),
        why: scrubForbiddenNutritionCopy(d.why),
      })),
    };
  }

  if (safety.caffeineNone) {
    for (const pillar of PILLARS) {
      const plan = data.pillarPlans[pillar];
      data.pillarPlans[pillar] = {
        ...plan,
        focusArea: scrubCaffeineMentions(plan.focusArea),
        focusReason: scrubCaffeineMentions(plan.focusReason),
        dos: plan.dos.map((d) => ({
          action: scrubCaffeineMentions(d.action),
          why: scrubCaffeineMentions(d.why),
        })),
        donts: plan.donts.map((d) => ({
          behavior: scrubCaffeineMentions(d.behavior),
          why: scrubCaffeineMentions(d.why),
        })),
      };
    }
  }

  if (!safety.fatLossGoal) {
    data.primaryPattern = {
      ...data.primaryPattern,
      personaNarrative: scrubFatLossCopy(data.primaryPattern.personaNarrative),
      behaviouralBoxes: data.primaryPattern.behaviouralBoxes.map((b) => ({
        ...b,
        content: scrubFatLossCopy(b.content),
      })),
    };
    for (const pillar of PILLARS) {
      const plan = data.pillarPlans[pillar];
      data.pillarPlans[pillar] = {
        ...plan,
        focusArea: scrubFatLossCopy(plan.focusArea),
        focusReason: scrubFatLossCopy(plan.focusReason),
        dos: plan.dos.map((d) => ({
          action: scrubFatLossCopy(d.action),
          why: scrubFatLossCopy(d.why),
        })),
      };
    }
  }

  if (safety.activityPrefs.length > 0) {
    const physical = data.pillarPlans["Physical Activity"];
    data.pillarPlans["Physical Activity"] = {
      ...physical,
      dos: ensureActivityPreferenceDos(physical.dos, safety.activityPrefs),
    };
  }

  data.primaryPattern = {
    ...data.primaryPattern,
    personaNarrative: finalizeCopy(
      padPersonaNarrative(
        appendPersonaBarrierAck(data.primaryPattern.personaNarrative),
        data.primaryPattern.behaviouralBoxes,
      ),
      profile,
    ),
    behaviouralBoxes: data.primaryPattern.behaviouralBoxes.map((b) => ({
      ...b,
      content: finalizeCopy(b.content, profile),
    })),
  };

  for (const pillar of PILLARS) {
    const plan = data.pillarPlans[pillar];
    data.pillarPlans[pillar] = {
      ...plan,
      focusArea: finalizeCopy(plan.focusArea, profile),
      focusReason: finalizeCopy(plan.focusReason, profile),
      dos: plan.dos.map((d) => ({
        action: finalizeCopy(d.action, profile),
        why: finalizeCopy(d.why, profile),
      })),
      donts: plan.donts.map((d) => ({
        behavior: finalizeCopy(d.behavior, profile),
        why: finalizeCopy(d.why, profile),
      })),
    };
  }

  data.opportunityCards = data.opportunityCards.map((c) => ({
    ...c,
    headline: c.headline ? finalizeCopy(c.headline, profile) : c.headline,
    whyItMatters: c.whyItMatters ? finalizeCopy(c.whyItMatters, profile) : c.whyItMatters,
    startThisWeek: c.startThisWeek
      ? finalizeCopy(
          !/^(set|text|tonight|today|this week)/i.test(c.startThisWeek.trim())
            ? `Tonight, ${c.startThisWeek.charAt(0).toLowerCase()}${c.startThisWeek.slice(1)}`
            : c.startThisWeek,
          profile,
        )
      : c.startThisWeek,
  }));
}
function collectPillarText(
  plans: ActionPlanSynthesis["pillarPlans"],
  pillar: PillarName,
): string {
  const p = plans[pillar];
  return [p.focusArea, p.focusReason, ...p.dos.map((d) => `${d.action} ${d.why}`)].join(" ");
}

function prefMatches(text: string): boolean {
  return PREF_WORDS.test(text);
}

/** PDA v1.2 §39 — deterministic QA checks (post-generation). */
export function runQaSynthesisChecks(
  profile: UserProfile,
  data: {
    pillarPlans: ActionPlanSynthesis["pillarPlans"];
    primaryPattern: PrimaryPatternSection;
    opportunityCards: OpportunityCard[];
  },
): QaCheckResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  const safety = buildProfileSafetyContext(profile);
  const physical = data.pillarPlans["Physical Activity"];
  const physicalText = collectPillarText(data.pillarPlans, "Physical Activity");
  const nutritionText = collectPillarText(data.pillarPlans, "Nutrition");
  const allText = [
    data.primaryPattern.personaNarrative,
    ...data.primaryPattern.behaviouralBoxes.map((b) => b.content),
    physicalText,
    nutritionText,
    ...data.opportunityCards.map((c) => `${c.headline} ${c.whyItMatters} ${c.startThisWeek}`),
  ].join(" ");

  if (safety.needsPhysicalDisclaimer) {
    const firstLine = physical.dos[0]?.action ?? physical.focusReason;
    const ok = VALID_DISCLAIMERS.some((d) => firstLine.toLowerCase().includes(d.toLowerCase().slice(0, 20)));
    if (!ok) failures.push("qa_disclaimer: Physical Activity missing safety disclaimer");
  }

  if (safety.activityPrefs.length > 0) {
    const prefHits = physical.dos.filter((d) => prefMatches(d.action)).length;
    if (prefHits < 2) {
      warnings.push(`qa_activity_pref: only ${prefHits}/2 Physical Do items reflect preferences`);
    }
  }

  if (safety.mealsByOthers && MEAL_PREP_WORDS.test(nutritionText)) {
    failures.push("qa_meals_by_others: cooking/meal-prep language for meals-by-others user");
  }

  if (safety.isNonWorker && WORK_WORDS.test(allText)) {
    warnings.push("qa_work_language: workplace terms for non-worker profile");
  }

  if (!safety.fatLossGoal && FAT_LOSS_WORDS.test(allText)) {
    failures.push("qa_fat_loss: deficit language without fat-loss goal");
  }

  if (safety.caffeineNone && /\bcaffeine\b/i.test(allText)) {
    failures.push("qa_caffeine: caffeine mention for caffeine_none user");
  }

  if (safety.fitActive) {
    const walkingPrimary = physical.dos.some(
      (d) => /\bwalk(ing)?\b/i.test(d.action) && !/recovery/i.test(d.action),
    );
    if (walkingPrimary) warnings.push("qa_walking: walking-primary for fit/active user");
  }

  for (const card of data.opportunityCards) {
    const step = card.startThisWeek?.trim() ?? "";
    if (!step || step.length < 12) {
      warnings.push(`qa_first_step: priority ${card.rank} first step too vague`);
    }
  }

  if (
    (safety.hasConsistencyBarrier || safety.hasStartingBarrier) &&
    STRENGTH_ASSERT.test(data.primaryPattern.personaNarrative) &&
    !/\b(challenge|but you|however|flagged|identified)\b/i.test(data.primaryPattern.personaNarrative)
  ) {
    warnings.push("qa_persona_barrier: strength claim without acknowledging barrier");
  }

  const leak = containsBlocklistTerm(allText);
  if (leak) failures.push(`qa_leak: forbidden term "${leak}"`);

  if (/\b(SLP|NUT|FIT|MW|PI)\d{3}\b/.test(allText)) {
    failures.push("qa_leak: rec ID in user-facing text");
  }

  return { failures, warnings };
}

function mapDos(dos: PillarSynthesisDo[], profile: UserProfile): PillarSynthesisDo[] {
  return dos.map((d) => ({
    action: applyLifestyleFraming(scrubBlocklistTerms(d.action), profile),
    why: applyLifestyleFraming(scrubBlocklistTerms(d.why), profile),
  }));
}

function mapDonts(donts: PillarSynthesisDont[], profile: UserProfile): PillarSynthesisDont[] {
  return donts.map((d) => ({
    behavior: applyLifestyleFraming(scrubBlocklistTerms(d.behavior), profile),
    why: applyLifestyleFraming(scrubBlocklistTerms(d.why), profile),
  }));
}

/** Deterministic fixes for §39 checks before post-gate validation. */
export function applyPdaV12SynthesisPostProcess(
  profile: UserProfile,
  data: {
    pillarPlans: ActionPlanSynthesis["pillarPlans"];
    primaryPattern: PrimaryPatternSection;
    opportunityCards: OpportunityCard[];
    blindSpots: { patternBody: string; goalsBody: string };
  },
): typeof data & { qa: QaCheckResult } {
  const pillarPlans = { ...data.pillarPlans };

  for (const pillar of PILLARS) {
    const base = pillarPlans[pillar];
    const framed = {
      ...base,
      focusArea: applyLifestyleFraming(scrubBlocklistTerms(base.focusArea), profile),
      focusReason: applyLifestyleFraming(scrubBlocklistTerms(base.focusReason), profile),
      dos: mapDos(base.dos, profile),
      donts: mapDonts(base.donts, profile),
    };
    pillarPlans[pillar] = applySafetyDisclaimersToPillarPlan(pillar, framed, profile);
  }

  const primaryPattern: PrimaryPatternSection = {
    ...data.primaryPattern,
    personaNarrative: applyLifestyleFraming(
      scrubBlocklistTerms(data.primaryPattern.personaNarrative),
      profile,
    ),
    behaviouralBoxes: data.primaryPattern.behaviouralBoxes.map((b) => ({
      ...b,
      content: applyLifestyleFraming(scrubBlocklistTerms(b.content), profile),
    })),
  };

  const opportunityCards = data.opportunityCards.map((c) => ({
    ...c,
    headline: c.headline ? applyLifestyleFraming(scrubBlocklistTerms(c.headline), profile) : c.headline,
    whyItMatters: c.whyItMatters
      ? applyLifestyleFraming(scrubBlocklistTerms(c.whyItMatters), profile)
      : c.whyItMatters,
    startThisWeek: c.startThisWeek
      ? applyLifestyleFraming(scrubBlocklistTerms(c.startThisWeek), profile)
      : c.startThisWeek,
  }));

  const blindSpots = {
    patternBody: applyLifestyleFraming(scrubBlocklistTerms(data.blindSpots.patternBody), profile),
    goalsBody: applyLifestyleFraming(scrubBlocklistTerms(data.blindSpots.goalsBody), profile),
  };

  const processed = {
    ...data,
    pillarPlans,
    primaryPattern,
    opportunityCards,
    blindSpots,
  };

  applyQaAutoFixes(profile, processed);

  const qa = runQaSynthesisChecks(profile, processed);
  return { ...processed, qa };
}
