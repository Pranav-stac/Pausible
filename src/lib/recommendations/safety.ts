import { primaryPersonaMatchesRow, resolvedText } from "@/lib/recommendations/action-pool";
import {
  NUTRITION_DISCLAIMER,
  PHYSICAL_DISCLAIMER_DEFAULT,
  PHYSICAL_DISCLAIMER_PREGNANCY,
} from "@/lib/recommendations/safety-disclaimers";
import type { PillarName, SafetyCard, ScoredRecommendation, UserProfile } from "@/lib/recommendations/types";

export type { SafetyCard };

function intersect(a: string[], b: string[]): string[] {
  const set = new Set(b);
  return a.filter((x) => set.has(x));
}

/** PDA §38.9 — severity 1 = highest priority when capping at 3 cards. */
function severityRankForRow(row: ScoredRecommendation, profile: UserProfile): number {
  const tags = [...row.excludeIf, ...row.contextFit, ...profile.exclusions];
  if (tags.some((t) => t.includes("pregnancy") || t.includes("postpartum"))) return 1;
  if (tags.some((t) => t.includes("medical") || t.includes("doctor_advised"))) return 2;
  if (tags.some((t) => t.includes("injury") || t.includes("persistent_pain"))) return 3;
  if (tags.some((t) => t.includes("severe_fatigue"))) return 4;
  if (profile.isElderly65 || profile.context.includes("age_55_64") || profile.context.includes("age_65_plus")) {
    return 5;
  }
  return 6;
}

function matchingTrigger(row: ScoredRecommendation, profile: UserProfile): string {
  const exclHit = profile.exclusions.find(
    (e) => e !== "exclude_none" && (row.excludeIf.includes(e) || row.contextFit.includes(e)),
  );
  if (exclHit) return exclHit;
  const ctxHit = intersect(row.contextFit, profile.context)[0];
  if (ctxHit) return ctxHit;
  const barrierHit = intersect(row.barrierFit, profile.barriers)[0];
  if (barrierHit) return barrierHit;
  if (profile.isElderly65) return "age_65_plus";
  return "persona_or_general";
}

function disclaimerForPillar(pillar: PillarName, profile: UserProfile): string | null {
  if (pillar === "Physical Activity") {
    if (profile.exclusions.some((e) => e.includes("pregnancy") || e.includes("postpartum"))) {
      return PHYSICAL_DISCLAIMER_PREGNANCY;
    }
    if (profile.exclusions.some((e) => e !== "exclude_none") || profile.isElderly65) {
      return PHYSICAL_DISCLAIMER_DEFAULT;
    }
  }
  if (pillar === "Nutrition" && profile.exclusions.some((e) => e !== "exclude_none")) {
    return NUTRITION_DISCLAIMER;
  }
  return null;
}

export function isSafetyScopedRow(
  row: Pick<
    ScoredRecommendation,
    "scopeClassification" | "userFacingBoundary" | "type" | "recommendationRole"
  >,
): boolean {
  return (
    row.scopeClassification === "safety_professional_referral" ||
    row.userFacingBoundary === "safety_sensitive" ||
    row.type === "safety_guidance" ||
    row.recommendationRole === "safety"
  );
}

/** Context tags that genuinely surface a safety / referral card (§38.9 — not generic fitness/goal fits). */
const SAFETY_RELEVANT_TAG =
  /pregnan|postpartum|injury|persistent_pain|medical|doctor_advised|severe_fatigue|physical_limitation|age_55|age_65|elderly/;

/** Triggered only when the user's condition activates the safety rec (§38.9 / Col W). */
export function isSafetyRowTriggered(row: ScoredRecommendation, profile: UserProfile): boolean {
  if (!isSafetyScopedRow(row)) return false;

  const personaOk =
    primaryPersonaMatchesRow(row, profile.primaryPersonaAlias) ||
    row.personaFit.includes("all_personas");
  if (!personaOk && (row.type === "safety_guidance" || row.recommendationRole === "safety")) {
    return false;
  }

  const activeExclusions = profile.exclusions.filter((e) => e !== "exclude_none");
  if (activeExclusions.some((tag) => row.excludeIf.includes(tag))) return true;

  if (intersect(row.contextFit, profile.context).some((t) => SAFETY_RELEVANT_TAG.test(t))) {
    return true;
  }
  if (intersect(row.barrierFit, profile.barriers).some((t) => SAFETY_RELEVANT_TAG.test(t))) {
    return true;
  }

  if (
    profile.isElderly65 &&
    (row.contextFit.some((t) => /age|elderly/.test(t)) ||
      row.type === "safety_guidance" ||
      row.recommendationRole === "safety")
  ) {
    return true;
  }

  return false;
}

/** Max 3 cards, severity-ordered (PDA §38.9). */
export function selectSafetyCards(
  ranked: ScoredRecommendation[],
  profile: UserProfile,
): SafetyCard[] {
  const triggered = ranked
    .filter((r) => isSafetyScopedRow(r) && isSafetyRowTriggered(r, profile))
    .map((r) => ({
      row: r,
      severityRank: severityRankForRow(r, profile),
      trigger: matchingTrigger(r, profile),
    }))
    .sort((a, b) => a.severityRank - b.severityRank || a.row.id.localeCompare(b.row.id));

  return triggered.slice(0, 3).map(({ row, severityRank, trigger }) => ({
    recId: row.id,
    trigger,
    severityRank,
    pillar: row.pillar,
    cardText: resolvedText(row, profile),
    disclaimerLine: disclaimerForPillar(row.pillar, profile),
  }));
}

/** Legacy list used by synthesis / UI (card backs). */
export function selectTriggeredSafetyGuidance(
  ranked: ScoredRecommendation[],
  profile: UserProfile,
): ScoredRecommendation[] {
  const cards = selectSafetyCards(ranked, profile);
  const byId = new Map(ranked.map((r) => [r.id, r]));
  return cards.map((c) => byId.get(c.recId)).filter((r): r is ScoredRecommendation => Boolean(r));
}
