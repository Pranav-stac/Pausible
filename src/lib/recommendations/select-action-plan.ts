import { isActionPlanPoolRow, resolvedText } from "@/lib/recommendations/action-pool";
import { hasBarrierOverride } from "@/lib/recommendations/barrier-override-tags";
import { clusterRecommendations } from "@/lib/recommendations/cluster";
import { GOAL_PREFERENCE_BRIDGE_REC_ID } from "@/lib/recommendations/goal-preference-bridge";
import { selectHighImpactPriorities } from "@/lib/recommendations/select-opportunities";
import { selectPiSeries } from "@/lib/recommendations/select-pi-series";
import { compareScored, type RankContext } from "@/lib/recommendations/score";
import { selectTriggeredSafetyGuidance } from "@/lib/recommendations/safety";
import type {
  ActionPlanSelection,
  PillarActionPlan,
  PillarName,
  ScoredRecommendation,
  UserProfile,
} from "@/lib/recommendations/types";

const PILLARS: PillarName[] = ["Nutrition", "Physical Activity", "Sleep & Recovery", "Mental Wellness"];

function pickUnique(
  rows: ScoredRecommendation[],
  count: number,
  used: Set<string>,
  ctx?: RankContext,
): ScoredRecommendation[] {
  const out: ScoredRecommendation[] = [];
  const sorted = [...rows].sort((a, b) => compareScored(a, b, ctx));
  for (const row of sorted) {
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
  ctx?: RankContext,
): ScoredRecommendation[] {
  const out: ScoredRecommendation[] = [];
  const seenCategories = new Set<string>();
  const sorted = [...rows].sort((a, b) => compareScored(a, b, ctx));
  for (const row of sorted) {
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

  const rankCtx: RankContext = { selectedCategories: new Set<string>(), pillarAssignmentCounts: {} };
  const dos = pickUniqueByCategory(dosPool, 3, used, rankCtx);
  for (const d of dos) rankCtx.selectedCategories?.add(d.category);
  const donts = pickUnique(dontsPool, 2, used, rankCtx);
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

function ensureGoalPreferenceBridgeInPhysicalActivity(
  plan: PillarActionPlan,
  ranked: ScoredRecommendation[],
  profile: UserProfile,
  used: Set<string>,
): PillarActionPlan {
  if (!profile.goalPreferenceBridge) return plan;

  const bridge = ranked.find((r) => r.id === GOAL_PREFERENCE_BRIDGE_REC_ID);
  if (!bridge || plan.dos.some((d) => d.id === bridge.id)) return plan;

  used.add(bridge.id);
  const bridgeItem = {
    id: bridge.id,
    text: resolvedText(bridge, profile),
    category: bridge.category,
  };
  const dos = [bridgeItem, ...plan.dos.filter((d) => d.id !== bridge.id)].slice(0, 3);

  return {
    ...plan,
    dos,
    sourceIds: [...new Set([...plan.sourceIds, bridge.id])],
  };
}

function pairNutritionDontsForEmotionalEating(
  plan: PillarActionPlan,
  ranked: ScoredRecommendation[],
  profile: UserProfile,
  used: Set<string>,
): PillarActionPlan {
  if (plan.pillar !== "Nutrition" || !hasBarrierOverride(profile, "emotional_eating")) {
    return plan;
  }

  const dontsPool = ranked.filter(
    (r) => r.pillar === "Nutrition" && r.type === "dont" && isActionPlanPoolRow(r),
  );
  const donts = [...plan.donts];

  while (donts.length < plan.dos.length && donts.length < 2) {
    const next = dontsPool.find((r) => !used.has(r.id) && !donts.some((d) => d.id === r.id));
    if (!next) break;
    used.add(next.id);
    donts.push({
      id: next.id,
      text: resolvedText(next, profile),
      category: next.category,
    });
  }

  if (donts.length === plan.donts.length) return plan;

  return {
    ...plan,
    donts,
    sourceIds: [...new Set([...plan.sourceIds, ...donts.map((d) => d.id)])],
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
    let plan = buildPillarPlan(pillar, ranked, profile, used);
    if (pillar === "Nutrition") {
      plan = pairNutritionDontsForEmotionalEating(plan, ranked, profile, used);
    }
    if (pillar === "Physical Activity") {
      plan = ensureGoalPreferenceBridgeInPhysicalActivity(plan, ranked, profile, used);
    }
    pillarPlans[pillar] = plan;
  }

  const opportunityCards = selectHighImpactPriorities(ranked, profile, pillarPlans);
  for (const card of opportunityCards) used.add(card.id);

  const opportunities = clusterRecommendations(ranked, profile);

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
    opportunities,
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
