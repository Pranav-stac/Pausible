import { isActionPlanPoolRow, primaryPersonaMatchesRow, resolvedText } from "@/lib/recommendations/action-pool";
import { hasBarrierOverride } from "@/lib/recommendations/barrier-override-tags";
import { selectOpportunityClusters } from "@/lib/recommendations/cluster";
import { GOAL_PREFERENCE_BRIDGE_REC_ID } from "@/lib/recommendations/goal-preference-bridge";
import { rowHasRole } from "@/lib/recommendations/recommendation-role";
import { selectHighImpactPriorities } from "@/lib/recommendations/select-opportunities";
import { selectPiSeries } from "@/lib/recommendations/select-pi-series";
import type { RankContext } from "@/lib/recommendations/score";
import { selectSafetyCards, selectTriggeredSafetyGuidance } from "@/lib/recommendations/safety";
import { expandSelectionToTargetCount } from "@/lib/recommendations/variable-rec-count";
import type {
  ActionPlanSelection,
  PillarActionPlan,
  PillarName,
  ScoredRecommendation,
  UserProfile,
} from "@/lib/recommendations/types";

const PILLARS: PillarName[] = ["Nutrition", "Physical Activity", "Sleep & Recovery", "Mental Wellness"];

/** PDA §15 — coach_note selection is persona-driven (primary match, top by score). */
function selectCoachNotes(
  ranked: ScoredRecommendation[],
  profile: UserProfile,
  used: Set<string>,
  count = 3,
): ScoredRecommendation[] {
  const out: ScoredRecommendation[] = [];
  for (const row of ranked) {
    if (out.length >= count) break;
    if (used.has(row.id)) continue;
    if (!rowHasRole(row, "coach_note") && row.type !== "coach_note" && row.type !== "mindset_shift") {
      continue;
    }
    // Prefer dedicated coach_note role; mindset_shift only if persona-matched and no dedicated notes.
    if (!rowHasRole(row, "coach_note") && row.type === "mindset_shift") continue;
    if (!primaryPersonaMatchesRow(row, profile.primaryPersonaAlias) && !row.personaFit.includes("all_personas")) {
      continue;
    }
    used.add(row.id);
    out.push(row);
  }
  // Fallback: persona-matched mindset_shift if no dedicated coach_notes.
  if (out.length === 0) {
    for (const row of ranked) {
      if (out.length >= count) break;
      if (used.has(row.id)) continue;
      if (row.type !== "mindset_shift") continue;
      if (!primaryPersonaMatchesRow(row, profile.primaryPersonaAlias) && !row.personaFit.includes("all_personas")) {
        continue;
      }
      used.add(row.id);
      out.push(row);
    }
  }
  return out;
}

