import type { RecommendationRow } from "@/lib/recommendations/types";

/** Classify activation energy (1–5) from recommendation type and category. */
export function classifyActivationEnergy(row: Pick<RecommendationRow, "type" | "category" | "text">): number {
  const category = row.category.toLowerCase();
  const text = row.text.toLowerCase();

  switch (row.type) {
    case "environment_change":
      return 1;
    case "first_action":
      if (category.includes("environment") || text.includes("environment") || text.includes("setup")) {
        return 1;
      }
      return 2;
    case "do":
      if (
        category.includes("structured") ||
        category.includes("training") ||
        category.includes("split") ||
        text.includes("3-day") ||
        text.includes("progressive")
      ) {
        return 4;
      }
      if (category.includes("routine") || category.includes("regular") || text.includes("every day")) {
        return 3;
      }
      return 2;
    case "dont":
      return 3;
    case "mindset_shift":
    case "recovery_rule":
      return 4;
    case "success_condition":
    case "strength_insight":
    case "blind_spot":
    case "pattern_prediction":
      return 5;
    default:
      return 3;
  }
}
