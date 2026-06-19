import { personaKeyToCsvAlias } from "@/lib/recommendations/persona-aliases";
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

function answerStrings(answers: AttemptAnswers, key: string): string[] {
  const v = answers[key];
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") return [v];
  return [];
}

function answerNumber(answers: AttemptAnswers, key: string): number | null {
  const v = answers[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function resolveOptionTags(
  field: WellnessFieldConfig,
  raw: string,
): { context: string[]; goals: string[]; barriers: string[] } {
  const context: string[] = [];
  const goals: string[] = [];
  const barriers: string[] = [];
  const key = norm(raw);
  const mapped = field.optionTags?.[key];
  if (!mapped) return { context, goals, barriers };

  const tags = Array.isArray(mapped) ? mapped : [mapped];
  const isGoal = field.answerKey.includes("wellness_goals");
  const isBarrier = field.answerKey.includes("barrier");

  for (const tag of tags) {
    if (isGoal) goals.push(tag);
    else if (isBarrier) barriers.push(tag);
    else context.push(tag);
  }

  if (field.inferBarrierTags?.length) {
    const poorSleep =
      context.includes("sleep_quality_poor") || context.includes("sleep_quality_very_poor");
    if (poorSleep) {
      for (const b of field.inferBarrierTags) {
        if (!barriers.includes(b)) barriers.push(b);
      }
    }
  }

  return { context, goals, barriers };
}

function applyWellnessField(
  field: WellnessFieldConfig,
  answers: AttemptAnswers,
  context: string[],
  goals: string[],
  barriers: string[],
) {
  const pushUnique = (arr: string[], tag: string) => {
    if (!arr.includes(tag)) arr.push(tag);
  };

  if (field.kind === "likert_scale") {
    const level = answerNumber(answers, field.answerKey);
    if (level == null || !field.likertBands) return;
    const band = field.likertBands.find((b) => level >= b.min && level <= b.max);
    if (band) pushUnique(context, band.tag);
    return;
  }

  if (field.kind === "multi") {
    for (const raw of answerStrings(answers, field.answerKey)) {
      const resolved = resolveOptionTags(field, raw);
      resolved.context.forEach((t) => pushUnique(context, t));
      resolved.goals.forEach((t) => pushUnique(goals, t));
      resolved.barriers.forEach((t) => pushUnique(barriers, t));
    }
    return;
  }

  const raw = answerString(answers, field.answerKey);
  if (!raw) return;
  const resolved = resolveOptionTags(field, raw);
  resolved.context.forEach((t) => pushUnique(context, t));
  resolved.goals.forEach((t) => pushUnique(goals, t));
  resolved.barriers.forEach((t) => pushUnique(barriers, t));
}

function derivedExclusions(
  config: RecommendationConfig,
  context: string[],
  barriers: string[],
  primaryAlias: string,
  secondaryAlias: string,
  healthAnswer: string | null,
): string[] {
  const ex = new Set<string>();

  if (healthAnswer) {
    const tags = config.healthExclusionByAnswer[norm(healthAnswer)];
    if (tags?.length) tags.forEach((t) => ex.add(t));
    else ex.add("exclude_none");
  } else {
    ex.add("exclude_none");
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

export type BuildProfileInput = {
  answers: AttemptAnswers;
  scores?: AttemptScores | null;
};

export function buildUserProfile(input: BuildProfileInput, config: RecommendationConfig): UserProfile {
  const { answers, scores } = input;
  const primaryPersona = (scores?.archetypeKey ?? scores?.persona?.primaryPersona ?? "self_regulated_planner") as PersonaKey;
  const secondaryPersona = (scores?.secondaryArchetypeKey ??
    scores?.persona?.secondaryPersona ??
    primaryPersona) as PersonaKey;

  const primaryPersonaAlias = personaKeyToCsvAlias(primaryPersona);
  const secondaryPersonaAlias = personaKeyToCsvAlias(secondaryPersona);
  const fitTier = normalizeFitTier(scores?.persona?.fitTier ?? "classic");
  const blendRatio = scores?.persona?.blendRatio ?? 2.5;
  const blendStrength = scores?.persona?.blendStrength ?? "pure";
  const oceanTags = scores?.persona?.oceanTags ?? [];

  const context: string[] = [];
  const goals: string[] = [];
  const barriers: string[] = [];

  for (const field of config.wellnessFields) {
    if (field.answerKey.includes("health_restrictions")) continue;
    applyWellnessField(field, answers, context, goals, barriers);
  }

  const healthField = config.wellnessFields.find((f) => f.answerKey.includes("health_restrictions"));
  const healthAnswer = healthField ? answerString(answers, healthField.answerKey) : null;

  const exclusions = derivedExclusions(
    config,
    context,
    barriers,
    primaryPersonaAlias,
    secondaryPersonaAlias,
    healthAnswer,
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
  };
}
