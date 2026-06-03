import type { AttemptAnswers, AttemptScores } from "@/types/models";
import {
  activeQuestionBank,
  facetIdFromQuestionCode,
  facetsByTrait,
  OCEAN_LIKERT_MAX,
  OCEAN_LIKERT_MIN,
} from "@/lib/scoring/question-bank-meta";
import { DEFAULT_PERSONA_ALPHA, DEFAULT_PERSONA_CENTROIDS, traitKeyFromLabel } from "@/lib/scoring/persona-defaults";
import { computeOceanTags } from "@/lib/scoring/ocean-tags";
import type {
  PersonaAnalysis,
  PersonaCentroidTable,
  PersonaKey,
  PersonaScoringConfig,
  QuestionItemResponse,
  TraitKey,
} from "@/lib/scoring/persona-types";
import { PERSONA_KEYS, TRAIT_KEYS } from "@/lib/scoring/persona-types";

export function likertResponseScore(raw: number, reverse: boolean): number {
  const clipped = Math.min(OCEAN_LIKERT_MAX, Math.max(OCEAN_LIKERT_MIN, Math.round(raw)));
  return reverse ? OCEAN_LIKERT_MAX + OCEAN_LIKERT_MIN - clipped : clipped;
}

export function buildItemResponses(answers: AttemptAnswers): QuestionItemResponse[] {
  const bank = activeQuestionBank();
  const rows: QuestionItemResponse[] = [];

  for (const item of bank) {
    const raw = answers[item.code];
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    rows.push({
      questionId: item.code,
      facetId: facetIdFromQuestionCode(item.code),
      trait: item.trait,
      question: item.text,
      responseScore: likertResponseScore(raw, item.is_reverse === true),
    });
  }

  return rows;
}

export function computeFacetAverages(itemResponses: QuestionItemResponse[]): Record<string, number> {
  const sums: Record<string, { total: number; count: number }> = {};
  for (const row of itemResponses) {
    const slot = sums[row.facetId] ?? { total: 0, count: 0 };
    slot.total += row.responseScore;
    slot.count += 1;
    sums[row.facetId] = slot;
  }
  const out: Record<string, number> = {};
  for (const [facetId, { total, count }] of Object.entries(sums)) {
    if (count > 0) out[facetId] = total / count;
  }
  return out;
}

export function computeTraitAverages(facetAverages: Record<string, number>): Record<TraitKey, number> {
  const byTrait = facetsByTrait();
  const traitAverages = {} as Record<TraitKey, number>;

  for (const traitKey of TRAIT_KEYS) {
    const facetIds = byTrait[traitKey] ?? [];
    const values = facetIds.map((f) => facetAverages[f]).filter((v): v is number => typeof v === "number");
    traitAverages[traitKey] =
      values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  return traitAverages;
}

export function euclideanPersonaDistance(
  traitAverages: Record<TraitKey, number>,
  centroid: Record<TraitKey, number>,
): number {
  let sumSq = 0;
  for (const trait of TRAIT_KEYS) {
    const diff = (traitAverages[trait] ?? 0) - (centroid[trait] ?? 0);
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq);
}

export function computePersonaDistances(
  traitAverages: Record<TraitKey, number>,
  centroids: PersonaCentroidTable,
): Record<PersonaKey, number> {
  const out = {} as Record<PersonaKey, number>;
  for (const key of PERSONA_KEYS) {
    out[key] = euclideanPersonaDistance(traitAverages, centroids[key]);
  }
  return out;
}

export function computePersonaSi(
  distances: Record<PersonaKey, number>,
  alpha: number,
): Record<PersonaKey, number> {
  const out = {} as Record<PersonaKey, number>;
  for (const key of PERSONA_KEYS) {
    out[key] = Math.exp(alpha * -distances[key]);
  }
  return out;
}

export function computePersonaPercentages(si: Record<PersonaKey, number>): Record<PersonaKey, number> {
  const sum = PERSONA_KEYS.reduce((acc, k) => acc + (si[k] ?? 0), 0);
  const out = {} as Record<PersonaKey, number>;
  for (const key of PERSONA_KEYS) {
    out[key] = sum > 0 ? ((si[key] ?? 0) / sum) * 100 : 0;
  }
  return out;
}

function topTwoPersonas(percentages: Record<PersonaKey, number>): { primary: PersonaKey; secondary: PersonaKey } {
  const ranked = [...PERSONA_KEYS].sort((a, b) => (percentages[b] ?? 0) - (percentages[a] ?? 0));
  return {
    primary: ranked[0] ?? PERSONA_KEYS[0],
    secondary: ranked[1] ?? PERSONA_KEYS[1],
  };
}

export function computePersonaAnalysis(
  answers: AttemptAnswers,
  config?: Partial<PersonaScoringConfig>,
): PersonaAnalysis {
  const centroids = config?.centroids ?? DEFAULT_PERSONA_CENTROIDS;
  const alpha =
    typeof config?.alpha === "number" && Number.isFinite(config.alpha) && config.alpha > 0
      ? config.alpha
      : DEFAULT_PERSONA_ALPHA;

  const itemResponses = buildItemResponses(answers);
  const facetAverages = computeFacetAverages(itemResponses);
  const traitAverages = computeTraitAverages(facetAverages);
  const { traitTags, categoryTags, oceanTags } = computeOceanTags(traitAverages, facetAverages);
  const personaDistances = computePersonaDistances(traitAverages, centroids);
  const personaSi = computePersonaSi(personaDistances, alpha);
  const personaPercentages = computePersonaPercentages(personaSi);
  const { primary, secondary } = topTwoPersonas(personaPercentages);

  return {
    itemResponses,
    facetAverages,
    traitAverages,
    traitTags,
    categoryTags,
    oceanTags,
    personaDistances,
    personaSi,
    personaPercentages,
    primaryPersona: primary,
    secondaryPersona: secondary,
    alpha,
    computedAt: new Date().toISOString(),
  };
}

/** Maps persona analysis into legacy `AttemptScores` fields used across the app. */
export function attemptScoresFromPersonaAnalysis(persona: PersonaAnalysis): AttemptScores {
  const dimensions: Record<string, number> = { ...persona.traitAverages };
  return {
    dimensions,
    archetypeKey: persona.primaryPersona,
    secondaryArchetypeKey: persona.secondaryPersona,
    persona,
  };
}

export function mergeCentroidsFromFirestore(
  partial: Partial<PersonaCentroidTable> | null | undefined,
): PersonaCentroidTable {
  const base = structuredClone(DEFAULT_PERSONA_CENTROIDS);
  if (!partial) return base;
  for (const persona of PERSONA_KEYS) {
    const row = partial[persona];
    if (!row) continue;
    for (const trait of TRAIT_KEYS) {
      const v = row[trait];
      if (typeof v === "number" && Number.isFinite(v)) {
        base[persona][trait] = Math.min(OCEAN_LIKERT_MAX, Math.max(OCEAN_LIKERT_MIN, v));
      }
    }
  }
  return base;
}
