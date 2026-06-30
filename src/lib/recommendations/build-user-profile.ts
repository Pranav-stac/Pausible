import { personaKeyToCsvAlias } from "@/lib/recommendations/persona-aliases";
import { ensureColTOceanTags } from "@/lib/scoring/ocean-tags";
import { normalizeFitTier } from "@/lib/scoring/persona-fit";
import type { RecommendationConfig, WellnessFieldConfig } from "@/lib/recommendations/firestore-config-types";
import type { UserProfile } from "@/lib/recommendations/types";
import type { PersonaKey } from "@/lib/scoring/persona-types";
import type { AttemptAnswers, AttemptScores } from "@/types/models";

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\s+/g, " ");
}

function answerString(answers: AttemptAnswers, key: string): string | null {
  const v = answers[key];
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return null;
}

const WELLNESS_MULTI_LIMITS: Record<string, number> = {
  wc_wellness_goals: 3,
  wc_wellness_barriers: 3,
};

function answerStrings(answers: AttemptAnswers, key: string): string[] {
  const v = answers[key];
  let list: string[] = [];
  if (Array.isArray(v)) list = v.map(String).filter(Boolean);
  else if (typeof v === "string" && v.trim()) list = [v];
  const cap = WELLNESS_MULTI_LIMITS[key];
  if (cap != null && list.length > cap) list = list.slice(0, cap);
  return list;
}

function resolveOptionTags(
  field: WellnessFieldConfig,
  raw: string,
): { context: string[]; goals: string[]; barriers: string[]; exclusions: string[] } {
  const context: string[] = [];
  const goals: string[] = [];
  const barriers: string[] = [];
  const exclusions: string[] = [];
  const key = norm(raw);
  const mapped = field.optionTags?.[key];
  if (!mapped) return { context, goals, barriers, exclusions };

  const tags = Array.isArray(mapped) ? mapped : [mapped];
  const isGoal = field.answerKey.includes("wellness_goals");
  const isBarrier = field.answerKey.includes("barrier");
  const isHealth = field.answerKey.includes("health_flags");

  for (const tag of tags) {
    if (isHealth) exclusions.push(tag);
    else if (isGoal) goals.push(tag);
    else if (isBarrier) barriers.push(tag);
    else context.push(tag);
  }

  if (field.inferBarrierTags?.length) {
    const poorSleep =
      context.includes("sleep_quality_poor") || context.includes("sleep_quality_very_poor");
    const highStress = context.includes("stress_high");
    if (poorSleep || highStress) {
      for (const b of field.inferBarrierTags) {
        if (!barriers.includes(b)) barriers.push(b);
      }
    }
  }

  return { context, goals, barriers, exclusions };
}

function applyWellnessField(
  field: WellnessFieldConfig,
  answers: AttemptAnswers,
  context: string[],
  goals: string[],
  barriers: string[],
  exclusions: string[],
) {
  const pushUnique = (arr: string[], tag: string) => {
    if (!arr.includes(tag)) arr.push(tag);
  };

  if (field.kind === "multi") {
    for (const raw of answerStrings(answers, field.answerKey)) {
      const resolved = resolveOptionTags(field, raw);
      resolved.context.forEach((t) => pushUnique(context, t));
      resolved.goals.forEach((t) => pushUnique(goals, t));
      resolved.barriers.forEach((t) => pushUnique(barriers, t));
      resolved.exclusions.forEach((t) => pushUnique(exclusions, t));
    }
    return;
  }

  const raw = answerString(answers, field.answerKey);
  if (!raw) return;
  const resolved = resolveOptionTags(field, raw);
  resolved.context.forEach((t) => pushUnique(context, t));
  resolved.goals.forEach((t) => pushUnique(goals, t));
  resolved.barriers.forEach((t) => pushUnique(barriers, t));
  resolved.exclusions.forEach((t) => pushUnique(exclusions, t));
}

