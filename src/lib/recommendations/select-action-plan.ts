import { isActionPlanPoolRow, resolvedText } from "@/lib/recommendations/action-pool";
import { selectHighImpactOpportunities } from "@/lib/recommendations/select-opportunities";
import { selectPiSeries } from "@/lib/recommendations/select-pi-series";
import { selectTriggeredSafetyGuidance } from "@/lib/recommendations/safety";
import type {
  ActionPlanSelection,
  LaunchpadGroup,
  LaunchpadItem,
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

  const dos = pickUniqueByCategory(dosPool, 4, used);
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

function selectLaunchpad(ranked: ScoredRecommendation[], profile: UserProfile, used: Set<string>): LaunchpadItem[] {
  const pool = ranked.filter((r) => isActionPlanPoolRow(r));
  const items: LaunchpadItem[] = [];

  const firstActions = pickUnique(
    pool.filter((r) => r.type === "first_action" && (r.strength === "core" || r.strength === "supporting")),
    2,
    used,
  );
  for (const r of firstActions) {
    items.push({
      id: r.id,
      text: resolvedText(r, profile),
      pillar: r.pillar,
      group: "start_here",
    });
  }

  const envChanges = pickUnique(pool.filter((r) => r.type === "environment_change"), 2, used);
  for (const r of envChanges) {
    items.push({
      id: r.id,
      text: resolvedText(r, profile),
      pillar: r.pillar,
      group: "environment_setup",
    });
  }

  const recoveryRules = pickUnique(pool.filter((r) => r.type === "recovery_rule"), 2, used);
  for (const r of recoveryRules) {
    items.push({
      id: r.id,
      text: resolvedText(r, profile),
      pillar: r.pillar,
      group: "recovery_rules",
    });
  }

  return items;
}

/** v2.1 report section selection (Content Logic Guide + A12-A13). */
export function selectActionPlan(
  ranked: ScoredRecommendation[],
  profile: UserProfile,
): ActionPlanSelection {
  const used = new Set<string>();
  const piSeries = selectPiSeries(ranked, profile);
  const opportunityCards = selectHighImpactOpportunities(ranked, profile);
  for (const c of opportunityCards) used.add(c.id);

  const pillarPlans = {} as Record<PillarName, PillarActionPlan>;
  for (const pillar of PILLARS) {
    pillarPlans[pillar] = buildPillarPlan(pillar, ranked, profile, used);
  }

  const launchpad = selectLaunchpad(ranked, profile, used);

  const coachSourceRows = ranked
    .filter((r) => isActionPlanPoolRow(r) && r.type !== "mindset_shift")
    .slice(0, 5);

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
      ...launchpad.map((l) => l.id),
      ...coachSourceRows.map((c) => c.id),
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
    launchpad,
    coachSourceRows,
    safetyGuidance,
    allSourceIds,
    validationWarnings,
  };
}

export const LAUNCHPAD_GROUP_LABELS: Record<LaunchpadGroup, string> = {
  start_here: "Start Here",
  environment_setup: "Environment Setup",
  recovery_rules: "Recovery Rules",
};
