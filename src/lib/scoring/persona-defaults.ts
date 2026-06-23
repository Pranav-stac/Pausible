import type { PersonaCentroidTable, PersonaKey, TraitKey } from "@/lib/scoring/persona-types";

export const DEFAULT_PERSONA_ALPHA = 1;

/** Portrait filename is the persona key — never derived from display labels like "Watchful Deer". */
export function personaImagePath(key: PersonaKey): string {
  return `/Personas/${key}.jpeg`;
}

export const PERSONA_ANIMAL: Record<
  PersonaKey,
  { name: string; emoji: string; imagePath: string }
> = {
  self_regulated_planner: { name: "Steady Elephant", emoji: "🐘", imagePath: personaImagePath("self_regulated_planner") },
  social_motivator: { name: "Pack Wolf", emoji: "🐺", imagePath: personaImagePath("social_motivator") },
  stress_sensitive: { name: "Watchful Deer", emoji: "🦌", imagePath: personaImagePath("stress_sensitive") },
  curious_explorer: { name: "Curious Fox", emoji: "🦊", imagePath: personaImagePath("curious_explorer") },
  resilient_performer: { name: "Steadfast Bear", emoji: "🐻", imagePath: personaImagePath("resilient_performer") },
  brittle_avoidant: { name: "Shielded Turtle", emoji: "🐢", imagePath: personaImagePath("brittle_avoidant") },
};

export const PERSONA_DISPLAY: Record<
  PersonaKey,
  { label: string; archetype: string; summary: string; bullets: string[] }
> = {
  self_regulated_planner: {
    label: "Steady Elephant",
    archetype: "Self-Regulated Planner",
    summary:
      "High conscientiousness, low neuroticism. Plans methodically and stays consistent with structure and preparation.",
    bullets: [
      "Anchor training and nutrition to calendar blocks.",
      "Use checklists for travel or high-stress weeks.",
    ],
  },
  social_motivator: {
    label: "Pack Wolf",
    archetype: "Social Motivator",
    summary:
      "High extraversion and agreeableness. Thrives in groups and stays motivated through social energy and accountability.",
    bullets: [
      "Book partner sessions or group classes ahead of time.",
      "Name one accountability buddy for hard weeks.",
    ],
  },
  stress_sensitive: {
    label: "Watchful Deer",
    archetype: "Stress-Sensitive",
    summary:
      "High neuroticism, lower extraversion. Easily overwhelmed and needs safe, low-pressure environments to sustain wellness.",
    bullets: [
      "Scale load when sleep or stress spikes.",
      "Prefer shorter sessions over full skips.",
    ],
  },
  curious_explorer: {
    label: "Curious Fox",
    archetype: "Curious Explorer",
    summary:
      "High openness and extraversion. Seeks variety, learns quickly, and bores easily with rigid routines.",
    bullets: [
      "Rotate one new modality per season with guardrails.",
      "Pilot habits in 4-week experiments.",
    ],
  },
  resilient_performer: {
    label: "Steadfast Bear",
    archetype: "Resilient Performer",
    summary:
      "High conscientiousness, low neuroticism and extraversion. Gritty, self-reliant, and disciplined under pressure.",
    bullets: [
      "Keep a minimum viable routine for chaotic weeks.",
      "Review weekly trends, not single bad days.",
    ],
  },
  brittle_avoidant: {
    label: "Shielded Turtle",
    archetype: "Brittle/Avoidant",
    summary:
      "High neuroticism with lower scores elsewhere. Withdraws under pressure; small, low-friction wins rebuild momentum.",
    bullets: [
      "Start with 10-minute movement anchors.",
      "Pair new habits with existing cues you already do daily.",
    ],
  },
};

/** Persona Plan v7 benchmark centroids (columns F–K). */
export const DEFAULT_PERSONA_CENTROIDS: PersonaCentroidTable = {
  self_regulated_planner: {
    openness: 3.5,
    conscientiousness: 6.5,
    extraversion: 4.6,
    agreeableness: 5.5,
    neuroticism: 1.5,
  },
  social_motivator: {
    openness: 4.5,
    conscientiousness: 5.2,
    extraversion: 6.5,
    agreeableness: 6.0,
    neuroticism: 2.8,
  },
  stress_sensitive: {
    openness: 4.5,
    conscientiousness: 2.8,
    extraversion: 2.8,
    agreeableness: 5.0,
    neuroticism: 6.0,
  },
  curious_explorer: {
    openness: 6.5,
    conscientiousness: 2.5,
    extraversion: 5.5,
    agreeableness: 4.0,
    neuroticism: 2.5,
  },
  resilient_performer: {
    openness: 3.0,
    conscientiousness: 5.8,
    extraversion: 3.0,
    agreeableness: 5.0,
    neuroticism: 2.0,
  },
  brittle_avoidant: {
    openness: 2.5,
    conscientiousness: 2.5,
    extraversion: 2.0,
    agreeableness: 4.0,
    neuroticism: 6.5,
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
