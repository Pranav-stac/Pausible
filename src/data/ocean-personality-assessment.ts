import type { AssessmentDefinition, AssessmentQuestion, AssessmentSection } from "@/types/models";
import questionBankRaw from "../../question.json";

type Item = {
  id: string;
  code: string;
  trait: string;
  facet: string;
  text: string;
  is_reverse: boolean;
  order_index: number;
  is_active?: boolean;
};

/** 7-point agreement scale (common for personality-style items). */
export const OCEAN_SCALE_MAX = 7;
export const OCEAN_ASSESSMENT_ID = "default";

function traitKey(trait: string): string {
  return trait.trim().replace(/\s+/g, "_").toLowerCase();
}

const TRAIT_SECTION_ORDER = [
  "Openness",
  "Conscientiousness",
  "Extraversion",
  "Agreeableness",
  "Neuroticism",
] as const;

const TRAIT_SET = new Set<string>(TRAIT_SECTION_ORDER);

/**
 * Full inventory built from repo-root `question.json`.
 * Id `default` keeps `/assessment/default` URLs stable.
 */
export function buildOceanPersonalityAssessment(): AssessmentDefinition {
  const rows = [...(questionBankRaw as unknown as Item[])]
    .filter((r) => r.is_active !== false)
    .sort((a, b) => a.order_index - b.order_index);

  const sections: AssessmentSection[] = [];
  const questions: Record<string, AssessmentQuestion> = {};

  for (const trait of TRAIT_SECTION_ORDER) {
    const traitRows = rows.filter((r) => r.trait === trait).sort((a, b) => a.order_index - b.order_index);
    if (!traitRows.length) continue;

    sections.push({
      id: traitKey(trait),
      title: trait,
      description: `Movement, nutrition & recovery tendencies linked to ${trait}.`,
      questionIds: traitRows.map((r) => r.code),
    });

    for (const r of traitRows) {
      const k = traitKey(r.trait);
      questions[r.code] = {
        id: r.code,
        prompt: r.text,
        caption: `${r.facet} · ${r.code}`,
        type: "likert",
        scaleMin: 1,
        scaleMax: OCEAN_SCALE_MAX,
        reverse: r.is_reverse === true,
        weights: { [k]: 1 },
      };
    }
  }

  const extras = rows.filter((r) => !TRAIT_SET.has(r.trait));
  if (extras.length) {
    const sorted = [...extras].sort((a, b) => a.order_index - b.order_index);
    sections.push({
      id: "additional",
      title: "Additional",
      description: "Items grouped outside the five core traits.",
      questionIds: sorted.map((r) => r.code),
    });
    for (const r of sorted) {
      const k = traitKey(r.trait);
      questions[r.code] = {
        id: r.code,
        prompt: r.text,
        caption: `${r.trait} · ${r.facet} · ${r.code}`,
        type: "likert",
        scaleMin: 1,
        scaleMax: OCEAN_SCALE_MAX,
        reverse: r.is_reverse === true,
        weights: { [k]: 1 },
      };
    }
  }

  return {
    id: OCEAN_ASSESSMENT_ID,
    active: true,
    title: "Fitness-related personality inventory",
    description:
      "Rate how much you agree with each statement using the numbered scale (1 disagree → 7 agree). Reverse-keyed lines are flipped automatically.",
    sections,
    questions,
    interpretation: {
      archetypes: [
        {
          key: "openness",
          label: "Openness-led mover",
          minScore: 0,
          summary:
            "You explore new modalities, cuisines, and recovery ideas willingly—novelty is informational fuel.",
          bullets: ["Rotate modalities seasonally but keep injury guardrails.", "Pilot one new habit per quarter."],
        },
        {
          key: "conscientiousness",
          label: "Structure-forward executor",
          minScore: 0,
          summary: "Consistency and follow-through outweigh whims—plans are your compass.",
          bullets: ["Protect non-negotiable training blocks.", "Review weekly adherence, not vibes."],
        },
        {
          key: "extraversion",
          label: "Energized collaborator",
          minScore: 0,
          summary: "Sessions, classes, and training partners amplify your adherence.",
          bullets: ["Leverage buddy systems for adherence.", "Build solo contingency plans."],
        },
        {
          key: "agreeableness",
          label: "Support-seeking harmonizer",
          minScore: 0,
          summary: "You respond to coaching, community, and prosocial accountability.",
          bullets: ["Name one coach or peer you’ll listen to when choices conflict.", "Balance people-pleasing with sleep."],
        },
        {
          key: "neuroticism",
          label: "Signal-sensitive regulator",
          minScore: 0,
          summary:
            "You notice stress and fatigue quickly—use that signal to adjust load before breakdown.",
          bullets: ["Track HRV/sleep as leading indicators.", "Shorten sessions instead of cancelling entirely."],
        },
      ],
    },
  };
}
