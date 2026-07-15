import type { RecommendationRow, RecommendationType } from "@/lib/recommendations/types";

/** Roles that participate in plan rhythm (daily/weekly cadence assignment). */
export const PLAN_RHYTHM_ROLES = new Set([
  "do",
  "first_action",
  "environment_change",
  "recovery_rule",
  "dont",
  "standard",
]);

/** Prefer Master col X Recommendation Role; fall back to type for legacy rows. */
export function effectiveRole(
  row: Pick<RecommendationRow, "type" | "recommendationRole">,
): string {
  const role = (row.recommendationRole ?? "").trim().toLowerCase();
  if (role && role !== "standard") return role;
  if (role === "standard") {
    // Standard do/dont keep their content type for do/dont eligibility.
    return row.type;
  }
  return row.type;
}

export function rowHasRole(
  row: Pick<RecommendationRow, "type" | "recommendationRole">,
  role: string,
): boolean {
  const r = role.toLowerCase();
  return effectiveRole(row) === r || row.type === r || row.recommendationRole === r;
}

export function isPlanRhythmRow(row: Pick<RecommendationRow, "type" | "recommendationRole">): boolean {
  const role = effectiveRole(row);
  if (PLAN_RHYTHM_ROLES.has(role)) return true;
  return row.type === "do" || row.type === "dont";
}

export function planRhythmRank(row: Pick<RecommendationRow, "type" | "recommendationRole">): number {
  const role = effectiveRole(row);
  if (role === "first_action") return 0;
  if (role === "do" || (role === "standard" && row.type === "do")) return 1;
  if (role === "environment_change") return 2;
  if (role === "recovery_rule") return 3;
  if (role === "dont" || row.type === "dont") return 4;
  return 20;
}

/** Phase eligibility: match type or Recommendation Role against the phase table. */
export function isEligibleForPhase(
  row: Pick<RecommendationRow, "type" | "recommendationRole">,
  eligible: Set<string> | Iterable<string>,
): boolean {
  const set = eligible instanceof Set ? eligible : new Set(eligible);
  if (set.has(row.type)) return true;
  const role = effectiveRole(row);
  if (set.has(role)) return true;
  if (row.recommendationRole && set.has(row.recommendationRole)) return true;
  // "do" eligibility also admits standard action roles still typed as do.
  if (set.has("do") && row.type === "do") return true;
  return false;
}

export function isActionableDo(
  row: Pick<RecommendationRow, "type" | "recommendationRole">,
): boolean {
  return (
    row.type === "do" ||
    rowHasRole(row, "first_action") ||
    rowHasRole(row, "environment_change") ||
    rowHasRole(row, "recovery_rule")
  );
}

export type { RecommendationType };
