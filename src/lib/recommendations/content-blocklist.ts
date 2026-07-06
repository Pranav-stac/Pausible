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

/** PDA §25 — replace forbidden terms instead of failing the whole report. Longer phrases first. */
const BLOCKLIST_REPLACEMENTS: [RegExp, string][] = [
  [/\bdo not push through\b/gi, "do not ignore"],
  [/\bdon't push through\b/gi, "don't ignore"],
  [/\bpush through\b/gi, "work through"],
  [/\byou've got this\b/gi, "you can build this steadily"],
  [/\bcrush your goals\b/gi, "reach your goals"],
  [/\bunleash your potential\b/gi, "grow at your pace"],
  [/\btransform your life\b/gi, "change your habits"],
  [/\bstay positive\b/gi, "stay steady"],
  [/\bbelieve in yourself\b/gi, "trust your process"],
  [/\bno excuses\b/gi, "no delays"],
  [/\bstay disciplined\b/gi, "stay consistent"],
  [/\bstay motivated\b/gi, "stay engaged"],
  [/\bconscientiousness\b/gi, "Discipline"],
  [/\bextraversion\b/gi, "Social Energy"],
  [/\bneuroticism\b/gi, "Stress Sensitivity"],
  [/\bactivation energy\b/gi, ""],
  [/\bblend ratio\b/gi, "pattern blend"],
  [/\breadiness signal\b/gi, "You'll know you're ready when"],
  [/\bpillar distribution\b/gi, "your plan across sleep, nutrition, movement, and mental wellness"],
  [/\bdensity weighting\b/gi, ""],
  [/\bphase assignment\b/gi, ""],
  [/\bscoring pipeline\b/gi, ""],
  [/\bscoring formula\b/gi, ""],
  [/\bthis pillar scored highly\b/gi, "this pillar matters strongly"],
  [/\bscored highly for your profile\b/gi, "matters strongly for your profile"],
  [/\bcluster score\b/gi, "priority level"],
  [/\bcluster\b/gi, "priority"],
  [/\b(?:total )?score\b/gi, "fit level"],
  [/\bscored\b/gi, "ranked"],
];

export function scrubBlocklistTerms(text: string): string {
  let out = text;
  for (const [pattern, replacement] of BLOCKLIST_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out.replace(/\s{2,}/g, " ").replace(/\s+([,.])/g, "$1").trim();
}
