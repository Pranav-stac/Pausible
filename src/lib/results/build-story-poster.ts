import type { ResultsReportModel } from "@/lib/results/build-results-report";
import { sanitizePersonaSummaryText } from "@/lib/results/trait-labels";

export type StoryPoster = {
  archetypeLabel: string;
  line: string;
  dimensions: { label: string; pct: number }[];
  hashtags: string[];
  siteSlug: string;
};

export function buildStoryPoster(model: ResultsReportModel): StoryPoster {
  const topDims = [...model.dimensions]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((d) => ({ label: d.label, pct: d.pct }));

  return {
    archetypeLabel: model.personaTitle ?? model.primaryLabel,
    line: sanitizePersonaSummaryText(model.primarySummary),
    dimensions: topDims.length ? topDims : model.dimensions.map((d) => ({ label: d.label, pct: d.pct })),
    hashtags: ["#Pausibl", "#WellnessPersona", "#KnowYourPattern"],
    siteSlug: "pausibl.com",
  };
}
