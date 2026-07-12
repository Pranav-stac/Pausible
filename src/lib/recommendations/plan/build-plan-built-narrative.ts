import type { OpportunityCard, PlanOutput, UserProfile } from "@/lib/recommendations/types";
import { PLAN_TEXT_LIMITS } from "@/lib/recommendations/plan/plan-text-limits";
import { PERSONA_DISPLAY } from "@/lib/scoring/persona-defaults";
import { fitTierLabel } from "@/lib/scoring/persona-fit";
import type { BuildProfileInput } from "@/lib/recommendations/build-user-profile";

function formatTag(tag: string): string {
  return tag.replace(/^goal_/, "").replace(/^barrier_/, "").replace(/_/g, " ");
}

function formatBarrier(tag: string): string {
  const labels: Record<string, string> = {
    barrier_low_activation_energy: "getting started",
    barrier_starting_difficulty: "getting started",
    barrier_lack_of_consistency: "staying consistent",
    barrier_lack_of_time: "lack of time",
    barrier_low_motivation: "low motivation",
    barrier_lack_of_knowledge: "not knowing what to do",
    barrier_emotional_eating_cravings: "emotional eating",
    barrier_poor_sleep: "poor sleep",
  };
  return labels[tag] ?? formatTag(tag);
}

function barrierPhrase(barriers: string[]): string {
  const unique = [...new Set(barriers.map(formatBarrier))];
  if (!unique.length) return "everyday constraints";
  if (unique.length === 1) return unique[0]!;
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0, -1).join(", ")}, and ${unique[unique.length - 1]}`;
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
  return goals.map((g) => g.replace(/^goal_/, "").replace(/_/g, " ")).join(" and ");
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
  const barrier = barrierPhrase(profile.barriers);
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

export function buildDeterministicPlanSubtitle(
  profile: UserProfile,
  secondaryBlendPct?: number,
): string {
  const primaryLabel = PERSONA_DISPLAY[profile.primaryPersona]?.label ?? profile.primaryPersona;
  const base = `A phased approach that builds your wellness routine layer by layer — shaped by your ${primaryLabel} personality.`;

  const secondaryLabel = PERSONA_DISPLAY[profile.secondaryPersona]?.label;
  const blendPct = secondaryBlendPct ?? 0;
  if (
    secondaryLabel &&
    blendPct > 15 &&
    profile.secondaryPersona !== profile.primaryPersona
  ) {
    const withSecondary = `${base.slice(0, -1)}, with ${secondaryLabel} support when you need it.`;
    if (withSecondary.length <= PLAN_TEXT_LIMITS.plan_subtitle) {
      return withSecondary;
    }
  }

  return base;
}

export function buildDeterministicGoalFraming(profile: UserProfile): string {
  const goal = profile.goals[0] ? formatTag(profile.goals[0]) : "your wellness goals";
  return `Built around ${goal}, one phase at a time.`;
}
