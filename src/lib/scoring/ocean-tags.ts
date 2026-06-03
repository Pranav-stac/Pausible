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
  /** Flat deduped list for storage / analytics pipelines. */
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

  const oceanTags = [...new Set([...Object.values(traitTags), ...Object.values(categoryTags)])];

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
