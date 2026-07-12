/** Global + plan-specific blocklist enforcement for Page 10 AI synthesis (§24). */

import { coercePlanText } from "@/lib/recommendations/plan/coerce-plan-field";

const TECHNICAL_TRAIT_REPLACEMENTS: [RegExp, string][] = [
  [/\bconscientiousness\b/gi, "Discipline"],
  [/\bneuroticism\b/gi, "Stress Sensitivity"],
  [/\bextraversion\b/gi, "Social Energy"],
  [/\bOCEAN\b/g, "your profile"],
];

/** Rhythm/action lines — strip engine jargon only; persona names allowed in narrative fields. */
const RHYTHM_LINE_REPLACEMENTS: [RegExp, string][] = [
  ...TECHNICAL_TRAIT_REPLACEMENTS,
  [/\blow\s+activation\s+energy\b/gi, "getting started"],
  [/\bactivation\s+energy\b/gi, "getting started"],
  [/\breadiness\s+signal\b/gi, "You'll know you're ready when"],
  [/\bpillar\s+distribution\b/gi, "Your plan covers sleep, nutrition, movement, and mental wellness"],
  [/\bphase\s+assignment\b/gi, ""],
  [/\bdensity\s+weighting\b/gi, ""],
  [/\brecommendation\s+master\b/gi, ""],
  [/\bscoring\s+formula\b/gi, ""],
  [/\b(core|supporting|optional|conditional)\s+(recommendation|strength)\b/gi, "recommendation"],
];

/** Subtitle + plan rationale — technical traits only (§20.9 allows persona + fit score). */
const NARRATIVE_REPLACEMENTS: [RegExp, string][] = [
  ...TECHNICAL_TRAIT_REPLACEMENTS,
  [/\blow\s+activation\s+energy\b/gi, "getting started"],
  [/\bactivation\s+energy\b/gi, "getting started"],
  [/\bblend\s+ratio\b/gi, "pattern blend"],
];

export type BlocklistViolation = {
  term: string;
  field: string;
};

export type IntegratedPlanSanitizeInput = {
  plan_subtitle: string;
  goal_framing: string;
  phases: {
    phase_number: number;
    phase_intent_user: string;
    readiness_signal_user: string;
    anchor_habit_user: string;
    daily_rhythm_user: string[];
    weekly_rhythm_user: string[];
  }[];
  plan_built_narrative: string;
  plan_notes: string[];
};

export function sanitizePlanMetaText(text: string): { text: string; violations: string[] } {
  const violations: string[] = [];
  for (const [pattern] of NARRATIVE_REPLACEMENTS) {
    if (pattern.test(text)) violations.push(pattern.source);
  }
  return {
    text: applyReplacements(text, NARRATIVE_REPLACEMENTS),
    violations,
  };
}

export function sanitizePlanBuiltNarrative(text: string): { text: string; violations: string[] } {
  return sanitizePlanMetaText(text);
}

function applyReplacements(text: string, replacements: [RegExp, string][]): string {
  let out = text;
  for (const [pattern, replacement] of replacements) {
    out = out.replace(pattern, replacement);
  }
  return out.replace(/\s{2,}/g, " ").replace(/\s+([,.])/g, "$1").trim();
}

export function sanitizePlanPageText(text: string): { text: string; violations: string[] } {
  const violations: string[] = [];
  for (const [pattern] of RHYTHM_LINE_REPLACEMENTS) {
    if (pattern.test(text)) {
      violations.push(pattern.source);
    }
  }

  return {
    text: applyReplacements(text, RHYTHM_LINE_REPLACEMENTS),
    violations,
  };
}

export function sanitizeIntegratedPlanFields(content: IntegratedPlanSanitizeInput): {
  sanitized: IntegratedPlanSanitizeInput;
  violations: BlocklistViolation[];
} {
  const violations: BlocklistViolation[] = [];

  const scrub = (value: string | unknown, field: string): string => {
    const { text, violations: found } = sanitizePlanPageText(coercePlanText(value, ""));
    for (const term of found) {
      violations.push({ term, field });
    }
    return text;
  };

  const scrubMeta = (value: string | unknown, field: string): string => {
    const { text, violations: found } = sanitizePlanMetaText(coercePlanText(value, ""));
    for (const term of found) {
      violations.push({ term, field });
    }
    return text;
  };

  const scrubNarrative = (value: string | unknown): string => {
    const { text, violations: found } = sanitizePlanBuiltNarrative(coercePlanText(value, ""));
    for (const term of found) {
      violations.push({ term, field: "plan_built_narrative" });
    }
    return text;
  };

  return {
    sanitized: {
      plan_subtitle: scrubMeta(content.plan_subtitle, "plan_subtitle"),
      goal_framing: scrub(content.goal_framing, "goal_framing"),
      plan_built_narrative: scrubNarrative(content.plan_built_narrative),
      plan_notes: content.plan_notes.map((note, i) => scrub(note, `plan_notes[${i}]`)),
      phases: content.phases.map((phase) => ({
        ...phase,
        phase_intent_user: scrub(phase.phase_intent_user, `phases[${phase.phase_number}].phase_intent_user`),
        readiness_signal_user: scrub(
          phase.readiness_signal_user,
          `phases[${phase.phase_number}].readiness_signal_user`,
        ),
        anchor_habit_user: scrub(
          phase.anchor_habit_user,
          `phases[${phase.phase_number}].anchor_habit_user`,
        ),
        daily_rhythm_user: phase.daily_rhythm_user.map((line, i) =>
          scrub(line, `phases[${phase.phase_number}].daily_rhythm_user[${i}]`),
        ),
        weekly_rhythm_user: phase.weekly_rhythm_user.map((line, i) =>
          scrub(line, `phases[${phase.phase_number}].weekly_rhythm_user[${i}]`),
        ),
      })),
    },
    violations,
  };
}