/** Legacy v1.2 fields for attempts completed before CQ v1.3 migration. */
function applyLegacyWellnessAnswers(
  answers: AttemptAnswers,
  context: string[],
  goals: string[],
  barriers: string[],
) {
  const pushUnique = (arr: string[], tag: string) => {
    if (!arr.includes(tag)) arr.push(tag);
  };

  const legacyBarrier = answerString(answers, "wc_biggest_barrier");
  if (legacyBarrier && barriers.length === 0) {
    const map: Record<string, string | string[]> = {
      "lack of time": "barrier_lack_of_time",
      "lack of consistency": "barrier_lack_of_consistency",
      "work stress": "barrier_work_stress",
      "poor sleep": "barrier_poor_sleep",
      "low motivation": "barrier_low_motivation",
      "emotional eating / cravings": "barrier_emotional_eating_cravings",
      "gym anxiety": "barrier_gym_anxiety",
      "lack of knowledge": "barrier_lack_of_knowledge",
      "travel and schedule disruptions": "barrier_travel_schedule_disruption",
      "family responsibilities": "barrier_family_responsibilities",
      "injury or physical discomfort": "barrier_injury_discomfort",
    };
    const tags = map[norm(legacyBarrier)];
    if (tags) {
      const list = Array.isArray(tags) ? tags : [tags];
      list.forEach((t) => pushUnique(barriers, t));
    }
  }

  const legacyHealth = answerString(answers, "wc_health_restrictions");
  if (legacyHealth && norm(legacyHealth) === "yes") {
    pushUnique(context, "exclude_medical_condition");
  }
}

function derivedExclusions(
  config: RecommendationConfig,
  context: string[],
  barriers: string[],
  primaryAlias: string,
  secondaryAlias: string,
  healthExclusions: string[],
): string[] {
  const ex = new Set<string>();

  if (healthExclusions.length === 0 || healthExclusions.every((t) => t === "exclude_none")) {
    ex.add("exclude_none");
  } else {
    for (const t of healthExclusions) {
      if (t !== "exclude_none") ex.add(t);
    }
  }

  for (const rule of config.derivedExclusionRules) {
    let hit = false;
    if (rule.anyContext?.some((t) => context.includes(t))) hit = true;
    if (rule.anyBarriers?.some((t) => barriers.includes(t))) hit = true;
    if (rule.personaAliases?.some((a) => a === primaryAlias || a === secondaryAlias)) hit = true;
    if (hit) ex.add(rule.exclusionTag);
  }

  return [...ex];
}

/** DR11 — strength/muscle goal without resistance preference (§21.14). */
export function computeGoalPreferenceBridge(goals: string[], context: string[]): boolean {
  const strengthGoal =
    goals.includes("goal_muscle_gain") || goals.includes("goal_strength");
  if (!strengthGoal) return false;
  return !context.includes("activity_pref_strength");
}

export type BuildProfileInput = {
  answers: AttemptAnswers;
  scores?: AttemptScores | null;
  participantName?: string | null;
};

export function buildUserProfile(input: BuildProfileInput, config: RecommendationConfig): UserProfile {
  const { answers, scores } = input;
  const primaryPersona = (scores?.archetypeKey ??
    scores?.persona?.primaryPersona ??
    "self_regulated_planner") as PersonaKey;
  const secondaryPersona = (scores?.secondaryArchetypeKey ??
    scores?.persona?.secondaryPersona ??
    primaryPersona) as PersonaKey;

  const primaryPersonaAlias = personaKeyToCsvAlias(primaryPersona);
  const secondaryPersonaAlias = personaKeyToCsvAlias(secondaryPersona);
  const fitTier = normalizeFitTier(scores?.persona?.fitTier ?? "classic");
  const blendRatio = scores?.persona?.blendRatio ?? 2.5;
  const blendStrength = scores?.persona?.blendStrength ?? "pure";
  const oceanTags = ensureColTOceanTags(scores?.persona?.oceanTags ?? []);
  const oceanCategoryTags = scores?.persona?.categoryTags
    ? Object.values(scores.persona.categoryTags)
    : [];

  const context: string[] = [];
  const goals: string[] = [];
  const barriers: string[] = [];
  const healthExclusions: string[] = [];

  for (const field of config.wellnessFields) {
    applyWellnessField(field, answers, context, goals, barriers, healthExclusions);
  }

  applyLegacyWellnessAnswers(answers, context, goals, barriers);

  const exclusions = derivedExclusions(
    config,
    context,
    barriers,
    primaryPersonaAlias,
    secondaryPersonaAlias,
    healthExclusions,
  );

  return {
    primaryPersona,
    secondaryPersona,
    primaryPersonaAlias,
    secondaryPersonaAlias,
    fitTier,
    blendRatio,
    blendStrength,
    oceanTags,
    goals,
    barriers,
    context,
    exclusions,
    oceanCategoryTags,
    goalPreferenceBridge: computeGoalPreferenceBridge(goals, context),
  };
}
