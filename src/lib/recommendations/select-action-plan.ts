import { isActionPlanPoolRow, resolvedText } from "@/lib/recommendations/action-pool";
import { selectHighImpactPriorities } from "@/lib/recommendations/select-opportunities";
import { selectPiSeries } from "@/lib/recommendations/select-pi-series";
import { selectTriggeredSafetyGuidance } from "@/lib/recommendations/safety";
import type {
  ActionPlanSelection,
  PillarActionPlan,
  PillarName,
  ScoredRecommendation,
  UserProfile,
} from "@/lib/recommendations/types";

const PILLARS: PillarName[] = ["Nutrition", "Physical Activity", "Sleep & Recovery", "Mental Wellness"];

function pickUnique(rows: ScoredRecommendation[], count: number, used: Set<string>): ScoredRecommendation[] {
  const out: ScoredRecommendation[] = [];
  for (const row of rows) {
    if (used.has(row.id)) continue;
    used.add(row.id);
    out.push(row);
    if (out.length >= count) break;
  }
  return out;
}

function pickUniqueByCategory(
  rows: ScoredRecommendation[],
  count: number,
  used: Set<string>,
): ScoredRecommendation[] {
  const out: ScoredRecommendation[] = [];
  const seenCategories = new Set<string>();
  for (const row of rows) {
    if (used.has(row.id) || seenCategories.has(row.category)) continue;
    used.add(row.id);
    seenCategories.add(row.category);
    out.push(row);
    if (out.length >= count) break;
  }
  return out;
}

function buildPillarPlan(
  pillar: PillarName,
  ranked: ScoredRecommendation[],
  profile: UserProfile,
  used: Set<string>,
): PillarActionPlan {
  const inPillar = ranked.filter((r) => r.pillar === pillar && isActionPlanPoolRow(r));

  const mindsetPool = inPillar.filter((r) => r.type === "mindset_shift");
  const focus = mindsetPool[0] ?? null;

  const dosPool = inPillar.filter((r) => r.type === "do" || r.type === "first_action");
  const dontsPool = inPillar.filter((r) => r.type === "dont");

  const dos = pickUniqueByCategory(dosPool, 3, used);
  const donts = pickUnique(dontsPool, 2, used);
  if (focus) used.add(focus.id);

  const sourceIds = [
    ...new Set([...(focus ? [focus.id] : []), ...dos.map((d) => d.id), ...donts.map((d) => d.id)]),
  ];

  return {
    pillar,
    focusArea: focus ? resolvedText(focus, profile) : pillar,
    focusReason: focus ? resolvedText(focus, profile) : `Personalized ${pillar} guidance for your profile.`,
    focusId: focus?.id ?? null,
    dos: dos.map((d) => ({
      id: d.id,
      text: resolvedText(d, profile),
      category: d.category,
    })),
    donts: donts.map((d) => ({
      id: d.id,
      text: resolvedText(d, profile),
      category: d.category,
    })),
    sourceIds,
  };
}

/** v2.0 report section selection (Content Logic Guide + Template v4.0). */
export function selectActionPlan(
  ranked: ScoredRecommendation[],
  profile: UserProfile,
): ActionPlanSelection {
  const used = new Set<string>();
  const piSeries = selectPiSeries(ranked, profile);

  const pillarPlans = {} as Record<PillarName, PillarActionPlan>;
  for (const pillar of PILLARS) {
    pillarPlans[pillar] = buildPillarPlan(pillar, ranked, profile, used);
  }

  const opportunityCards = selectHighImpactPriorities(ranked, profile, pillarPlans);
  for (const card of opportunityCards) used.add(card.id);

  const safetyGuidance = selectTriggeredSafetyGuidance(ranked, profile);
  for (const s of safetyGuidance) used.add(s.id);
  for (const id of piSeries.sourceIds) used.add(id);

  const validationWarnings: string[] = [];
  if (!piSeries.complete) {
    validationWarnings.push("PI series incomplete for primary persona — some report sections may use fallbacks.");
  }
  const scoredPositive = ranked.filter((r) => r.score.total > 0).length;
  if (scoredPositive < 50) {
    validationWarnings.push(`Only ${scoredPositive} recommendations scored above 0 (expected ≥50).`);
  }

  const allSourceIds = [
    ...new Set([
      ...opportunityCards.flatMap((c) => c.sourceIds),
      ...PILLARS.flatMap((p) => pillarPlans[p].sourceIds),
      ...safetyGuidance.map((s) => s.id),
      ...piSeries.sourceIds,
    ]),
  ];

  return {
    profile,
    ranked,
    opportunities: [],
    opportunityCards,
    piSeries,
    pillarPlans,
    launchpad: [],
    coachSourceRows: [],
    safetyGuidance,
    allSourceIds,
    validationWarnings,
  };
}
