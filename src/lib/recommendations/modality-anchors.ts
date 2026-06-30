import type { ScoredRecommendation, UserProfile } from "@/lib/recommendations/types";

/** Master v1.13 modality anchor recs (§21.14). */
export const MODALITY_ANCHOR_REC_IDS = {
  cardio: "FIT038",
  sportDance: "FIT039",
  yoga: "FIT040",
  cardioProgression: "FIT041",
} as const;

const CARDIO_PREFS = new Set([
  "activity_pref_cardio",
  "activity_pref_running",
  "activity_pref_cycling",
  "activity_pref_swimming",
]);

const SPORT_DANCE_PREFS = new Set(["activity_pref_sports", "activity_pref_dance"]);

function boostRow(row: ScoredRecommendation, tag: string): ScoredRecommendation {
  return {
    ...row,
    score: {
      ...row.score,
      total: row.score.total + 30,
      context: row.score.context + 3,
      matchedContext: row.score.matchedContext.includes(tag)
        ? row.score.matchedContext
        : [...row.score.matchedContext, tag],
    },
  };
}

/** Surface modality anchors when user activity preferences match (§21.14). */
export function injectModalityAnchors(
  ranked: ScoredRecommendation[],
  profile: UserProfile,
  allRows: ScoredRecommendation[],
): ScoredRecommendation[] {
  const prefs = new Set(profile.context);
  const toInject: string[] = [];

  if ([...CARDIO_PREFS].some((p) => prefs.has(p))) {
    toInject.push(MODALITY_ANCHOR_REC_IDS.cardio);
    if (profile.goals.some((g) => g === "goal_energy" || g === "goal_overall_health")) {
      toInject.push(MODALITY_ANCHOR_REC_IDS.cardioProgression);
    }
  }
  if ([...SPORT_DANCE_PREFS].some((p) => prefs.has(p))) {
    toInject.push(MODALITY_ANCHOR_REC_IDS.sportDance);
  }
  if (prefs.has("activity_pref_yoga")) {
    toInject.push(MODALITY_ANCHOR_REC_IDS.yoga);
  }

  if (!toInject.length) return ranked;

  let out = ranked;
  for (const id of toInject) {
    if (out.some((r) => r.id === id)) continue;
    const row = allRows.find((r) => r.id === id);
    if (!row) continue;
    out = [...out, boostRow(row, `modality_anchor_${id.toLowerCase()}`)];
  }

  return out.sort((a, b) => b.score.total - a.score.total);
}
