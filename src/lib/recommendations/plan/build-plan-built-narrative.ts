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
  if (phrases.length === 0) return "your highest-impact wellness actions";
  if (phrases.length === 1) return phrases[0]!;
  if (phrases.length === 2) return `${phrases[0]} and ${phrases[1]}`;
  return `${phrases[0]}, ${phrases[1]}, and ${phrases[2]}`;
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
  const goal = profile.goals[0] ? formatTag(profile.goals[0]) : "general wellness";
  const barrier = profile.barriers[0] ? formatTag(profile.barriers[0]) : "everyday constraints";
  const summary = PERSONA_DISPLAY[profile.primaryPersona]?.summary ?? "";
  const traitHint = summary.split(".")[0]?.trim();
  const blendPct = secondaryBlendPct ?? 0;
  const secondaryClause =
    secondaryLabel && blendPct > 0 && profile.secondaryPersona !== profile.primaryPersona
      ? ` with ${secondaryLabel} tendencies`
      : "";

  return [
    "This plan was generated from your Wellness Intelligence assessment.",
    `Your profile is a ${fitTier} ${primaryLabel}${fitScore ? ` (${fitScore}% fit, ${fitTier} tier)` : ""}${secondaryClause}.`,
    traitHint ? `${traitHint}.` : null,
    `The phasing is calibrated to your main barrier (${barrier}) and your ${goal} goal, introducing changes gradually through a ${planOutput.progression_style.toLowerCase()} ${planOutput.total_duration_weeks}-week structure so your pattern can absorb them.`,
    `Your plan prioritises high-impact opportunities: ${priorityPhrases(priorityCards)}.`,
  ]
    .filter(Boolean)
    .join(" ");
}
