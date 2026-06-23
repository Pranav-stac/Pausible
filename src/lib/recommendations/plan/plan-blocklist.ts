/** Global + plan-specific blocklist enforcement for Page 10 AI synthesis. */

const GLOBAL_REPLACEMENTS: [RegExp, string][] = [
  [/\bconscientiousness\b/gi, "Discipline"],
  [/\bneuroticism\b/gi, "Stress Sensitivity"],
  [/\bextraversion\b/gi, "Social Energy"],
  [/\bOCEAN\b/g, "your profile"],
  [/\bfits?\s+score\b/gi, "pattern match"],
  [/\bblend\s+ratio\b/gi, "pattern blend"],
  [/\bcentroid\b/gi, "typical pattern"],
  [/\bpersona\b/gi, "pattern"],
  [/\bturtle\b/gi, "your cautious pattern"],
  [/\bdeer\b/gi, "your watchful pattern"],
  [/\bfox\b/gi, "your curious pattern"],
  [/\bwolf\b/gi, "your social pattern"],
  [/\bbear\b/gi, "your disciplined pattern"],
  [/\belephant\b/gi, "your systematic pattern"],
];

const PLAN_SPECIFIC_REPLACEMENTS: [RegExp, string][] = [
  [/\bactivation\s+energy\b/gi, ""],
  [/\breadiness\s+signal\b/gi, "You'll know you're ready when"],
  [/\bpillar\s+distribution\b/gi, "Your plan covers sleep, nutrition, movement, and mental wellness"],
  [/\bphase\s+assignment\b/gi, ""],
  [/\bdensity\s+weighting\b/gi, ""],
  [/\brecommendation\s+master\b/gi, ""],
  [/\bscoring\s+formula\b/gi, ""],
  [/\b(core|supporting|optional|conditional)\s+(recommendation|strength)\b/gi, "recommendation"],
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

/** Lighter scrub for meta narrative — keeps persona animal names. */
const NARRATIVE_REPLACEMENTS: [RegExp, string][] = [
  [/\bconscientiousness\b/gi, "Discipline"],
  [/\bneuroticism\b/gi, "Stress Sensitivity"],
  [/\bextraversion\b/gi, "Social Energy"],
  [/\bOCEAN\b/g, "your profile"],
  [/\bactivation\s+energy\b/gi, ""],
  [/\breadiness\s+signal\b/gi, "readiness cues"],
];

export function sanitizePlanBuiltNarrative(text: string): { text: string; violations: string[] } {
  const violations: string[] = [];
  for (const [pattern] of NARRATIVE_REPLACEMENTS) {
    if (pattern.test(text)) violations.push(pattern.source);
  }
  return {
    text: applyReplacements(text, NARRATIVE_REPLACEMENTS),
    violations,
  };
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
  const combined = [...GLOBAL_REPLACEMENTS, ...PLAN_SPECIFIC_REPLACEMENTS];

  for (const [pattern] of combined) {
    if (pattern.test(text)) {
      violations.push(pattern.source);
    }
  }

  return {
    text: applyReplacements(text, combined),
    violations,
  };
}

export function sanitizeIntegratedPlanFields(content: IntegratedPlanSanitizeInput): {
  sanitized: IntegratedPlanSanitizeInput;
  violations: BlocklistViolation[];
} {
  const violations: BlocklistViolation[] = [];

  const scrub = (value: string, field: string): string => {
    const { text, violations: found } = sanitizePlanPageText(value);
    for (const term of found) {
      violations.push({ term, field });
    }
    return text;
  };

  const scrubNarrative = (value: string): string => {
    const { text, violations: found } = sanitizePlanBuiltNarrative(value);
    for (const term of found) {
      violations.push({ term, field: "plan_built_narrative" });
    }
    return text;
  };

  return {
    sanitized: {
      plan_subtitle: scrub(content.plan_subtitle, "plan_subtitle"),
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