function pickUnique(
  rows: ScoredRecommendation[],
  count: number,
  used: Set<string>,
  _ctx?: RankContext,
): ScoredRecommendation[] {
  // Preserve MMR / score ordering from `ranked` (PDA §15) — do not re-sort by raw score.
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
  _ctx?: RankContext,
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

  const dosPool = inPillar.filter(
    (r) => r.type === "do" || r.type === "first_action" || r.recommendationRole === "first_action",
  );
  const dontsPool = inPillar.filter((r) => r.type === "dont");

  const rankCtx: RankContext = { selectedCategories: new Set<string>(), pillarAssignmentCounts: {} };
  const dos = pickUniqueByCategory(dosPool, 3, used, rankCtx);
  for (const d of dos) rankCtx.selectedCategories?.add(d.category);

  // PDA §15 — dont complement-do: prefer same Category as selected DOs.
  const donts: ScoredRecommendation[] = [];
  const doCategories = new Set(dos.map((d) => d.category));
  for (const row of dontsPool) {
    if (donts.length >= 2) break;
    if (used.has(row.id)) continue;
    if (!doCategories.has(row.category)) continue;
    used.add(row.id);
    donts.push(row);
  }
  for (const row of dontsPool) {
    if (donts.length >= 2) break;
    if (used.has(row.id)) continue;
    used.add(row.id);
    donts.push(row);
  }
  if (focus) used.add(focus.id);

  const sourceIds = [
    ...new Set([...(focus ? [focus.id] : []), ...dos.map((d) => d.id), ...donts.map((d) => d.id)]),
  ];

  return {
    pillar,
    focusArea: focus ? resolvedText(focus, profile, { topScoring: true }) : pillar,
    focusReason: focus
      ? resolvedText(focus, profile, { topScoring: true })
      : `Personalized ${pillar} guidance for your profile.`,
    focusId: focus?.id ?? null,
    dos: dos.map((d) => ({
      id: d.id,
      text: resolvedText(d, profile, { topScoring: true }),
      category: d.category,
      scopeClassification: d.scopeClassification || undefined,
      userFacingBoundary: d.userFacingBoundary || undefined,
    })),
    donts: donts.map((d) => ({
      id: d.id,
      text: resolvedText(d, profile, { topScoring: true }),
      category: d.category,
      scopeClassification: d.scopeClassification || undefined,
      userFacingBoundary: d.userFacingBoundary || undefined,
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
    text: resolvedText(bridge, profile, { topScoring: true }),
    category: bridge.category,
    scopeClassification: bridge.scopeClassification || undefined,
    userFacingBoundary: bridge.userFacingBoundary || undefined,
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
  const pairedIds = new Set(donts.map((d) => d.id));

  for (const d of plan.dos) {
    if (donts.length >= 2) break;
    const match =
      dontsPool.find(
        (r) =>
          !used.has(r.id) &&
          !pairedIds.has(r.id) &&
          !donts.some((x) => x.id === r.id) &&
          r.category === d.category,
      ) ??
      dontsPool.find(
        (r) =>
          !used.has(r.id) &&
          !pairedIds.has(r.id) &&
          !donts.some((x) => x.id === r.id),
      );
    if (!match) continue;
    used.add(match.id);
    pairedIds.add(match.id);
    donts.push({
      id: match.id,
      text: resolvedText(match, profile, { topScoring: true }),
      category: match.category,
      scopeClassification: match.scopeClassification || undefined,
      userFacingBoundary: match.userFacingBoundary || undefined,
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

  const opportunities = selectOpportunityClusters(ranked, profile);

  const safetyCards = selectSafetyCards(ranked, profile);
  const safetyGuidance = selectTriggeredSafetyGuidance(ranked, profile);
  for (const s of safetyGuidance) used.add(s.id);
  for (const id of piSeries.sourceIds) used.add(id);

  const coachSourceRows = selectCoachNotes(ranked, profile, used, 3);

  const validationWarnings: string[] = [];
  if (!piSeries.complete) {
    validationWarnings.push("PI series incomplete for primary persona — some report sections may use fallbacks.");
  }
  const scoredPositive = ranked.filter((r) => r.score.total > 0).length;
  if (scoredPositive < 50) {
    validationWarnings.push(`Only ${scoredPositive} recommendations scored above 0 (expected ≥50).`);
  }

  const coreSourceIds = [
    ...new Set([
      ...opportunityCards.flatMap((c) => c.sourceIds),
      ...PILLARS.flatMap((p) => pillarPlans[p].sourceIds),
      ...safetyGuidance.map((s) => s.id),
      ...safetyCards.map((s) => s.recId),
      ...piSeries.sourceIds,
      ...coachSourceRows.map((r) => r.id),
    ]),
  ];

  // PDA §13 — variable report rec count (20–35) from profile complexity.
  const expanded = expandSelectionToTargetCount(ranked, coreSourceIds, profile, {
    secondaryBlendPct: profile.secondaryBlendPct,
    safetyTriggered: safetyCards.length > 0 || safetyGuidance.length > 0,
  });
  if (expanded.expanded > 0) {
    validationWarnings.push(
      `Expanded report pool by ${expanded.expanded} to target ${expanded.target} (PDA §13).`,
    );
  }

  return {
    profile,
    ranked,
    opportunities,
    opportunityCards,
    piSeries,
    pillarPlans,
    launchpad: [],
    coachSourceRows,
    safetyGuidance,
    safetyCards,
    allSourceIds: expanded.ids,
    validationWarnings,
  };
}
