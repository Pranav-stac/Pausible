import type { RecommendationType } from "@/lib/recommendations/types";

const DAILY_PATTERN =
  /\b(every day|each day|daily|nightly|each night|before bed|at bedtime|each morning|at breakfast|at lunch|after dinner)\b/i;

const WEEKLY_PATTERN =
  /\b(per week|each week|this week|weekly|times a week|days a week|a week|sessions?\/week|\d+\s*[×x]\s*|\d+\s*(?:times|sessions?|days?)\s*(?:per|\/)\s*week)\b/i;

/** Self-talk / recovery scripts are not valid anchor habits. */
const ANCHOR_DISQUALIFY_PATTERN =
  /\b(say to yourself|tell yourself|say,|ask yourself|when you miss|i ruined|that happened|do not say|mindset|journal about|reflect on|one question:)\b/i;

export type RhythmCadence = "daily" | "weekly" | "either";

/** Infer whether a recommendation belongs in daily vs weekly rhythm from its text. */
export function classifyRhythmCadence(
  text: string,
  type: RecommendationType,
): RhythmCadence {
  const t = text.toLowerCase();
  const isDaily = DAILY_PATTERN.test(t);
  const isWeekly = WEEKLY_PATTERN.test(t) || /\b(when you miss|if you miss|after a miss|pick up)\b/.test(t);

  if (isDaily && !isWeekly) return "daily";
  if (isWeekly && !isDaily) return "weekly";
  if (isDaily) return "daily";
  if (isWeekly) return "weekly";

  if (type === "recovery_rule" || type === "environment_change") return "either";
  if (type === "dont") return "either";
  return "either";
}

export function isValidAnchorCandidate(row: {
  type: RecommendationType;
  text: string;
}): boolean {
  if (row.type === "dont" || row.type === "mindset_shift") return false;
  if (ANCHOR_DISQUALIFY_PATTERN.test(row.text)) return false;
  if (row.type === "recovery_rule" && ANCHOR_DISQUALIFY_PATTERN.test(row.text)) return false;
  return row.type === "first_action" || row.type === "do" || row.type === "environment_change";
}

/** Lower = better anchor (concrete behaviour, not self-talk). */
export function anchorCandidateRank(row: { type: RecommendationType; text: string }): number {
  if (!isValidAnchorCandidate(row)) return 99;
  if (row.type === "first_action") return 0;
  const t = row.text.toLowerCase();
  if (row.type === "do" && /\b(walk|workout|meal|eat|sleep|train|lift|protein|bedtime)\b/.test(t)) {
    return 1;
  }
  if (row.type === "do") return 2;
  if (row.type === "environment_change") return 3;
  return 4;
}

export function isSelfTalkOrMantra(text: string): boolean {
  return ANCHOR_DISQUALIFY_PATTERN.test(text);
}
