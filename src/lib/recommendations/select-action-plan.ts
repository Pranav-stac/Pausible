import {
  A12_COACH_NOTES_MAX,
  A12_LAUNCHPAD_COUNT,
} from "@/lib/recommendations/scoring-constants";
import { selectOpportunityClusters } from "@/lib/recommendations/cluster";
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

const LAUNCHPAD_TYPES = new Set(["first_action", "environment_change", "mindset_shift"]);
const COACH_POOL_TYPES = new Set(["coach_note", "mindset_shift"]);

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

function launchpadGroup(row: ScoredRecommendation): LaunchpadGroup {
  if (row.type === "mindset_shift") return "build_awareness";
  if (row.category.includes("social") || row.category.includes("accountability") || row.category.includes("support")) {
    return "create_support";
  }
  return "remove_friction";
}

function buildPillarPlan(
  pillar: PillarName,
  ranked: ScoredRecommendation[],
  used: Set<string>,
): PillarActionPlan {
  const inPillar = ranked.filter((r) => r.pillar === pillar);
  const dosPool = inPillar.filter((r) => r.type === "do");
  const dontsPool = inPillar.filter((r) => r.type === "dont");

  const focus = dosPool[0] ?? inPillar[0];
  const dos = pickUnique(dosPool, 4, used);
  const donts = pickUnique(dontsPool, 2, used);

  const sourceIds = [...new Set([...(focus ? [focus.id] : []), ...dos.map((d) => d.id), ...donts.map((d) => d.id)])];

  return {
    pillar,
    focusArea: focus?.category.replace(/_/g, " ") ?? pillar,
    focusReason: focus?.notes || focus?.text || `Personalized ${pillar} guidance for your profile.`,
    dos: dos.map((d) => ({ id: d.id, text: d.text })),
    donts: donts.map((d) => ({ id: d.id, text: d.text })),
    sourceIds,
  };
}

/** A12 §8 Page 6 section selection. */
export function selectActionPlan(
  ranked: ScoredRecommendation[],
  profile: UserProfile,
): ActionPlanSelection {
  const used = new Set<string>();
  const opportunities = selectOpportunityClusters(ranked, profile);

  const pillarPlans = {} as Record<PillarName, PillarActionPlan>;
  for (const pillar of PILLARS) {
    pillarPlans[pillar] = buildPillarPlan(pillar, ranked, used);
  }

  const launchpadRows = ranked.filter((r) => LAUNCHPAD_TYPES.has(r.type));
  const launchpad: LaunchpadItem[] = pickUnique(launchpadRows, A12_LAUNCHPAD_COUNT, used).map((r) => ({
    id: r.id,
    text: r.text,
    group: launchpadGroup(r),
  }));

  const coachPool = ranked.filter((r) => COACH_POOL_TYPES.has(r.type));
  const coachNotes = pickUnique(coachPool, A12_COACH_NOTES_MAX, used);

  const safetyGuidance = selectTriggeredSafetyGuidance(ranked, profile);
  for (const s of safetyGuidance) used.add(s.id);

  const allSourceIds = [
    ...new Set([
      ...opportunities.flatMap((c) => c.rows.map((r) => r.id)),
      ...PILLARS.flatMap((p) => pillarPlans[p].sourceIds),
      ...launchpad.map((l) => l.id),
      ...coachNotes.map((c) => c.id),
      ...safetyGuidance.map((s) => s.id),
    ]),
  ];

  return {
    profile,
    ranked,
    opportunities,
    pillarPlans,
    launchpad,
    coachNotes,
    safetyGuidance,
    allSourceIds,
  };
}
