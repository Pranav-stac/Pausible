import { WELLNESS_CONTEXT_PREFIX } from "@/data/wellness-context-questionnaire";
import tagMappingRulesJson from "@/data/recommendations/tag-mapping-rules.json";
import type { TagMappingRule, WellnessFieldConfig } from "@/lib/recommendations/firestore-config-types";

const w = (id: string) => `${WELLNESS_CONTEXT_PREFIX}${id}`;

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\s+/g, " ");
}

/** CQ v1.5 → answer keys (CQ10 / CQ19 removed; CQ08a → preferred_activity_details). */
const CQ_FIELD: Record<string, { answerKey: string; kind: "single" | "multi" }> = {
  CQ01: { answerKey: w("age_range"), kind: "single" },
  CQ02: { answerKey: w("gender"), kind: "single" },
  CQ03: { answerKey: w("work_lifestyle"), kind: "single" },
  CQ04: { answerKey: w("stress_level"), kind: "single" },
  CQ05: { answerKey: w("wellness_time"), kind: "single" },
  CQ06: { answerKey: w("fitness_level"), kind: "single" },
  CQ07: { answerKey: w("daily_activity"), kind: "single" },
  CQ08: { answerKey: w("preferred_activities"), kind: "multi" },
  CQ08a: { answerKey: w("preferred_activity_details"), kind: "multi" },
  CQ09: { answerKey: w("workout_environment"), kind: "single" },
  CQ11: { answerKey: w("sleep_quality"), kind: "single" },
  CQ12: { answerKey: w("sleep_hours"), kind: "single" },
  CQ13: { answerKey: w("caffeine_habit"), kind: "single" },
  CQ14: { answerKey: w("food_pattern"), kind: "single" },
  CQ15: { answerKey: w("meal_control"), kind: "single" },
  CQ16: { answerKey: w("wellness_goals"), kind: "single" },
  CQ17: { answerKey: w("wellness_barriers"), kind: "multi" },
  CQ18: { answerKey: w("support_system"), kind: "single" },
  CQ20: { answerKey: w("health_flags"), kind: "multi" },
};

function parseTags(raw: string): string | string[] {
  const parts = raw.split(";").map((t) => t.trim()).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? raw.trim();
  return parts;
}

/** Build wellness field config from Contextual Tags v1.5 tag-mapping-rules.json. */
export function buildWellnessFieldsFromTagMapping(
  rules: TagMappingRule[] = tagMappingRulesJson as TagMappingRule[],
): WellnessFieldConfig[] {
  const grouped = new Map<string, WellnessFieldConfig>();

  for (const rule of rules) {
    const meta = CQ_FIELD[rule.questionId];
    if (!meta) continue;

    let field = grouped.get(meta.answerKey);
    if (!field) {
      field = {
        answerKey: meta.answerKey,
        kind: meta.kind,
        optionTags: {},
      };
      grouped.set(meta.answerKey, field);
    }

    const key = norm(rule.responseValue);
    const existing = field.optionTags![key];
    const mapped = parseTags(rule.tag);
    if (!existing) {
      field.optionTags![key] = mapped;
    } else if (Array.isArray(existing) && Array.isArray(mapped)) {
      field.optionTags![key] = [...new Set([...existing, ...mapped])];
    } else if (typeof existing === "string" && typeof mapped === "string" && existing !== mapped) {
      field.optionTags![key] = [existing, mapped];
    }
  }

  const stress = grouped.get(w("stress_level"));
  if (stress) stress.inferBarrierTags = ["barrier_work_stress"];

  const sleep = grouped.get(w("sleep_quality"));
  if (sleep) sleep.inferBarrierTags = ["barrier_poor_sleep"];

  const order = Object.values(CQ_FIELD).map((f) => f.answerKey);
  return order.map((key) => grouped.get(key)).filter((f): f is WellnessFieldConfig => Boolean(f));
}
