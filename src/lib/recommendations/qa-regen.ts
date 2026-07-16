import type {
  ActionPlanSynthesis,
  OpportunityCard,
  PillarName,
  PrimaryPatternSection,
  SecondaryPatternSection,
} from "@/lib/recommendations/types";

/**
 * PDA §39 — map QA failure codes to report section keys for one regen attempt.
 */
export type QaRegenSection =
  | "primary_pattern"
  | "secondary_pattern"
  | "blind_spots"
  | "priorities"
  | "plan_page"
  | PillarName;

const PILLAR_FAIL: Array<{ re: RegExp; pillar: PillarName }> = [
  { re: /physical|activity_pref|walking|disclaimer|exclusion/i, pillar: "Physical Activity" },
  { re: /nutrition|meals_by_others|eat_out|fat_loss|caffeine|exclusion/i, pillar: "Nutrition" },
  { re: /sleep/i, pillar: "Sleep & Recovery" },
  { re: /mental/i, pillar: "Mental Wellness" },
];

/** Extract failed section keys from qa failure / warning strings. */
export function mapQaFailuresToSections(messages: string[]): QaRegenSection[] {
  const out = new Set<QaRegenSection>();
  for (const msg of messages) {
    if (/persona_barrier|phantom_barrier|primary/i.test(msg)) out.add("primary_pattern");
    if (/first_step|priorit/i.test(msg)) out.add("priorities");
    if (/blind|leak/i.test(msg) && /blind/i.test(msg)) out.add("blind_spots");
    if (/qa_phases|plan_page/i.test(msg)) out.add("plan_page");
    if (/qa_exclusion/i.test(msg)) {
      out.add("Physical Activity");
      out.add("Nutrition");
      out.add("Sleep & Recovery");
      out.add("Mental Wellness");
      out.add("priorities");
    }
    if (/postpartum/i.test(msg)) {
      out.add("Sleep & Recovery");
      out.add("Nutrition");
      out.add("Physical Activity");
    }
    if (/work_language|secondary/i.test(msg)) {
      out.add("primary_pattern");
      out.add("secondary_pattern");
    }
    for (const { re, pillar } of PILLAR_FAIL) {
      if (re.test(msg)) out.add(pillar);
    }
    // Broad leak / work language may touch all pillars — prefer Physical + Nutrition + primary.
    if (/^qa_leak:/i.test(msg)) {
      out.add("primary_pattern");
      out.add("priorities");
    }
  }
  return [...out];
}

/** Prepend failed QA rules to a user prompt for a single regeneration attempt (§39). */
export function prependQaFailedRules(userPrompt: string, failedRules: string[]): string {
  if (!failedRules.length || !userPrompt.trim()) return userPrompt;
  const block = failedRules.map((r) => `- ${r}`).join("\n");
  return `QA REGENERATION (mandatory — previous output failed these checks):\n${block}\n\nFix ONLY the failed rules above. Keep every other rule from the system prompt.\n\n${userPrompt}`;
}

export type SectionBundle = {
  primaryPattern: PrimaryPatternSection;
  secondaryPattern?: SecondaryPatternSection | null;
  pillarPlans: ActionPlanSynthesis["pillarPlans"];
  opportunityCards: OpportunityCard[];
  blindSpots: { patternBody: string; goalsBody: string };
};

/** Collect human-readable failed rules for a specific section. */
export function failedRulesForSection(section: QaRegenSection, failures: string[]): string[] {
  return failures.filter((f) => mapQaFailuresToSections([f]).includes(section));
}
