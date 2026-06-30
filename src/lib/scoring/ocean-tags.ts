import categoryTagByFacetJson from "@/data/ocean/category-tag-by-facet.json";
import traitTagConfigJson from "@/data/ocean/trait-tag-config.json";
import type { TraitKey } from "@/lib/scoring/persona-types";
import { TRAIT_KEYS } from "@/lib/scoring/persona-types";

type ScoreBand = { min: number; max: number; tag: string };

type TraitTagRow = {
  trait: string;
  traitCode: string;
  bands: ScoreBand[];
};

type CategoryTagRow = {
  trait: string;
  category: string;
  categoryCode: string;
  bands: ScoreBand[];
};

const TRAIT_CODE_TO_KEY: Record<string, TraitKey> = {
  o: "openness",
  c: "conscientiousness",
  e: "extraversion",
  a: "agreeableness",
  n: "neuroticism",
};

/** PDA col T — single-letter trait code for master oceanTraitTags (O_high, C_low, …). */
const TRAIT_KEY_TO_COL_T_CODE: Record<TraitKey, string> = {
  openness: "O",
  conscientiousness: "C",
  extraversion: "E",
  agreeableness: "A",
  neuroticism: "N",
};

const TRAIT_BANDS = ["low", "medium", "high"] as const;

/** Map analytics trait tag (openness_high) → col T tag (O_high). */
export function traitTagToColT(traitKey: TraitKey, analyticsTag: string): string | null {
  const code = TRAIT_KEY_TO_COL_T_CODE[traitKey];
  if (!code) return null;
  for (const level of TRAIT_BANDS) {
    if (analyticsTag === `${traitKey}_${level}`) return `${code}_${level}`;
  }
  return null;
}

/** Map a flat analytics trait tag string to col T when recognized. */
export function analyticsTraitTagToColT(analyticsTag: string): string | null {
  for (const key of TRAIT_KEYS) {
    if (analyticsTag.startsWith(`${key}_`)) {
      return traitTagToColT(key, analyticsTag);
    }
  }
  return null;
}

/** Ensure col T trait tags are present (for legacy stored oceanTags). */
export function ensureColTOceanTags(tags: string[]): string[] {
  const out = new Set(tags);
  for (const tag of tags) {
    const colT = analyticsTraitTagToColT(tag);
    if (colT) out.add(colT);
  }
  return [...out];
}

const traitTagConfig = traitTagConfigJson as TraitTagRow[];
const categoryTagByFacet = categoryTagByFacetJson as Record<string, CategoryTagRow>;

function tagForScore(score: number, bands: ScoreBand[]): string | null {
  for (const band of bands) {
    if (score >= band.min && score <= band.max) return band.tag;
  }
  return null;
}

export type OceanTagProfile = {
  /** Trait-level analytics tags (e.g. openness_high). */
  traitTags: Record<TraitKey, string>;
  /** Facet ID → category tag (e.g. O-NC → nutritional_curiosity_high). */
  categoryTags: Record<string, string>;
  /** Flat deduped list: analytics trait tags, col T trait tags (O_high), and category tags. */
  oceanTags: string[];
};

export function computeOceanTags(
  traitAverages: Record<TraitKey, number>,
  facetAverages: Record<string, number>,
): OceanTagProfile {
  const traitTags = {} as Record<TraitKey, string>;
  for (const row of traitTagConfig) {
    const key = TRAIT_CODE_TO_KEY[row.traitCode.toLowerCase()];
    if (!key) continue;
    const score = traitAverages[key];
    if (typeof score !== "number") continue;
    const tag = tagForScore(score, row.bands);
    if (tag) traitTags[key] = tag;
  }

  const categoryTags: Record<string, string> = {};
  for (const [facetId, avg] of Object.entries(facetAverages)) {
    const cfg = categoryTagByFacet[facetId];
    if (!cfg || typeof avg !== "number") continue;
    const tag = tagForScore(avg, cfg.bands);
    if (tag) categoryTags[facetId] = tag;
  }

  const colTTraitTags = (Object.entries(traitTags) as [TraitKey, string][])
    .map(([key, tag]) => traitTagToColT(key, tag))
    .filter((t): t is string => t != null);

  const oceanTags = [
    ...new Set([
      ...Object.values(traitTags),
      ...colTTraitTags,
      ...Object.values(categoryTags),
    ]),
  ];

  return { traitTags, categoryTags, oceanTags };
}

/** Tag config metadata for admin / Firestore seed (tags only, no meanings). */
export function exportOceanTagConfigForStorage() {
  return {
    version: "v1.0",
    questionnaireVersion: "v5",
    traitTags: traitTagConfig.map((r) => ({
      traitCode: r.traitCode,
      bands: r.bands.map((b) => ({ min: b.min, max: b.max, tag: b.tag })),
    })),
    categoryTags: Object.entries(categoryTagByFacet).map(([facetId, row]) => ({
      facetId,
      categoryCode: row.categoryCode,
      bands: row.bands.map((b) => ({ min: b.min, max: b.max, tag: b.tag })),
    })),
  };
}

export function allTraitKeys(): TraitKey[] {
  return [...TRAIT_KEYS];
}
