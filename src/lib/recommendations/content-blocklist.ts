/** PDA §24 — global blocklist terms (user-facing output). */

export const FORBIDDEN_TECHNICAL_TRAITS = [
  "conscientiousness",
  "extraversion",
  "neuroticism",
  "ocean",
  "big five",
  "facet",
  "curiosity",
  "cooperation",
] as const;

export const FORBIDDEN_ENGINE_INTERNALS = [
  "activation energy",
  "blend ratio",
  "scoring",
  "scoring pipeline",
  "scoring formula",
  "score",
  "centroid",
  "euclidean",
  "softmax",
  "cluster",
  "recommendation master",
  "rec ids",
  "readiness signal",
  "pillar distribution",
  "density weighting",
  "phase assignment",
  "strength label",
] as const;

export const FORBIDDEN_MOTIVATIONAL_CLICHES = [
  "you've got this",
  "crush your goals",
  "unleash your potential",
  "transform your life",
  "stay positive",
  "believe in yourself",
  "no excuses",
  "push through",
  "stay disciplined",
  "stay motivated",
] as const;

/** PDA §24 — health-jargon terms blocked in user-facing output. */
export const FORBIDDEN_HEALTH_JARGON = [
  "biohacking",
  "mitochondrial",
  "metabolic adaptation",
  "circadian optimisation",
  "circadian optimization",
  "cortisol",
  "macros",
  "glycemic",
  "ketosis",
  "fasted",
] as const;

const ALL_BLOCKLIST_TERMS = [
  ...FORBIDDEN_TECHNICAL_TRAITS,
  ...FORBIDDEN_ENGINE_INTERNALS,
  ...FORBIDDEN_MOTIVATIONAL_CLICHES,
  ...FORBIDDEN_HEALTH_JARGON,
] as const;

export function containsBlocklistTerm(text: string): string | null {
  const lower = text.toLowerCase();
  for (const term of ALL_BLOCKLIST_TERMS) {
    if (lower.includes(term)) return term;
  }
  return null;
}

export function scanTextForBlocklist(text: string, field = "text"): { field: string; term: string }[] {
  const hit = containsBlocklistTerm(text);
  return hit ? [{ field, term: hit }] : [];
}
