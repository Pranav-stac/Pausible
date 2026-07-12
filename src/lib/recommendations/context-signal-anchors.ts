import type { ScoredRecommendation, UserProfile } from "@/lib/recommendations/types";

export const CONTEXT_SIGNAL_ANCHOR_REC_IDS = {
  caffeineSleepCutoff: "SLP014",
  timeOfDayMatch: "FIT036",
  routineBoredomRefresh: "MW037",
} as const;

function boostRow(row: ScoredRecommendation, tag: string, points: number): ScoredRecommendation {
  return {
    ...row,
    score: {
      ...row.score,
      total: row.score.total + points,
      context: row.score.context + Math.min(3, points / 10),
      matchedContext: row.score.matchedContext.includes(tag)
        ? row.score.matchedContext
        : [...row.score.matchedContext, tag],
    },
  };
}

/** Boost high-signal recs when critical context tags co-occur (§21.14 extension). */
export function injectContextSignalAnchors(
  ranked: ScoredRecommendation[],
  profile: UserProfile,
  allRows: ScoredRecommendation[],
): ScoredRecommendation[] {
  const ctx = new Set(profile.context);
  const toInject: Array<{ id: string; tag: string; points: number }> = [];

  const poorSleep =
    ctx.has("sleep_quality_poor") ||
    ctx.has("sleep_5_6_hours") ||
    profile.barriers.includes("barrier_poor_sleep");
  if (poorSleep && (ctx.has("caffeine_daytime") || ctx.has("caffeine_evening"))) {
    toInject.push({
      id: CONTEXT_SIGNAL_ANCHOR_REC_IDS.caffeineSleepCutoff,
      tag: "signal_caffeine_sleep",
      points: 35,
    });
  }

  if (ctx.has("time_of_day_latenight")) {
    toInject.push({
      id: CONTEXT_SIGNAL_ANCHOR_REC_IDS.timeOfDayMatch,
      tag: "signal_time_pref",
      points: 28,
    });
  }

  if (profile.barriers.includes("barrier_lack_of_consistency")) {
    toInject.push({
      id: CONTEXT_SIGNAL_ANCHOR_REC_IDS.routineBoredomRefresh,
      tag: "signal_routine_boredom",
      points: 30,
    });
  }

  if (!toInject.length) return ranked;

  let out = ranked;
  for (const { id, tag, points } of toInject) {
    const existing = out.find((r) => r.id === id);
    if (existing) {
      out = out.map((r) => (r.id === id ? boostRow(r, tag, points) : r));
      continue;
    }
    const row = allRows.find((r) => r.id === id);
    if (!row) continue;
    out = [...out, boostRow(row, tag, points)];
  }

  return out.sort((a, b) => b.score.total - a.score.total);
}
