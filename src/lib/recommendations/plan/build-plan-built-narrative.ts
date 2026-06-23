import type { OpportunityCard, PlanOutput, UserProfile } from "@/lib/recommendations/types";
import { PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import { fitTierLabel } from "@/lib/scoring/persona-fit";
import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";

function formatTag(tag: string): string {
  return tag.replace(/^goal_/, "").replace(/^barrier_/, "").replace(/_/g, " ");
}

function priorityPhrases(cards: OpportunityCard[]): string {
  const phrases = cards
    .slice(0, 3)
    .map((c) => c.startThisWeek?.trim() || c.headline?.trim())
    .filter(Boolean);
  if (phrases.length === 0) return "having backup workouts and meals ready when motivation drops";
  if (phrases.length === 1) return phrases[0]!.toLowerCase();
  if (phrases.length === 2) return `${phrases[0]!.toLowerCase()} and ${phrases[1]!.toLowerCase()}`;
  return `${phrases[0]!.toLowerCase()}, ${phrases[1]!.toLowerCase()}, and ${phrases[2]!.toLowerCase()}`;
}

function goalPhrase(goals: string[]): string {
  if (!goals.length) return "general wellness";
  return goals.map(formatTag).join(" and ");
}

/** Deterministic fallback when A14 plan_built_narrative is unavailable. */
export function buildDeterministicPlanBuiltNarrative(args: {
  planOutput: PlanOutput;
  profile: UserProfile;
  input?: BuildProfileInput;
  priorityCards?: OpportunityCard[];
  secondaryBlendPct?: number;
}): string {
  const { planOutput, profile, input, priorityCards = [], secondaryBlendPct } = args;
  const primaryLabel = PERSONA_DISPLAY[profile.primaryPersona]?.label ?? profile.primaryPersona;
  const secondaryLabel = PERSONA_DISPLAY[profile.secondaryPersona]?.label;
  const fitScore = Math.round(input?.scores?.persona?.fitScore ?? 0);
  const fitTier = fitTierLabel(planOutput.fit_tier);
  const goals = goalPhrase(profile.goals);
  const barrier = profile.barriers[0] ? formatTag(profile.barriers[0]) : "everyday constraints";
  const blendPct = secondaryBlendPct ?? 0;
  const secondaryClause =
    secondaryLabel && blendPct > 0 && profile.secondaryPersona !== profile.primaryPersona
      ? ` with ${secondaryLabel} tendencies`
      : "";

  return [
    "This plan was generated from your Wellness Intelligence assessment.",
    `Your ${primaryLabel} profile${fitScore ? ` (${fitScore}% fit, ${fitTier} tier)` : ""}${secondaryClause} shaped a phased plan calibrated to how you actually start, recover, and stay consistent.`,
    `The phasing accounts for your main barrier (${barrier}) and your goals around ${goals}, introducing changes gradually through a ${planOutput.progression_style.toLowerCase()} ${planOutput.total_duration_weeks}-week structure so your pattern can absorb them rather than forcing intensity too early.`,
    `Your plan prioritises high-impact opportunities: ${priorityPhrases(priorityCards)}.`,
  ].join(" ");
}

export function buildDeterministicPlanSubtitle(profile: UserProfile): string {
  const primaryLabel = PERSONA_DISPLAY[profile.primaryPersona]?.label ?? profile.primaryPersona;
  return `A phased approach that builds your wellness routine layer by layer — shaped by your ${primaryLabel} personality.`;
}

export function buildDeterministicGoalFraming(profile: UserProfile): string {
  const goal = profile.goals[0] ? formatTag(profile.goals[0]) : "your wellness goals";
  return `Built around ${goal}, one phase at a time.`;
}
