import type { PersonaKey } from "@/lib/scoring/persona-types";

/** Coach guide §5.3 Layer 1 — persona-specific psychological fit criteria. */
export const LAYER1_PSYCHOLOGICAL_CRITERIA: Record<PersonaKey, string> = {
  self_regulated_planner: "Predictable, systematic, routine-compatible. No surprises.",
  social_motivator: "Social, shared, community-connected. Not isolating.",
  stress_sensitive: "Private, low-pressure, clearly defined. No exposure or shame risk.",
  curious_explorer: "Novel, explorative, learning-oriented. Not repetitive or rigid.",
  resilient_performer: "Challenging, measurable, performance-driven. Not easy or vague.",
  brittle_avoidant: "Minimal, effortless, zero-pressure. Not ambitious or complex.",
};

/** Coach guide §5.3 Layer 2 — barrier-specific realism checks. */
const LAYER2_BARRIER_CRITERIA: { match: RegExp; criterion: string }[] = [
  {
    match: /time|busy|schedule/i,
    criterion: "Can this be done in under 20 minutes? Does it require preparation?",
  },
  {
    match: /consist|inconsist/i,
    criterion: "Does this work even if they do it 2 out of 5 days? Is partial credit built in?",
  },
  {
    match: /emotional.?eat|stress.?eat/i,
    criterion: "Does this approach avoid guilt framing? Is there a non-judgmental backup?",
  },
  {
    match: /perfect/i,
    criterion: "Is 'good enough' defined? Can they succeed without doing it perfectly?",
  },
  {
    match: /activation|starting|motivat/i,
    criterion: "Can they start this without any setup? Is the first step trivially easy?",
  },
  {
    match: /overwhelm/i,
    criterion: "Is this one thing? Or does it require remembering multiple steps?",
  },
];

const LAYER2_DEFAULT =
  "Is the friction low enough given their life constraints? Can they repeat this without heroic effort?";

export function layer2CriterionForBarrier(barrierLabel: string): string {
  const normalized = barrierLabel.replace(/^barrier_/, "").replace(/_/g, " ");
  for (const row of LAYER2_BARRIER_CRITERIA) {
    if (row.match.test(normalized)) return row.criterion;
  }
  return LAYER2_DEFAULT;
}

export const LAYER3_ENVIRONMENTAL_QUESTION =
  "Does {first_name} have the space, time, and access to do this in their real life?";
