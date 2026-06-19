import { isPiSeries, primaryPersonaMatchesRow, resolvedText, resolvedTextForAlias } from "@/lib/recommendations/action-pool";
import type {
  PiSeriesSelection,
  RecommendationType,
  ScoredRecommendation,
  UserProfile,
} from "@/lib/recommendations/types";

const PI_TYPES: RecommendationType[] = [
  "blind_spot",
  "pattern_prediction",
  "success_condition",
  "strength_insight",
];

function pickPi(
  ranked: ScoredRecommendation[],
  profile: UserProfile,
  type: RecommendationType,
  personaAlias: string,
): ScoredRecommendation | null {
  return (
    ranked.find(
      (r) =>
        isPiSeries(r) &&
        r.type === type &&
        r.pillar === "Mental Wellness" &&
        primaryPersonaMatchesRow(r, personaAlias),
    ) ?? null
  );
}

/** PI001–PI024 selection for Slides 3, 4, and 10 (Content Logic Guide §6–7, §12). */
export function selectPiSeries(ranked: ScoredRecommendation[], profile: UserProfile): PiSeriesSelection {
  const primary = profile.primaryPersonaAlias;
  const secondary = profile.secondaryPersonaAlias;
  const includeSecondary = profile.blendStrength !== "pure";

  const blindSpot = pickPi(ranked, profile, "blind_spot", primary);
  const patternPrediction = pickPi(ranked, profile, "pattern_prediction", primary);
  const successCondition = pickPi(ranked, profile, "success_condition", primary);
  const strengthInsight = pickPi(ranked, profile, "strength_insight", primary);

  const secondaryBlindSpot = includeSecondary ? pickPi(ranked, profile, "blind_spot", secondary) : null;
  const secondarySuccessCondition = includeSecondary
    ? pickPi(ranked, profile, "success_condition", secondary)
    : null;
  const secondaryStrengthInsight = includeSecondary
    ? pickPi(ranked, profile, "strength_insight", secondary)
    : null;
  const secondaryPatternPrediction = includeSecondary
    ? pickPi(ranked, profile, "pattern_prediction", secondary)
    : null;

  const sourceIds = [
    blindSpot?.id,
    patternPrediction?.id,
    successCondition?.id,
    strengthInsight?.id,
    secondaryBlindSpot?.id,
    secondarySuccessCondition?.id,
    secondaryStrengthInsight?.id,
    secondaryPatternPrediction?.id,
  ].filter((id): id is string => Boolean(id));

  return {
    blindSpot,
    patternPrediction,
    successCondition,
    strengthInsight,
    secondaryBlindSpot,
    secondarySuccessCondition,
    secondaryStrengthInsight,
    secondaryPatternPrediction,
    blindSpotText: blindSpot ? resolvedText(blindSpot, profile) : "",
    patternPredictionText: patternPrediction ? resolvedText(patternPrediction, profile) : "",
    successConditionText: successCondition ? resolvedText(successCondition, profile) : "",
    strengthInsightText: strengthInsight ? resolvedText(strengthInsight, profile) : "",
    secondaryBlindSpotText: secondaryBlindSpot
      ? resolvedTextForAlias(secondaryBlindSpot, secondary)
      : "",
    secondarySuccessConditionText: secondarySuccessCondition
      ? resolvedTextForAlias(secondarySuccessCondition, secondary)
      : "",
    secondaryStrengthInsightText: secondaryStrengthInsight
      ? resolvedTextForAlias(secondaryStrengthInsight, secondary)
      : "",
    secondaryPatternPredictionText: secondaryPatternPrediction
      ? resolvedTextForAlias(secondaryPatternPrediction, secondary)
      : "",
    sourceIds,
    complete: PI_TYPES.every((t) => pickPi(ranked, profile, t, primary) != null),
  };
}
