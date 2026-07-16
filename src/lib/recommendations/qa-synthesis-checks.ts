import { containsBlocklistTerm, scrubBlocklistTerms } from "@/lib/recommendations/content-blocklist";
import { isRecommendationSuppressedForProfile } from "@/lib/recommendations/filter";
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
  RecommendationRow,
  UserProfile,
} from "@/lib/recommendations/types";
import { PDA_REPORT_PILLAR_ORDER } from "@/lib/recommendations/scoring-constants";

const PILLARS: PillarName[] = [...PDA_REPORT_PILLAR_ORDER];

const PREF_WORDS =
  /\b(walk(ing)?|run(ning)?|jog(ging)?|strength|weight(s)?|cardio|hiit|yoga|pilates|stretch(ing)?|sport(s)?|dance|swim(ming)?|pool|cycle|cycling|bike|home)\b/i;

const MEAL_PREP_WORDS = /\b(cook|meal prep|kitchen|grocery|recipe)\b/i;
const FAT_LOSS_WORDS = /\b(deficit|calorie|weight loss|lean out|fat loss)\b/i;
const POSTPARTUM_TEXT = /\bpostpartum\b/i;
const WORK_WORDS = /\b(work|office|meeting|commute|workday)\b/i;
const STRENGTH_ASSERT =
  /\b(disciplined|consistency comes naturally|gritty|naturally consistent|always follow through|strong follow-through)\b/i;

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

