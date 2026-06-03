import questionBankRaw from "../../../question.json";
import facetOrderJson from "@/data/ocean/facet-order.json";
import type { TraitKey } from "@/lib/scoring/persona-types";
import { traitKeyFromLabel } from "@/lib/scoring/persona-defaults";

export const OCEAN_LIKERT_MIN = 1;
export const OCEAN_LIKERT_MAX = 7;

export type QuestionBankItem = {
  id: string;
  code: string;
  trait: string;
  facet: string;
  facetId?: string;
  text: string;
  is_reverse: boolean;
  order_index: number;
  is_active?: boolean;
};

/** Facet IDs in v5 questionnaire order (30 facets × 3 items). */
export const FACET_IDS_ORDERED = facetOrderJson as readonly string[];

export function facetIdFromQuestionCode(code: string): string {
  const m = code.match(/^([A-Z]-[A-Z]{2})-\d+$/);
  return m?.[1] ?? code.replace(/-\d+$/, "");
}

export function activeQuestionBank(): QuestionBankItem[] {
  return [...(questionBankRaw as unknown as QuestionBankItem[])]
    .filter((r) => r.is_active !== false)
    .sort((a, b) => a.order_index - b.order_index);
}

export function facetsByTrait(): Record<TraitKey, string[]> {
  const map = {} as Record<TraitKey, string[]>;
  for (const row of activeQuestionBank()) {
    const traitKey = traitKeyFromLabel(row.trait);
    if (!traitKey) continue;
    const facetId = row.facetId ?? facetIdFromQuestionCode(row.code);
    if (!map[traitKey]) map[traitKey] = [];
    if (!map[traitKey].includes(facetId)) map[traitKey].push(facetId);
  }
  for (const t of Object.keys(map) as TraitKey[]) {
    map[t].sort(
      (a, b) =>
        FACET_IDS_ORDERED.indexOf(a as (typeof FACET_IDS_ORDERED)[number]) -
        FACET_IDS_ORDERED.indexOf(b as (typeof FACET_IDS_ORDERED)[number]),
    );
  }
  return map;
}
