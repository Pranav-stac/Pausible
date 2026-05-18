import type { PersonaCentroidTable, PersonaKey, TraitKey } from "@/lib/scoring/persona-types";

export const DEFAULT_PERSONA_ALPHA = 1;

export const PERSONA_DISPLAY: Record<
  PersonaKey,
  { label: string; summary: string; bullets: string[] }
> = {
  self_regulated_planner: {
    label: "Self-regulated planner",
    summary:
      "You rely on structure, preparation, and steady routines—plans turn intent into repeatable action.",
    bullets: [
      "Anchor training and nutrition to calendar blocks.",
      "Use checklists for travel or high-stress weeks.",
    ],
  },
  social_motivator: {
    label: "Social motivator",
    summary:
      "Energy and accountability from people and shared goals keep you showing up consistently.",
    bullets: [
      "Book partner sessions or group classes ahead of time.",
      "Name one accountability buddy for hard weeks.",
    ],
  },
  stress_sensitive: {
    label: "Stress-sensitive",
    summary:
      "Stress and overload show up quickly in mood and recovery—early signals matter more than willpower.",
    bullets: [
      "Scale load when sleep or stress spikes.",
      "Prefer shorter sessions over full skips.",
    ],
  },
  curious_explorer: {
    label: "Curious Explorer",
    summary:
      "Novelty and learning drive adherence—you stay engaged when workouts and nutrition stay fresh.",
    bullets: [
      "Rotate one new modality per season with guardrails.",
      "Pilot habits in 4-week experiments.",
    ],
  },
  resilient_performer: {
    label: "Resilient Performer",
    summary:
      "You bounce back from setbacks and maintain output under pressure with balanced structure.",
    bullets: [
      "Keep a minimum viable routine for chaotic weeks.",
      "Review weekly trends, not single bad days.",
    ],
  },
  brittle_avoidant: {
    label: "Brittle / Avoidant",
    summary:
      "Avoidance spikes when load or discomfort rises—small, low-friction wins rebuild momentum.",
    bullets: [
      "Start with 10-minute movement anchors.",
      "Pair new habits with existing cues you already do daily.",
    ],
  },
};

/** Spec default centroid table (traits × personas). */
export const DEFAULT_PERSONA_CENTROIDS: PersonaCentroidTable = {
  self_regulated_planner: {
    openness: 4.0,
    conscientiousness: 6.4,
    extraversion: 4.6,
    agreeableness: 4.6,
    neuroticism: 1.6,
  },
  social_motivator: {
    openness: 4.6,
    conscientiousness: 5.2,
    extraversion: 6.4,
    agreeableness: 6.1,
    neuroticism: 2.8,
  },
  stress_sensitive: {
    openness: 4.6,
    conscientiousness: 2.8,
    extraversion: 2.8,
    agreeableness: 5.0,
    neuroticism: 6.1,
  },
  curious_explorer: {
    openness: 6.4,
    conscientiousness: 3.4,
    extraversion: 4.6,
    agreeableness: 4.0,
    neuroticism: 2.5,
  },
  resilient_performer: {
    openness: 4.6,
    conscientiousness: 5.8,
    extraversion: 4.6,
    agreeableness: 5.0,
    neuroticism: 3.5,
  },
  brittle_avoidant: {
    openness: 2.8,
    conscientiousness: 2.5,
    extraversion: 2.2,
    agreeableness: 3.4,
    neuroticism: 6.7,
  },
};

export function traitKeyFromLabel(trait: string): TraitKey | null {
  const k = trait.trim().replace(/\s+/g, "_").toLowerCase();
  if (
    k === "openness" ||
    k === "conscientiousness" ||
    k === "extraversion" ||
    k === "agreeableness" ||
    k === "neuroticism"
  ) {
    return k;
  }
  return null;
}