function scrubPostpartumCopy(text: string): string {
  return text
    .replace(/\bpostpartum,\s*/gi, "")
    .replace(/\bduring recovery\s*—\s*postpartum/gi, "during recovery")
    .replace(/\bpostpartum\b/gi, "recovery")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function scrubFatLossCopy(text: string): string {
  return text
    .replace(/\b(deficit|calorie|calories|weight loss|lean out|fat loss|body composition)\b/gi, "steady habits")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function appendPersonaBarrierAck(narrative: string, profile: UserProfile): string {
  if (!profile.barriers.includes("barrier_lack_of_consistency")) return narrative;

  const ack =
    "You've flagged consistency as a challenge, so this plan is built to grow that quality gradually. ";
  if (narrative.toLowerCase().includes("challenge")) return narrative;
  return `${ack}${narrative}`;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function prefLabel(tag: string): string {
  const raw = tag.replace(/^activity_pref_/, "").replace(/_/g, " ");
  if (raw === "open") return "flexible";
  return raw;
}

const PHANTOM_CONSISTENCY_BARRIER =
  /\b(you(?:'ve| have) (?:said|told us|flagged) consistency(?: is hard| as a challenge)?[^.]*\.?)/gi;

function scrubPhantomConsistencyBarrier(text: string, profile: UserProfile): string {
  if (profile.barriers.includes("barrier_lack_of_consistency")) return text;
  return text
    .replace(
      /\bYour pattern points to strong follow-through,\s*but you(?:'ve| have) (?:said|told us|flagged) consistency[^.]*\.\s*/gi,
      "",
    )
    .replace(PHANTOM_CONSISTENCY_BARRIER, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function padPersonaNarrative(narrative: string, _boxes: { content: string }[]): string {
  let out = narrative.trim();
  if (wordCount(out) >= 150) return out;

  // Never paste behavioural-box prose into the narrative — that creates cross-section duplicates.
  const pads = [
    "Make the plan small enough that it survives busy weeks, not just ideal days.",
    "Keep the next step shorter than the urge to overhaul everything at once.",
    "Visible follow-through beats intensity you cannot repeat.",
  ];
  for (const pad of pads) {
    if (wordCount(out) >= 150) break;
    if (!out.toLowerCase().includes(pad.toLowerCase().slice(0, 28))) {
      out = `${out} ${pad}`.trim();
    }
  }

  return out;
}

function sentenceList(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

function stripDuplicateBoxSentences(
  narrative: string,
  boxes: { title: string; content: string }[],
): { title: string; content: string }[] {
  const taken = new Set(sentenceList(narrative).map((s) => s.toLowerCase()));
  return boxes.map((box) => {
    const kept = sentenceList(box.content).filter((s) => {
      const key = s.toLowerCase();
      if (taken.has(key)) return false;
      taken.add(key);
      return true;
    });
    if (kept.length) return { ...box, content: kept.join(" ") };
    // All sentences were duplicates — keep a short unique restatement rather than repeating.
    return {
      ...box,
      content: `In practice, this shows up as steady, visible follow-through rather than dramatic resets.`,
    };
  });
}

function ensureDistinctFocusReason(
  pillar: PillarName,
  focusArea: string,
  focusReason: string,
): string {
  const a = focusArea.trim().toLowerCase().replace(/[.!?\s]+$/g, "");
  const b = focusReason.trim().toLowerCase().replace(/[.!?\s]+$/g, "");
  if (a && b && a !== b) return focusReason.trim();
  return `This keeps ${pillar.toLowerCase()} simple enough to hold when stress and time both press in.`;
}

function ensureActivityPreferenceDos(
  dos: PillarSynthesisDo[],
  prefs: string[],
): PillarSynthesisDo[] {
  if (!prefs.length) return dos;

  const next = dos.map((d) => ({ ...d }));
  let hits = next.filter((d) => prefMatches(d.action, prefs) || prefMatches(d.example ?? "", prefs)).length;
  const isDisclaimer = (text: string) =>
    /\b(check with your doctor|physiotherapist|ob\/gyn|clearance from your doctor)\b/i.test(text) ||
    text.trim() === "A quick safety check before you begin.";

  // PDA §20.7 — never invent new actions; ground preference via example field only.
  for (let i = 0; i < next.length && hits < 2; i++) {
    const d = next[i]!;
    if (prefMatches(d.action, prefs) || prefMatches(d.example ?? "", prefs)) continue;
    if (isDisclaimer(d.action) || isDisclaimer(d.why)) continue;
    const pref = prefLabel(prefs[hits % prefs.length]!);
    if (!d.example?.trim()) {
      next[i] = { ...d, example: `e.g., a short ${pref} session` };
      hits++;
    }
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
  sourceRows: RecommendationRow[] = [],
): void {
  const safety = buildProfileSafetyContext(profile);
  const suppressed = sourceRows.filter((r) => isRecommendationSuppressedForProfile(r, profile));
  if (suppressed.length) {
    const badIds = new Set(suppressed.map((r) => r.id));
    const echoesSuppressed = (text: string) =>
      suppressed.some((r) => {
        const tip = r.text.trim().slice(0, 48).toLowerCase();
        return tip.length >= 12 && text.toLowerCase().includes(tip);
      });

    for (const pillar of PILLARS) {
      const plan = data.pillarPlans[pillar];
      data.pillarPlans[pillar] = {
        ...plan,
        sourceIds: plan.sourceIds.filter((id) => !badIds.has(id)),
        dos: plan.dos.filter((d) => !echoesSuppressed(`${d.action} ${d.why}`)),
        donts: plan.donts.filter((d) => !echoesSuppressed(`${d.behavior} ${d.why}`)),
      };
    }
    data.opportunityCards = data.opportunityCards.map((c) => ({
      ...c,
      sourceIds: c.sourceIds.filter((id) => !badIds.has(id)),
    }));
  }

  if (safety.mealsByOthers) {
    const nutrition = data.pillarPlans.Nutrition;
    data.pillarPlans.Nutrition = {
      ...nutrition,
      focusArea: scrubForbiddenNutritionCopy(nutrition.focusArea),
      focusReason: scrubForbiddenNutritionCopy(nutrition.focusReason),
      dos: nutrition.dos.map((d) => ({
        action: scrubForbiddenNutritionCopy(d.action),
        why: scrubForbiddenNutritionCopy(d.why),
        example: d.example ? scrubForbiddenNutritionCopy(d.example) : d.example,
      })),
      donts: nutrition.donts.map((d) => ({
        behavior: scrubForbiddenNutritionCopy(d.behavior),
        why: scrubForbiddenNutritionCopy(d.why),
      })),
    };
  }

  if (safety.eatsOutFrequently) {
    const nutrition = data.pillarPlans.Nutrition;
    data.pillarPlans.Nutrition = {
      ...nutrition,
      focusArea: scrubForbiddenNutritionCopy(nutrition.focusArea),
      focusReason: scrubForbiddenNutritionCopy(nutrition.focusReason),
      dos: nutrition.dos.map((d) => ({
        action: scrubForbiddenNutritionCopy(d.action),
        why: scrubForbiddenNutritionCopy(d.why),
        example: d.example ? scrubForbiddenNutritionCopy(d.example) : d.example,
      })),
      donts: nutrition.donts.map((d) => ({
        behavior: scrubForbiddenNutritionCopy(d.behavior),
        why: scrubForbiddenNutritionCopy(d.why),
      })),
    };
  }

  if (!profile.exclusions.includes("exclude_pregnancy_postpartum")) {
    const scrubAll = (text: string) => scrubPostpartumCopy(text);
    const nutrition = data.pillarPlans.Nutrition;
    data.pillarPlans.Nutrition = {
      ...nutrition,
      focusArea: scrubAll(nutrition.focusArea),
      focusReason: scrubAll(nutrition.focusReason),
      dos: nutrition.dos.map((d) => ({
        action: scrubAll(d.action),
        why: scrubAll(d.why),
        example: d.example ? scrubAll(d.example) : d.example,
      })),
      donts: nutrition.donts.map((d) => ({
        behavior: scrubAll(d.behavior),
        why: scrubAll(d.why),
      })),
    };
    data.primaryPattern = {
      ...data.primaryPattern,
      personaNarrative: scrubAll(data.primaryPattern.personaNarrative),
      behaviouralBoxes: data.primaryPattern.behaviouralBoxes.map((b) => ({
        ...b,
        content: scrubAll(b.content),
      })),
    };
    data.opportunityCards = data.opportunityCards.map((c) => ({
      ...c,
      headline: c.headline ? scrubAll(c.headline) : c.headline,
      whyItMatters: c.whyItMatters ? scrubAll(c.whyItMatters) : c.whyItMatters,
      startThisWeek: c.startThisWeek ? scrubAll(c.startThisWeek) : c.startThisWeek,
    }));
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
          example: d.example ? scrubCaffeineMentions(d.example) : d.example,
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
          example: d.example ? scrubFatLossCopy(d.example) : d.example,
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
      scrubPhantomConsistencyBarrier(
        padPersonaNarrative(
          appendPersonaBarrierAck(data.primaryPattern.personaNarrative, profile),
          data.primaryPattern.behaviouralBoxes,
        ),
        profile,
      ),
      profile,
    ),
    behaviouralBoxes: data.primaryPattern.behaviouralBoxes.map((b) => ({
      ...b,
      content: finalizeCopy(scrubPhantomConsistencyBarrier(b.content, profile), profile),
    })),
  };

  data.primaryPattern = {
    ...data.primaryPattern,
    behaviouralBoxes: stripDuplicateBoxSentences(
      data.primaryPattern.personaNarrative,
      data.primaryPattern.behaviouralBoxes,
    ),
  };

  for (const pillar of PILLARS) {
    const plan = data.pillarPlans[pillar];
    data.pillarPlans[pillar] = {
      ...plan,
      focusArea: finalizeCopy(plan.focusArea, profile),
      focusReason: finalizeCopy(
        ensureDistinctFocusReason(pillar, plan.focusArea, plan.focusReason),
        profile,
      ),
      dos: plan.dos.map((d) => ({
        action: finalizeCopy(d.action, profile),
        why: finalizeCopy(d.why, profile),
        example: d.example ? finalizeCopy(d.example, profile) : d.example ?? null,
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

function prefMatches(text: string, prefs: string[] = []): boolean {
  if (PREF_WORDS.test(text)) return true;
  if (prefs.includes("activity_pref_open") && /\b(open|anything|flexible)\b/i.test(text)) {
    return true;
  }
  return false;
}

/** PDA v1.2 §39 — deterministic QA checks (post-generation). */
export function runQaSynthesisChecks(
  profile: UserProfile,
  data: {
    pillarPlans: ActionPlanSynthesis["pillarPlans"];
    primaryPattern: PrimaryPatternSection;
    opportunityCards: OpportunityCard[];
  },
  sourceRows: RecommendationRow[] = [],
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

  // PDA §39 check 2 EXCLUSION — suppressed Master rec must not appear via sourceIds.
  if (sourceRows.length) {
    const rowById = new Map(sourceRows.map((r) => [r.id, r]));
    const presentIds = [
      ...PILLARS.flatMap((p) => data.pillarPlans[p].sourceIds),
      ...data.opportunityCards.flatMap((c) => c.sourceIds),
    ];
    for (const id of new Set(presentIds)) {
      const row = rowById.get(id);
      if (row && isRecommendationSuppressedForProfile(row, profile)) {
        failures.push(`qa_exclusion: suppressed rec ${id} appears in output`);
      }
    }
  }

  if (safety.needsPhysicalDisclaimer) {
    const physicalCopy = [physical.focusReason, ...physical.dos.map((d) => d.action)].join(" ");
    const ok = VALID_DISCLAIMERS.some((d) =>
      physicalCopy.toLowerCase().includes(d.toLowerCase().slice(0, 20)),
    );
    if (!ok) failures.push("qa_disclaimer: Physical Activity missing safety disclaimer");
  }

  if (safety.activityPrefs.length > 0) {
    const prefHits = physical.dos.filter(
      (d) => prefMatches(d.action, safety.activityPrefs) || prefMatches(d.example ?? "", safety.activityPrefs),
    ).length;
    if (prefHits < 2) {
      failures.push(`qa_activity_pref: only ${prefHits}/2 Physical Do items reflect preferences`);
    }
  }

  if (
    !profile.barriers.includes("barrier_lack_of_consistency") &&
    /\bconsistency is hard\b/i.test(allText)
  ) {
    failures.push("qa_phantom_barrier: consistency barrier referenced without user barrier");
  }

  if (safety.mealsByOthers && MEAL_PREP_WORDS.test(nutritionText)) {
    failures.push("qa_meals_by_others: cooking/meal-prep language for meals-by-others user");
  }

  if (safety.eatsOutFrequently && MEAL_PREP_WORDS.test(nutritionText)) {
    failures.push("qa_eat_out: cooking/meal-prep language for frequent-eat-out user");
  }

  if (safety.isNonWorker && WORK_WORDS.test(allText)) {
    failures.push("qa_work_language: workplace terms for non-worker profile");
  }

  if (!safety.fatLossGoal && FAT_LOSS_WORDS.test(allText)) {
    failures.push("qa_fat_loss: deficit language without fat-loss goal");
  }

  if (
    !profile.exclusions.includes("exclude_pregnancy_postpartum") &&
    POSTPARTUM_TEXT.test(allText)
  ) {
    failures.push("qa_postpartum: postpartum language without pregnancy/postpartum restriction");
  }

  if (safety.caffeineNone && /\bcaffeine\b/i.test(allText)) {
    failures.push("qa_caffeine: caffeine mention for caffeine_none user");
  }

  if (safety.fitActive) {
    const walkingPref = safety.activityPrefs.some((p) => p.includes("walking"));
    const walkingPrimary = physical.dos.some(
      (d) => /\bwalk(ing)?\b/i.test(d.action) && !/recovery/i.test(d.action),
    );
    if (walkingPrimary && !walkingPref) {
      failures.push("qa_walking: walking-primary for fit/active user");
    }
  }

  const PHOTOGRAPH_TEST =
    /^(Tonight|Today|This (morning|evening|week)|Set|Text|Put|Place|Open|Write|Lay|Dim|Charge|Walk|Stand|Sit|Call|Ask|Fill|Keep|Move|Start)\b/i;
  for (const card of data.opportunityCards) {
    const step = card.startThisWeek?.trim() ?? "";
    const headline = card.headline?.trim() ?? "";
    if (!step || step.length < 12 || !PHOTOGRAPH_TEST.test(step)) {
      failures.push(`qa_first_step: priority ${card.rank} fails photograph test`);
    } else if (headline && step.toLowerCase().includes(headline.toLowerCase().slice(0, 20))) {
      failures.push(`qa_first_step: priority ${card.rank} restates the headline`);
    }
  }

  if (
    (safety.hasConsistencyBarrier || safety.hasStartingBarrier) &&
    STRENGTH_ASSERT.test(data.primaryPattern.personaNarrative) &&
    !/\b(challenge|but you|however|flagged|identified)\b/i.test(data.primaryPattern.personaNarrative)
  ) {
    failures.push("qa_persona_barrier: strength claim without acknowledging barrier");
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
    // PDA §20.7 / §38.3 — preserve personalized example field through post-process.
    example: d.example
      ? applyLifestyleFraming(scrubBlocklistTerms(d.example), profile)
      : d.example ?? null,
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
  sourceRows: RecommendationRow[] = [],
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

  applyQaAutoFixes(profile, processed, sourceRows);

  // Activity-preference injection can overwrite the first Physical Do row; re-apply disclaimers last.
  for (const pillar of PILLARS) {
    processed.pillarPlans[pillar] = applySafetyDisclaimersToPillarPlan(
      pillar,
      processed.pillarPlans[pillar],
      profile,
    );
  }

  // Capture EXCLUSION failures against pre-strip sourceIds so §39 still regenerates.
  const exclusionFailures: string[] = [];
  if (sourceRows.length) {
    const rowById = new Map(sourceRows.map((r) => [r.id, r]));
    const presentIds = [
      ...PILLARS.flatMap((p) => data.pillarPlans[p].sourceIds),
      ...data.opportunityCards.flatMap((c) => c.sourceIds),
    ];
    for (const id of new Set(presentIds)) {
      const row = rowById.get(id);
      if (row && isRecommendationSuppressedForProfile(row, profile)) {
        exclusionFailures.push(`qa_exclusion: suppressed rec ${id} appears in output`);
      }
    }
  }

  const qa = runQaSynthesisChecks(profile, processed, sourceRows);
  if (exclusionFailures.length) {
    qa.failures = [...new Set([...exclusionFailures, ...qa.failures])];
  }
  return { ...processed, qa };
}
