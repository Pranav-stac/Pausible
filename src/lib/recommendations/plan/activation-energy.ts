import type { EffortLevel, RecommendationRow } from "@/lib/recommendations/types";

/** Map Effort Level (col U) → activation energy 1–5 (PDA §21.4). */
export function classifyActivationEnergy(
  row: Pick<RecommendationRow, "type" | "category" | "text" | "effortLevel">,
): number {
  const effort: EffortLevel = row.effortLevel ?? "medium";
  const category = row.category.toLowerCase();
  const text = row.text.toLowerCase();

  if (effort === "low") {
    if (row.type === "environment_change") return 1;
    if (
      row.type === "first_action" &&
      (category.includes("environment") || text.includes("environment") || text.includes("setup"))
    ) {
      return 1;
    }
    if (row.type === "mindset_shift") return 1;
    return 2;
  }

  if (effort === "medium") return 3;

  if (row.type === "success_condition" || row.type === "strength_insight") return 5;
  if (
    row.type === "do" &&
    (category.includes("structured") ||
      category.includes("training") ||
      text.includes("progressive") ||
      text.includes("3-day"))
  ) {
    return 5;
  }
  return 4;
}
